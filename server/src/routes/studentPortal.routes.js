const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { homeworkUpload } = require("../middlewares/homeworkUpload.middleware");
const {
  getStudentHomework,
  submitStudentHomework,
} = require("../controllers/homework.controller");
const {
  getStudentMaterials,
} = require("../controllers/studyMaterial.controller");
const {
  getStudentGradebook,
} = require("../controllers/gradebook.controller");
const {
  getStudentQuizzes,
  startQuiz,
  autosaveQuiz,
  submitQuiz,
  getQuizResult,
} = require("../controllers/quizStudent.controller");

const router = express.Router();

router.use(authMiddleware);

// ── Student Homework Endpoints ─────────────────────────────────────────────
router.get("/homework", authorizeRoles("student"), getStudentHomework);
router.post(
  "/homework/:id/submit",
  authorizeRoles("student"),
  homeworkUpload.array("files", 5),
  submitStudentHomework
);

// ── Student Study Materials Endpoints ──────────────────────────────────────
router.get("/materials", authorizeRoles("student"), getStudentMaterials);

// ── Student Gradebook Endpoint ─────────────────────────────────────────────
router.get("/gradebook", authorizeRoles("student"), getStudentGradebook);

// ── Student Online Quizzes Endpoints ───────────────────────────────────────
router.get("/quizzes", authorizeRoles("student"), getStudentQuizzes);
router.post("/quizzes/:id/start", authorizeRoles("student"), startQuiz);
router.put("/quizzes/:id/autosave", authorizeRoles("student"), autosaveQuiz);
router.post("/quizzes/:id/submit", authorizeRoles("student"), submitQuiz);
router.get("/quizzes/:id/result", authorizeRoles("student"), getQuizResult);

module.exports = router;
