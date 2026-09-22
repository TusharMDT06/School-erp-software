const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { getAdminDashboardStats, getStudentDashboardStats } = require("../controllers/dashboard.controller");

const router = express.Router();

/**
 * @route   GET /api/dashboard/admin
 * @desc    Get aggregated stats and metrics for admin dashboard
 * @access  Protected (admin, superadmin)
 */
router.get(
  "/admin",
  authMiddleware,
  authorizeRoles("admin", "superadmin"),
  getAdminDashboardStats
);

/**
 * @route   GET /api/dashboard/student
 * @desc    Get live metrics for logged in student
 * @access  Protected (student)
 */
router.get(
  "/student",
  authMiddleware,
  authorizeRoles("student"),
  getStudentDashboardStats
);

module.exports = router;
