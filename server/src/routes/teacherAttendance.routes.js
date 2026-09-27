const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  markTeacherAttendance,
  getTeacherAttendanceByDate,
  getTeacherAttendanceSummary,
  getTeacherSalary,
} = require("../controllers/teacherAttendance.controller");

const router = express.Router();

router.use(authMiddleware);

// ── Mark bulk teacher attendance (admin / superadmin / principal) ──────────
router.post(
  "/mark",
  authorizeRoles("admin", "superadmin"),
  markTeacherAttendance
);

// ── Get teacher attendance for a date ─────────────────────────────────────
router.get(
  "/",
  authorizeRoles("admin", "superadmin"),
  getTeacherAttendanceByDate
);

// ── Monthly summary (for reports) ─────────────────────────────────────────
router.get(
  "/summary",
  authorizeRoles("admin", "superadmin"),
  getTeacherAttendanceSummary
);

// ── Salary calculation for a month ────────────────────────────────────────
router.get(
  "/salary",
  authorizeRoles("admin", "superadmin"),
  getTeacherSalary
);

module.exports = router;
