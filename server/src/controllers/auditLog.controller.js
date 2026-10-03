const AuditLog = require("../models/AuditLog.model");
const User = require("../models/User.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

/**
 * GET /api/audit-logs
 * (Admin, Superadmin, Principal)
 * Filters: search, action, status, role, from, to, page, limit
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const isSuperAdmin = req.user.role === "superadmin";
    const {
      userId,
      module: mod,
      action,
      status,
      role,
      search,
      from,
      to,
      page = 1,
      limit = 25,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    // Multi-tenant scoping:
    if (!isSuperAdmin && schoolId) {
      const schoolUsers = await User.find({ schoolId }).select("_id").lean();
      const userIds = schoolUsers.map((u) => u._id);
      filter.$or = [
        { schoolId },
        { userId: { $in: userIds } },
        { schoolId: null, userRole: { $in: ["admin", "teacher", "student", "parent", "principal", "accountant"] } },
      ];
    } else if (req.query.schoolId) {
      filter.schoolId = req.query.schoolId;
    }

    if (userId) {
      filter.userId = userId;
    }

    if (mod) {
      filter.module = mod;
    }

    if (action && action !== "ALL" && action !== "All Actions") {
      filter.action = action.trim();
    }

    if (status && status !== "ALL" && status !== "All Status") {
      filter.status = status.toUpperCase().trim();
    }

    if (role && role !== "ALL" && role !== "All Roles") {
      filter.userRole = role.toLowerCase().trim();
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

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");

      // Match users by name or email
      const matchedUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      })
        .select("_id")
        .limit(50)
        .lean();

      const matchedUserIds = matchedUsers.map((u) => u._id);

      const searchConditions = [
        { userName: searchRegex },
        { userRole: searchRegex },
        { ip: searchRegex },
        { device: searchRegex },
        { details: searchRegex },
        { action: searchRegex },
      ];

      if (matchedUserIds.length > 0) {
        searchConditions.push({ userId: { $in: matchedUserIds } });
      }

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("userId", "name email role profileImage")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    // Fast counters for header/stats
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [todayCount, failedCount, successCount] = await Promise.all([
      AuditLog.countDocuments({ ...filter, createdAt: { $gte: startOfToday } }),
      AuditLog.countDocuments({ ...filter, status: "FAILED" }),
      AuditLog.countDocuments({ ...filter, status: "SUCCESS" }),
    ]);

    const sanitizedLogs = logs.map((log) => ({
      ...log,
      userName:
        log.userName ||
        log.userId?.name ||
        (log.userId?.email ? log.userId.email.split("@")[0] : null) ||
        "system",
      userRole: (
        log.userRole && log.userRole !== "unknown"
          ? log.userRole
          : log.userId?.role || "UNKNOWN"
      ).toUpperCase(),
      status: (log.status || "SUCCESS").toUpperCase(),
      ip: log.ip || "127.0.0.1",
      device:
        log.device ||
        (log.os ? `${log.os} ${log.browser || ""}`.trim() : "Windows"),
      details:
        log.details ||
        (log.status === "FAILED"
          ? "Authentication failed"
          : "User authenticated successfully"),
    }));

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          logs: sanitizedLogs,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil(total / limitNum) || 1,
          },
          stats: {
            total,
            todayCount,
            failedCount,
            successCount,
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
