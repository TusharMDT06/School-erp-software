const cron = require("node-cron");
const mongoose = require("mongoose");
const Student = require("../models/Student.model");
const StudentRisk = require("../models/StudentRisk.model");
const ClassSection = require("../models/ClassSection.model");
const Attendance = require("../models/Attendance.model");
const Result = require("../models/Result.model");
const Exam = require("../models/Exam.model");
const FeeStructure = require("../models/FeeStructure.model");
const FeeTransaction = require("../models/FeeTransaction.model");
const LeaveRequest = require("../models/LeaveRequest.model");
const Incident = require("../models/Incident.model");
const Teacher = require("../models/Teacher.model");
const { calculateRiskScore } = require("../utils/riskScore");
const { notify } = require("../services/notification.service");

/**
 * Computes welfare risk for a single student.
 */
async function computeStudentRiskMetrics(student) {
  const studentId = student._id;
  const classId = student.classId;

  // 1. Attendance over last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysStr = thirtyDaysAgo.toISOString().split("T")[0];

  const attendanceRecords = await Attendance.find({
    classId,
    date: { $gte: thirtyDaysStr },
    "records.studentId": studentId,
  })
    .select("records date")
    .lean();

  let attendancePct = 100;
  if (attendanceRecords.length > 0) {
    let presentCount = 0;
    attendanceRecords.forEach((att) => {
      const rec = (att.records || []).find(
        (r) => r.studentId?.toString() === studentId.toString()
      );
      if (rec && (rec.status === "present" || rec.status === "late")) {
        presentCount += 1;
      }
    });
    attendancePct = Math.round((presentCount / attendanceRecords.length) * 100);
  }

  // 2. Marks trend across latest 2 published exams
  const exams = await Exam.find({
    classId,
    resultPublished: true,
  })
    .sort({ createdAt: -1 })
    .limit(2)
    .select("_id createdAt")
    .lean();

  let marksTrend = { currentPct: null, previousPct: null, dropPct: null };
  if (exams.length > 0) {
    const latestExamId = exams[0]._id;
    const latestResult = await Result.findOne({
      studentId,
      examId: latestExamId,
    })
      .select("percentage")
      .lean();

    if (latestResult) {
      marksTrend.currentPct = latestResult.percentage;
    }

    if (exams.length > 1) {
      const prevExamId = exams[1]._id;
      const prevResult = await Result.findOne({
        studentId,
        examId: prevExamId,
      })
        .select("percentage")
        .lean();

      if (prevResult) {
        marksTrend.previousPct = prevResult.percentage;
        marksTrend.dropPct = Math.max(
          0,
          Math.round((prevResult.percentage - (latestResult?.percentage || 0)) * 10) / 10
        );
      }
    }
  }

  // 3. Fee overdue days
  let feeOverdueDays = 0;
  try {
    const feeStructures = await FeeStructure.find({
      classId,
      status: "active",
    })
      .select("dueDate feeHeads")
      .lean();

    if (feeStructures.length > 0) {
      const now = new Date();
      for (const fs of feeStructures) {
        if (fs.dueDate && fs.dueDate < now) {
          const days = Math.floor((now - new Date(fs.dueDate)) / (1000 * 60 * 60 * 24));
          if (days > feeOverdueDays) feeOverdueDays = days;
        }
      }
    }
  } catch (err) {
    feeOverdueDays = 0;
  }

  // 4. Leave frequency
  const leaveCount = await LeaveRequest.countDocuments({
    applicantId: student.userId || student._id,
    status: "approved",
    createdAt: { $gte: thirtyDaysAgo },
  });

  // 5. Open disciplinary incidents
  const incidentCount = await Incident.countDocuments({
    studentIds: studentId,
    status: { $ne: "closed" },
  });

  // Calculate pure risk score
  const { score, band, reasons } = calculateRiskScore({
    attendancePct,
    marksTrend,
    feeOverdueDays,
    leaveFrequency: leaveCount,
    openIncidents: incidentCount,
  });

  return { score, band, reasons };
}

/**
 * Executes welfare risk assessment for students in batches of 100.
 */
async function runWelfareAssessmentBatch(schoolId = null) {
  try {
    console.log("[WelfareCron] Starting nightly early-warning assessment...");
    const filter = { status: "active" };
    if (schoolId) filter.schoolId = schoolId;

    const totalStudents = await Student.countDocuments(filter);
    const BATCH_SIZE = 100;
    let processed = 0;
    let highRiskCount = 0;

    for (let skip = 0; skip < totalStudents; skip += BATCH_SIZE) {
      const students = await Student.find(filter)
        .populate("classId")
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

      for (const student of students) {
        try {
          const { score, band, reasons } = await computeStudentRiskMetrics(student);

          const existingRisk = await StudentRisk.findOne({
            studentId: student._id,
          });

          const previousBand = existingRisk ? existingRisk.band : null;

          // Upsert student risk
          await StudentRisk.findOneAndUpdate(
            { studentId: student._id },
            {
              schoolId: student.schoolId || student.classId?.schoolId,
              classId: student.classId?._id || student.classId,
              score,
              band,
              previousBand,
              reasons,
              computedAt: new Date(),
            },
            { upsert: true, new: true }
          );

          if (band === "high") highRiskCount++;

          // When a student moves UP into "high", notify the class teacher WITHOUT fee reasons
          if (band === "high" && previousBand !== "high") {
            const classDoc = await ClassSection.findById(student.classId?._id || student.classId)
              .populate({
                path: "classTeacherId",
                populate: { path: "userId", select: "_id name email" },
              })
              .lean();

            const teacherUser = classDoc?.classTeacherId?.userId;
            if (teacherUser?._id) {
              // Strip fee reasons for teacher communication
              const teacherReasons = reasons
                .filter((r) => r.visibility !== "finance")
                .map((r) => r.detail);

              const summaryText =
                teacherReasons.length > 0
                  ? teacherReasons.join(". ")
                  : "Attendance or academic decline detected.";

              await notify(teacherUser._id, {
                type: "student_at_risk",
                title: `⚠️ Welfare Alert: ${student.name} flagged at High Risk`,
                message: `Student ${student.name} has moved into High Risk status (${score}/100). Flagged areas: ${summaryText}`,
                data: {
                  studentId: student._id,
                  studentName: student.name,
                  className: classDoc ? `${classDoc.className}-${classDoc.section}` : "Class",
                  score,
                },
                sendEmailFlag: true,
                schoolId: student.schoolId || student.classId?.schoolId,
              }).catch((err) =>
                console.warn("[WelfareCron] Failed to notify class teacher:", err.message)
              );
            }
          }

          processed++;
        } catch (studentErr) {
          console.warn(`[WelfareCron] Failed to process student ${student._id}:`, studentErr.message);
        }
      }
    }

    console.log(
      `[WelfareCron] Completed: ${processed}/${totalStudents} students evaluated. High risk count: ${highRiskCount}`
    );
    return { total: totalStudents, processed, highRiskCount };
  } catch (error) {
    console.error("[WelfareCron] Error in assessment batch:", error);
    throw error;
  }
}

// Schedule nightly at 02:00 AM
const startWelfareCron = () => {
  cron.schedule("0 2 * * *", async () => {
    try {
      await runWelfareAssessmentBatch();
    } catch (err) {
      console.error("[WelfareCron] Nightly run failed:", err.message);
    }
  });
  console.log("[WelfareCron] Nightly risk assessment job scheduled for 02:00 AM.");
};

module.exports = {
  startWelfareCron,
  runWelfareAssessmentBatch,
  computeStudentRiskMetrics,
};
