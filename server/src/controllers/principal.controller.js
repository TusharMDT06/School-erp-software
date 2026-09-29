const mongoose = require("mongoose");
const Student = require("../models/Student.model");
const ClassSection = require("../models/ClassSection.model");
const Teacher = require("../models/Teacher.model");
const Attendance = require("../models/Attendance.model");
const LeaveRequest = require("../models/LeaveRequest.model");
const FeeStructure = require("../models/FeeStructure.model");
const FeeTransaction = require("../models/FeeTransaction.model");
const LedgerEntry = require("../models/LedgerEntry.model");
const AcademicEvent = require("../models/AcademicEvent.model");
const Circular = require("../models/Circular.model");
const Exam = require("../models/Exam.model");
const Result = require("../models/Result.model");
const StudentRisk = require("../models/StudentRisk.model");
const Incident = require("../models/Incident.model");
const approvalsService = require("../services/approvals.service");
const { safeGet, safeSet } = require("../config/redis");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

const DASHBOARD_CACHE_TTL = 60; // 60s cache

/**
 * GET /api/principal/dashboard
 * Aggregates complete institutional metrics for Principal / Admin
 */
exports.getPrincipalDashboard = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const cacheKey = `principal:dashboard:${schoolId}`;

    const cached = await safeGet(cacheKey);
    if (cached) {
      try {
        return res.status(200).json(new ApiResponse(200, JSON.parse(cached), "Dashboard metrics (cached)."));
      } catch {}
    }

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // ── 1. Fetch Class Sections & Students for Enrollment Metrics ──────────
    const [classes, totalStudents] = await Promise.all([
      ClassSection.find({ schoolId }).select("_id className section capacity").lean(),
      Student.countDocuments({ schoolId }),
    ]);

    const classIds = classes.map((c) => c._id);

    // Students count per class
    const studentCountByClass = await Student.aggregate([
      { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), classId: { $in: classIds } } },
      { $group: { _id: "$classId", count: { $sum: 1 } } },
    ]);

    const countMap = new Map();
    studentCountByClass.forEach((item) => countMap.set(item._id.toString(), item.count));

    const byClass = classes.map((c) => {
      const count = countMap.get(c._id.toString()) || 0;
      const capacity = c.capacity || 0;
      const fillPercent = capacity > 0 ? Math.round((count / capacity) * 100) : null;
      return {
        classId: c._id,
        className: c.className,
        section: c.section,
        count,
        capacity,
        fillPercent,
      };
    });

    // ── 2. Run Parallel Aggregations ────────────────────────────────────────
    const [
      todayAttendanceAgg,
      teachersOnLeaveCount,
      approvalCounts,
      oldestLeave,
      feeStructures,
      monthLedgerAgg,
      latestExam,
      upcomingEvents,
      circularsPendingAck,
      attendanceTrendAgg,
      realAtRiskCount,
      realOpenIncidents,
    ] = await Promise.all([
      // Today student attendance
      Attendance.aggregate([
        {
          $match: {
            classId: { $in: classIds },
            date: { $gte: todayStart, $lte: todayEnd },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            present: { $sum: { $cond: [{ $in: ["$status", ["present", "late"]] }, 1, 0] } },
          },
        },
      ]),

      // Teachers on leave today
      LeaveRequest.countDocuments({
        schoolId,
        requesterRole: "teacher",
        status: "approved",
        fromDate: { $lte: now },
        toDate: { $gte: now },
      }),

      // Approvals counts
      approvalsService.getApprovalCounts(schoolId),

      // Oldest pending approval (to compute oldestAgeDays)
      LeaveRequest.findOne({ schoolId, requesterRole: "teacher", status: "pending" })
        .sort({ createdAt: 1 })
        .select("createdAt")
        .lean(),

      // Fee structure IDs for transaction metrics
      FeeStructure.find({ schoolId }).select("_id").lean(),

      // Month fee collections from ledger
      LedgerEntry.aggregate([
        {
          $match: {
            schoolId: new mongoose.Types.ObjectId(schoolId),
            direction: "in",
            category: "fee_collection",
            date: { $gte: monthStart },
          },
        },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      // Latest Exam
      Exam.findOne({ schoolId })
        .sort({ startDate: -1 })
        .select("name examType academicYear")
        .lean(),

      // Upcoming Events (next 7 days)
      AcademicEvent.find({
        schoolId,
        status: "published",
        startDate: { $lte: in7Days },
        endDate: { $gte: now },
      })
        .select("title type startDate endDate audience")
        .sort({ startDate: 1 })
        .limit(6)
        .lean(),

      // Circulars requiring acknowledgement with active deadlines
      Circular.countDocuments({
        schoolId,
        status: "published",
        requiresAcknowledgement: true,
        $or: [{ ackDeadline: null }, { ackDeadline: { $gte: now } }],
      }),

      // 30-day student attendance trend
      Attendance.aggregate([
        {
          $match: {
            classId: { $in: classIds },
            date: { $gte: thirtyDaysAgo, $lte: now },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            total: { $sum: 1 },
            present: { $sum: { $cond: [{ $in: ["$status", ["present", "late"]] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Real at-risk student count (band: "high")
      StudentRisk.countDocuments({ schoolId, band: "high" }),

      // Real open incidents count (status not closed)
      Incident.countDocuments({ schoolId, status: { $ne: "closed" } }),
    ]);

    // ── 3. Calculate Attendance Today % ─────────────────────────────────────
    const todayTotal = todayAttendanceAgg[0]?.total || 0;
    const todayPresent = todayAttendanceAgg[0]?.present || 0;
    const studentAttendanceToday = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : 0;

    // ── 4. Calculate Oldest Approval Age ─────────────────────────────────────
    let oldestAgeDays = 0;
    if (oldestLeave?.createdAt) {
      oldestAgeDays = Math.max(0, Math.floor((now.getTime() - new Date(oldestLeave.createdAt).getTime()) / 86400000));
    }

    // ── 5. Outstanding & Efficiency Metrics ──────────────────────────────────
    const feeStructureIds = feeStructures.map((f) => f._id);
    let totalOutstanding = 0;
    let collectionEfficiency = 0;

    if (feeStructureIds.length > 0) {
      const [outstandingAgg, termAgg] = await Promise.all([
        FeeTransaction.aggregate([
          {
            $match: {
              feeStructureId: { $in: feeStructureIds },
              status: { $in: ["pending", "partial", "overdue"] },
              isReversed: { $ne: true },
            },
          },
          { $group: { _id: null, total: { $sum: { $subtract: ["$amountDue", "$amountPaid"] } } } },
        ]),
        FeeTransaction.aggregate([
          {
            $match: {
              feeStructureId: { $in: feeStructureIds },
              isReversed: { $ne: true },
            },
          },
          {
            $group: {
              _id: null,
              billed: { $sum: "$amountDue" },
              paid: { $sum: "$amountPaid" },
            },
          },
        ]),
      ]);

      totalOutstanding = outstandingAgg[0]?.total || 0;
      const billed = termAgg[0]?.billed || 0;
      const paid = termAgg[0]?.paid || 0;
      collectionEfficiency = billed > 0 ? Math.round((paid / billed) * 100) : 0;
    }

    // ── 6. Latest Exam Stats ────────────────────────────────────────────────
    let latestExamStats = null;
    if (latestExam) {
      const resultAgg = await Result.aggregate([
        { $match: { examId: latestExam._id } },
        {
          $group: {
            _id: null,
            totalStudents: { $sum: 1 },
            avgPercent: { $avg: "$percentage" },
            passCount: { $sum: { $cond: [{ $eq: ["$status", "passed"] }, 1, 0] } },
          },
        },
      ]);

      const resItem = resultAgg[0];
      const avgPercent = resItem?.avgPercent ? Math.round(resItem.avgPercent) : 0;
      const passPercent =
        resItem?.totalStudents > 0 ? Math.round((resItem.passCount / resItem.totalStudents) * 100) : 0;

      latestExamStats = {
        id: latestExam._id,
        name: latestExam.name,
        avgPercent,
        passPercent,
      };
    }

    // ── 7. Daily 30d Trend Formatting ───────────────────────────────────────
    const attendanceTrend30d = attendanceTrendAgg.map((item) => ({
      date: item._id,
      percent: item.total > 0 ? Math.round((item.present / item.total) * 100) : 0,
      total: item.total,
      present: item.present,
    }));

    // ── 8. Assemble Full Dashboard Response ─────────────────────────────────
    const dashboardData = {
      enrollment: {
        total: totalStudents,
        byClass,
      },
      studentAttendanceToday,
      teachersOnLeaveToday: teachersOnLeaveCount,
      approvals: {
        countsByType: approvalCounts,
        oldestAgeDays,
      },
      finance: {
        monthCollection: monthLedgerAgg[0]?.total || 0,
        outstanding: totalOutstanding,
        collectionEfficiency,
      },
      latestExam: latestExamStats,
      upcomingEvents,
      circularsPendingAck,
      attendanceTrend30d,
      atRiskCount: realAtRiskCount || 0,
      openIncidents: realOpenIncidents || 0,
    };

    await safeSet(cacheKey, JSON.stringify(dashboardData), DASHBOARD_CACHE_TTL);

    res.status(200).json(new ApiResponse(200, dashboardData, "Principal dashboard metrics retrieved."));
  } catch (err) {
    next(err);
  }
};
