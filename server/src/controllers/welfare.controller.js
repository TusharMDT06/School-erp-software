const mongoose = require("mongoose");
const Student = require("../models/Student.model");
const StudentRisk = require("../models/StudentRisk.model");
const Intervention = require("../models/Intervention.model");
const ClassSection = require("../models/ClassSection.model");
const Teacher = require("../models/Teacher.model");
const { generateText } = require("../config/geminiClient");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

/**
 * Helper to get teacher's accessible class IDs
 */
async function getTeacherClassIds(userId) {
  const teacher = await Teacher.findOne({ userId }).lean();
  if (!teacher) return [];

  const assigned = (teacher.assignedClasses || []).map((id) => id.toString());
  const classTeacherSections = await ClassSection.find({
    classTeacherId: teacher._id,
  })
    .select("_id")
    .lean();
  classTeacherSections.forEach((c) => assigned.push(c._id.toString()));

  return [...new Set(assigned)].map((id) => new mongoose.Types.ObjectId(id));
}

/**
 * GET /api/welfare/at-risk?band=&classId=
 * Scoped by role: Principal/admin sees all; teachers see own classes only, finance reasons stripped.
 */
const getAtRiskStudents = async (req, res, next) => {
  try {
    const { role, schoolId, id: userId } = req.user;
    const { band, classId, page = 1, limit = 50 } = req.query;

    if (!["principal", "admin", "superadmin", "teacher"].includes(role)) {
      throw new ApiError(403, "Access to student welfare data is restricted.");
    }

    const query = { schoolId: new mongoose.Types.ObjectId(schoolId) };

    if (band) query.band = band;

    if (role === "teacher") {
      const allowedClasses = await getTeacherClassIds(userId);
      if (allowedClasses.length === 0) {
        return res
          .status(200)
          .json(ApiResponse.success(200, "No accessible classes found", []));
      }
      if (classId) {
        if (!allowedClasses.some((ac) => ac.toString() === classId)) {
          throw new ApiError(403, "You are not authorized for this class section");
        }
        query.classId = new mongoose.Types.ObjectId(classId);
      } else {
        query.classId = { $in: allowedClasses };
      }
    } else if (classId) {
      query.classId = new mongoose.Types.ObjectId(classId);
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);
    const risks = await StudentRisk.find(query)
      .populate("studentId", "name admissionNumber rollNumber gender status")
      .populate("classId", "className section academicYear")
      .sort({ score: -1, computedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const isTeacher = role === "teacher";

    // Server-side stripping of finance reasons for teachers
    const sanitized = risks
      .filter((r) => r.studentId != null)
      .map((r) => {
        let reasons = r.reasons || [];
        if (isTeacher) {
          reasons = reasons.filter((reason) => reason.visibility !== "finance");
        }
        return {
          ...r,
          reasons,
        };
      });

    return res.status(200).json(
      ApiResponse.success(200, "At-risk students retrieved successfully", {
        students: sanitized,
        total: sanitized.length,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/welfare/students/:id
 * Risk detail + intervention timeline for a student
 */
const getStudentWelfareDetail = async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;
    const { id: studentId } = req.params;

    if (!["principal", "admin", "superadmin", "teacher"].includes(role)) {
      throw new ApiError(403, "Access to student welfare data is restricted.");
    }

    const student = await Student.findById(studentId)
      .populate("classId", "className section academicYear classTeacherId")
      .lean();

    if (!student) throw new ApiError(404, "Student record not found");

    if (role === "teacher") {
      const allowedClasses = await getTeacherClassIds(userId);
      const studentClassId = student.classId?._id || student.classId;
      if (
        !allowedClasses.some((ac) => ac.toString() === studentClassId?.toString())
      ) {
        throw new ApiError(403, "You are not authorized for this student's class");
      }
    }

    const risk = await StudentRisk.findOne({ studentId }).lean();
    const interventions = await Intervention.find({ studentId })
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name role")
      .populate("notes.by", "name role")
      .sort({ createdAt: -1 })
      .lean();

    const isTeacher = role === "teacher";
    let reasons = risk?.reasons || [];
    if (isTeacher) {
      reasons = reasons.filter((r) => r.visibility !== "finance");
    }

    return res.status(200).json(
      ApiResponse.success(200, "Student welfare profile loaded successfully", {
        student: {
          _id: student._id,
          name: student.name,
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber,
          classInfo: student.classId
            ? `${student.classId.className} - ${student.classId.section}`
            : "-",
          gender: student.gender,
        },
        risk: risk ? { ...risk, reasons } : null,
        interventions,
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/welfare/interventions
 */
const createIntervention = async (req, res, next) => {
  try {
    const { studentId, riskId, type, assignedTo, dueDate, note } = req.body;
    if (!studentId || !type || !assignedTo) {
      throw new ApiError(400, "Student, intervention type, and assignee are required");
    }

    const schoolId = req.user.schoolId;

    const notes = [];
    if (note && note.trim()) {
      notes.push({
        text: note.trim(),
        by: req.user.id,
        at: new Date(),
      });
    }

    const intervention = await Intervention.create({
      studentId,
      schoolId,
      riskId: riskId || null,
      type,
      assignedTo,
      dueDate: dueDate ? new Date(dueDate) : null,
      notes,
      status: "open",
      createdBy: req.user.id,
    });

    const populated = await Intervention.findById(intervention._id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name")
      .lean();

    return res
      .status(201)
      .json(ApiResponse.success(201, "Intervention plan initiated successfully", populated));
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/welfare/interventions/:id
 */
const updateIntervention = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, outcome, newNote } = req.body;

    const intervention = await Intervention.findById(id);
    if (!intervention) throw new ApiError(404, "Intervention not found");

    if (status) intervention.status = status;
    if (outcome !== undefined) intervention.outcome = outcome;

    if (newNote && newNote.trim()) {
      intervention.notes.push({
        text: newNote.trim(),
        by: req.user.id,
        at: new Date(),
      });
    }

    await intervention.save();

    const populated = await Intervention.findById(id)
      .populate("assignedTo", "name email")
      .populate("createdBy", "name")
      .populate("notes.by", "name role")
      .lean();

    return res
      .status(200)
      .json(ApiResponse.success(200, "Intervention updated successfully", populated));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/welfare/students/:id/talking-points
 * Sends ONLY computed reasons and first name to Gemini AI.
 * Human draft for parent conference, never sent to parents.
 */
const generateParentTalkingPoints = async (req, res, next) => {
  try {
    const { id: studentId } = req.params;
    const { role } = req.user;

    if (!["principal", "admin", "superadmin", "teacher"].includes(role)) {
      throw new ApiError(403, "Access restricted.");
    }

    const student = await Student.findById(studentId).select("name classId").lean();
    if (!student) throw new ApiError(404, "Student not found");

    const risk = await StudentRisk.findOne({ studentId }).lean();
    let reasons = risk?.reasons || [];

    // Filter finance reasons if teacher
    if (role === "teacher") {
      reasons = reasons.filter((r) => r.visibility !== "finance");
    }

    // PRIVACY GUARD: extract only the first name
    const firstName = (student.name || "Student").trim().split(" ")[0];

    const reasonsList =
      reasons.length > 0
        ? reasons.map((r) => `- [${r.factor.toUpperCase()}]: ${r.detail}`).join("\n")
        : "- Slight inconsistency in class engagement and regular assignment submission.";

    const prompt = `You are a supportive, experienced educational guidance counselor.
Create 4-5 constructive, sensitive, and collaborative talking points for a teacher or principal to discuss with a parent during an in-person meeting.

Student's First Name: ${firstName}
Identified Context & Observations:
${reasonsList}

Instructions:
- Frame observations around growth, care, and partnership (avoid punitive or harsh language).
- Suggest 1-2 practical home-school routine checks (e.g. sleep schedule, designated study space).
- Offer encouraging action items the school and family can coordinate on.
- Return ONLY the 4-5 numbered talking points.`;

    let generatedPoints = "";

    try {
      if (process.env.GEMINI_API_KEY) {
        const response = await generateText(prompt);
        generatedPoints = response.text || "";
      }
    } catch (aiErr) {
      console.warn("[WelfareAI] Gemini call failed, utilizing rule-based draft:", aiErr.message);
    }

    if (!generatedPoints) {
      // Fallback talking points if Gemini API unavailable
      generatedPoints = `1. Celebrate ${firstName}'s presence and strengths in the school community while reviewing recent routine shifts.\n` +
        `2. Discuss attendance and daily energy levels: collaboratively explore morning habits and consistent sleep schedules.\n` +
        `3. Review current academic pacing: identify specific topics where extra tutoring or study group support will rebuild confidence.\n` +
        `4. Align on home-school communication: set up a fortnightly check-in between teacher and parents to celebrate small wins.\n` +
        `5. Confirm next steps: initiate a peer mentoring or teacher check-in program to guide daily engagement.`;
    }

    return res.status(200).json(
      ApiResponse.success(200, "Parent meeting talking points generated", {
        firstName,
        isHumanDraftOnly: true,
        notice: "Draft for educator reference only; never dispatched to parents automatically.",
        talkingPoints: generatedPoints,
      })
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAtRiskStudents,
  getStudentWelfareDetail,
  createIntervention,
  updateIntervention,
  generateParentTalkingPoints,
};
