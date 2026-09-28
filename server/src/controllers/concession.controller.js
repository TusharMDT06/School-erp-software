/**
 * concession.controller.js
 * Phase 7A — Fee Concession / Scholarship with approval flow
 */

const FeeConcession = require("../models/FeeConcession.model");
const Student = require("../models/Student.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const auditLog = require("../utils/auditLog");

// Helper: get schoolId from student if not on token
const resolveSchoolId = async (req, studentId) => {
  if (req.user.schoolId) return req.user.schoolId;
  const s = await Student.findById(studentId).populate("classId", "schoolId").lean();
  return s?.classId?.schoolId || null;
};

/**
 * POST /api/concessions
 * Create a concession request (accountant / admin) — status = pending
 */
exports.createConcession = async (req, res, next) => {
  try {
    const { studentId, academicYear, type, valueType, value, applyOn, reason } = req.body;

    if (!studentId || !academicYear || !type || !valueType || value === undefined || !reason) {
      throw new ApiError(400, "studentId, academicYear, type, valueType, value, and reason are required.");
    }

    const schoolId = await resolveSchoolId(req, studentId);
    if (!schoolId) throw new ApiError(400, "Could not resolve school for this student.");

    const concession = await FeeConcession.create({
      schoolId,
      studentId,
      academicYear,
      type,
      valueType,
      value,
      applyOn: applyOn || "total",
      reason,
      requestedBy: req.user.id,
      status: "pending",
    });

    // TODO: notify admins/principal via notifyMany (add when notification engine is wired)

    await auditLog({
      userId: req.user.id,
      action: "concession_requested",
      module: "concession",
      targetId: concession._id,
      newValue: { studentId, type, valueType, value },
      ip: req.ip,
    });

    res.status(201).json(new ApiResponse(201, concession, "Concession request submitted for approval."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/concessions
 * List concessions — filters: status, studentId
 */
exports.getConcessions = async (req, res, next) => {
  try {
    const { status, studentId, page = 1, limit = 20 } = req.query;
    const schoolId = req.user.schoolId;

    const filter = {};
    if (schoolId) filter.schoolId = schoolId;
    if (status) filter.status = status;
    if (studentId) filter.studentId = studentId;

    const [concessions, total] = await Promise.all([
      FeeConcession.find(filter)
        .populate("studentId", "admissionNumber rollNumber userId")
        .populate({ path: "studentId", populate: { path: "userId", select: "name email" } })
        .populate("requestedBy", "name role")
        .populate("decidedBy", "name role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      FeeConcession.countDocuments(filter),
    ]);

    res.status(200).json(
      new ApiResponse(200, { concessions, total, page: Number(page) }, "Concessions retrieved.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/concessions/:id/decide
 * Approve or reject — admin / principal only
 * Body: { status: "approved"|"rejected", decisionRemarks }
 */
exports.decideConcession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, decisionRemarks = "" } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      throw new ApiError(400, "status must be 'approved' or 'rejected'.");
    }

    const concession = await FeeConcession.findById(id);
    if (!concession) throw new ApiError(404, "Concession not found.");
    if (concession.status !== "pending") {
      throw new ApiError(400, `Concession is already ${concession.status}.`);
    }

    concession.status = status;
    concession.decidedBy = req.user.id;
    concession.decidedAt = new Date();
    concession.decisionRemarks = decisionRemarks;

    await concession.save();

    // TODO: notify requester

    await auditLog({
      userId: req.user.id,
      action: `concession_${status}`,
      module: "concession",
      targetId: concession._id,
      oldValue: { status: "pending" },
      newValue: { status, decisionRemarks },
      ip: req.ip,
    });

    res.status(200).json(new ApiResponse(200, concession, `Concession ${status}.`));
  } catch (err) {
    next(err);
  }
};
