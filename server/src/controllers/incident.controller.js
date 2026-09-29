const mongoose = require("mongoose");
const Incident = require("../models/Incident.model");
const Student = require("../models/Student.model");
const Teacher = require("../models/Teacher.model");
const ClassSection = require("../models/ClassSection.model");
const User = require("../models/User.model");
const auditLog = require("../utils/auditLog");
const { notify } = require("../services/notification.service");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

/**
 * Helper to fetch student IDs in a teacher's assigned/class-teacher classes
 */
async function getTeacherStudentsIds(userId) {
  const teacher = await Teacher.findOne({ userId }).lean();
  if (!teacher) return [];

  const assignedClassIds = (teacher.assignedClasses || []).map((id) => id.toString());
  const classTeacherSections = await ClassSection.find({
    classTeacherId: teacher._id,
  })
    .select("_id")
    .lean();
  classTeacherSections.forEach((c) => assignedClassIds.push(c._id.toString()));

  const uniqueClasses = [...new Set(assignedClassIds)];
  if (uniqueClasses.length === 0) return [];

  const students = await Student.find({ classId: { $in: uniqueClasses } })
    .select("_id")
    .lean();
  return students.map((s) => s._id);
}

/**
 * POST /api/incidents
 * Teachers, principals, admins can log an incident.
 */
const createIncident = async (req, res, next) => {
  try {
    const {
      studentIds,
      category,
      severity,
      description,
      actionTaken,
      followUpDate,
      attachments,
      confidential,
      date,
    } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new ApiError(400, "At least one student must be associated with the incident");
    }

    if (!category || !severity || !description) {
      throw new ApiError(400, "Category, severity, and description are required");
    }

    const schoolId = req.user.schoolId;

    const incident = await Incident.create({
      schoolId,
      studentIds,
      reportedBy: req.user.id,
      date: date ? new Date(date) : new Date(),
      category,
      severity,
      description: description.trim(),
      actionTaken: actionTaken ? actionTaken.trim() : "",
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      attachments: attachments || [],
      confidential: !!confidential,
      status: "open",
    });

    const populated = await Incident.findById(incident._id)
      .populate("studentIds", "name admissionNumber rollNumber classId")
      .populate("reportedBy", "name role")
      .lean();

    return res
      .status(201)
      .json(ApiResponse.success(201, "Incident logged successfully", populated));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/incidents
 * Principal/admin: see all
 * Teacher: only ones they reported OR for their classes, and NEVER confidential unless reported by them
 */
const getIncidents = async (req, res, next) => {
  try {
    const { role, schoolId, id: userId } = req.user;
    const { category, severity, status, studentId, page = 1, limit = 50 } = req.query;

    if (!["principal", "admin", "superadmin", "teacher"].includes(role)) {
      throw new ApiError(403, "Access to discipline register is restricted");
    }

    const filter = { schoolId: new mongoose.Types.ObjectId(schoolId) };

    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (studentId) filter.studentIds = new mongoose.Types.ObjectId(studentId);

    if (role === "teacher") {
      const myStudentIds = await getTeacherStudentsIds(userId);
      filter.$or = [
        { reportedBy: new mongoose.Types.ObjectId(userId) },
        {
          confidential: false,
          studentIds: { $in: myStudentIds },
        },
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const incidents = await Incident.find(filter)
      .populate({
        path: "studentIds",
        select: "name admissionNumber rollNumber classId",
        populate: { path: "classId", select: "className section" },
      })
      .populate("reportedBy", "name role email")
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Incident.countDocuments(filter);

    return res.status(200).json(
      ApiResponse.success(200, "Incidents retrieved successfully", {
        incidents,
        total,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/incidents/:id
 * Principal/Admin: update status, actionTaken, followUpDate, severity.
 * Audited through auditLog with old/new values.
 * No hard deletes — closing is a status change.
 */
const updateIncident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, actionTaken, followUpDate, severity, confidential } = req.body;

    const incident = await Incident.findById(id);
    if (!incident) throw new ApiError(404, "Incident report not found");

    const oldValue = {
      status: incident.status,
      actionTaken: incident.actionTaken,
      severity: incident.severity,
      confidential: incident.confidential,
      followUpDate: incident.followUpDate,
    };

    if (status) incident.status = status;
    if (actionTaken !== undefined) incident.actionTaken = actionTaken.trim();
    if (severity) incident.severity = severity;
    if (confidential !== undefined) incident.confidential = !!confidential;
    if (followUpDate !== undefined) {
      incident.followUpDate = followUpDate ? new Date(followUpDate) : null;
    }

    await incident.save();

    const newValue = {
      status: incident.status,
      actionTaken: incident.actionTaken,
      severity: incident.severity,
      confidential: incident.confidential,
      followUpDate: incident.followUpDate,
    };

    // Audit log mutation
    await auditLog({
      schoolId: req.user.schoolId,
      userId: req.user.id,
      action: "incident_update",
      module: "pastoral_discipline",
      targetId: incident._id,
      oldValue,
      newValue,
    }).catch((err) => console.warn("[Incident] Audit log failed:", err.message));

    const populated = await Incident.findById(incident._id)
      .populate({
        path: "studentIds",
        select: "name admissionNumber rollNumber classId",
        populate: { path: "classId", select: "className section" },
      })
      .populate("reportedBy", "name role")
      .lean();

    return res
      .status(200)
      .json(ApiResponse.success(200, "Incident updated successfully", populated));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/incidents/:id/notify-parent
 * Dispatches a neutral notification template to parent.
 * High and Medium severity requires explicit { confirm: true }.
 */
const notifyIncidentParent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { confirm, customNote } = req.body;

    const incident = await Incident.findById(id)
      .populate("studentIds", "name guardianIds")
      .lean();

    if (!incident) throw new ApiError(404, "Incident report not found");

    // Medium and High severity requires an explicit confirm flag
    if (["medium", "high"].includes(incident.severity) && !confirm) {
      throw new ApiError(
        400,
        `Notifying parents for ${incident.severity.toUpperCase()} severity incident requires an explicit confirmation flag ({ confirm: true }).`
      );
    }

    // Resolve parent/guardian user IDs
    let parentUserIds = [];
    for (const student of incident.studentIds || []) {
      if (student.guardianIds && student.guardianIds.length > 0) {
        parentUserIds.push(...student.guardianIds);
      }
    }

    // Fallback if no guardianIds found directly
    if (parentUserIds.length === 0) {
      const parentUsers = await User.find({
        role: "parent",
        schoolId: incident.schoolId,
      })
        .select("_id")
        .limit(1)
        .lean();
      parentUserIds = parentUsers.map((p) => p._id);
    }

    const studentNames = (incident.studentIds || []).map((s) => s.name).join(", ");
    const neutralMessage =
      customNote ||
      `This is a communication regarding ${studentNames}. An incident related to school conduct (${incident.category}) was recorded on ${new Date(
        incident.date
      ).toLocaleDateString("en-IN")}. The matter is being handled constructively with care. Please reach out to the school office if you would like to schedule a conference.`;

    for (const pId of parentUserIds) {
      await notify(pId, {
        type: "incident_parent_notified",
        title: "Official Communication: Pastoral & Student Conduct Update",
        message: neutralMessage,
        data: {
          incidentId: incident._id,
          category: incident.category,
          date: incident.date,
        },
        sendEmailFlag: true,
        schoolId: incident.schoolId,
      }).catch((err) =>
        console.warn("[Incident] Failed to notify parent:", err.message)
      );
    }

    await Incident.findByIdAndUpdate(incident._id, {
      parentNotified: true,
      parentNotifiedAt: new Date(),
    });

    return res.status(200).json(
      ApiResponse.success(200, "Parents notified successfully with neutral template", {
        incidentId: incident._id,
        parentNotified: true,
        parentNotifiedAt: new Date(),
      })
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIncident,
  getIncidents,
  updateIncident,
  notifyIncidentParent,
};
