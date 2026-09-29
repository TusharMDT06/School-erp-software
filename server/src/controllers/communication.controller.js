const TeacherPreference = require("../models/TeacherPreference.model");
const Teacher = require("../models/Teacher.model");
const ClassSection = require("../models/ClassSection.model");
const Circular = require("../models/Circular.model");
const { ApiError, ApiResponse } = require("../utils/apiResponse");

const MESSAGE_TEMPLATES = [
  {
    key: "homework_reminder",
    title: "Homework Reminder",
    category: "homework",
    template:
      "Dear Students and Parents, please ensure homework for [Subject] is completed and submitted by [Date]. If you have any doubts, please consult during class hours.",
  },
  {
    key: "test_tomorrow",
    title: "Unit Test Tomorrow",
    category: "exam",
    template:
      "Reminder: A unit test for [Subject] will be conducted tomorrow covering [Topics]. Please ensure your child prepares thoroughly and brings necessary stationery.",
  },
  {
    key: "ptm_reminder",
    title: "PTM Slot Booking Reminder",
    category: "ptm",
    template:
      "Reminder: The upcoming Parent-Teacher Meeting is scheduled on [Date]. Please book your preferred meeting slot through the ERP portal before booking closes.",
  },
  {
    key: "absent_followup",
    title: "Absence Follow-up & Class Notes",
    category: "attendance",
    template:
      "We missed [Student Name] in class today. Please review the shared study materials on the portal and complete the missed exercises before next session.",
  },
  {
    key: "general_update",
    title: "Class Activity Update",
    category: "general",
    template:
      "Dear Parents, please take note of the upcoming class activity / project submission on [Date]. Your cooperation and encouragement are appreciated.",
  },
];

/**
 * GET /api/teacher/preferences
 * Get logged-in teacher's communication preferences and office hours.
 */
const getTeacherPreference = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher) throw new ApiError(404, "Teacher profile not found.");

    let preference = await TeacherPreference.findOne({ teacherId: teacher._id });
    if (!preference) {
      preference = await TeacherPreference.create({
        teacherId: teacher._id,
        schoolId: req.user.schoolId,
      });
    }

    return res.status(200).json(
      new ApiResponse(200, preference, "Teacher preferences retrieved.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/teacher/preferences
 * Update teacher's office hours and auto-reply settings.
 */
const updateTeacherPreference = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher) throw new ApiError(404, "Teacher profile not found.");

    const { officeHours, autoReplyEnabled, autoReplyText } = req.body;

    let preference = await TeacherPreference.findOne({ teacherId: teacher._id });
    if (!preference) {
      preference = new TeacherPreference({
        teacherId: teacher._id,
        schoolId: req.user.schoolId,
      });
    }

    if (Array.isArray(officeHours)) {
      preference.officeHours = officeHours;
    }
    if (autoReplyEnabled !== undefined) {
      preference.autoReplyEnabled = Boolean(autoReplyEnabled);
    }
    if (autoReplyText !== undefined) {
      preference.autoReplyText = autoReplyText.trim();
    }

    await preference.save();

    return res.status(200).json(
      new ApiResponse(200, preference, "Teacher preferences updated successfully.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/communication/office-hours/:teacherId
 * Public / Parent view: Get teacher's office hours and availability.
 */
const getTeacherOfficeHours = async (req, res, next) => {
  try {
    const { teacherId } = req.params;

    const teacher = await Teacher.findById(teacherId).populate("userId", "name");
    if (!teacher) throw new ApiError(404, "Teacher not found.");

    const preference = await TeacherPreference.findOne({ teacherId: teacher._id }).lean();

    return res.status(200).json(
      new ApiResponse(200, {
        teacherName: teacher.userId?.name,
        officeHours: preference ? preference.officeHours : [],
        autoReplyEnabled: preference ? preference.autoReplyEnabled : false,
      }, "Teacher office hours retrieved.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/teacher/notices/templates
 * Returns reusable notice templates for teachers.
 */
const getNoticeTemplates = async (req, res, next) => {
  return res.status(200).json(
    new ApiResponse(200, MESSAGE_TEMPLATES, "Notice templates retrieved.")
  );
};

/**
 * POST /api/teacher/notices
 * Teacher posts a Notice to their own classes only.
 * Rate limited to 5 per day. Visible to principal in notice list.
 */
const createClassNotice = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user._id });
    if (!teacher) throw new ApiError(404, "Teacher profile not found.");

    const {
      title,
      body,
      classId,
      attachments = [],
      requiresAcknowledgement = false,
      ackDeadline = null,
    } = req.body;

    if (!title || !body || !classId) {
      throw new ApiError(400, "Title, body, and classId are required.");
    }

    // Verify teacher owns or is assigned to this class
    const classSection = await ClassSection.findById(classId);
    if (!classSection) throw new ApiError(404, "Class section not found.");

    const isClassTeacher =
      classSection.classTeacherId?.toString() === teacher._id.toString();
    const isAssigned = teacher.assignedClasses?.some(
      (cId) => cId.toString() === classId.toString()
    );

    if (!isClassTeacher && !isAssigned && !["admin", "principal"].includes(req.user.role)) {
      throw new ApiError(403, "You can only post notices to your own assigned classes.");
    }

    // Rate Limit: 5 notices per day per teacher
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const noticesToday = await Circular.countDocuments({
      publishedBy: req.user._id,
      createdAt: { $gte: todayStart },
    });

    if (noticesToday >= 5) {
      throw new ApiError(429, "Daily limit reached: Maximum 5 notices allowed per day.");
    }

    // Create Circular
    const notice = await Circular.create({
      schoolId: req.user.schoolId,
      title: title.trim(),
      body: body.trim(),
      attachments,
      audienceRoles: ["parent", "student"],
      classIds: [classId],
      requiresAcknowledgement: Boolean(requiresAcknowledgement),
      ackDeadline: ackDeadline ? new Date(ackDeadline) : null,
      status: "published",
      publishedBy: req.user._id,
      publishedAt: new Date(),
    });

    const populatedNotice = await Circular.findById(notice._id)
      .populate("publishedBy", "name role")
      .populate("classIds", "className section");

    return res.status(201).json(
      new ApiResponse(201, populatedNotice, "Class notice posted successfully.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/teacher/notices
 * List notices published by logged-in teacher.
 */
const getMyClassNotices = async (req, res, next) => {
  try {
    const notices = await Circular.find({
      schoolId: req.user.schoolId,
      publishedBy: req.user._id,
    })
      .populate("classIds", "className section")
      .populate("publishedBy", "name")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(
      new ApiResponse(200, notices, "Teacher class notices retrieved.")
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTeacherPreference,
  updateTeacherPreference,
  getTeacherOfficeHours,
  getNoticeTemplates,
  createClassNotice,
  getMyClassNotices,
};
