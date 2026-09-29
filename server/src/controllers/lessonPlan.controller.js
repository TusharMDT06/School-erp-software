const LessonPlan = require("../models/LessonPlan.model");
const Teacher = require("../models/Teacher.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const { assertTeacherOwnsClassSubject } = require("../utils/teacherAccess");
const { checkAiRateLimit } = require("../utils/aiRateLimit");
const { generateValidatedJson, lessonPlanDraftSchema } = require("../utils/geminiJson");

/**
 * POST /api/lesson-plans
 * Teacher creates a saved lesson plan.
 */
const createLessonPlan = async (req, res, next) => {
  try {
    const {
      classId,
      subject,
      date,
      unitId = null,
      topicTitle,
      objectives = [],
      activities = [],
      resources = [],
      assessmentIdea = "",
      homeworkIdea = "",
      status = "planned",
      reflection = "",
    } = req.body;

    if (!classId || !subject || !date || !topicTitle) {
      throw new ApiError(400, "classId, subject, date, and topicTitle are required.");
    }

    const { teacher, classSection } = await assertTeacherOwnsClassSubject(
      req.user,
      classId,
      subject
    );

    const plan = await LessonPlan.create({
      schoolId: classSection.schoolId,
      teacherId: teacher._id,
      classId: classSection._id,
      subject: subject.trim(),
      date: date.trim(),
      unitId: unitId || null,
      topicTitle: topicTitle.trim(),
      objectives: Array.isArray(objectives) ? objectives.map((o) => String(o).trim()).filter(Boolean) : [],
      activities: Array.isArray(activities)
        ? activities.map((a) => ({
            name: a.name?.trim() || "Activity",
            minutes: Number(a.minutes) || 10,
          }))
        : [],
      resources: Array.isArray(resources) ? resources.map((r) => String(r).trim()).filter(Boolean) : [],
      assessmentIdea: assessmentIdea ? assessmentIdea.trim() : "",
      homeworkIdea: homeworkIdea ? homeworkIdea.trim() : "",
      status: ["planned", "taught", "skipped"].includes(status) ? status : "planned",
      reflection: reflection ? reflection.trim() : "",
    });

    res.status(201).json(new ApiResponse(201, plan, "Lesson plan saved successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/lesson-plans
 * Query lesson plans with optional from/to date filters, classId, subject.
 */
const getLessonPlans = async (req, res, next) => {
  try {
    const { classId, subject, from, to } = req.query;

    const filter = {};

    if (req.user.role === "teacher") {
      const teacher = await Teacher.findOne({ userId: req.user.id || req.user._id });
      if (teacher) {
        filter.teacherId = teacher._id;
      }
    }

    if (classId) filter.classId = classId;
    if (subject) filter.subject = new RegExp(`^${subject.trim()}$`, "i");

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const plans = await LessonPlan.find(filter)
      .populate("unitId", "unitNo title")
      .populate("classId", "className section")
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json(new ApiResponse(200, plans, "Lesson plans fetched successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/lesson-plans/:id
 */
const getLessonPlanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await LessonPlan.findById(id)
      .populate("unitId", "unitNo title")
      .populate("classId", "className section");

    if (!plan) throw new ApiError(404, "Lesson plan not found.");

    res.status(200).json(new ApiResponse(200, plan, "Lesson plan fetched successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/lesson-plans/:id
 */
const updateLessonPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await LessonPlan.findById(id);
    if (!plan) throw new ApiError(404, "Lesson plan not found.");

    await assertTeacherOwnsClassSubject(req.user, plan.classId, plan.subject);

    const {
      topicTitle,
      date,
      unitId,
      objectives,
      activities,
      resources,
      assessmentIdea,
      homeworkIdea,
      status,
      reflection,
    } = req.body;

    if (topicTitle !== undefined) plan.topicTitle = topicTitle.trim();
    if (date !== undefined) plan.date = date.trim();
    if (unitId !== undefined) plan.unitId = unitId || null;
    if (Array.isArray(objectives)) {
      plan.objectives = objectives.map((o) => String(o).trim()).filter(Boolean);
    }
    if (Array.isArray(activities)) {
      plan.activities = activities.map((a) => ({
        name: a.name?.trim() || "Activity",
        minutes: Number(a.minutes) || 10,
      }));
    }
    if (Array.isArray(resources)) {
      plan.resources = resources.map((r) => String(r).trim()).filter(Boolean);
    }
    if (assessmentIdea !== undefined) plan.assessmentIdea = assessmentIdea.trim();
    if (homeworkIdea !== undefined) plan.homeworkIdea = homeworkIdea.trim();
    if (status !== undefined && ["planned", "taught", "skipped"].includes(status)) {
      plan.status = status;
    }
    if (reflection !== undefined) plan.reflection = reflection.trim();

    await plan.save();

    res.status(200).json(new ApiResponse(200, plan, "Lesson plan updated successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/lesson-plans/:id
 */
const deleteLessonPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const plan = await LessonPlan.findById(id);
    if (!plan) throw new ApiError(404, "Lesson plan not found.");

    await assertTeacherOwnsClassSubject(req.user, plan.classId, plan.subject);

    await LessonPlan.findByIdAndDelete(id);

    res.status(200).json(new ApiResponse(200, null, "Lesson plan deleted successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/lesson-plans/ai-draft
 * Uses Gemini to generate an editable draft lesson plan.
 * Validates with Zod, retries once on failure, enforces 20/day rate limit.
 * Does NOT save anything into the database!
 */
const draftLessonPlanAi = async (req, res, next) => {
  try {
    const { classId, subject, topic, durationMinutes = 45, level = "Secondary" } = req.body;

    if (!classId || !subject || !topic) {
      throw new ApiError(400, "classId, subject, and topic are required.");
    }

    const { teacher, classSection } = await assertTeacherOwnsClassSubject(
      req.user,
      classId,
      subject
    );

    // Rate-limit check (20 calls / day / teacher)
    const rateLimit = await checkAiRateLimit(teacher._id, "lesson_plan", 20);

    const prompt = `
You are an expert curriculum designer and senior school teacher.
Create a structured lesson plan for:
- Subject: ${subject}
- Class/Grade: ${classSection.className}${classSection.section ? ` (Section ${classSection.section})` : ""}
- Academic Level: ${level}
- Topic: "${topic}"
- Duration: ${durationMinutes} minutes

Return STRICT JSON adhering to this exact structure:
{
  "objectives": [
    "Clear, measurable learning outcome 1",
    "Clear, measurable learning outcome 2"
  ],
  "activities": [
    { "name": "Introduction & Hook", "minutes": 5 },
    { "name": "Concept Demonstration / Guided Practice", "minutes": 20 },
    { "name": "Student Activity / Peer Discussion", "minutes": 15 },
    { "name": "Summary & Exit Ticket", "minutes": 5 }
  ],
  "resources": [
    "Whiteboard/Markers",
    "Textbook Chapter X"
  ],
  "assessmentIdea": "Quick check or formative assessment idea",
  "homeworkIdea": "Actionable, relevant homework task for students"
}
Total minutes across all activities should roughly equal ${durationMinutes} minutes.
`;

    const draft = await generateValidatedJson(prompt, lessonPlanDraftSchema, { maxRetries: 1 });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          draft: {
            classId,
            subject,
            topicTitle: topic,
            durationMinutes,
            ...draft,
          },
          remainingQuotaToday: rateLimit.remaining,
        },
        "AI draft generated successfully. Review and edit before saving."
      )
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createLessonPlan,
  getLessonPlans,
  getLessonPlanById,
  updateLessonPlan,
  deleteLessonPlan,
  draftLessonPlanAi,
};
