const Quiz = require("../models/Quiz.model");
const QuizAttempt = require("../models/QuizAttempt.model");
const Student = require("../models/Student.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

/**
 * Fisher-Yates shuffle array helper
 */
const shuffleArray = (arr) => {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

/**
 * GET /api/student/quizzes
 * Returns quizzes categorized into available, upcoming, completed for the student's class.
 */
const getStudentQuizzes = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id || req.user._id });
    if (!student) throw new ApiError(404, "Student profile not found.");

    const now = new Date();

    // Find all non-draft quizzes for student's class
    const quizzes = await Quiz.find({
      classId: student.classId,
      status: { $in: ["published", "closed"] },
    })
      .populate("teacherId", "name")
      .sort({ availableFrom: -1 });

    const quizIds = quizzes.map((q) => q._id);
    const attempts = await QuizAttempt.find({
      quizId: { $in: quizIds },
      studentId: student._id,
    });

    const attemptMap = new Map();
    attempts.forEach((a) => attemptMap.set(a.quizId.toString(), a));

    const available = [];
    const upcoming = [];
    const completed = [];

    quizzes.forEach((quiz) => {
      const qObj = quiz.toObject();
      const attempt = attemptMap.get(quiz._id.toString());
      const totalMarks = quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
      const isPastEnd = quiz.availableUntil && new Date(quiz.availableUntil) < now;
      const isClosed = quiz.status === "closed" || isPastEnd;

      // Strip questions from listing
      delete qObj.questions;
      qObj.totalMarks = totalMarks;
      qObj.questionCount = quiz.questions.length;

      if (attempt && attempt.submittedAt) {
        // Can view result details based on showResults rule
        const canViewFull =
          quiz.showResults === "immediately" || isClosed;

        completed.push({
          ...qObj,
          attempt: {
            attemptId: attempt._id,
            score: attempt.score,
            maxScore: attempt.maxScore,
            submittedAt: attempt.submittedAt,
            autoSubmitted: attempt.autoSubmitted,
            canViewAnswers: canViewFull,
          },
        });
      } else if (isClosed) {
        // Closed without attempt -> completed/missed
        completed.push({
          ...qObj,
          missed: true,
          attempt: null,
        });
      } else if (quiz.availableFrom && new Date(quiz.availableFrom) > now) {
        // Upcoming
        upcoming.push(qObj);
      } else {
        // Available now (or in progress)
        available.push({
          ...qObj,
          inProgress: attempt && !attempt.submittedAt,
          startedAt: attempt?.startedAt || null,
        });
      }
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          available,
          upcoming,
          completed,
        },
        "Student quizzes fetched successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/student/quizzes/:id/start
 * Starts a quiz session.
 * Enforces SERVER-side startedAt timing.
 * CRITICAL SECURITY: Questions returned WITHOUT correctIndex or explanation!
 */
const startQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student = await Student.findOne({ userId: req.user.id || req.user._id });
    if (!student) throw new ApiError(404, "Student profile not found.");

    const quiz = await Quiz.findById(id);
    if (!quiz) throw new ApiError(404, "Quiz not found.");

    if (quiz.classId.toString() !== student.classId.toString()) {
      throw new ApiError(403, "Access denied. This quiz is not assigned to your class.");
    }

    if (quiz.status !== "published") {
      throw new ApiError(400, "This quiz is not currently open for taking.");
    }

    const now = new Date();
    if (quiz.availableFrom && new Date(quiz.availableFrom) > now) {
      throw new ApiError(400, "This quiz has not started yet.");
    }
    if (quiz.availableUntil && new Date(quiz.availableUntil) < now) {
      throw new ApiError(400, "This quiz deadline has passed.");
    }

    let attempt = await QuizAttempt.findOne({ quizId: quiz._id, studentId: student._id });

    if (attempt && attempt.submittedAt) {
      throw new ApiError(400, "You have already completed this quiz.");
    }

    // If new attempt, initialize ordering & server time
    if (!attempt) {
      let questionOrder = quiz.questions.map((q) => q._id);
      if (quiz.shuffleQuestions) {
        questionOrder = shuffleArray(questionOrder);
      }

      const optionOrders = [];
      quiz.questions.forEach((q) => {
        let order = [0, 1, 2, 3];
        if (quiz.shuffleOptions) {
          order = shuffleArray(order);
        }
        optionOrders.push({
          questionId: q._id,
          order,
        });
      });

      attempt = await QuizAttempt.create({
        quizId: quiz._id,
        studentId: student._id,
        schoolId: quiz.schoolId,
        startedAt: now,
        questionOrder,
        optionOrders,
        answers: [],
        score: 0,
        maxScore: quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0),
      });
    }

    // Build question payload stripped of security fields
    const qMap = new Map();
    quiz.questions.forEach((q) => qMap.set(q._id.toString(), q));

    const optOrderMap = new Map();
    (attempt.optionOrders || []).forEach((o) => optOrderMap.set(o.questionId.toString(), o.order));

    const orderedQuestionIds =
      attempt.questionOrder && attempt.questionOrder.length > 0
        ? attempt.questionOrder
        : quiz.questions.map((q) => q._id);

    const safeQuestions = orderedQuestionIds.map((qid) => {
      const q = qMap.get(qid.toString());
      if (!q) return null;

      const order = optOrderMap.get(qid.toString()) || [0, 1, 2, 3];
      // Display options in the assigned permutation order
      const displayedOptions = order.map((origIdx) => q.options[origIdx]);

      return {
        _id: q._id,
        text: q.text,
        options: displayedOptions, // Shuffled if configured
        marks: q.marks || 1,
      };
    }).filter(Boolean);

    // Calculate remaining seconds based on server startedAt
    const totalDurationSeconds = quiz.durationMinutes * 60;
    const elapsedSeconds = Math.floor((now.getTime() - new Date(attempt.startedAt).getTime()) / 1000);
    const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          attemptId: attempt._id,
          quizId: quiz._id,
          title: quiz.title,
          durationMinutes: quiz.durationMinutes,
          startedAt: attempt.startedAt,
          remainingSeconds,
          questions: safeQuestions,
          savedAnswers: attempt.answers || [],
          hiddenTabCount: attempt.hiddenTabCount || 0,
        },
        "Quiz started successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/student/quizzes/:id/autosave
 * Periodic autosave every 15s to preserve answer state.
 */
const autosaveQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answers, hiddenTabCount } = req.body;

    const student = await Student.findOne({ userId: req.user.id || req.user._id });
    if (!student) throw new ApiError(404, "Student profile not found.");

    const attempt = await QuizAttempt.findOne({ quizId: id, studentId: student._id });
    if (!attempt) throw new ApiError(404, "Active quiz attempt not found.");

    if (attempt.submittedAt) {
      throw new ApiError(400, "Quiz has already been submitted.");
    }

    if (Array.isArray(answers)) {
      attempt.answers = answers.map((a) => ({
        questionId: a.questionId,
        selectedIndex: a.selectedIndex !== null && a.selectedIndex !== undefined ? Number(a.selectedIndex) : null,
      }));
    }

    if (hiddenTabCount !== undefined && Number(hiddenTabCount) >= 0) {
      attempt.hiddenTabCount = Number(hiddenTabCount);
    }

    await attempt.save();

    res.status(200).json(new ApiResponse(200, { saved: true, answersCount: attempt.answers.length }, "Progress autosaved."));
  } catch (err) {
    next(err);
  }
};

/**
 * Helper to grade answers against quiz questions.
 */
const gradeAttempt = (quiz, attempt, submittedAnswers = null) => {
  const answersToGrade = submittedAnswers || attempt.answers || [];

  const qMap = new Map();
  quiz.questions.forEach((q) => qMap.set(q._id.toString(), q));

  const optOrderMap = new Map();
  (attempt.optionOrders || []).forEach((o) => optOrderMap.set(o.questionId.toString(), o.order));

  let totalScore = 0;

  answersToGrade.forEach((ans) => {
    if (!ans || !ans.questionId) return;
    const q = qMap.get(ans.questionId.toString());
    if (!q) return;

    if (ans.selectedIndex !== null && ans.selectedIndex !== undefined) {
      const order = optOrderMap.get(ans.questionId.toString()) || [0, 1, 2, 3];
      const originalSelectedIdx = order[ans.selectedIndex];

      if (originalSelectedIdx === q.correctIndex) {
        totalScore += q.marks || 1;
      }
    }
  });

  const maxScore = quiz.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
  return { totalScore, maxScore };
};

/**
 * POST /api/student/quizzes/:id/submit
 * Submits the quiz attempt.
 * If submitted after startedAt + duration + 10s grace -> rejected, and last autosaved answers are graded with autoSubmitted=true.
 */
const submitQuiz = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answers, hiddenTabCount } = req.body;

    const student = await Student.findOne({ userId: req.user.id || req.user._id });
    if (!student) throw new ApiError(404, "Student profile not found.");

    const quiz = await Quiz.findById(id);
    if (!quiz) throw new ApiError(404, "Quiz not found.");

    const attempt = await QuizAttempt.findOne({ quizId: quiz._id, studentId: student._id });
    if (!attempt) throw new ApiError(404, "Active quiz attempt not found.");

    if (attempt.submittedAt) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            score: attempt.score,
            maxScore: attempt.maxScore,
            submittedAt: attempt.submittedAt,
            autoSubmitted: attempt.autoSubmitted,
          },
          "Quiz was already submitted."
        )
      );
    }

    const now = new Date();
    const durationMs = quiz.durationMinutes * 60 * 1000;
    const graceMs = 10 * 1000; // 10 seconds grace period
    const maxAllowedTimestamp = new Date(attempt.startedAt).getTime() + durationMs + graceMs;

    const isLate = now.getTime() > maxAllowedTimestamp;

    if (hiddenTabCount !== undefined) {
      attempt.hiddenTabCount = Number(hiddenTabCount);
    }

    if (isLate) {
      // Late submission: Reject direct answers, grade last autosaved answers with autoSubmitted=true
      const { totalScore, maxScore } = gradeAttempt(quiz, attempt, attempt.answers);
      attempt.score = totalScore;
      attempt.maxScore = maxScore;
      attempt.autoSubmitted = true;
      attempt.submittedAt = now;
      await attempt.save();

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            score: totalScore,
            maxScore,
            autoSubmitted: true,
            submittedAt: now,
            message: "Time expired. Your last autosaved answers were automatically graded.",
          },
          "Quiz auto-submitted due to time expiry."
        )
      );
    }

    // On-time submission: update answers if provided
    let finalAnswers = attempt.answers;
    if (Array.isArray(answers)) {
      finalAnswers = answers.map((a) => ({
        questionId: a.questionId,
        selectedIndex: a.selectedIndex !== null && a.selectedIndex !== undefined ? Number(a.selectedIndex) : null,
      }));
      attempt.answers = finalAnswers;
    }

    const { totalScore, maxScore } = gradeAttempt(quiz, attempt, finalAnswers);
    attempt.score = totalScore;
    attempt.maxScore = maxScore;
    attempt.autoSubmitted = false;
    attempt.submittedAt = now;
    await attempt.save();

    res.status(200).json(
      new ApiResponse(
        200,
        {
          score: totalScore,
          maxScore,
          percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
          autoSubmitted: false,
          submittedAt: now,
        },
        "Quiz submitted successfully!"
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/student/quizzes/:id/result
 * Respects showResults rule ("immediately" vs "after_close").
 */
const getQuizResult = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student = await Student.findOne({ userId: req.user.id || req.user._id });
    if (!student) throw new ApiError(404, "Student profile not found.");

    const quiz = await Quiz.findById(id);
    if (!quiz) throw new ApiError(404, "Quiz not found.");

    const attempt = await QuizAttempt.findOne({ quizId: quiz._id, studentId: student._id });
    if (!attempt || !attempt.submittedAt) {
      throw new ApiError(400, "You have not submitted this quiz yet.");
    }

    const now = new Date();
    const isPastEnd = quiz.availableUntil && new Date(quiz.availableUntil) < now;
    const isClosed = quiz.status === "closed" || isPastEnd;

    const canRevealAnswers = quiz.showResults === "immediately" || isClosed;

    if (!canRevealAnswers) {
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            quizId: quiz._id,
            title: quiz.title,
            subject: quiz.subject,
            score: attempt.score,
            maxScore: attempt.maxScore,
            percentage: attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100) : 0,
            submittedAt: attempt.submittedAt,
            autoSubmitted: attempt.autoSubmitted,
            canRevealAnswers: false,
            message: "Detailed solutions and correct answers will be available once the quiz closes.",
          },
          "Quiz summary fetched."
        )
      );
    }

    // Build full result with correct answers and explanations
    const qMap = new Map();
    quiz.questions.forEach((q) => qMap.set(q._id.toString(), q));

    const optOrderMap = new Map();
    (attempt.optionOrders || []).forEach((o) => optOrderMap.set(o.questionId.toString(), o.order));

    const studentAnsMap = new Map();
    (attempt.answers || []).forEach((a) => studentAnsMap.set(a.questionId.toString(), a.selectedIndex));

    const orderedQuestionIds =
      attempt.questionOrder && attempt.questionOrder.length > 0
        ? attempt.questionOrder
        : quiz.questions.map((q) => q._id);

    const detailedQuestions = orderedQuestionIds.map((qid) => {
      const q = qMap.get(qid.toString());
      if (!q) return null;

      const order = optOrderMap.get(qid.toString()) || [0, 1, 2, 3];
      const displayedOptions = order.map((origIdx) => q.options[origIdx]);

      // Find which displayed option corresponds to original correctIndex
      const correctDisplayedIdx = order.indexOf(q.correctIndex);
      const studentSelectedDisplayedIdx = studentAnsMap.get(qid.toString()) ?? null;

      const isCorrect =
        studentSelectedDisplayedIdx !== null && studentSelectedDisplayedIdx === correctDisplayedIdx;

      return {
        _id: q._id,
        text: q.text,
        options: displayedOptions,
        correctDisplayedIndex: correctDisplayedIdx,
        studentSelectedIndex: studentSelectedDisplayedIdx,
        isCorrect,
        explanation: q.explanation || "",
        marks: q.marks || 1,
        earnedMarks: isCorrect ? q.marks || 1 : 0,
      };
    }).filter(Boolean);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          quizId: quiz._id,
          title: quiz.title,
          subject: quiz.subject,
          score: attempt.score,
          maxScore: attempt.maxScore,
          percentage: attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100) : 0,
          submittedAt: attempt.submittedAt,
          autoSubmitted: attempt.autoSubmitted,
          canRevealAnswers: true,
          questions: detailedQuestions,
        },
        "Full quiz results and answer key fetched."
      )
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStudentQuizzes,
  startQuiz,
  autosaveQuiz,
  submitQuiz,
  getQuizResult,
};
