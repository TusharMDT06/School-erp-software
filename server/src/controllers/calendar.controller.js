const mongoose = require("mongoose");
const AcademicEvent = require("../models/AcademicEvent.model");
const Student = require("../models/Student.model");
const Teacher = require("../models/Teacher.model");
const User = require("../models/User.model");
const ClassSection = require("../models/ClassSection.model");
const { notify, notifyMany } = require("../services/notification.service");
const { invalidateHolidayCache } = require("../utils/workingDay");
const { isQuietTime } = require("../utils/commsGuard");
const auditLog = require("../utils/auditLog");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

/**
 * Resolves audience user list and breakdown by role for an event
 */
const resolveEventAudienceUsers = async (schoolId, audience, classIds = []) => {
  let userQuery = { schoolId };
  const breakdown = { student: 0, parent: 0, teacher: 0, accountant: 0, admin: 0, principal: 0, other: 0 };
  let userIds = [];

  if (audience === "all") {
    const users = await User.find({ schoolId }).select("_id role").lean();
    userIds = users.map((u) => u._id);
    users.forEach((u) => {
      if (breakdown[u.role] !== undefined) breakdown[u.role]++;
      else breakdown.other++;
    });
  } else if (audience === "staff_only") {
    const users = await User.find({
      schoolId,
      role: { $in: ["teacher", "accountant", "admin", "superadmin", "principal"] },
    })
      .select("_id role")
      .lean();
    userIds = users.map((u) => u._id);
    users.forEach((u) => {
      if (breakdown[u.role] !== undefined) breakdown[u.role]++;
      else breakdown.other++;
    });
  } else if (audience === "students_parents") {
    const users = await User.find({
      schoolId,
      role: { $in: ["student", "parent"] },
    })
      .select("_id role")
      .lean();
    userIds = users.map((u) => u._id);
    users.forEach((u) => {
      if (breakdown[u.role] !== undefined) breakdown[u.role]++;
      else breakdown.other++;
    });
  } else if (audience === "class_specific" && classIds?.length > 0) {
    const students = await Student.find({
      schoolId,
      classId: { $in: classIds },
    })
      .select("userId guardianIds")
      .lean();

    const idSet = new Set();
    students.forEach((s) => {
      if (s.userId) idSet.add(s.userId.toString());
      if (Array.isArray(s.guardianIds)) {
        s.guardianIds.forEach((gid) => {
          if (gid) idSet.add(gid.toString());
        });
      }
    });

    const uniqueIds = Array.from(idSet);
    const users = await User.find({ _id: { $in: uniqueIds } }).select("_id role").lean();
    userIds = users.map((u) => u._id);
    users.forEach((u) => {
      if (breakdown[u.role] !== undefined) breakdown[u.role]++;
      else breakdown.other++;
    });
  }

  return { userIds, total: userIds.length, breakdown };
};

/**
 * Dispatches event notifications in batches of 50 to respect Resend rate limits
 */
const dispatchEventNotifications = async (event, notifType = "event_published") => {
  try {
    const schoolId = event.schoolId;
    const { userIds } = await resolveEventAudienceUsers(schoolId, event.audience, event.classIds);

    event.notificationStats = {
      startedAt: new Date(),
      total: userIds.length,
      sent: 0,
      failed: 0,
      completedAt: null,
    };
    await event.save().catch(() => {});

    const batchSize = 50;
    const sendEmailFlag = event.notifyChannels?.includes("email");

    for (let i = 0; i < userIds.length; i += batchSize) {
      const chunk = userIds.slice(i, i + batchSize);

      await Promise.allSettled(
        chunk.map(async (uid) => {
          try {
            await notify(uid, {
              type: notifType,
              title: event.title,
              message: event.description || `Event notice: ${event.title}`,
              data: {
                eventId: event._id,
                startDate: event.startDate,
                endDate: event.endDate,
                type: event.type,
                schoolId: event.schoolId,
              },
              sendEmailFlag,
              schoolId: event.schoolId,
            });
            event.notificationStats.sent = (event.notificationStats.sent || 0) + 1;
          } catch {
            event.notificationStats.failed = (event.notificationStats.failed || 0) + 1;
          }
        })
      );

      // Brief delay between batches
      if (i + batchSize < userIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }

    event.notificationStats.completedAt = new Date();
    await event.save().catch(() => {});
  } catch (err) {
    console.error("[dispatchEventNotifications Error]:", err.message);
  }
};

/**
 * POST /api/calendar/events
 * Creates an event in "draft" status.
 * Authorized: principal, admin, superadmin
 */
exports.createEvent = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const {
      title,
      description,
      type,
      startDate,
      endDate,
      audience = "all",
      classIds = [],
      notifyChannels = ["email", "in_app"],
    } = req.body;

    if (!title || !type || !startDate || !endDate) {
      throw new ApiError(400, "Title, type, startDate, and endDate are required.");
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ApiError(400, "Invalid start or end date.");
    }
    if (start > end) {
      throw new ApiError(400, "startDate cannot be after endDate.");
    }

    const event = await AcademicEvent.create({
      schoolId,
      title: title.trim(),
      description: description?.trim() || "",
      type,
      startDate: start,
      endDate: end,
      audience,
      classIds: audience === "class_specific" ? classIds : [],
      notifyChannels,
      status: "draft",
      createdBy: req.user._id,
    });

    await auditLog({
      schoolId,
      userId: req.user._id,
      action: "CALENDAR_EVENT_CREATED",
      module: "calendar",
      targetId: event._id,
      details: { title: event.title, type: event.type, status: "draft" },
    });

    res.status(201).json(new ApiResponse(201, event, "Calendar event created as draft."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/calendar/events/:id/audience-preview
 * Shows recipient counts by role before publishing
 */
exports.getAudiencePreview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await AcademicEvent.findById(id);
    if (!event) throw new ApiError(404, "Calendar event not found.");

    const audiencePreview = await resolveEventAudienceUsers(
      event.schoolId,
      event.audience,
      event.classIds
    );

    res.status(200).json(
      new ApiResponse(200, audiencePreview, "Audience preview retrieved.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/calendar/events/:id/publish
 * Publishes event and sends background notifications.
 * Idempotent: publishing twice will not re-send.
 */
exports.publishEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await AcademicEvent.findById(id);
    if (!event) throw new ApiError(404, "Calendar event not found.");

    // Idempotent: already published?
    if (event.status === "published") {
      return res.status(200).json(new ApiResponse(200, event, "Event is already published."));
    }

    event.status = "published";
    await event.save();

    // Invalidate Redis holiday cache
    await invalidateHolidayCache(event.schoolId);

    // Audit log
    await auditLog({
      schoolId: event.schoolId,
      userId: req.user._id,
      action: "CALENDAR_EVENT_PUBLISHED",
      module: "calendar",
      targetId: event._id,
      details: { title: event.title, type: event.type },
    });

    // Determine notification type
    const notifType = ["holiday", "vacation"].includes(event.type)
      ? "holiday_declared"
      : "event_published";

    // Asynchronously dispatch notifications in background without blocking response
    setImmediate(() => {
      dispatchEventNotifications(event, notifType).catch((err) =>
        console.error("[PublishEvent Background Error]:", err.message)
      );
    });

    res.status(200).json(
      new ApiResponse(200, event, "Event published successfully. Notifications queued.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/calendar/events/:id
 * Edit event details. If published and dates changed, notify "event_updated" in background.
 */
exports.updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await AcademicEvent.findById(id);
    if (!event) throw new ApiError(404, "Calendar event not found.");

    const {
      title,
      description,
      type,
      startDate,
      endDate,
      audience,
      classIds,
      notifyChannels,
    } = req.body;

    const oldStartDate = event.startDate?.toISOString();
    const oldEndDate = event.endDate?.toISOString();

    if (title) event.title = title.trim();
    if (description !== undefined) event.description = description.trim();
    if (type) event.type = type;
    if (startDate) event.startDate = new Date(startDate);
    if (endDate) event.endDate = new Date(endDate);
    if (audience) event.audience = audience;
    if (classIds) event.classIds = classIds;
    if (notifyChannels) event.notifyChannels = notifyChannels;

    await event.save();

    // Invalidate cache
    await invalidateHolidayCache(event.schoolId);

    // Check if published and dates shifted
    const datesChanged =
      event.status === "published" &&
      (event.startDate?.toISOString() !== oldStartDate || event.endDate?.toISOString() !== oldEndDate);

    if (datesChanged) {
      setImmediate(() => {
        dispatchEventNotifications(event, "event_updated").catch((err) =>
          console.error("[UpdateEvent Background Error]:", err.message)
        );
      });
    }

    res.status(200).json(new ApiResponse(200, event, "Event updated successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/calendar/events/:id/cancel
 * Cancels event without hard deletion.
 * If was published, notifies "event_cancelled".
 */
exports.cancelEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await AcademicEvent.findById(id);
    if (!event) throw new ApiError(404, "Calendar event not found.");

    const wasPublished = event.status === "published";
    event.status = "cancelled";
    await event.save();

    // Invalidate cache
    await invalidateHolidayCache(event.schoolId);

    await auditLog({
      schoolId: event.schoolId,
      userId: req.user._id,
      action: "CALENDAR_EVENT_CANCELLED",
      module: "calendar",
      targetId: event._id,
      details: { title: event.title, wasPublished },
    });

    if (wasPublished) {
      setImmediate(() => {
        dispatchEventNotifications(event, "event_cancelled").catch((err) =>
          console.error("[CancelEvent Background Error]:", err.message)
        );
      });
    }

    res.status(200).json(new ApiResponse(200, event, "Event cancelled."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/calendar/events
 * Role-filtered events listing.
 * Authenticated users of every role can read events relevant to them.
 */
exports.getEvents = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { from, to, type, status } = req.query;
    const role = req.user.role;

    const filter = { schoolId };

    // Status filter: principal/admin can filter or view draft/cancelled; other roles see published only
    if (["admin", "superadmin", "principal"].includes(role)) {
      if (status && status !== "all") filter.status = status;
    } else {
      filter.status = "published";
    }

    if (type && type !== "all") {
      filter.type = type;
    }

    // Date range filter
    if (from || to) {
      if (from && to) {
        filter.startDate = { $lte: new Date(to) };
        filter.endDate = { $gte: new Date(from) };
      } else if (from) {
        filter.endDate = { $gte: new Date(from) };
      } else if (to) {
        filter.startDate = { $lte: new Date(to) };
      }
    }

    // Role-based audience filtering
    if (!["admin", "superadmin", "principal"].includes(role)) {
      if (role === "teacher" || role === "accountant") {
        filter.audience = { $in: ["all", "staff_only"] };
      } else if (role === "student") {
        const student = await Student.findOne({ userId: req.user._id }).select("classId").lean();
        const studentClassId = student?.classId;
        filter.$or = [
          { audience: { $in: ["all", "students_parents"] } },
          ...(studentClassId ? [{ audience: "class_specific", classIds: studentClassId }] : []),
        ];
      } else if (role === "parent") {
        const students = await Student.find({ guardianIds: req.user._id }).select("classId").lean();
        const classIds = students.map((s) => s.classId).filter(Boolean);
        filter.$or = [
          { audience: { $in: ["all", "students_parents"] } },
          ...(classIds.length ? [{ audience: "class_specific", classIds: { $in: classIds } }] : []),
        ];
      }
    }

    const events = await AcademicEvent.find(filter)
      .populate("createdBy", "name role")
      .populate("classIds", "className section")
      .sort({ startDate: 1 })
      .lean();

    res.status(200).json(new ApiResponse(200, events, "Events retrieved."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/calendar/events/:id
 */
exports.getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const event = await AcademicEvent.findById(id)
      .populate("createdBy", "name role")
      .populate("classIds", "className section");

    if (!event) throw new ApiError(404, "Calendar event not found.");
    res.status(200).json(new ApiResponse(200, event, "Event retrieved."));
  } catch (err) {
    next(err);
  }
};
