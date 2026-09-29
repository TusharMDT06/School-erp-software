const cron = require("node-cron");
const QuizAttempt = require("../models/QuizAttempt.model");
const Quiz = require("../models/Quiz.model");

/**
 * Auto-submit Cron Job
 * Runs every minute to find open quiz attempts past duration + 10s grace,
 * and automatically grades their last autosaved answers.
 */
const startQuizAutoSubmitCron = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = Date.now();
      const openAttempts = await QuizAttempt.find({ submittedAt: null }).populate("quizId");

      if (!openAttempts || openAttempts.length === 0) return;

      for (const attempt of openAttempts) {
        const quiz = attempt.quizId;
        if (!quiz) continue;

        const durationMs = (quiz.durationMinutes || 15) * 60 * 1000;
        const graceMs = 10 * 1000; // 10s grace period
        const deadline = new Date(attempt.startedAt).getTime() + durationMs + graceMs;

        if (now > deadline) {
          // Attempt is expired! Auto-grade and finalize
          const answersToGrade = attempt.answers || [];

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
          attempt.score = totalScore;
          attempt.maxScore = maxScore;
          attempt.autoSubmitted = true;
          attempt.submittedAt = new Date();

          await attempt.save();
          console.log(`[QuizAutoSubmit] Auto-submitted attempt ${attempt._id} for student ${attempt.studentId}. Score: ${totalScore}/${maxScore}`);
        }
      }
    } catch (err) {
      console.warn("[QuizAutoSubmitCron] Error running auto-submit check:", err.message);
    }
  });

  console.log("⏰ Quiz Auto-Submit background cron initialized (every minute).");
};

module.exports = { startQuizAutoSubmitCron };
