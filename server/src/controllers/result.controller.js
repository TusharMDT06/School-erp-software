const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const Exam = require("../models/Exam.model");
const Result = require("../models/Result.model");
const Student = require("../models/Student.model");
const Teacher = require("../models/Teacher.model");
const { calculateGrade, isPassing } = require("../utils/gradeCalculator");
const { generateRemark } = require("../utils/aiRemarkGenerator");
const generateReportCard = require("../utils/generateReportCard");
const sendEmail = require("../utils/sendEmail");
const { getIO } = require("../config/socket");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

/**
 * POST /api/results/bulk-entry
 * Upserts marks for multiple students in an exam.
 * Keeps bulk entry fast by avoiding AI calls here.
 */
const bulkEntryResults = async (req, res, next) => {
  try {
    const { examId, entries } = req.body;

    if (!examId || !Array.isArray(entries) || entries.length === 0) {
      throw new ApiError(400, "examId and a non-empty entries list are required.");
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      throw new ApiError(404, "Examination not found.");
    }

    if (exam.resultPublished) {
      throw new ApiError(400, "Results for this exam have already been published and cannot be modified.");
    }

    // Determine enteredBy teacher ID
    let enteredBy = null;
    if (req.user.role === "teacher") {
      const teacher = await Teacher.findOne({ userId: req.user.id });
      enteredBy = teacher ? teacher._id : new mongoose.Types.ObjectId();
    } else {
      const anyTeacher = await Teacher.findOne({ schoolId: exam.schoolId });
      enteredBy = anyTeacher ? anyTeacher._id : new mongoose.Types.ObjectId();
    }

    // Map exam subjects for fast validation and maxMarks lookup
    const examSubjectsMap = new Map();
    let totalMaxMarks = 0;
    exam.subjects.forEach((sub) => {
      const key = sub.subjectName.toLowerCase().trim();
      examSubjectsMap.set(key, sub);
      totalMaxMarks += sub.maxMarks;
    });

    const bulkOps = [];

    for (const entry of entries) {
      const { studentId, marksObtained } = entry;
      if (!studentId || !Array.isArray(marksObtained)) {
        continue;
      }

      let totalMarksObtained = 0;
      const sanitizedMarks = [];

      for (const m of marksObtained) {
        const subKey = (m.subjectName || "").toLowerCase().trim();
        const subConfig = examSubjectsMap.get(subKey);

        if (!subConfig) {
          throw new ApiError(400, `Subject "${m.subjectName}" is not registered in this exam schedule.`);
        }

        const score = Number(m.marks) || 0;
        if (score < 0 || score > subConfig.maxMarks) {
          throw new ApiError(
            400,
            `Invalid marks for ${m.subjectName}: Score (${score}) must be between 0 and ${subConfig.maxMarks}.`
          );
        }

        totalMarksObtained += score;
        sanitizedMarks.push({
          subjectName: subConfig.subjectName,
          marks: score,
        });
      }

      const percentage =
        totalMaxMarks > 0 ? Number(((totalMarksObtained / totalMaxMarks) * 100).toFixed(1)) : 0;
      const pass = isPassing(sanitizedMarks, exam.subjects);
      const grade = calculateGrade(percentage);
      const overallStatus = pass ? "pass" : "fail";

      bulkOps.push({
        updateOne: {
          filter: {
            studentId: new mongoose.Types.ObjectId(studentId),
            examId: new mongoose.Types.ObjectId(examId),
          },
          update: {
            $set: {
              studentId: new mongoose.Types.ObjectId(studentId),
              examId: new mongoose.Types.ObjectId(examId),
              marksObtained: sanitizedMarks,
              totalMarksObtained,
              totalMaxMarks,
              percentage,
              grade,
              overallStatus,
              enteredBy,
            },
          },
          upsert: true,
        },
      });
    }

    if (bulkOps.length > 0) {
      await Result.bulkWrite(bulkOps);
    }

    res.status(200).json(
      new ApiResponse(
        200,
        { updatedCount: bulkOps.length },
        `Marks recorded successfully for ${bulkOps.length} students.`
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/results/:examId/generate-remarks
 * Generates personalized AI remarks for results under an examination in batches.
 */
const generateAiRemarksForExam = async (req, res, next) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      throw new ApiError(404, "Examination not found.");
    }

    const examSubjectsMap = new Map();
    exam.subjects.forEach((s) => {
      examSubjectsMap.set(s.subjectName.toLowerCase().trim(), s.passingMarks);
    });

    const results = await Result.find({ examId })
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name" },
      });

    let generatedCount = 0;
    const BATCH_SIZE = 5;

    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (resDoc) => {
          const studentName = resDoc.studentId?.userId?.name || "Student";

          // Identify weak subjects (where marks < passingMarks or < 40%)
          const weakSubjects = [];
          resDoc.marksObtained.forEach((m) => {
            const passMarks = examSubjectsMap.get(m.subjectName.toLowerCase().trim()) ?? 35;
            if (m.marks < passMarks) {
              weakSubjects.push(m.subjectName);
            }
          });

          const remark = await generateRemark(
            studentName,
            resDoc.percentage,
            resDoc.grade,
            weakSubjects
          );

          resDoc.remarks = remark;
          await resDoc.save();
          generatedCount++;
        })
      );
    }

    res.status(200).json(
      new ApiResponse(
        200,
        { generatedCount },
        `AI remarks generated for ${generatedCount} student report cards.`
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/results/:examId/publish
 * Marks examination as published, generates official PDF report cards, and alerts parents via email/sockets.
 */
const publishResults = async (req, res, next) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId).populate("classId", "className section");
    if (!exam) {
      throw new ApiError(404, "Examination not found.");
    }

    exam.resultPublished = true;
    await exam.save();

    const results = await Result.find({ examId }).populate({
      path: "studentId",
      populate: [
        { path: "userId", select: "name email" },
        { path: "guardianIds", select: "name email _id" },
        { path: "classId", select: "className section" },
      ],
    });

    const io = getIO();
    let publishedCount = 0;

    for (const resDoc of results) {
      const student = resDoc.studentId;
      if (!student) continue;

      // 1. Generate PDF Report Card
      let reportCardUrl = resDoc.reportCardUrl;
      try {
        reportCardUrl = await generateReportCard(student, exam, resDoc);
        resDoc.reportCardUrl = reportCardUrl;
        await resDoc.save();
        publishedCount++;
      } catch (pdfErr) {
        console.warn(`Failed generating report card for student ${student._id}:`, pdfErr.message);
      }

      const studentName = student.userId?.name || "Student";
      const className = exam.classId
        ? `${exam.classId.className}-${exam.classId.section}`
        : "Class";

      // 2. Real-time Socket.io notification
      if (io) {
        // Notify student room
        if (student.userId?._id) {
          io.to(`user:${student.userId._id.toString()}`).emit("results:published", {
            examId: exam._id,
            examName: exam.examName,
            percentage: resDoc.percentage,
            grade: resDoc.grade,
            status: resDoc.overallStatus,
          });
        }

        // Notify parents rooms
        student.guardianIds?.forEach((parent) => {
          if (parent?._id) {
            io.to(`user:${parent._id.toString()}`).emit("results:published", {
              examId: exam._id,
              examName: exam.examName,
              studentName,
              percentage: resDoc.percentage,
              grade: resDoc.grade,
              status: resDoc.overallStatus,
            });
          }
        });
      }

      // 3. Email Notification to Parents via Resend
      const parentEmails = (student.guardianIds || [])
        .map((p) => p.email)
        .filter(Boolean);

      if (parentEmails.length > 0) {
        const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="background-color: #1F4E79; padding: 18px; border-radius: 6px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px;">School ERP — Examination Results Published</h1>
            </div>
            <div style="padding: 20px 0; color: #334155; line-height: 1.6;">
              <p>Dear Parent / Guardian,</p>
              <p>The academic results for <strong>${exam.examName}</strong> (${exam.academicYear}) have been officially published for your ward <strong>${studentName}</strong> (Class: <strong>${className}</strong>).</p>

              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="color: #64748b;">Aggregate Score:</td>
                    <td style="font-weight: bold; text-align: right;">${resDoc.totalMarksObtained} / ${resDoc.totalMaxMarks}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b;">Percentage:</td>
                    <td style="font-weight: bold; text-align: right; color: #1F4E79;">${resDoc.percentage}%</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b;">Letter Grade:</td>
                    <td style="font-weight: bold; text-align: right;">${resDoc.grade}</td>
                  </tr>
                  <tr>
                    <td style="color: #64748b;">Overall Status:</td>
                    <td style="font-weight: bold; text-align: right; color: ${resDoc.overallStatus === "pass" ? "#16a34a" : "#dc2626"};">
                      ${resDoc.overallStatus.toUpperCase()}
                    </td>
                  </tr>
                </table>
              </div>

              <p>You can view the detailed subject-wise marksheet and download the official signed PDF report card through the Parent Portal.</p>

              <div style="text-align: center; margin: 25px 0;">
                <a href="${clientUrl}/parent/results" style="background-color: #1F4E79; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Report Card</a>
              </div>
            </div>
          </div>
        `;

        sendEmail({
          to: parentEmails,
          subject: `Results Published: ${exam.examName} — ${studentName}`,
          html: emailHtml,
        }).catch((err) => {
          console.warn(`Failed sending results email to ${parentEmails.join(", ")}:`, err.message);
        });
      }
    }

    res.status(200).json(
      new ApiResponse(
        200,
        { publishedCount },
        `Examination results published and ${publishedCount} report cards generated.`
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/results/student/:studentId
 * Returns all published examination results for a student.
 */
const getStudentResults = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId)
      .populate("userId", "name email")
      .populate("classId", "className section");

    if (!student) {
      throw new ApiError(404, "Student not found.");
    }

    // Role check: student can only view own, parent only own child
    if (req.user.role === "student" && student.userId?._id.toString() !== req.user.id) {
      throw new ApiError(403, "Access denied to other students' results.");
    }
    if (req.user.role === "parent") {
      const isChild = student.guardianIds?.some((gid) => gid.toString() === req.user.id);
      if (!isChild) {
        throw new ApiError(403, "Access denied to non-linked student results.");
      }
    }

    const query = { studentId };

    const results = await Result.find(query)
      .populate("examId")
      .sort({ createdAt: -1 });

    // Filter out unpublished exams for students/parents
    const isStaff = ["admin", "superadmin", "teacher"].includes(req.user.role);
    const visibleResults = isStaff
      ? results
      : results.filter((r) => r.examId && r.examId.resultPublished === true);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          student: {
            id: student._id,
            name: student.userId?.name,
            rollNumber: student.rollNumber,
            admissionNumber: student.admissionNumber,
            className: student.classId
              ? `${student.classId.className}-${student.classId.section}`
              : "N/A",
          },
          results: visibleResults,
        },
        "Student examination results retrieved."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/results/reportcard/:studentId/:examId
 * Streams or downloads the generated PDF report card.
 */
const getReportCardPdf = async (req, res, next) => {
  try {
    const { studentId, examId } = req.params;

    let result = await Result.findOne({ studentId, examId });
    if (!result) {
      throw new ApiError(404, "Result record not found for this student and exam.");
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      throw new ApiError(404, "Exam not found.");
    }

    const isStaff = ["admin", "superadmin", "teacher"].includes(req.user.role);
    if (!exam.resultPublished && !isStaff) {
      throw new ApiError(403, "Results for this exam have not been published yet.");
    }

    const student = await Student.findById(studentId)
      .populate("userId", "name email")
      .populate("classId", "className section");

    // If report card PDF not yet generated, create it on demand
    let filePath;
    if (result.reportCardUrl) {
      filePath = path.join(__dirname, "../../", result.reportCardUrl);
    }

    if (!filePath || !fs.existsSync(filePath)) {
      const generatedUrl = await generateReportCard(student, exam, result);
      result.reportCardUrl = generatedUrl;
      await result.save();
      filePath = path.join(__dirname, "../../", generatedUrl);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="ReportCard_${student.rollNumber || "Student"}_${exam.examName}.pdf"`
    );
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/results/class/:classId/exam/:examId/analytics
 * Aggregation pipeline computing subject averages, pass percentage, grade distribution, and toppers.
 */
const getClassExamAnalytics = async (req, res, next) => {
  try {
    const { classId, examId } = req.params;

    const exam = await Exam.findById(examId).populate("classId", "className section");
    if (!exam) {
      throw new ApiError(404, "Examination not found.");
    }

    const examObjectId = new mongoose.Types.ObjectId(examId);

    // 1. Overall stats and Grade distribution
    const overallStats = await Result.aggregate([
      { $match: { examId: examObjectId } },
      {
        $group: {
          _id: null,
          totalStudents: { $sum: 1 },
          passedCount: {
            $sum: { $cond: [{ $eq: ["$overallStatus", "pass"] }, 1, 0] },
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ["$overallStatus", "fail"] }, 1, 0] },
          },
          avgPercentage: { $avg: "$percentage" },
          highestPercentage: { $max: "$percentage" },
          lowestPercentage: { $min: "$percentage" },
        },
      },
    ]);

    // 2. Grade distribution counts
    const gradeDistribution = await Result.aggregate([
      { $match: { examId: examObjectId } },
      {
        $group: {
          _id: "$grade",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 3. Subject-wise class average
    const subjectAverages = await Result.aggregate([
      { $match: { examId: examObjectId } },
      { $unwind: "$marksObtained" },
      {
        $group: {
          _id: "$marksObtained.subjectName",
          avgMarks: { $avg: "$marksObtained.marks" },
          highestMarks: { $max: "$marksObtained.marks" },
          lowestMarks: { $min: "$marksObtained.marks" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 4. Highest & Lowest Scorers
    const highestScorer = await Result.findOne({ examId })
      .sort({ percentage: -1 })
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name" },
      });

    const lowestScorer = await Result.findOne({ examId })
      .sort({ percentage: 1 })
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name" },
      });

    const summary = overallStats[0] || {
      totalStudents: 0,
      passedCount: 0,
      failedCount: 0,
      avgPercentage: 0,
      highestPercentage: 0,
      lowestPercentage: 0,
    };

    const passPercentage =
      summary.totalStudents > 0
        ? Number(((summary.passedCount / summary.totalStudents) * 100).toFixed(1))
        : 0;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          exam: {
            id: exam._id,
            examName: exam.examName,
            academicYear: exam.academicYear,
            className: exam.classId
              ? `${exam.classId.className}-${exam.classId.section}`
              : "N/A",
            resultPublished: exam.resultPublished,
          },
          summary: {
            ...summary,
            avgPercentage: Number((summary.avgPercentage || 0).toFixed(1)),
            passPercentage,
          },
          gradeDistribution: gradeDistribution.map((g) => ({
            grade: g._id,
            count: g.count,
          })),
          subjectAverages: subjectAverages.map((s) => ({
            subjectName: s._id,
            avgMarks: Number(s.avgMarks.toFixed(1)),
            highestMarks: s.highestMarks,
            lowestMarks: s.lowestMarks,
          })),
          topper: highestScorer
            ? {
                name: highestScorer.studentId?.userId?.name || "Student",
                percentage: highestScorer.percentage,
                grade: highestScorer.grade,
              }
            : null,
          lowest: lowestScorer
            ? {
                name: lowestScorer.studentId?.userId?.name || "Student",
                percentage: lowestScorer.percentage,
                grade: lowestScorer.grade,
              }
            : null,
        },
        "Class exam performance analytics retrieved."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/results/exam/:examId/all
 * Returns all results for an exam (used by teachers and admin for marks entry & review).
 */
const getResultsByExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const results = await Result.find({ examId })
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "name email" },
      })
      .sort({ "studentId.rollNumber": 1 });

    res.status(200).json(new ApiResponse(200, results, "Exam results retrieved."));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  bulkEntryResults,
  generateAiRemarksForExam,
  publishResults,
  getStudentResults,
  getReportCardPdf,
  getClassExamAnalytics,
  getResultsByExam,
};
