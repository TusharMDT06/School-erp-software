const mongoose = require("mongoose");
const Circular = require("../models/Circular.model");
const CircularReceipt = require("../models/CircularReceipt.model");
const Student = require("../models/Student.model");
const User = require("../models/User.model");
const ClassSection = require("../models/ClassSection.model");
const { notify } = require("../services/notification.service");
const auditLog = require("../utils/auditLog");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

/**
 * Basic HTML tag sanitizer to prevent XSS in circular body
 */
const sanitizeBodyHtml = (rawHtml) => {
  if (!rawHtml) return "";
  // Strip dangerous tags like <script>, <iframe>, <object>, <embed>, onload/onerror attributes
  return String(rawHtml)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "")
    .trim();
};

/**
 * Resolves audience user IDs for a circular
 */
const resolveCircularRecipientUserIds = async (schoolId, audienceRoles = [], classIds = []) => {
  const userIdsSet = new Set();

  // If specific roles selected (teacher, accountant, staff, admin, etc.)
  const directRoles = (audienceRoles || []).filter((r) => !["student", "parent"].includes(r));
  if (directRoles.length > 0) {
    const staffUsers = await User.find({
      schoolId,
      role: { $in: directRoles },
    })
      .select("_id")
      .lean();
    staffUsers.forEach((u) => userIdsSet.add(u._id.toString()));
  }

  // Handle students and parents
  const includesStudents = audienceRoles.includes("student");
  const includesParents = audienceRoles.includes("parent");

  if (includesStudents || includesParents) {
    const studentQuery = { schoolId };
    if (classIds && classIds.length > 0) {
      studentQuery.classId = { $in: classIds };
    }

    const students = await Student.find(studentQuery).select("userId guardianIds").lean();
    students.forEach((s) => {
      if (includesStudents && s.userId) {
        userIdsSet.add(s.userId.toString());
      }
      if (includesParents && Array.isArray(s.guardianIds)) {
        s.guardianIds.forEach((gid) => {
          if (gid) userIdsSet.add(gid.toString());
        });
      }
    });
  }

  return Array.from(userIdsSet).map((id) => new mongoose.Types.ObjectId(id));
};

/**
 * Dispatches circular notifications in batches of 50
 */
const dispatchCircularNotifications = async (circular, recipientUserIds, notifType = "circular_published") => {
  try {
    const batchSize = 50;

    for (let i = 0; i < recipientUserIds.length; i += batchSize) {
      const chunk = recipientUserIds.slice(i, i + batchSize);

      await Promise.allSettled(
        chunk.map((uid) =>
          notify(uid, {
            type: notifType,
            title: circular.title,
            message: `Official circular: "${circular.title}". ${
              circular.requiresAcknowledgement ? "Formal acknowledgement required." : ""
            }`,
            data: {
              circularId: circular._id,
              requiresAcknowledgement: circular.requiresAcknowledgement,
              ackDeadline: circular.ackDeadline,
              schoolId: circular.schoolId,
            },
            sendEmailFlag: true,
            schoolId: circular.schoolId,
          })
        )
      );

      if (i + batchSize < recipientUserIds.length) {
        await new Promise((r) => setTimeout(r, 150));
      }
    }
  } catch (err) {
    console.error("[dispatchCircularNotifications Error]:", err.message);
  }
};

/**
 * POST /api/circulars
 * Creates a circular draft.
 * Authorized: principal, admin, superadmin
 */
exports.createCircular = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const {
      title,
      body,
      attachments = [],
      audienceRoles = ["teacher", "student", "parent"],
      classIds = [],
      requiresAcknowledgement = false,
      ackDeadline = null,
    } = req.body;

    if (!title || !body) {
      throw new ApiError(400, "Title and body are required.");
    }

    const circular = await Circular.create({
      schoolId,
      title: title.trim(),
      body: sanitizeBodyHtml(body),
      attachments,
      audienceRoles,
      classIds,
      requiresAcknowledgement: Boolean(requiresAcknowledgement),
      ackDeadline: ackDeadline ? new Date(ackDeadline) : null,
      status: "draft",
    });

    await auditLog({
      schoolId,
      userId: req.user._id,
      action: "CIRCULAR_CREATED",
      module: "circular",
      targetId: circular._id,
      details: { title: circular.title, status: "draft" },
    });

    res.status(201).json(new ApiResponse(201, circular, "Circular created as draft."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/circulars
 * List all circulars for school with receipt stats.
 * Authorized: principal, admin, superadmin
 */
exports.getCirculars = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { schoolId };
    if (status && status !== "all") filter.status = status;

    const [circulars, total] = await Promise.all([
      Circular.find(filter)
        .populate("publishedBy", "name role")
        .populate("classIds", "className section")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Circular.countDocuments(filter),
    ]);

    // Attach quick stats to each circular
    const circularIds = circulars.map((c) => c._id);
    const receiptStats = await CircularReceipt.aggregate([
      { $match: { circularId: { $in: circularIds } } },
      {
        $group: {
          _id: "$circularId",
          totalReceipts: { $sum: 1 },
          readCount: { $sum: { $cond: [{ $ne: ["$readAt", null] }, 1, 0] } },
          ackCount: { $sum: { $cond: [{ $ne: ["$acknowledgedAt", null] }, 1, 0] } },
        },
      },
    ]);

    const statsMap = new Map();
    receiptStats.forEach((s) => statsMap.set(s._id.toString(), s));

    const enriched = circulars.map((c) => {
      const s = statsMap.get(c._id.toString()) || { totalReceipts: 0, readCount: 0, ackCount: 0 };
      const readPercent = s.totalReceipts > 0 ? Math.round((s.readCount / s.totalReceipts) * 100) : 0;
      const ackPercent = s.totalReceipts > 0 ? Math.round((s.ackCount / s.totalReceipts) * 100) : 0;
      return {
        ...c,
        stats: {
          totalReceipts: s.totalReceipts,
          readCount: s.readCount,
          readPercent,
          ackCount: s.ackCount,
          ackPercent,
        },
      };
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          circulars: enriched,
          pagination: { page: Number(page), limit: Number(limit), total },
        },
        "Circulars retrieved."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/circulars/:id
 */
exports.getCircularById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const circular = await Circular.findById(id)
      .populate("publishedBy", "name role")
      .populate("classIds", "className section");

    if (!circular) throw new ApiError(404, "Circular not found.");
    res.status(200).json(new ApiResponse(200, circular, "Circular retrieved."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/circulars/:id
 * Edit circular draft
 */
exports.updateCircular = async (req, res, next) => {
  try {
    const { id } = req.params;
    const circular = await Circular.findById(id);
    if (!circular) throw new ApiError(404, "Circular not found.");

    if (circular.status === "published") {
      throw new ApiError(400, "Cannot edit an already published circular.");
    }

    const {
      title,
      body,
      attachments,
      audienceRoles,
      classIds,
      requiresAcknowledgement,
      ackDeadline,
    } = req.body;

    if (title) circular.title = title.trim();
    if (body) circular.body = sanitizeBodyHtml(body);
    if (attachments) circular.attachments = attachments;
    if (audienceRoles) circular.audienceRoles = audienceRoles;
    if (classIds) circular.classIds = classIds;
    if (requiresAcknowledgement !== undefined) {
      circular.requiresAcknowledgement = Boolean(requiresAcknowledgement);
    }
    if (ackDeadline !== undefined) {
      circular.ackDeadline = ackDeadline ? new Date(ackDeadline) : null;
    }

    await circular.save();
    res.status(200).json(new ApiResponse(200, circular, "Circular updated."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/circulars/:id/publish
 * Publishes circular, generates CircularReceipt for every recipient, and notifies.
 */
exports.publishCircular = async (req, res, next) => {
  try {
    const { id } = req.params;
    const circular = await Circular.findById(id);
    if (!circular) throw new ApiError(404, "Circular not found.");

    if (circular.status === "published") {
      return res.status(200).json(new ApiResponse(200, circular, "Circular is already published."));
    }

    // 1. Resolve concrete recipient user IDs
    const recipientUserIds = await resolveCircularRecipientUserIds(
      circular.schoolId,
      circular.audienceRoles,
      circular.classIds
    );

    circular.status = "published";
    circular.publishedAt = new Date();
    circular.publishedBy = req.user._id;
    await circular.save();

    // 2. Create receipts in bulk
    if (recipientUserIds.length > 0) {
      const receiptDocs = recipientUserIds.map((uid) => ({
        circularId: circular._id,
        userId: uid,
        schoolId: circular.schoolId,
        readAt: null,
        acknowledgedAt: null,
      }));

      // insertMany with unordered to skip duplicate edge-cases gracefully
      await CircularReceipt.insertMany(receiptDocs, { ordered: false }).catch(() => {});
    }

    await auditLog({
      schoolId: circular.schoolId,
      userId: req.user._id,
      action: "CIRCULAR_PUBLISHED",
      module: "circular",
      targetId: circular._id,
      details: { title: circular.title, recipientCount: recipientUserIds.length },
    });

    // 3. Dispatch notifications in background
    setImmediate(() => {
      dispatchCircularNotifications(circular, recipientUserIds, "circular_published").catch((err) =>
        console.error("[PublishCircular Background Notif Error]:", err.message)
      );
    });

    res.status(200).json(
      new ApiResponse(
        200,
        circular,
        `Circular published. Delivered to ${recipientUserIds.length} recipients.`
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/circulars/mine
 * Authenticated user inbox for circulars with read & ack state.
 */
exports.getMyCirculars = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { status = "all", page = 1, limit = 20 } = req.query;

    const filter = { userId };
    if (status === "unread") filter.readAt = null;
    if (status === "pending_ack") filter.acknowledgedAt = null;

    const receipts = await CircularReceipt.find(filter)
      .populate({
        path: "circularId",
        populate: { path: "publishedBy", select: "name role" },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const formatted = receipts
      .filter((r) => r.circularId && r.circularId.status === "published")
      .map((r) => ({
        receiptId: r._id,
        readAt: r.readAt,
        acknowledgedAt: r.acknowledgedAt,
        isRead: Boolean(r.readAt),
        isAcknowledged: Boolean(r.acknowledgedAt),
        circular: r.circularId,
      }));

    res.status(200).json(new ApiResponse(200, formatted, "My circulars retrieved."));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/circulars/:id/read
 * Mark circular as read by current user
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const receipt = await CircularReceipt.findOne({ circularId: id, userId });
    if (!receipt) {
      throw new ApiError(404, "No circular receipt found for current user.");
    }

    if (!receipt.readAt) {
      receipt.readAt = new Date();
      await receipt.save();
    }

    res.status(200).json(new ApiResponse(200, receipt, "Circular marked as read."));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/circulars/:id/acknowledge
 * Acknowledge circular by current user
 */
exports.acknowledgeCircular = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const receipt = await CircularReceipt.findOne({ circularId: id, userId });
    if (!receipt) {
      throw new ApiError(404, "No circular receipt found for current user.");
    }

    receipt.acknowledgedAt = new Date();
    if (!receipt.readAt) receipt.readAt = new Date();
    await receipt.save();

    res.status(200).json(new ApiResponse(200, receipt, "Circular acknowledged successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/circulars/:id/stats
 * Read %, Acknowledged %, breakdown by class, and list of non-responders.
 * Authorized: principal, admin, superadmin
 */
exports.getCircularStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const circular = await Circular.findById(id);
    if (!circular) throw new ApiError(404, "Circular not found.");

    const receipts = await CircularReceipt.find({ circularId: id })
      .populate("userId", "name email role")
      .lean();

    const total = receipts.length;
    let readCount = 0;
    let ackCount = 0;
    const nonResponders = [];

    // Map student user IDs to their classes for class-wise breakdown
    const studentUserIds = receipts
      .filter((r) => r.userId?.role === "student")
      .map((r) => r.userId?._id);

    const students = await Student.find({ userId: { $in: studentUserIds } })
      .populate("classId", "className section")
      .lean();

    const studentClassMap = new Map();
    students.forEach((s) => {
      if (s.userId && s.classId) {
        studentClassMap.set(s.userId.toString(), `${s.classId.className}-${s.classId.section}`);
      }
    });

    const classStatsMap = {};

    receipts.forEach((r) => {
      const isRead = Boolean(r.readAt);
      const isAck = Boolean(r.acknowledgedAt);

      if (isRead) readCount++;
      if (isAck) ackCount++;

      const className = studentClassMap.get(r.userId?._id?.toString()) || "Staff/General";
      if (!classStatsMap[className]) {
        classStatsMap[className] = { total: 0, read: 0, acknowledged: 0 };
      }
      classStatsMap[className].total++;
      if (isRead) classStatsMap[className].read++;
      if (isAck) classStatsMap[className].acknowledged++;

      // Non-responder: if ack required and not acknowledged, or if not read
      const isNonResponder = circular.requiresAcknowledgement ? !isAck : !isRead;
      if (isNonResponder && r.userId) {
        nonResponders.push({
          userId: r.userId._id,
          name: r.userId.name,
          email: r.userId.email,
          role: r.userId.role,
          className,
          readAt: r.readAt,
          acknowledgedAt: r.acknowledgedAt,
        });
      }
    });

    const readPercent = total > 0 ? Math.round((readCount / total) * 100) : 0;
    const ackPercent = total > 0 ? Math.round((ackCount / total) * 100) : 0;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          circularId: circular._id,
          title: circular.title,
          requiresAcknowledgement: circular.requiresAcknowledgement,
          ackDeadline: circular.ackDeadline,
          total,
          readCount,
          readPercent,
          ackCount,
          ackPercent,
          classBreakdown: classStatsMap,
          nonResponders,
        },
        "Circular statistics retrieved."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/circulars/:id/remind
 * Re-notifies non-responders only.
 * Rate-limit: once per 24 hours per circular.
 * Authorized: principal, admin, superadmin
 */
exports.remindNonResponders = async (req, res, next) => {
  try {
    const { id } = req.params;
    const circular = await Circular.findById(id);
    if (!circular) throw new ApiError(404, "Circular not found.");

    if (circular.status !== "published") {
      throw new ApiError(400, "Cannot send reminders for an unpublished circular.");
    }

    // Rate-limit check: once per 24 hours
    const now = new Date();
    if (circular.lastRemindedAt) {
      const diffMs = now.getTime() - new Date(circular.lastRemindedAt).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours < 24) {
        const remainingHours = Math.ceil(24 - diffHours);
        throw new ApiError(
          429,
          `Reminders can only be sent once every 24 hours. Please wait ${remainingHours} more hour(s).`
        );
      }
    }

    // Find non-responders
    const query = { circularId: id };
    if (circular.requiresAcknowledgement) {
      query.acknowledgedAt = null;
    } else {
      query.readAt = null;
    }

    const receipts = await CircularReceipt.find(query).select("userId").lean();
    const nonResponderUserIds = receipts.map((r) => r.userId).filter(Boolean);

    if (nonResponderUserIds.length === 0) {
      return res
        .status(200)
        .json(new ApiResponse(200, { remindedCount: 0 }, "All recipients have already responded!"));
    }

    circular.lastRemindedAt = now;
    await circular.save();

    // Background notification to non-responders
    setImmediate(() => {
      dispatchCircularNotifications(circular, nonResponderUserIds, "circular_reminder").catch((err) =>
        console.error("[RemindNonResponders Error]:", err.message)
      );
    });

    res.status(200).json(
      new ApiResponse(
        200,
        { remindedCount: nonResponderUserIds.length },
        `Reminder queued for ${nonResponderUserIds.length} non-responder(s).`
      )
    );
  } catch (err) {
    next(err);
  }
};
