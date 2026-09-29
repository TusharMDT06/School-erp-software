const StudentRemark = require("../models/StudentRemark.model");
const Student = require("../models/Student.model");
const Teacher = require("../models/Teacher.model");
const ClassSection = require("../models/ClassSection.model");
const Incident = require("../models/Incident.model");
const User = require("../models/User.model");
const { notify, notifyMany } = require("../services/notification.service");
const { ApiError, ApiResponse } = require("../utils/apiResponse");
const { getOrEnsureTeacher } = require("../utils/teacherAccess");

/**
 * POST /api/remarks
 * Teacher creates a student remark (must teach or be class teacher of student's class).
 */
const createRemark = async (req, res, next) => {
  try {
    const { studentId, type, text, visibleToParent = false } = req.body;

    if (!studentId || !type || !text?.trim()) {
      throw new ApiError(400, "Student ID, remark type, and text are required.");
    }

    const student = await Student.findById(studentId);
    if (!student) {
      throw new ApiError(404, "Student not found.");
    }

    const teacher = await getOrEnsureTeacher(req.user);
    if (!teacher) {
      throw new ApiError(403, "Teacher profile not found.");
    }

    // Verify teacher is assigned to student's class or is class teacher
    const classSection = await ClassSection.findById(student.classId);
    const isClassTeacher =
      classSection?.classTeacherId &&
      classSection.classTeacherId.toString() === teacher._id.toString();

    const isAssigned = teacher.assignedClasses?.some(
      (cId) => cId.toString() === student.classId.toString()
    );

    if (!isClassTeacher && !isAssigned && !["admin", "principal"].includes(req.user.role)) {
      throw new ApiError(
        403,
        "You can only add remarks for students in your assigned or class teacher classes."
      );
    }

    const remark = await StudentRemark.create({
      schoolId: req.user.schoolId,
      studentId,
      teacherId: teacher._id,
      type,
      text: text.trim(),
      visibleToParent: Boolean(visibleToParent),
      date: new Date(),
      editHistory: [],
    });

    const populatedRemark = await StudentRemark.findById(remark._id)
      .populate("teacherId", "subjects userId")
      .populate({ path: "teacherId", populate: { path: "userId", select: "name email" } })
      .populate("studentId", "name rollNumber admissionNumber");

    return res.status(201).json(
      new ApiResponse(201, populatedRemark, "Student remark created successfully.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/remarks/:id
 * Edit remark (within 24 hours only; pushes old text to editHistory).
 */
const updateRemark = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, type, visibleToParent } = req.body;

    const remark = await StudentRemark.findById(id);
    if (!remark) {
      throw new ApiError(404, "Remark not found.");
    }

    const teacher = await getOrEnsureTeacher(req.user);
    if (!teacher || remark.teacherId.toString() !== teacher._id.toString()) {
      if (!["admin", "principal"].includes(req.user.role)) {
        throw new ApiError(403, "You can only edit remarks you authored.");
      }
    }

    // 24-hour edit lock check
    const diffMs = Date.now() - new Date(remark.createdAt).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours > 24) {
      throw new ApiError(403, "Remarks can only be edited within 24 hours of creation.");
    }

    // Push previous state to editHistory if text changed
    if (text && text.trim() !== remark.text) {
      remark.editHistory.push({
        text: remark.text,
        at: new Date(),
      });
      remark.text = text.trim();
    }

    if (type) remark.type = type;
    if (visibleToParent !== undefined) remark.visibleToParent = Boolean(visibleToParent);

    await remark.save();

    return res.status(200).json(
      new ApiResponse(200, remark, "Student remark updated successfully.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/remarks/student/:id
 * Retrieve remarks for a student (authorized teachers, principal, admin).
 */
const getStudentRemarks = async (req, res, next) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      throw new ApiError(404, "Student not found.");
    }

    // If teacher, verify authorization to student's class
    if (req.user.role === "teacher") {
      const teacher = await getOrEnsureTeacher(req.user);
      if (!teacher) throw new ApiError(403, "Teacher profile not found.");

      const classSection = await ClassSection.findById(student.classId);
      const isClassTeacher =
        classSection?.classTeacherId?.toString() === teacher._id.toString();
      const isAssigned = teacher.assignedClasses?.some(
        (cId) => cId.toString() === student.classId.toString()
      );

      if (!isClassTeacher && !isAssigned) {
        throw new ApiError(403, "You are not authorized to view remarks for this student.");
      }
    }

    const remarks = await StudentRemark.find({ studentId: id })
      .populate({
        path: "teacherId",
        select: "subjects userId",
        populate: { path: "userId", select: "name email" },
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(
      new ApiResponse(200, remarks, "Student remarks retrieved.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/parent/children/:id/remarks
 * Parent view: only remarks marked visibleToParent: true.
 */
const getParentRemarks = async (req, res, next) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id);
    if (!student) {
      throw new ApiError(404, "Student not found.");
    }

    // Verify parent owns this student
    const isParent = student.guardianIds?.some(
      (gId) => gId.toString() === req.user._id.toString()
    );
    if (!isParent && req.user.role !== "admin") {
      throw new ApiError(403, "You can only view remarks for your registered child.");
    }

    const remarks = await StudentRemark.find({
      studentId: id,
      visibleToParent: true,
    })
      .populate({
        path: "teacherId",
        select: "subjects userId",
        populate: { path: "userId", select: "name" },
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(
      new ApiResponse(200, remarks, "Child remarks retrieved.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/remarks/:id/appreciate
 * Notifies parent of positive remark (type: student_appreciation).
 */
const appreciateRemark = async (req, res, next) => {
  try {
    const { id } = req.params;

    const remark = await StudentRemark.findById(id).populate("studentId");
    if (!remark) {
      throw new ApiError(404, "Remark not found.");
    }

    const student = remark.studentId;
    if (!student) {
      throw new ApiError(404, "Student for this remark not found.");
    }

    // Mark as positive if not already and visible to parent
    remark.type = "positive";
    remark.visibleToParent = true;
    await remark.save();

    // Notify all parents/guardians
    if (student.guardianIds && student.guardianIds.length > 0) {
      for (const guardianId of student.guardianIds) {
        await notify(guardianId, {
          type: "student_appreciation",
          title: `🌟 Appreciation for ${student.name}!`,
          message: `Great news! Teacher shared a special appreciation: "${remark.text}"`,
          data: { studentId: student._id, remarkId: remark._id },
          sendEmail: true,
        });
      }
    }

    return res.status(200).json(
      new ApiResponse(200, remark, "Appreciation sent to parent successfully.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/remarks/:id/escalate
 * Creates an Incident linked to the remark and notifies the principal.
 */
const escalateRemark = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { severity = "medium", category = "behavior" } = req.body;

    const remark = await StudentRemark.findById(id).populate("studentId");
    if (!remark) {
      throw new ApiError(404, "Remark not found.");
    }

    const student = remark.studentId;
    if (!student) {
      throw new ApiError(404, "Student not found.");
    }

    // Create Incident record
    const incident = await Incident.create({
      schoolId: req.user.schoolId,
      studentIds: [student._id],
      reportedBy: req.user._id,
      date: new Date(),
      category: category || "behavior",
      severity: severity || "medium",
      description: `Escalated from student remark: "${remark.text}"`,
      actionTaken: "Escalated to principal for administrative review",
      status: "open",
    });

    // Notify Principal(s)
    const principals = await User.find({
      schoolId: req.user.schoolId,
      role: "principal",
    }).select("_id");

    for (const principal of principals) {
      await notify(principal._id, {
        type: "remark_escalated",
        title: `⚠️ Incident Escalated: ${student.name}`,
        message: `Teacher escalated a remark to an official incident (${severity.toUpperCase()} severity). Details: "${remark.text.slice(0, 100)}..."`,
        data: { incidentId: incident._id, studentId: student._id, remarkId: remark._id },
        sendEmail: true,
      });
    }

    return res.status(201).json(
      new ApiResponse(201, { remark, incident }, "Remark escalated to an Incident and principal notified.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/remarks/:id
 * Strictly forbidden — Remarks have an audit trail and cannot be hard deleted.
 */
const deleteRemark = async (req, res, next) => {
  return res.status(403).json(
    new ApiResponse(403, null, "Student remarks cannot be deleted. Immutable audit policy enforced.")
  );
};

module.exports = {
  createRemark,
  updateRemark,
  getStudentRemarks,
  getParentRemarks,
  appreciateRemark,
  escalateRemark,
  deleteRemark,
};
