const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { getTeacherDashboard } = require("../controllers/teacherDashboard.controller");
const { getTeacherClassesAndSubjects } = require("../utils/teacherAccess");
const { ApiResponse } = require("../utils/apiResponse");

const router = express.Router();

router.use(authMiddleware);

// ── Teacher Dashboard ──────────────────────────────────────────────────────
router.get("/dashboard", authorizeRoles("teacher"), getTeacherDashboard);

// ── Teacher Assigned Classes and Subjects (for dropdowns) ──────────────────
router.get("/classes-subjects", authorizeRoles("teacher"), async (req, res, next) => {
  try {
    const data = await getTeacherClassesAndSubjects(req.user);
    res.status(200).json(new ApiResponse(200, data, "Teacher classes and subjects fetched."));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
