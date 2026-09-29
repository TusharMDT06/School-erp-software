const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
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
} = require("../controllers/quiz.controller");

const router = express.Router();

router.use(authMiddleware);

// AI MCQ generation endpoint (Rate limited 20/day)
router.post(
  "/ai-questions",
  authorizeRoles("teacher"),
  generateAiQuizQuestions
);

// Quizzes CRUD
router.post(
  "/",
  authorizeRoles("teacher"),
  createQuiz
);

router.get(
  "/",
  authorizeRoles("teacher", "principal", "admin", "superadmin"),
  getQuizzes
);

router.get(
  "/:id",
  authorizeRoles("teacher", "principal", "admin", "superadmin"),
  getQuizById
);

router.put(
  "/:id",
  authorizeRoles("teacher"),
  updateQuiz
);

router.delete(
  "/:id",
  authorizeRoles("teacher"),
  deleteQuiz
);

// Publish quiz
router.post(
  "/:id/publish",
  authorizeRoles("teacher"),
  publishQuiz
);

// Teacher analysis and attempts
router.get(
  "/:id/attempts",
  authorizeRoles("teacher", "principal", "admin", "superadmin"),
  getQuizAttempts
);

router.get(
  "/:id/analysis",
  authorizeRoles("teacher", "principal", "admin", "superadmin"),
  getQuizAnalysis
);

router.get(
  "/:id/export",
  authorizeRoles("teacher", "principal", "admin", "superadmin"),
  exportQuizExcel
);

module.exports = router;
