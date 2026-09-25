const mongoose = require("mongoose");
const Student = require("../models/Student.model");
const Teacher = require("../models/Teacher.model");
const ClassSection = require("../models/ClassSection.model");
const Attendance = require("../models/Attendance.model");
const FeeTransaction = require("../models/FeeTransaction.model");
const FeeStructure = require("../models/FeeStructure.model");
const Exam = require("../models/Exam.model");
const Result = require("../models/Result.model");
const User = require("../models/User.model");
const { ApiResponse } = require("../utils/apiResponse");

/**
 * GET /api/dashboard/admin
 * Aggregates real-time statistics, metrics, charts data, and recent activity
 */
const getAdminDashboardStats = async (req, res, next) => {
  try {
    const schoolId = req.user?.schoolId;

    let schoolClassIds = [];
    let schoolUserIds = [];
    let feeStructureIds = [];

    if (schoolId) {
      const [classes, users, feeStructures] = await Promise.all([
        ClassSection.find({ schoolId }).select("_id"),
        User.find({ schoolId }).select("_id"),
        FeeStructure.find({ schoolId }).select("_id"),
      ]);
      schoolClassIds = classes.map((c) => c._id);
      schoolUserIds = users.map((u) => u._id);
      feeStructureIds = feeStructures.map((f) => f._id);
    }

    const studentFilter = schoolId ? { classId: { $in: schoolClassIds } } : {};
    const teacherFilter = schoolId ? { userId: { $in: schoolUserIds } } : {};
    const classFilter = schoolId ? { schoolId } : {};
    const examFilter = schoolId ? { schoolId } : {};
    const feeTxFilter = schoolId ? { feeStructureId: { $in: feeStructureIds } } : {};
    const attendanceFilter = schoolId ? { classId: { $in: schoolClassIds } } : {};

    // 1. Basic Counts in parallel
    const [
      totalStudents,
      activeStudents,
      pendingActivationStudents,
      totalTeachers,
      totalClasses,
      totalExams,
    ] = await Promise.all([
      Student.countDocuments(studentFilter),
      Student.countDocuments({ ...studentFilter, status: "active" }),
      Student.countDocuments({ ...studentFilter, isAccountActivated: false }),
      Teacher.countDocuments(teacherFilter),
      ClassSection.countDocuments(classFilter),
      Exam.countDocuments(examFilter),
    ]);

    // 2. Today's Attendance Overview
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayAttendance = await Attendance.find({
      ...attendanceFilter,
      date: { $gte: startOfToday, $lte: endOfToday },
    });

    const presentToday = todayAttendance.filter((a) => a.status === "present" || a.status === "late").length;
    const absentToday = todayAttendance.filter((a) => a.status === "absent").length;
    const leaveToday = todayAttendance.filter((a) => a.status === "leave").length;
    const totalMarkedToday = todayAttendance.length;
    const attendancePercentage =
      totalStudents > 0 && totalMarkedToday > 0
        ? Math.round((presentToday / totalMarkedToday) * 100)
        : totalMarkedToday > 0
        ? Math.round((presentToday / totalMarkedToday) * 100)
        : 0;

    // 3. Fee Collections & Revenue
    const revenueAgg = await FeeTransaction.aggregate([
      { $match: { ...feeTxFilter, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amountPaid" } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    const pendingRevenueAgg = await FeeTransaction.aggregate([
      { $match: { ...feeTxFilter, status: { $in: ["pending", "overdue"] } } },
      { $group: { _id: null, total: { $sum: "$amountDue" } } },
    ]);
    const pendingRevenue = pendingRevenueAgg[0]?.total || 0;

    // Recent Fee Transactions
    const recentTransactions = await FeeTransaction.find(feeTxFilter)
      .populate({
        path: "studentId",
        select: "name admissionNumber",
        populate: { path: "userId", select: "name" },
      })
      .sort({ createdAt: -1 })
      .limit(5);

    // 4. Class Distribution (Students per class)
    const classDistributionPipeline = [
      ...(schoolId ? [{ $match: { classId: { $in: schoolClassIds } } }] : []),
      { $group: { _id: "$classId", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "classsections",
          localField: "_id",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          className: {
            $concat: [
              { $ifNull: ["$classInfo.className", "Class"] },
              "-",
              { $ifNull: ["$classInfo.section", "A"] },
            ],
          },
          students: "$count",
        },
      },
      { $sort: { className: 1 } },
      { $limit: 8 },
    ];
    const classDistributionRaw = await Student.aggregate(classDistributionPipeline);

    // 5. Recent Admissions
    const recentStudents = await Student.find(studentFilter)
      .populate("classId", "className section academicYear")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(5);

    // 6. Upcoming / Recent Exams
    const recentExams = await Exam.find(examFilter)
      .populate("classId", "className section")
      .sort({ createdAt: -1 })
      .limit(4);

    // 7. Weekly Attendance Trend (Last 7 Days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);

      last7Days.push({
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        dateStr: d.toISOString().slice(0, 10),
        start: d,
        end: nextD,
      });
    }

    const attendanceTrend = await Promise.all(
      last7Days.map(async ({ dayName, start, end }) => {
        const records = await Attendance.find({
          ...attendanceFilter,
          date: { $gte: start, $lt: end },
        });
        const present = records.filter((r) => r.status === "present" || r.status === "late").length;
        const absent = records.filter((r) => r.status === "absent").length;
        return {
          day: dayName,
          present,
          absent,
          total: records.length,
        };
      })
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          counts: {
            totalStudents,
            activeStudents,
            pendingActivationStudents,
            totalTeachers,
            totalClasses,
            totalExams,
          },
          todayAttendance: {
            marked: totalMarkedToday,
            present: presentToday,
            absent: absentToday,
            leave: leaveToday,
            percentage: attendancePercentage,
          },
          finance: {
            totalRevenue,
            pendingRevenue,
            recentTransactions,
          },
          classDistribution: classDistributionRaw,
          recentStudents,
          recentExams,
          attendanceTrend,
        },
        "Dashboard statistics fetched successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dashboard/student
 * Aggregates real-time data for the logged-in student (Attendance, Results, Fee status)
 */
const getStudentDashboardStats = async (req, res, next) => {
  try {
    // 1. Find student linked to logged-in user
    let student = await Student.findOne({ userId: req.user.id })
      .populate("classId", "className section academicYear classTeacherId")
      .populate("guardianIds", "name email phone");

    if (!student && req.user?.name) {
      student = await Student.findOne({ name: req.user.name })
        .populate("classId", "className section academicYear classTeacherId")
        .populate("guardianIds", "name email phone");
    }

    if (!student) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            student: null,
            attendance: { totalDays: 0, present: 0, absent: 0, late: 0, leave: 0, percentage: 0 },
            results: [],
            fees: { totalDue: 0, totalPaid: 0, pendingAmount: 0, transactions: [] },
          },
          "No student profile found for user"
        )
      );
    }

    // 2. Attendance Summary
    const attendanceRecords = await Attendance.find({ studentId: student._id }).sort({ date: -1 });
    const totalDays = attendanceRecords.length;
    const present = attendanceRecords.filter((r) => r.status === "present").length;
    const late = attendanceRecords.filter((r) => r.status === "late").length;
    const absent = attendanceRecords.filter((r) => r.status === "absent").length;
    const leave = attendanceRecords.filter((r) => r.status === "leave").length;
    const percentage = totalDays > 0 ? Math.round(((present + late) / totalDays) * 100) : 0;

    // 3. Exam Results
    const results = await Result.find({ studentId: student._id })
      .populate("examId", "examName academicYear resultPublished")
      .sort({ createdAt: -1 });

    // 4. Fee Transactions
    const feeTransactions = await FeeTransaction.find({ studentId: student._id })
      .populate("feeStructureId", "term academicYear totalAmount feeHeads")
      .sort({ createdAt: -1 });

    const totalDue = feeTransactions.reduce((sum, tx) => sum + (tx.amountDue || 0), 0);
    const totalPaid = feeTransactions.reduce((sum, tx) => sum + (tx.amountPaid || 0), 0);
    const pendingAmount = Math.max(0, totalDue - totalPaid);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          student: {
            id: student._id,
            name: student.name,
            admissionNumber: student.admissionNumber,
            rollNumber: student.rollNumber,
            dob: student.dob,
            bloodGroup: student.bloodGroup,
            className: student.classId ? `${student.classId.className}-${student.classId.section}` : "N/A",
            academicYear: student.classId?.academicYear || "2026-2027",
            status: student.status,
          },
          attendance: {
            totalDays,
            present,
            late,
            absent,
            leave,
            percentage,
            recentRecords: attendanceRecords.slice(0, 5),
          },
          results: results.map((r) => ({
            id: r._id,
            examName: r.examId?.examName || "Term Exam",
            academicYear: r.examId?.academicYear || "2026-2027",
            totalMarksObtained: r.totalMarksObtained,
            totalMaxMarks: r.totalMaxMarks,
            percentage: r.percentage,
            grade: r.grade,
            overallStatus: r.overallStatus,
            remarks: r.remarks,
            marksObtained: r.marksObtained,
          })),
          fees: {
            totalDue,
            totalPaid,
            pendingAmount,
            transactions: feeTransactions,
          },
        },
        "Student dashboard statistics fetched successfully"
      )
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdminDashboardStats,
  getStudentDashboardStats,
};
