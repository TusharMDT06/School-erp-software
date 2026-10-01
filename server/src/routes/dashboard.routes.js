const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { cacheMiddleware } = require("../middlewares/cache.middleware");
const { getAdminDashboardStats, getStudentDashboardStats } = require("../controllers/dashboard.controller");

const router = express.Router();

/**
 * @route   GET /api/dashboard/admin
 * @desc    Get aggregated stats and metrics for admin dashboard (cached 60s)
 * @access  Protected (admin, superadmin)
 */
router.get(
  "/admin",
  authMiddleware,
  authorizeRoles("admin", "superadmin"),
  cacheMiddleware({ ttl: 60, prefix: "dashboard:admin" }),
  getAdminDashboardStats
);

/**
 * @route   GET /api/dashboard/student
 * @desc    Get live metrics for logged in student (cached 60s)
 * @access  Protected (student)
 */
router.get(
  "/student",
  authMiddleware,
  authorizeRoles("student"),
  cacheMiddleware({ ttl: 60, prefix: "dashboard:student" }),
  getStudentDashboardStats
);

module.exports = router;
