const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  bulkEntryResults,
  generateAiRemarksForExam,
  publishResults,
  getStudentResults,
  getReportCardPdf,
  getClassExamAnalytics,
  getResultsByExam,
} = require("../controllers/result.controller");

const router = express.Router();

router.use(authMiddleware);

// ── Marks Entry ────────────────────────────────────────────────────────────
router.post(
  "/bulk-entry",
  authorizeRoles("teacher", "admin", "superadmin", "principal"),
  bulkEntryResults
);

router.get(
  "/exam/:examId/all",
  authorizeRoles("teacher", "admin", "superadmin", "principal"),
  getResultsByExam
);

// ── AI Remarks Generation ──────────────────────────────────────────────────
router.post(
  "/:examId/generate-remarks",
  authorizeRoles("admin", "superadmin", "principal"),
  generateAiRemarksForExam
);

// ── Result Publishing ──────────────────────────────────────────────────────
router.post(
  "/:examId/publish",
  authorizeRoles("admin", "superadmin", "principal"),
  publishResults
);

// ── Student / Parent Results ───────────────────────────────────────────────
router.get("/student/:studentId", getStudentResults);

// ── Report Card PDF Streaming ──────────────────────────────────────────────
router.get("/reportcard/:studentId/:examId", getReportCardPdf);

// ── Class Performance Analytics ────────────────────────────────────────────
router.get(
  "/class/:classId/exam/:examId/analytics",
  authorizeRoles("admin", "superadmin", "teacher", "principal"),
  getClassExamAnalytics
);

module.exports = router;
