const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { homeworkUpload } = require("../middlewares/homeworkUpload.middleware");
const {
  getStudentHomework,
  submitStudentHomework,
} = require("../controllers/homework.controller");
const { getStudentDashboardStats } = require("../controllers/dashboard.controller");
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

// ── Student Dashboard Endpoint ─────────────────────────────────────────────
router.get("/dashboard", authorizeRoles("student"), getStudentDashboardStats);

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

// ── Student Attendance, Fees & Results Direct Handlers ───────────────────────
const Student = require("../models/Student.model");
const { getStudentAttendanceReport } = require("../controllers/attendance.controller");
const { getStudentFeeTransactions } = require("../controllers/fee.controller");
const { getStudentResults } = require("../controllers/result.controller");

router.get("/attendance", authorizeRoles("student"), async (req, res, next) => {
  try {
    let student = await Student.findOne({ userId: req.user.id });
    if (!student && req.user?.name) {
      student = await Student.findOne({ name: req.user.name });
    }
    if (!student) {
      return res.status(200).json({
        success: true,
        data: { totalDays: 0, present: 0, absent: 0, late: 0, leave: 0, percentage: 0, dailyRecords: [] },
      });
    }
    req.params.studentId = student._id.toString();
    return getStudentAttendanceReport(req, res, next);
  } catch (err) {
    next(err);
  }
});

router.get("/fees", authorizeRoles("student"), async (req, res, next) => {
  try {
    let student = await Student.findOne({ userId: req.user.id });
    if (!student && req.user?.name) {
      student = await Student.findOne({ name: req.user.name });
    }
    if (!student) {
      return res.status(200).json({
        success: true,
        data: { totalDue: 0, totalPaid: 0, pendingAmount: 0, transactions: [] },
      });
    }
    req.params.studentId = student._id.toString();
    return getStudentFeeTransactions(req, res, next);
  } catch (err) {
    next(err);
  }
});

router.get("/results", authorizeRoles("student"), async (req, res, next) => {
  try {
    let student = await Student.findOne({ userId: req.user.id });
    if (!student && req.user?.name) {
      student = await Student.findOne({ name: req.user.name });
    }
    if (!student) {
      return res.status(200).json({ success: true, data: [] });
    }
    req.params.studentId = student._id.toString();
    return getStudentResults(req, res, next);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

