const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  markAttendance,
  getClassAttendanceByDate,
  getStudentAttendanceReport,
  getClassAttendanceSummary,
} = require("../controllers/attendance.controller");
const {
  createCorrectionRequest,
  decideCorrectionRequest,
  getCorrectionRequests,
} = require("../controllers/attendanceCorrection.controller");

const router = express.Router();

// All attendance routes require authentication
router.use(authMiddleware);

// ── Attendance Correction Window Routes ──────────────────────────────────
router.post(
  "/corrections",
  authorizeRoles("teacher"),
  createCorrectionRequest
);

router.get(
  "/corrections",
  authorizeRoles("teacher", "principal", "admin", "superadmin"),
  getCorrectionRequests
);

router.put(
  "/corrections/:id/decide",
  authorizeRoles("principal", "admin", "superadmin"),
  decideCorrectionRequest
);

// ── Mark attendance (Bulk upsert) ──────────────────────────────────────────
router.post(
  "/mark",
  authorizeRoles("teacher", "admin", "superadmin"),
  markAttendance
);

// ── Class attendance on a specific date (pre-fill) ──────────────────────────
router.get(
  "/class/:classId/date/:date",
  authorizeRoles("teacher", "admin", "superadmin"),
  getClassAttendanceByDate
);

// ── Class monthly summary for reports (MongoDB Aggregation) ─────────────────
router.get(
  "/class/:classId/summary",
  authorizeRoles("teacher", "admin", "superadmin"),
  getClassAttendanceSummary
);

// ── Student individual attendance report ────────────────────────────────────
router.get(
  ["/student/:studentId", "/student/:studentId/report"],
  authorizeRoles("teacher", "admin", "superadmin", "student", "parent"),
  getStudentAttendanceReport
);

module.exports = router;

