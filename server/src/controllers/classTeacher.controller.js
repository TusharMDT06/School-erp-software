const mongoose = require("mongoose");
const ClassSection = require("../models/ClassSection.model");
const Teacher = require("../models/Teacher.model");
const Student = require("../models/Student.model");
const Attendance = require("../models/Attendance.model");
const Result = require("../models/Result.model");
const Exam = require("../models/Exam.model");
const Homework = require("../models/Homework.model");
const HomeworkSubmission = require("../models/HomeworkSubmission.model");
const StudentRisk = require("../models/StudentRisk.model");
const AuditLog = require("../models/AuditLog.model");
const auditLog = require("../utils/auditLog");
const { notify } = require("../services/notification.service");
const { generateContent, parseResponse } = require("../config/geminiClient");
const { ApiError, ApiResponse } = require("../utils/apiResponse");
const { getOrEnsureTeacher } = require("../utils/teacherAccess");

let sendWhatsAppMessage = null;
try {
  const wa = require("../services/whatsapp.service");
  sendWhatsAppMessage = wa.sendWhatsAppMessage || wa.sendMessage || null;
} catch (e) {}

let sendSms = null;
try {
  const sms = require("../services/sms.service");
  sendSms = sms.sendSms || null;
} catch (e) {}

/**
 * GET /api/teacher/my-class
 * Class teacher only: Roster with mini metrics, risk band (no finance data), guardian contact.
 */
const getMyClass = async (req, res, next) => {
  try {
    const teacher = await getOrEnsureTeacher(req.user);
    if (!teacher) {
      throw new ApiError(404, "Teacher profile not found.");
    }

    const { classId } = req.query;
    let targetClass;

    if (classId) {
      targetClass = await ClassSection.findOne({
        _id: classId,
        ...(teacher ? { classTeacherId: teacher._id } : {}),
      });
      if (!targetClass && ["admin", "principal", "superadmin"].includes(req.user.role)) {
        targetClass = await ClassSection.findById(classId);
      }
      if (!targetClass) {
        throw new ApiError(403, "You are not designated as the Class Teacher for this class.");
      }
    } else {
      if (teacher) {
        targetClass = await ClassSection.findOne({ classTeacherId: teacher._id });
      }
      if (!targetClass && ["admin", "principal", "superadmin"].includes(req.user.role)) {
        targetClass =
          (await ClassSection.findOne({ schoolId: req.user.schoolId })) ||
          (await ClassSection.findOne());
      }
    }

    if (!targetClass) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            classInfo: null,
            stats: {
              totalEnrolled: 0,
              averageAttendance: 0,
              atRiskCount: 0,
              homeworkAvg: 0,
            },
            students: [],
            message: "You are not currently designated as the Class Teacher for an active class.",
          },
          "Class teacher roster retrieved."
        )
      );
    }

    // Retrieve all active students in this class
    const students = await Student.find({
      classId: targetClass._id,
      status: "active",
    })
      .populate("guardianIds", "name phone email")
      .sort({ rollNumber: 1, name: 1 })
      .lean();

    // Enrich each student with attendance %, latest result %, homework completion %, and risk band
    const roster = await Promise.all(
      students.map(async (student) => {
        const studentId = student._id;

        // 1. Attendance %
        const totalAttendance = await Attendance.countDocuments({ studentId });
        const presentCount = await Attendance.countDocuments({
          studentId,
          status: { $in: ["present", "late"] },
        });
        const attendancePercentage =
          totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100;

        // 2. Latest Exam Result %
        const latestResult = await Result.findOne({ studentId })
          .sort({ createdAt: -1 })
          .populate("examId", "name")
          .lean();

        // 3. Homework Completion %
        const totalHw = await Homework.countDocuments({
          classId: targetClass._id,
          status: "published",
        });
        let homeworkCompletionRate = 100;
        if (totalHw > 0) {
          const submissions = await HomeworkSubmission.countDocuments({ studentId });
          homeworkCompletionRate = Math.min(100, Math.round((submissions / totalHw) * 100));
        }

        // 4. Student Risk Band (STRIP ALL FINANCE REASONS!)
        const risk = await StudentRisk.findOne({ studentId }).lean();
        let riskBand = "low";
        let nonFinanceReasons = [];
        if (risk) {
          riskBand = risk.band || "low";
          nonFinanceReasons = (risk.reasons || [])
            .filter((r) => r.visibility !== "finance" && r.factor !== "fees")
            .map((r) => ({ factor: r.factor, detail: r.detail }));
        }

        // 5. Guardian Contact Info
        const primaryGuardian = (student.guardianIds && student.guardianIds[0]) || null;
        const guardianContact = primaryGuardian
          ? {
              name: primaryGuardian.name,
              phone: primaryGuardian.phone,
              email: primaryGuardian.email,
              telLink: primaryGuardian.phone ? `tel:${primaryGuardian.phone}` : null,
              whatsappLink: primaryGuardian.phone
                ? `https://wa.me/${primaryGuardian.phone.replace(/[^0-9]/g, "")}`
                : null,
            }
          : null;

        return {
          _id: student._id,
          name: student.name,
          rollNumber: student.rollNumber || "-",
          admissionNumber: student.admissionNumber,
          gender: student.gender,
          dob: student.dob,
          avatarUrl: student.documents?.find((d) => d.name === "photo")?.url || null,
          attendancePercentage,
          latestResult: latestResult
            ? {
                examName: latestResult.examId?.name || "Exam",
                percentage: latestResult.percentage,
                grade: latestResult.grade,
              }
            : null,
          homeworkCompletionRate,
          risk: {
            band: riskBand,
            reasons: nonFinanceReasons,
          },
          guardianContact,
        };
      })
    );

    return res.status(200).json(
      new ApiResponse(200, {
        classSection: targetClass,
        studentCount: roster.length,
        roster,
      }, "Class roster and metrics retrieved.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/teacher/my-class/message-absentees/preview
 * Preview absentees and rendered message.
 */
const previewAbsenteeMessage = async (req, res, next) => {
  try {
    const teacher = await getOrEnsureTeacher(req.user);
    if (!teacher) throw new ApiError(404, "Teacher profile not found.");

    const { classId, date, templateKey = "standard", customNote = "" } = req.query;
    const targetClass = classId
      ? await ClassSection.findOne({ _id: classId, classTeacherId: teacher._id })
      : await ClassSection.findOne({ classTeacherId: teacher._id });

    if (!targetClass) {
      throw new ApiError(403, "You are not designated as the Class Teacher for this class.");
    }

    const queryDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

    // Find absent records for this class today
    const absentRecords = await Attendance.find({
      classId: targetClass._id,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: "absent",
    })
      .populate({
        path: "studentId",
        select: "name rollNumber guardianIds",
        populate: { path: "guardianIds", select: "name phone email" },
      })
      .lean();

    const studentList = absentRecords
      .map((r) => r.studentId)
      .filter((s) => s != null);

    const defaultMsg =
      templateKey === "urgent"
        ? `Urgent Notice: Your ward is marked absent today (${queryDate.toLocaleDateString()}). Please contact the school office or class teacher immediately.${customNote ? ` Note: ${customNote}` : ""}`
        : `Dear Parent, your child was marked absent today (${queryDate.toLocaleDateString()}) in Class ${targetClass.className}-${targetClass.section}. Please ensure they catch up on daily classwork.${customNote ? ` Teacher Note: ${customNote}` : ""}`;

    return res.status(200).json(
      new ApiResponse(200, {
        classSection: {
          _id: targetClass._id,
          name: `${targetClass.className}-${targetClass.section}`,
        },
        date: queryDate.toISOString().split("T")[0],
        absenteeCount: studentList.length,
        students: studentList.map((s) => ({
          _id: s._id,
          name: s.name,
          rollNumber: s.rollNumber,
          guardians: s.guardianIds?.map((g) => ({ name: g.name, phone: g.phone })),
        })),
        renderedMessage: defaultMsg,
      }, "Absentee message preview generated.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/teacher/my-class/message-absentees
 * Send bulk absentee messages to guardians.
 * Requires { confirm: true }. Limit 3 bulk sends per day per teacher.
 */
const sendAbsenteeMessage = async (req, res, next) => {
  try {
    const teacher = await getOrEnsureTeacher(req.user);
    if (!teacher) throw new ApiError(404, "Teacher profile not found.");

    const {
      classId,
      date,
      templateKey = "standard",
      customNote = "",
      confirm,
      sendChannels = ["in_app", "email"],
    } = req.body;

    if (!confirm) {
      throw new ApiError(400, "Please confirm the action before sending bulk messages.");
    }

    const targetClass = classId
      ? await ClassSection.findOne({ _id: classId, classTeacherId: teacher._id })
      : await ClassSection.findOne({ classTeacherId: teacher._id });

    if (!targetClass) {
      throw new ApiError(403, "You are not designated as the Class Teacher for this class.");
    }

    // Rate Limit: Max 3 bulk sends per day per teacher
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const sendsToday = await AuditLog.countDocuments({
      userId: req.user._id,
      action: "absentee_bulk_message",
      createdAt: { $gte: todayStart },
    });

    if (sendsToday >= 3) {
      throw new ApiError(
        429,
        "Daily limit reached: You can send at most 3 absentee bulk messages per day to prevent message fatigue."
      );
    }

    const queryDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

    const absentRecords = await Attendance.find({
      classId: targetClass._id,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: "absent",
    })
      .populate({
        path: "studentId",
        populate: { path: "guardianIds", select: "_id name phone email" },
      })
      .lean();

    if (absentRecords.length === 0) {
      return res.status(200).json(
        new ApiResponse(200, { sentCount: 0 }, "No absent students found for selected date.")
      );
    }

    const renderedMessage =
      templateKey === "urgent"
        ? `Urgent Notice: Your ward is marked absent today (${queryDate.toLocaleDateString()}). Please contact the class teacher.${customNote ? ` Note: ${customNote}` : ""}`
        : `Dear Parent, your child was marked absent today (${queryDate.toLocaleDateString()}) in Class ${targetClass.className}-${targetClass.section}.${customNote ? ` Note: ${customNote}` : ""}`;

    let sentCount = 0;
    for (const record of absentRecords) {
      const student = record.studentId;
      if (!student || !student.guardianIds) continue;

      for (const guardian of student.guardianIds) {
        // In-app & Email notification
        await notify(guardian._id, {
          type: "absentee_notice",
          title: `Attendance Alert: ${student.name} Absent Today`,
          message: renderedMessage,
          data: { studentId: student._id, date: queryDate.toISOString().split("T")[0] },
          sendEmail: sendChannels.includes("email"),
        });

        // WhatsApp / SMS if selected and available
        if (sendChannels.includes("whatsapp") && sendWhatsAppMessage && guardian.phone) {
          sendWhatsAppMessage(guardian.phone, renderedMessage).catch(() => {});
        }
        if (sendChannels.includes("sms") && sendSms && guardian.phone) {
          sendSms(guardian.phone, renderedMessage).catch(() => {});
        }

        sentCount++;
      }
    }

    // Write audit log
    await auditLog({
      schoolId: req.user.schoolId,
      userId: req.user._id,
      action: "absentee_bulk_message",
      module: "class_teacher",
      targetId: targetClass._id,
      newValue: {
        recipientsSent: sentCount,
        absenteeStudents: absentRecords.length,
        templateKey,
      },
      ip: req.ip,
    });

    return res.status(200).json(
      new ApiResponse(200, {
        recipientsSent: sentCount,
        absenteesCount: absentRecords.length,
        remainingSendsToday: 2 - sendsToday,
      }, `Absentee notices dispatched to ${sentCount} guardian contacts.`)
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/teacher/report-remarks/draft
 * AI-assisted report card remarks in batches of 5 with PII minimization.
 * Never overwrites existing remark without explicit confirm flag.
 */
const draftReportRemarks = async (req, res, next) => {
  try {
    const {
      examId,
      studentIds = [],
      tone = "encouraging",
      confirmOverwrite = false,
    } = req.body;

    if (!examId || !studentIds || studentIds.length === 0) {
      throw new ApiError(400, "Exam ID and an array of student IDs are required.");
    }

    if (studentIds.length > 30) {
      throw new ApiError(400, "Maximum 30 students allowed per draft request.");
    }

    const exam = await Exam.findById(examId);
    if (!exam) throw new ApiError(404, "Exam not found.");

    const teacher = await getOrEnsureTeacher(req.user);
    if (!teacher) throw new ApiError(404, "Teacher profile not found.");

    // Process students in batches of 5
    const batchSize = 5;
    const resultsSummary = [];

    for (let i = 0; i < studentIds.length; i += batchSize) {
      const batchIds = studentIds.slice(i, i + batchSize);

      const batchPromises = batchIds.map(async (studentId) => {
        const student = await Student.findById(studentId);
        if (!student) return null;

        // Current Result
        const currentResult = await Result.findOne({ studentId, examId });
        if (!currentResult) {
          return {
            studentId,
            studentName: student.name,
            error: "No result found for this exam.",
          };
        }

        // Attendance %
        const totalAtt = await Attendance.countDocuments({ studentId });
        const presentAtt = await Attendance.countDocuments({
          studentId,
          status: { $in: ["present", "late"] },
        });
        const attendancePct = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

        // Homework %
        const totalHw = await Homework.countDocuments({
          classId: student.classId,
          status: "published",
        });
        const submissions = await HomeworkSubmission.countDocuments({ studentId });
        const hwPct = totalHw > 0 ? Math.min(100, Math.round((submissions / totalHw) * 100)) : 100;

        // Previous Exam Trend
        const prevResult = await Result.findOne({
          studentId,
          examId: { $ne: examId },
        })
          .sort({ createdAt: -1 })
          .lean();

        const currentPct = currentResult.percentage || 0;
        const trend = prevResult ? Math.round(currentPct - (prevResult.percentage || 0)) : 0;

        // PII MINIMIZATION: Only first name + numbers sent to Gemini!
        const firstName = student.name.split(" ")[0];

        const prompt = `Student first name: ${firstName}.
Exam Percentage: ${currentPct}%, Grade: ${currentResult.grade}.
Trend vs prior exam: ${trend >= 0 ? "+" : ""}${trend}%.
Attendance Rate: ${attendancePct}%.
Homework Completion Rate: ${hwPct}%.
Tone requested: ${tone} (encouraging | neutral | firm-but-kind).
Instructions: Write exactly a 2-sentence report card remark for the student. Focus on academic growth and dedication. Do NOT mention full names or sensitive personal details. Output ONLY the 2 sentences text.`;

        let draftRemark = "";
        try {
          const geminiRes = await generateContent({
            model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            systemInstruction:
              "You are an expert school educator crafting constructive, motivating report card remarks.",
          });
          const parsed = parseResponse(geminiRes);
          draftRemark = parsed.text?.trim() || "";
        } catch (aiErr) {
          draftRemark = `${firstName} has achieved ${currentPct}% in this evaluation. Continued focus and active participation will support further progress.`;
        }

        // Check if Result.remarks exists
        const hasExistingRemark = Boolean(currentResult.remarks && currentResult.remarks.trim());
        let savedAsDraft = false;

        if (!hasExistingRemark || confirmOverwrite) {
          currentResult.remarks = draftRemark;
          await currentResult.save();
          savedAsDraft = true;
        }

        return {
          studentId: student._id,
          studentName: student.name,
          rollNumber: student.rollNumber,
          currentMarksPercentage: currentPct,
          trend,
          attendancePct,
          hwPct,
          existingRemark: currentResult.remarks,
          draftRemark,
          savedAsDraft,
          requiresConfirmToOverwrite: hasExistingRemark && !confirmOverwrite,
        };
      });

      const batchResults = await Promise.all(batchPromises);
      resultsSummary.push(...batchResults.filter(Boolean));
    }

    // Write audit log for AI assist call
    await auditLog({
      schoolId: req.user.schoolId,
      userId: req.user._id,
      action: "report_remarks_draft",
      module: "ai_assist",
      targetId: examId,
      newValue: {
        studentsCount: studentIds.length,
        tone,
      },
      ip: req.ip,
    });

    return res.status(200).json(
      new ApiResponse(200, resultsSummary, "Report remarks drafted successfully.")
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyClass,
  previewAbsenteeMessage,
  sendAbsenteeMessage,
  draftReportRemarks,
};
