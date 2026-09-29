const SubstituteAssignment = require("../models/SubstituteAssignment.model");
const SubstituteSuggestion = require("../models/SubstituteSuggestion.model");
const Teacher = require("../models/Teacher.model");
const LessonPlan = require("../models/LessonPlan.model");
const ClassSection = require("../models/ClassSection.model");
const { ApiError, ApiResponse } = require("../utils/apiResponse");
const { getOrEnsureTeacher } = require("../utils/teacherAccess");

/**
 * GET /api/teacher/substitutions?from=&to=
 * Fetch substitution assignments where substituteTeacherId is the logged-in teacher.
 * Also retrieves the absent teacher's lesson-plan topic and notes for that date/class if one exists.
 */
const getTeacherSubstitutions = async (req, res, next) => {
  try {
    const teacher = await getOrEnsureTeacher(req.user);
    if (!teacher) {
      return res.status(200).json(
        new ApiResponse(200, [], "Teacher substitutions retrieved.")
      );
    }

    const { from, to } = req.query;
    const filter = { substituteTeacherId: teacher._id };

    if (from && to) {
      filter.date = { $gte: from, $lte: to };
    } else if (from) {
      filter.date = { $gte: from };
    }

    const assignments = await SubstituteAssignment.find(filter)
      .populate("classId", "className section academicYear")
      .populate({
        path: "absentTeacherId",
        select: "subjects userId",
        populate: { path: "userId", select: "name email phone" },
      })
      .sort({ date: -1, periodRef: 1 })
      .lean();

    // Attach absent teacher's LessonPlan if available
    const enrichedAssignments = await Promise.all(
      assignments.map(async (sub) => {
        let lessonPlan = null;
        if (sub.classId?._id && sub.absentTeacherId?._id && sub.date) {
          const subDate = new Date(sub.date);
          const startOfDay = new Date(subDate.setHours(0, 0, 0, 0));
          const endOfDay = new Date(subDate.setHours(23, 59, 59, 999));

          const plan = await LessonPlan.findOne({
            teacherId: sub.absentTeacherId._id,
            classId: sub.classId._id,
            subject: new RegExp(`^${sub.subject?.trim()}$`, "i"),
            date: { $gte: startOfDay, $lte: endOfDay },
          })
            .select("topicTitle objectives activities homeworkIdea reflection status")
            .lean();

          if (plan) {
            lessonPlan = plan;
          }
        }

        return {
          ...sub,
          absentTeacherLessonPlan: lessonPlan,
        };
      })
    );

    return res.status(200).json(
      new ApiResponse(200, enrichedAssignments, "Substitutions retrieved successfully.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/teacher/substitutions/:id/acknowledge
 * Substitute teacher acknowledges assignment.
 */
const acknowledgeSubstitution = async (req, res, next) => {
  try {
    const { id } = req.params;

    const teacher = await getOrEnsureTeacher(req.user);
    if (!teacher) {
      throw new ApiError(404, "Teacher profile not found.");
    }

    const assignment = await SubstituteAssignment.findById(id);
    if (!assignment) {
      throw new ApiError(404, "Substitution assignment not found.");
    }

    if (
      assignment.substituteTeacherId.toString() !== teacher._id.toString() &&
      !["admin", "principal"].includes(req.user.role)
    ) {
      throw new ApiError(403, "You can only acknowledge your own substitution assignments.");
    }

    assignment.status = "acknowledged";
    await assignment.save();

    return res.status(200).json(
      new ApiResponse(200, assignment, "Substitution acknowledged successfully.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/teacher/substitutions/suggestions
 * Store cover notes and suggested substitute for a leave request.
 */
const createSubstituteSuggestion = async (req, res, next) => {
  try {
    const {
      leaveId = null,
      date,
      periodRef,
      classId,
      subject,
      coverNotes = "",
      suggestedSubstituteId = null,
    } = req.body;

    if (!date || !periodRef || !classId || !subject) {
      throw new ApiError(400, "Date, period, class, and subject are required.");
    }

    const teacher = await getOrEnsureTeacher(req.user);
    if (!teacher) {
      throw new ApiError(404, "Teacher profile not found.");
    }

    const suggestion = await SubstituteSuggestion.create({
      schoolId: req.user.schoolId,
      leaveId,
      teacherId: teacher._id,
      date,
      periodRef,
      classId,
      subject,
      coverNotes: coverNotes.trim(),
      suggestedSubstituteId,
      status: "pending",
    });

    return res.status(201).json(
      new ApiResponse(201, suggestion, "Substitute suggestion saved.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/teacher/substitutions/suggestions
 * Retrieve suggestions for the teacher or all for admin/principal.
 */
const getSubstituteSuggestions = async (req, res, next) => {
  try {
    const filter = { schoolId: req.user.schoolId };

    if (req.user.role === "teacher") {
      const teacher = await getOrEnsureTeacher(req.user);
      if (teacher) {
        filter.teacherId = teacher._id;
      }
    }

    const suggestions = await SubstituteSuggestion.find(filter)
      .populate("classId", "className section")
      .populate({
        path: "teacherId",
        populate: { path: "userId", select: "name" },
      })
      .populate({
        path: "suggestedSubstituteId",
        populate: { path: "userId", select: "name" },
      })
      .sort({ date: -1 })
      .lean();

    return res.status(200).json(
      new ApiResponse(200, suggestions, "Substitute suggestions retrieved.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/teacher/substitutions/suggestions/:id/confirm
 * Admin/Principal confirms suggestion, converting it into a SubstituteAssignment.
 */
const confirmSubstituteSuggestion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { substituteTeacherId } = req.body;

    const suggestion = await SubstituteSuggestion.findById(id);
    if (!suggestion) {
      throw new ApiError(404, "Suggestion not found.");
    }

    const finalSubId = substituteTeacherId || suggestion.suggestedSubstituteId;
    if (!finalSubId) {
      throw new ApiError(400, "Please specify a substitute teacher.");
    }

    // Upsert SubstituteAssignment
    const assignment = await SubstituteAssignment.findOneAndUpdate(
      {
        date: suggestion.date,
        periodRef: suggestion.periodRef,
        classId: suggestion.classId,
      },
      {
        schoolId: suggestion.schoolId,
        date: suggestion.date,
        periodRef: suggestion.periodRef,
        classId: suggestion.classId,
        subject: suggestion.subject,
        absentTeacherId: suggestion.teacherId,
        substituteTeacherId: finalSubId,
        notes: suggestion.coverNotes || "",
        status: "assigned",
        createdBy: req.user._id,
      },
      { upsert: true, new: true }
    );

    suggestion.status = "confirmed";
    await suggestion.save();

    return res.status(200).json(
      new ApiResponse(200, { suggestion, assignment }, "Suggestion confirmed and substitution assignment created.")
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTeacherSubstitutions,
  acknowledgeSubstitution,
  createSubstituteSuggestion,
  getSubstituteSuggestions,
  confirmSubstituteSuggestion,
};
