const mongoose = require("mongoose");
const Attendance = require("../models/Attendance.model");
const Student = require("../models/Student.model");
const Teacher = require("../models/Teacher.model");
const ClassSection = require("../models/ClassSection.model");
const notifyAbsentee = require("../utils/notifyAbsentee");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

/**
 * Normalizes a date string or Date object to UTC midnight (date-only, zero time).
 */
const normalizeDate = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

/**
 * POST /api/attendance/mark
 * Bulk upserts attendance records for a class on a given date.
 * Authorized: teacher (if assigned), admin, superadmin.
 */
const markAttendance = async (req, res, next) => {
  try {
    const { classId, date, records } = req.body;

    if (!classId || !date || !Array.isArray(records) || records.length === 0) {
      throw new ApiError(400, "classId, date, and a non-empty records array are required.");
    }

    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) {
      throw new ApiError(400, "Invalid date format provided.");
    }

    // Date must not be in the future
    const todayNormalized = normalizeDate(new Date());
    if (normalizedDate > todayNormalized) {
      throw new ApiError(400, "Attendance cannot be marked for future dates.");
    }

    // Verify class exists
    const classSection = await ClassSection.findById(classId);
    if (!classSection) {
      throw new ApiError(404, "Class section not found.");
    }

    // Determine markedBy (Teacher ObjectId)
    let markedBy = null;
    if (req.user.role === "teacher") {
      const teacher = await Teacher.findOne({ userId: req.user.id });
      if (!teacher) {
        throw new ApiError(403, "Teacher profile not found for this account.");
      }

      // Verify teacher is authorized for this class
      const isAssigned =
        teacher.assignedClasses?.some((id) => id.toString() === classId.toString()) ||
        classSection.classTeacherId?.toString() === teacher._id.toString();

      if (!isAssigned) {
        throw new ApiError(403, "You are not assigned to mark attendance for this class.");
      }
      markedBy = teacher._id;
    } else {
      // Admin / SuperAdmin marking attendance
      if (classSection.classTeacherId) {
        markedBy = classSection.classTeacherId;
      } else {
        const anyTeacher = await Teacher.findOne({ schoolId: classSection.schoolId });
        markedBy = anyTeacher ? anyTeacher._id : new mongoose.Types.ObjectId();
      }
    }

    const validStatuses = ["present", "absent", "late", "leave"];
    const bulkOps = [];
    const absenteeStudentIds = [];

    for (const item of records) {
      if (!item.studentId || !validStatuses.includes(item.status)) {
        throw new ApiError(
          400,
          `Invalid student record: status must be one of [${validStatuses.join(", ")}]`
        );
      }

      bulkOps.push({
        updateOne: {
          filter: {
            studentId: new mongoose.Types.ObjectId(item.studentId),
            date: normalizedDate,
          },
          update: {
            $set: {
              studentId: new mongoose.Types.ObjectId(item.studentId),
              classId: new mongoose.Types.ObjectId(classId),
              date: normalizedDate,
              status: item.status,
              remarks: item.remarks || null,
              markedBy,
            },
          },
          upsert: true,
        },
      });

      if (item.status === "absent") {
        absenteeStudentIds.push(item.studentId);
      }
    }

    // Execute bulk upsert
    await Attendance.bulkWrite(bulkOps);

    // Asynchronously trigger absentee notifications without blocking the HTTP response
    if (absenteeStudentIds.length > 0) {
      setImmediate(() => {
        absenteeStudentIds.forEach((studentId) => {
          notifyAbsentee(studentId, normalizedDate).catch((err) => {
            console.error(`Error notifying absentee ${studentId}:`, err.message);
          });
        });
      });
    }

    res.status(200).json(
      new ApiResponse(
        200,
        {
          markedCount: records.length,
          absentCount: absenteeStudentIds.length,
          date: normalizedDate,
        },
        "Attendance saved successfully."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/class/:classId/date/:date
 * Returns existing attendance records for pre-filling the mark attendance screen.
 */
const getClassAttendanceByDate = async (req, res, next) => {
  try {
    const { classId, date } = req.params;

    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) {
      throw new ApiError(400, "Invalid date format provided.");
    }

    const records = await Attendance.find({
      classId,
      date: normalizedDate,
    })
      .populate({
        path: "studentId",
        select: "rollNumber admissionNumber gender status userId",
        populate: {
          path: "userId",
          select: "name email",
        },
      })
      .populate({
        path: "markedBy",
        populate: {
          path: "userId",
          select: "name",
        },
      });

    res.status(200).json(new ApiResponse(200, records, "Class daily attendance retrieved."));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/student/:studentId/report
 * Returns student attendance statistics & records for a date range.
 */
const getStudentAttendanceReport = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    let { fromDate, toDate } = req.query;

    const student = await Student.findById(studentId)
      .populate("userId", "name email profileImage")
      .populate("classId", "className section academicYear");

    if (!student) {
      throw new ApiError(404, "Student not found.");
    }

    // Role safety check: student can only access own report; parent only own children
    if (req.user.role === "student" && student.userId?._id.toString() !== req.user.id) {
      throw new ApiError(403, "You are only allowed to view your own attendance report.");
    }
    if (req.user.role === "parent") {
      const isChild = student.guardianIds?.some((gid) => gid.toString() === req.user.id);
      if (!isChild) {
        throw new ApiError(403, "You can only view attendance for your own children.");
      }
    }

    const dateFilter = {};
    if (fromDate) {
      dateFilter.$gte = normalizeDate(fromDate);
    }
    if (toDate) {
      dateFilter.$lte = new Date(new Date(toDate).setUTCHours(23, 59, 59, 999));
    }

    const query = { studentId };
    if (Object.keys(dateFilter).length > 0) {
      query.date = dateFilter;
    }

    const dailyRecords = await Attendance.find(query).sort({ date: 1 });

    const totalDays = dailyRecords.length;
    const present = dailyRecords.filter((r) => r.status === "present").length;
    const absent = dailyRecords.filter((r) => r.status === "absent").length;
    const late = dailyRecords.filter((r) => r.status === "late").length;
    const leave = dailyRecords.filter((r) => r.status === "leave").length;

    const percentage = totalDays > 0 ? Math.round(((present + late) / totalDays) * 100) : 0;

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
              : null,
          },
          dateRange: { from: dateFilter.$gte || null, to: dateFilter.$lte || null },
          totalDays,
          present,
          absent,
          late,
          leave,
          percentage,
          dailyRecords,
        },
        "Student attendance report retrieved."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/attendance/class/:classId/summary
 * MongoDB aggregation pipeline returning per-student attendance stats for a given month & year.
 */
const getClassAttendanceSummary = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const now = new Date();
    const month = parseInt(req.query.month, 10) || now.getUTCMonth() + 1; // 1-12
    const year = parseInt(req.query.year, 10) || now.getUTCFullYear();

    const classSection = await ClassSection.findById(classId);
    if (!classSection) {
      throw new ApiError(404, "Class section not found.");
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // MongoDB Aggregation Pipeline
    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          classId: new mongoose.Types.ObjectId(classId),
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$studentId",
          totalDays: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
          leave: { $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] } },
        },
      },
    ]);

    const statsMap = new Map();
    attendanceStats.forEach((stat) => {
      statsMap.set(stat._id.toString(), stat);
    });

    // Fetch all active students in the class so complete roster is returned even if 0 days marked
    const students = await Student.find({ classId, status: "active" })
      .populate("userId", "name email")
      .sort({ rollNumber: 1 });

    const summary = students.map((student) => {
      const stat = statsMap.get(student._id.toString()) || {
        totalDays: 0,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
      };

      const percentage =
        stat.totalDays > 0 ? Math.round(((stat.present + stat.late) / stat.totalDays) * 100) : 0;

      return {
        studentId: student._id,
        name: student.userId?.name || "Unknown",
        email: student.userId?.email || "",
        rollNumber: student.rollNumber || "-",
        admissionNumber: student.admissionNumber,
        totalDays: stat.totalDays,
        present: stat.present,
        absent: stat.absent,
        late: stat.late,
        leave: stat.leave,
        percentage,
      };
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          class: {
            id: classSection._id,
            className: classSection.className,
            section: classSection.section,
            academicYear: classSection.academicYear,
          },
          month,
          year,
          students: summary,
        },
        "Class attendance summary retrieved."
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markAttendance,
  getClassAttendanceByDate,
  getStudentAttendanceReport,
  getClassAttendanceSummary,
};
