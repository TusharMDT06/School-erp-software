const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const Quiz = require("../models/Quiz.model");
const QuizAttempt = require("../models/QuizAttempt.model");
const Student = require("../models/Student.model");
const ClassSection = require("../models/ClassSection.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const { assertTeacherOwnsClassSubject } = require("../utils/teacherAccess");
const { checkAiRateLimit } = require("../utils/aiRateLimit");
const { generateValidatedJson, quizQuestionsListSchema } = require("../utils/geminiJson");
const { notifyMany } = require("../services/notification.service");

/**
 * POST /api/quizzes
 * Create a new quiz in draft status.
 */
const createQuiz = async (req, res, next) => {
  try {
    const {
      classId,
      subject,
      title,
      durationMinutes = 15,
      questions = [],
      shuffleQuestions = false,
      shuffleOptions = false,
      availableFrom,
      availableUntil,
      showResults = "immediately",
    } = req.body;

    if (!classId || !subject || !title) {
      throw new ApiError(400, "classId, subject, and title are required.");
    }

    const { teacher, classSection } = await assertTeacherOwnsClassSubject(
      req.user,
      classId,
      subject
    );

    const formattedQuestions = Array.isArray(questions)
      ? questions.map((q) => {
          if (!q.text || !Array.isArray(q.options) || q.options.length !== 4 || q.correctIndex === undefined) {
            throw new ApiError(400, "Each question must have text, exactly 4 options, and a valid correctIndex (0-3).");
          }
          return {
            text: q.text.trim(),
            options: q.options.map((opt) => String(opt).trim()),
            correctIndex: Number(q.correctIndex),
            explanation: q.explanation ? String(q.explanation).trim() : "",
            marks: Number(q.marks) || 1,
          };
        })
      : [];

    const quiz = await Quiz.create({
      schoolId: classSection.schoolId,
      classId: classSection._id,
      subject: subject.trim(),
      teacherId: teacher._id,
      title: title.trim(),
      durationMinutes: Number(durationMinutes) || 15,
      questions: formattedQuestions,
      shuffleQuestions: Boolean(shuffleQuestions),
      shuffleOptions: Boolean(shuffleOptions),
      availableFrom: availableFrom ? new Date(availableFrom) : new Date(),
      availableUntil: availableUntil ? new Date(availableUntil) : null,
      showResults: ["immediately", "after_close"].includes(showResults) ? showResults : "immediately",
      status: "draft",
    });

    res.status(201).json(new ApiResponse(201, quiz, "Quiz created successfully as draft."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/quizzes
 * Fetch quizzes with optional classId, subject, status filters.
 */
const getQuizzes = async (req, res, next) => {
  try {
    const { classId, subject, status } = req.query;

    const filter = {};
    if (classId) filter.classId = classId;
    if (status) filter.status = status;
    if (subject) filter.subject = new RegExp(`^${subject.trim()}$`, "i");

    if (req.user.role === "teacher") {
      const Teacher = require("../models/Teacher.model");
      const teacher = await Teacher.findOne({ userId: req.user.id || req.user._id });
      if (teacher && !classId) {
        filter.teacherId = teacher._id;
      }
    }

    const quizzes = await Quiz.find(filter)
      .populate("classId", "className section")
      .populate("teacherId", "name employeeId")
      .sort({ createdAt: -1 });

    // Also attach attempt counts
    const quizIds = quizzes.map((q) => q._id);
    const attemptCounts = await QuizAttempt.aggregate([
      { $match: { quizId: { $in: quizIds } } },
      { $group: { _id: "$quizId", count: { $sum: 1 }, submittedCount: { $sum: { $cond: ["$submittedAt", 1, 0] } } } },
    ]);

    const countMap = new Map();
    attemptCounts.forEach((a) => countMap.set(a._id.toString(), a));

    const enriched = quizzes.map((q) => {
      const counts = countMap.get(q._id.toString()) || { count: 0, submittedCount: 0 };
      return {
        ...q.toObject(),
        attemptsCount: counts.count,
        submittedCount: counts.submittedCount,
        questionCount: q.questions.length,
        totalMarks: q.questions.reduce((sum, item) => sum + (item.marks || 1), 0),
      };
    });

    res.status(200).json(new ApiResponse(200, enriched, "Quizzes fetched successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/quizzes/:id
 */
const getQuizById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id)
      .populate("classId", "className section")
      .populate("teacherId", "name");

    if (!quiz) throw new ApiError(404, "Quiz not found.");

    res.status(200).json(new ApiResponse(200, quiz, "Quiz details fetched successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/quizzes/:id
 * Teacher updates quiz.
 * Rules:
 * - Drafts are fully editable.
 * - A published quiz with attempts CANNOT have its questions/timing edited, it can only be closed.
 */
const updateQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);
    if (!quiz) throw new ApiError(404, "Quiz not found.");

    await assertTeacherOwnsClassSubject(req.user, quiz.classId, quiz.subject);

    const attemptsCount = await QuizAttempt.countDocuments({ quizId: quiz._id });

    const {
      title,
      durationMinutes,
      questions,
      shuffleQuestions,
      shuffleOptions,
      availableFrom,
      availableUntil,
      showResults,
      status,
    } = req.body;

    if (quiz.status === "published" && attemptsCount > 0) {
      // If quiz is published and already has student attempts, only allow status update to "closed"
      if (status && status === "closed") {
        quiz.status = "closed";
        await quiz.save();
        return res.status(200).json(new ApiResponse(200, quiz, "Quiz closed successfully."));
      }

      throw new ApiError(
        400,
        "This quiz is published and already has student attempts. Questions and configuration cannot be modified. You may only close the quiz."
      );
    }

    if (title !== undefined) quiz.title = title.trim();
    if (durationMinutes !== undefined) quiz.durationMinutes = Number(durationMinutes);
    if (shuffleQuestions !== undefined) quiz.shuffleQuestions = Boolean(shuffleQuestions);
    if (shuffleOptions !== undefined) quiz.shuffleOptions = Boolean(shuffleOptions);
    if (availableFrom !== undefined) quiz.availableFrom = availableFrom ? new Date(availableFrom) : null;
    if (availableUntil !== undefined) quiz.availableUntil = availableUntil ? new Date(availableUntil) : null;
    if (showResults !== undefined) quiz.showResults = showResults;
    if (status !== undefined && ["draft", "published", "closed"].includes(status)) {
      quiz.status = status;
    }

    if (Array.isArray(questions)) {
      quiz.questions = questions.map((q) => {
        if (!q.text || !Array.isArray(q.options) || q.options.length !== 4 || q.correctIndex === undefined) {
          throw new ApiError(400, "Each question must have text, exactly 4 options, and a valid correctIndex (0-3).");
        }
        return {
          text: q.text.trim(),
          options: q.options.map((opt) => String(opt).trim()),
          correctIndex: Number(q.correctIndex),
          explanation: q.explanation ? String(q.explanation).trim() : "",
          marks: Number(q.marks) || 1,
        };
      });
    }

    await quiz.save();

    res.status(200).json(new ApiResponse(200, quiz, "Quiz updated successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/quizzes/:id
 */
const deleteQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);
    if (!quiz) throw new ApiError(404, "Quiz not found.");

    await assertTeacherOwnsClassSubject(req.user, quiz.classId, quiz.subject);

    const attemptsCount = await QuizAttempt.countDocuments({ quizId: quiz._id });
    if (attemptsCount > 0) {
      throw new ApiError(400, "Cannot delete a quiz that has student attempts. You can close it instead.");
    }

    await Quiz.findByIdAndDelete(id);

    res.status(200).json(new ApiResponse(200, null, "Quiz deleted successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/quizzes/:id/publish
 * Publishes the quiz and sends in-app notifications to all students in the class.
 */
const publishQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);
    if (!quiz) throw new ApiError(404, "Quiz not found.");

    await assertTeacherOwnsClassSubject(req.user, quiz.classId, quiz.subject);

    if (quiz.questions.length === 0) {
      throw new ApiError(400, "Cannot publish an empty quiz. Please add questions first.");
    }

    quiz.status = "published";
    if (!quiz.availableFrom) quiz.availableFrom = new Date();
    await quiz.save();

    // In-app notification to students in the class
    const studentsInClass = await Student.find({
      classId: quiz.classId,
      isAccountActivated: true,
      userId: { $ne: null },
    }).select("userId");

    const studentUserIds = studentsInClass.map((s) => s.userId).filter(Boolean);
    if (studentUserIds.length > 0) {
      notifyMany(studentUserIds, {
        type: "quiz_published",
        title: `Online Quiz: ${quiz.title}`,
        message: `A new quiz for ${quiz.subject} has been published (${quiz.durationMinutes} mins, ${quiz.questions.length} questions).`,
        data: {
          quizId: quiz._id,
          title: quiz.title,
          subject: quiz.subject,
          durationMinutes: quiz.durationMinutes,
        },
        schoolId: quiz.schoolId,
        sendEmailFlag: false,
      }).catch((err) => console.warn("[publishQuiz] notify error:", err.message));
    }

    res.status(200).json(new ApiResponse(200, quiz, "Quiz published and students notified."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/quizzes/:id/attempts
 * Teacher view of all student attempts for this quiz.
 */
const getQuizAttempts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);
    if (!quiz) throw new ApiError(404, "Quiz not found.");

    await assertTeacherOwnsClassSubject(req.user, quiz.classId, quiz.subject);

    const attempts = await QuizAttempt.find({ quizId: quiz._id })
      .populate("studentId", "name rollNumber admissionNumber")
      .sort({ score: -1, submittedAt: 1 });

    res.status(200).json(new ApiResponse(200, attempts, "Quiz attempts fetched successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/quizzes/:id/analysis
 * Analysis: per-question percent correct, hardest questions, average time taken.
 */
const getQuizAnalysis = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);
    if (!quiz) throw new ApiError(404, "Quiz not found.");

    await assertTeacherOwnsClassSubject(req.user, quiz.classId, quiz.subject);

    const attempts = await QuizAttempt.find({
      quizId: quiz._id,
      submittedAt: { $ne: null },
    });

    const totalSubmissions = attempts.length;
    let totalDurationSeconds = 0;
    let totalScoreSum = 0;

    // Per question stats: questionId -> { text, correctCount, totalAnswers }
    const qStats = new Map();
    quiz.questions.forEach((q) => {
      qStats.set(q._id.toString(), {
        questionId: q._id,
        text: q.text,
        marks: q.marks,
        correctIndex: q.correctIndex,
        correctCount: 0,
        totalAnswers: 0,
      });
    });

    attempts.forEach((att) => {
      totalScoreSum += att.score || 0;
      if (att.submittedAt && att.startedAt) {
        const diffSec = Math.max(0, Math.round((new Date(att.submittedAt) - new Date(att.startedAt)) / 1000));
        totalDurationSeconds += diffSec;
      }

      // Check answers
      const optionOrderMap = new Map();
      (att.optionOrders || []).forEach((o) => optionOrderMap.set(o.questionId.toString(), o.order));

      (att.answers || []).forEach((ans) => {
        const stat = qStats.get(ans.questionId.toString());
        if (stat && ans.selectedIndex !== null && ans.selectedIndex !== undefined) {
          stat.totalAnswers += 1;
          const order = optionOrderMap.get(ans.questionId.toString());
          const originalIdx = order ? order[ans.selectedIndex] : ans.selectedIndex;
          if (originalIdx === stat.correctIndex) {
            stat.correctCount += 1;
          }
        }
      });
    });

    const questionAnalysis = Array.from(qStats.values()).map((q) => {
      const pctCorrect = totalSubmissions > 0 ? Math.round((q.correctCount / totalSubmissions) * 100) : 0;
      return {
        questionId: q.questionId,
        text: q.text,
        marks: q.marks,
        correctCount: q.correctCount,
        totalSubmissions,
        percentCorrect: pctCorrect,
      };
    });

    // Sort to identify hardest questions (lowest percent correct)
    const hardestQuestions = [...questionAnalysis].sort((a, b) => a.percentCorrect - b.percentCorrect).slice(0, 3);

    const averageTimeMinutes =
      totalSubmissions > 0 ? Number((totalDurationSeconds / (totalSubmissions * 60)).toFixed(1)) : 0;
    const averageScore = totalSubmissions > 0 ? Number((totalScoreSum / totalSubmissions).toFixed(1)) : 0;
    const maxPossibleScore = quiz.questions.reduce((sum, item) => sum + (item.marks || 1), 0);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          quizId: quiz._id,
          title: quiz.title,
          totalSubmissions,
          maxPossibleScore,
          averageScore,
          averageScorePercentage: maxPossibleScore > 0 ? Math.round((averageScore / maxPossibleScore) * 100) : 0,
          averageTimeMinutes,
          hardestQuestions,
          perQuestionAnalysis: questionAnalysis,
        },
        "Quiz analysis computed successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/quizzes/:id/export
 * Excel export of quiz results and student attempts.
 */
const exportQuizExcel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id).populate("classId", "className section");
    if (!quiz) throw new ApiError(404, "Quiz not found.");

    await assertTeacherOwnsClassSubject(req.user, quiz.classId, quiz.subject);

    const attempts = await QuizAttempt.find({ quizId: quiz._id })
      .populate("studentId", "name rollNumber admissionNumber")
      .sort({ score: -1 });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "School ERP Quiz System";

    const sheet = workbook.addWorksheet("Quiz Attempts");

    // Title
    sheet.mergeCells("A1:G1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `Quiz Report: ${quiz.title} (${quiz.subject}) - Class: ${quiz.classId?.className || ""}`;
    titleCell.font = { size: 13, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E79" },
    };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 28;

    // Headers
    const headers = [
      "Roll No",
      "Admission No",
      "Student Name",
      "Score",
      `Max (${quiz.questions.reduce((sum, item) => sum + (item.marks || 1), 0)})`,
      "Percentage",
      "Submitted At",
      "Auto-Submitted",
      "Hidden Tab Shifts",
    ];

    const headerRow = sheet.getRow(3);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2E75B6" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getColumn(i + 1).width = 18;
    });
    headerRow.height = 25;

    attempts.forEach((att, idx) => {
      const row = sheet.getRow(idx + 4);
      const maxScore = att.maxScore || quiz.questions.reduce((sum, item) => sum + (item.marks || 1), 0);
      const pct = maxScore > 0 ? Math.round((att.score / maxScore) * 100) : 0;

      row.getCell(1).value = att.studentId?.rollNumber || "-";
      row.getCell(2).value = att.studentId?.admissionNumber || "-";
      row.getCell(3).value = att.studentId?.name || "Student";
      row.getCell(4).value = att.score;
      row.getCell(5).value = maxScore;
      row.getCell(6).value = `${pct}%`;
      row.getCell(7).value = att.submittedAt ? new Date(att.submittedAt).toLocaleString("en-IN") : "In Progress";
      row.getCell(8).value = att.autoSubmitted ? "YES" : "NO";
      row.getCell(9).value = att.hiddenTabCount || 0;

      for (let c = 1; c <= 9; c++) {
        row.getCell(c).alignment = { horizontal: c === 3 ? "left" : "center" };
      }
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="Quiz_${quiz.title.replace(/\s+/g, "_")}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/quizzes/ai-questions
 * Generates MCQs with Gemini.
 * Validates every question has text, exactly 4 options, and valid correctIndex (0-3).
 * Drops invalid ones. Retries once if all fail.
 * Rate-limited to 20/day/teacher.
 * Teacher reviews and edits before adding to quiz.
 */
const generateAiQuizQuestions = async (req, res, next) => {
  try {
    const { classId, subject, topic, level = "Secondary", count = 5, difficulty = "medium" } = req.body;

    if (!classId || !subject || !topic) {
      throw new ApiError(400, "classId, subject, and topic are required.");
    }

    const { teacher, classSection } = await assertTeacherOwnsClassSubject(
      req.user,
      classId,
      subject
    );

    const questionCount = Math.min(10, Math.max(1, Number(count) || 5));

    // Rate-limit check (20 calls / day / teacher)
    const rateLimit = await checkAiRateLimit(teacher._id, "quiz_draft", 20);

    const prompt = `
You are an expert school examination creator and question paper setter.
Create ${questionCount} multiple choice questions (MCQ) for:
- Subject: ${subject}
- Class/Grade: ${classSection.className}${classSection.section ? ` (Section ${classSection.section})` : ""}
- Academic Level: ${level}
- Topic: "${topic}"
- Difficulty: ${difficulty} (easy / medium / hard)

STRICT REQUIREMENTS:
1. Each question MUST have exactly 4 distinct options in the "options" array.
2. "correctIndex" MUST be an integer between 0 and 3 indicating which option is correct.
3. Provide a clear, short "explanation" for why that option is correct.
4. Return ONLY a strict JSON array.

Return format:
[
  {
    "text": "What is the primary function of mitochondria in eukaryotic cells?",
    "options": [
      "Protein synthesis",
      "Cellular energy (ATP) production",
      "Lipid storage",
      "DNA replication only"
    ],
    "correctIndex": 1,
    "explanation": "Mitochondria generate most of the chemical energy needed by the cell through ATP production."
  }
]
`;

    const validatedQuestions = await generateValidatedJson(prompt, quizQuestionsListSchema, { maxRetries: 1 });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          notice: "AI-generated questions: review, edit, or discard each item before publishing.",
          questions: validatedQuestions.map((q) => ({
            ...q,
            marks: 1,
          })),
          remainingQuotaToday: rateLimit.remaining,
        },
        "AI quiz questions generated successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createQuiz,
  getQuizzes,
  getQuizById,
  updateQuiz,
  deleteQuiz,
  publishQuiz,
  getQuizAttempts,
  getQuizAnalysis,
  exportQuizExcel,
  generateAiQuizQuestions,
};
