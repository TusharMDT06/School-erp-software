const AuditLog = require("../models/AuditLog.model");
const User = require("../models/User.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

/**
 * GET /api/audit-logs
 * (Admin, Superadmin, Principal)
 * Filters: userId, module, action, from, to, page, limit
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const {
      userId,
      module: mod,
      action,
      from,
      to,
      page = 1,
      limit = 20,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    // Multi-tenant scoping: logs from this school or users in this school
    if (schoolId) {
      const schoolUsers = await User.find({ schoolId }).select("_id").lean();
      const userIds = schoolUsers.map((u) => u._id);
      filter.$or = [{ schoolId }, { userId: { $in: userIds } }];
    }

    if (userId) {
      filter.userId = userId;
    }

    if (mod) {
      filter.module = mod;
    }

    if (action) {
      filter.action = action;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("userId", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          logs,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum) || 1,
          },
        },
        "Audit logs retrieved successfully"
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/audit-logs/mine
 * (Accountant / Authenticated Staff)
 * Returns the caller's own recent activity log.
 */
const getMyAuditLogs = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { page = 1, limit = 20, module: mod, from, to } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = { userId };

    if (mod) {
      filter.module = mod;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("userId", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          logs,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum) || 1,
          },
        },
        "My activity logs retrieved successfully"
      )
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAuditLogs,
  getMyAuditLogs,
};
