const mongoose = require("mongoose");
const AttendanceCorrectionRequest = require("../models/AttendanceCorrectionRequest.model");
const Attendance = require("../models/Attendance.model");
const Teacher = require("../models/Teacher.model");
const ClassSection = require("../models/ClassSection.model");
const Student = require("../models/Student.model");
const auditLog = require("../utils/auditLog");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const { assertTeacherOwnsClassSubject } = require("../utils/teacherAccess");
const { notify } = require("../services/notification.service");
const { invalidateTeacherDashboardCache } = require("../utils/dashboardCache");

/**
 * Normalizes date to midnight UTC
 */
const normalizeDate = (dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

/**
 * POST /api/attendance/corrections
 * Teacher submits a request to correct attendance for past dates (up to 3 days back).
 */
const createCorrectionRequest = async (req, res, next) => {
  try {
    const { classId, date, changes, reason } = req.body;

    if (!classId || !date || !reason || !Array.isArray(changes) || changes.length === 0) {
      throw new ApiError(400, "classId, date, reason, and a non-empty changes array are required.");
    }

    const normalizedDate = normalizeDate(date);
    if (!normalizedDate) {
      throw new ApiError(400, "Invalid date format.");
    }

    const todayNormalized = normalizeDate(new Date());
    if (normalizedDate > todayNormalized) {
      throw new ApiError(400, "Cannot request corrections for future dates.");
    }

    // Verify window: up to 3 days back
    const diffMs = todayNormalized.getTime() - normalizedDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 3) {
      throw new ApiError(
        400,
        "Attendance records older than 3 days are locked. Please contact the school administrator directly for institutional adjustments."
      );
    }

    // Validate teacher ownership of this class
    const { teacher, classSection } = await assertTeacherOwnsClassSubject(req.user, classId, null, {
      date: normalizedDate,
    });

    // Populate student names if not present
    const studentIds = changes.map((c) => c.studentId);
    const students = await Student.find({ _id: { $in: studentIds } }).select("name");
    const studentMap = new Map(students.map((s) => [s._id.toString(), s.name]));

    const formattedChanges = changes.map((c) => ({
      studentId: c.studentId,
      studentName: studentMap.get(c.studentId.toString()) || c.studentName || "Student",
      from: c.from || "absent",
      to: c.to,
    }));

    const correction = await AttendanceCorrectionRequest.create({
      schoolId: classSection.schoolId,
      classId,
      date: normalizedDate,
      changes: formattedChanges,
      reason: reason.trim(),
      status: "pending",
      requestedBy: req.user.id || req.user._id,
    });

    // Audit log request creation
    await auditLog({
      schoolId: classSection.schoolId,
      userId: req.user.id || req.user._id,
      action: "ATTENDANCE_CORRECTION_REQUESTED",
      module: "attendance",
      targetId: correction._id,
      details: {
        classId,
        date: normalizedDate,
        diffDays,
        changesCount: formattedChanges.length,
        reason,
      },
    });

    res.status(201).json(new ApiResponse(201, correction, "Attendance correction request submitted successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/attendance/corrections/:id/decide
 * Principal / Admin decides on the correction request.
 * On approval: applies changes atomically and logs auditLog with old/new values.
 */
const decideCorrectionRequest = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { status, remarks = "" } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      throw new ApiError(400, "Status must be either 'approved' or 'rejected'.");
    }

    const correction = await AttendanceCorrectionRequest.findById(id).session(session);
    if (!correction) {
      throw new ApiError(404, "Attendance correction request not found.");
    }

    if (correction.status !== "pending") {
      throw new ApiError(400, `This correction request has already been ${correction.status}.`);
    }

    // Verify school authority
    if (
      req.user.role !== "superadmin" &&
      req.user.schoolId &&
      req.user.schoolId.toString() !== correction.schoolId.toString()
    ) {
      throw new ApiError(403, "Unauthorized to act on requests from another school.");
    }

    correction.status = status;
    correction.decidedBy = req.user.id || req.user._id;
    correction.decidedAt = new Date();
    correction.remarks = remarks.trim();

    const auditOldValues = [];
    const auditNewValues = [];

    if (status === "approved") {
      const bulkOps = [];
      const teacher = await Teacher.findOne({ userId: correction.requestedBy }).session(session);
      const markedBy = teacher ? teacher._id : new mongoose.Types.ObjectId();

      for (const change of correction.changes) {
        // Find existing attendance to verify previous state
        const existingRecord = await Attendance.findOne({
          studentId: change.studentId,
          date: correction.date,
        }).session(session);

        const oldStatus = existingRecord ? existingRecord.status : "not_marked";
        auditOldValues.push({
          studentId: change.studentId,
          studentName: change.studentName,
          status: oldStatus,
        });

        auditNewValues.push({
          studentId: change.studentId,
          studentName: change.studentName,
          status: change.to,
        });

        bulkOps.push({
          updateOne: {
            filter: {
              studentId: change.studentId,
              date: correction.date,
            },
            update: {
              $set: {
                studentId: change.studentId,
                classId: correction.classId,
                date: correction.date,
                status: change.to,
                remarks: `Corrected via request #${correction._id.toString().slice(-6)}: ${correction.reason}`,
                markedBy,
              },
            },
            upsert: true,
          },
        });
      }

      if (bulkOps.length > 0) {
        await Attendance.bulkWrite(bulkOps, { session });
      }

      // Invalidate teacher dashboard cache
      if (teacher) {
        await invalidateTeacherDashboardCache(teacher._id);
      }
    }

    await correction.save({ session });
    await session.commitTransaction();
    session.endSession();

    // Audit log outside transaction
    await auditLog({
      schoolId: correction.schoolId,
      userId: req.user.id || req.user._id,
      action: status === "approved" ? "ATTENDANCE_CORRECTION_APPROVED" : "ATTENDANCE_CORRECTION_REJECTED",
      module: "attendance",
      targetId: correction._id,
      details: {
        correctionId: correction._id,
        date: correction.date,
        classId: correction.classId,
        remarks,
        oldValues: auditOldValues,
        newValues: auditNewValues,
      },
    });

    // Notify requesting teacher
    notify(correction.requestedBy, {
      type: "attendance_correction",
      title: `Attendance Correction ${status === "approved" ? "Approved" : "Rejected"}`,
      message: `Your attendance correction request for ${new Date(correction.date).toLocaleDateString("en-IN")} has been ${status}.${remarks ? ` Remarks: ${remarks}` : ""}`,
      data: {
        correctionId: correction._id,
        status,
        remarks,
        date: correction.date,
      },
      schoolId: correction.schoolId,
      sendEmailFlag: true,
    }).catch((err) => console.warn("[attendanceCorrection] Notification failed:", err.message));

    res.status(200).json(new ApiResponse(200, correction, `Attendance correction request ${status} successfully.`));
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

/**
 * GET /api/attendance/corrections
 * Lists correction requests. Teachers see their own requests; admin/principal see class/school requests.
 */
const getCorrectionRequests = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === "teacher") {
      filter.requestedBy = req.user.id || req.user._id;
    } else if (req.user.schoolId) {
      filter.schoolId = req.user.schoolId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.classId) {
      filter.classId = req.query.classId;
    }

    const requests = await AttendanceCorrectionRequest.find(filter)
      .populate("classId", "className section")
      .populate("requestedBy", "name email")
      .populate("decidedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json(new ApiResponse(200, requests, "Correction requests retrieved."));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCorrectionRequest,
  decideCorrectionRequest,
  getCorrectionRequests,
};
