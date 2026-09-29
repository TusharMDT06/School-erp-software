const approvalsService = require("../services/approvals.service");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

/**
 * GET /api/approvals
 * Lists normalized pending or decided approval items across all modules
 */
exports.getApprovals = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { type = "all", status = "pending", page = 1, limit = 25 } = req.query;

    const data = await approvalsService.getApprovalsList(schoolId, {
      type,
      status,
      page: Number(page),
      limit: Number(limit),
    });

    res.status(200).json(new ApiResponse(200, data, "Approvals retrieved."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/approvals/counts
 * Sidebar badge counts cached for 30s in Redis
 */
exports.getApprovalCounts = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const counts = await approvalsService.getApprovalCounts(schoolId);
    res.status(200).json(new ApiResponse(200, counts, "Approval counts retrieved."));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/approvals/decide
 * Individual item approval or rejection
 */
exports.decideApproval = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { type, id, decision, remarks = "" } = req.body;

    if (!type || !id || !decision) {
      throw new ApiError(400, "type, id, and decision ('approved' | 'rejected') are required.");
    }

    const result = await approvalsService.decideItem({
      schoolId,
      approverUser: req.user,
      type,
      id,
      decision,
      remarks,
      ip: req.ip,
    });

    res.status(200).json(new ApiResponse(200, result, result.message));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/approvals/bulk-decide
 * Bulk approvals. Allowed ONLY for teacher_leave, concession, expense. Max 25 items.
 */
exports.bulkDecideApprovals = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { items = [], decision, remarks = "" } = req.body;

    const results = await approvalsService.bulkDecideItems({
      schoolId,
      approverUser: req.user,
      items,
      decision,
      remarks,
      ip: req.ip,
    });

    res.status(200).json(new ApiResponse(200, results, "Bulk decision executed."));
  } catch (err) {
    next(err);
  }
};
