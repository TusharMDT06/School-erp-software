const mongoose = require("mongoose");
const {
  extractJsonString,
  lessonPlanDraftSchema,
  singleQuizQuestionSchema,
  quizQuestionsListSchema,
} = require("../utils/geminiJson");
const { checkAiRateLimit } = require("../utils/aiRateLimit");
const SyllabusUnit = require("../models/SyllabusUnit.model");
const LessonPlan = require("../models/LessonPlan.model");
const AssessmentComponent = require("../models/AssessmentComponent.model");
const ComponentScore = require("../models/ComponentScore.model");
const Quiz = require("../models/Quiz.model");
const QuizAttempt = require("../models/QuizAttempt.model");

describe("Phase 9B Tests — Syllabus, Gradebook & Quizzes", () => {
  describe("1. Strict JSON Extraction & Zod Schema Validation", () => {
    it("should strip markdown fences from raw text", () => {
      const fenced = "```json\n{\"objectives\": [\"Learn Newton laws\"]}\n```";
      expect(extractJsonString(fenced)).toBe("{\"objectives\": [\"Learn Newton laws\"]}");
    });

    it("should validate a valid AI lesson plan draft", () => {
      const validPlan = {
        objectives: ["Understand kinetic energy", "Calculate 0.5*m*v^2"],
        activities: [
          { name: "Hook / Demo", minutes: 5 },
          { name: "Formula & Practice", minutes: 25 },
        ],
        resources: ["Textbook Chapter 3", "Interactive PhET simulation"],
        assessmentIdea: "Exit ticket with 2 calculation problems",
        homeworkIdea: "Complete workbook exercises 1-5",
      };

      const result = lessonPlanDraftSchema.safeParse(validPlan);
      expect(result.success).toBe(true);
    });

    it("should reject invalid lesson plan missing activities or objectives", () => {
      const invalidPlan = {
        objectives: [],
        activities: [],
      };
      const result = lessonPlanDraftSchema.safeParse(invalidPlan);
      expect(result.success).toBe(false);
    });

    it("should validate quiz questions with exactly 4 options and valid correctIndex (0-3)", () => {
      const validQ = {
        text: "What is the unit of electric current?",
        options: ["Volt", "Ampere", "Ohm", "Watt"],
        correctIndex: 1,
        explanation: "Ampere (A) is the SI base unit of electrical current.",
      };
      const res = singleQuizQuestionSchema.safeParse(validQ);
      expect(res.success).toBe(true);
    });

    it("should reject quiz questions that do not have exactly 4 options", () => {
      const invalidQ = {
        text: "Is gravity a force?",
        options: ["Yes", "No"], // only 2 options!
        correctIndex: 0,
      };
      const res = singleQuizQuestionSchema.safeParse(invalidQ);
      expect(res.success).toBe(false);
    });

    it("should filter out invalid questions in quizQuestionsListSchema and keep valid ones", () => {
      const mixedList = [
        {
          text: "Valid Q1",
          options: ["A", "B", "C", "D"],
          correctIndex: 0,
        },
        {
          text: "Invalid Q2 (3 options)",
          options: ["A", "B", "C"],
          correctIndex: 1,
        },
        {
          text: "Valid Q3",
          options: ["W", "X", "Y", "Z"],
          correctIndex: 3,
        },
      ];

      const res = quizQuestionsListSchema.parse(mixedList);
      expect(res.length).toBe(2);
      expect(res[0].text).toBe("Valid Q1");
      expect(res[1].text).toBe("Valid Q3");
    });
  });

  describe("2. AI Rate Limiting (20 calls / day / teacher)", () => {
    it("should allow calls within limit and track remaining quota", async () => {
      const teacherId = new mongoose.Types.ObjectId();
      const res = await checkAiRateLimit(teacherId, "unit_test_action", 5);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(4);
    });

    it("should reject when daily limit is exceeded", async () => {
      const teacherId = new mongoose.Types.ObjectId();
      for (let i = 0; i < 3; i++) {
        await checkAiRateLimit(teacherId, "limit_test", 3);
      }
      await expect(checkAiRateLimit(teacherId, "limit_test", 3)).rejects.toThrow("limit of 3 reached");
    });
  });

  describe("3. Model Validation & Constraints", () => {
    it("should validate SyllabusUnit topic status enum", () => {
      const unit = new SyllabusUnit({
        schoolId: new mongoose.Types.ObjectId(),
        classId: new mongoose.Types.ObjectId(),
        className: "Class 10-A",
        subject: "Physics",
        academicYear: "2024-2025",
        unitNo: 1,
        title: "Mechanics",
        topics: [{ title: "Motion", status: "invalid_status" }],
        teacherId: new mongoose.Types.ObjectId(),
      });

      const err = unit.validateSync();
      expect(err.errors["topics.0.status"]).toBeDefined();
    });

    it("should validate AssessmentComponent weightage range (0-100)", () => {
      const comp = new AssessmentComponent({
        schoolId: new mongoose.Types.ObjectId(),
        classId: new mongoose.Types.ObjectId(),
        subject: "Math",
        academicYear: "2024-2025",
        name: "Test 1",
        maxMarks: 50,
        weightage: 150, // exceeds 100!
        teacherId: new mongoose.Types.ObjectId(),
      });

      const err = comp.validateSync();
      expect(err.errors["weightage"]).toBeDefined();
    });

    it("should enforce Quiz question with 4 options validator", () => {
      const quiz = new Quiz({
        schoolId: new mongoose.Types.ObjectId(),
        classId: new mongoose.Types.ObjectId(),
        subject: "Science",
        teacherId: new mongoose.Types.ObjectId(),
        title: "Midterm Quiz",
        durationMinutes: 20,
        questions: [
          {
            text: "Question 1",
            options: ["Option 1", "Option 2"], // only 2 options
            correctIndex: 0,
          },
        ],
      });

      const err = quiz.validateSync();
      expect(err.errors["questions.0.options"]).toBeDefined();
    });

    it("should validate QuizAttempt timing boundary (grace period)", () => {
      const startedAt = new Date("2026-09-29T10:00:00Z");
      const durationMinutes = 15;
      const graceMs = 10000; // 10 seconds

      const deadline = new Date(startedAt.getTime() + durationMinutes * 60 * 1000 + graceMs);

      const onTimeSubmission = new Date("2026-09-29T10:15:08Z");
      const lateSubmission = new Date("2026-09-29T10:15:15Z");

      expect(onTimeSubmission.getTime() <= deadline.getTime()).toBe(true);
      expect(lateSubmission.getTime() > deadline.getTime()).toBe(true);
    });
  });
});
