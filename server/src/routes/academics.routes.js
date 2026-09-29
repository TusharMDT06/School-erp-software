const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const roleGuard = require("../middlewares/roleGuard.middleware");
const {
  getAcademicsOverview,
  getClassComparison,
  getSubjectAnalysis,
  getAcademicsTrend,
  getExamToppers,
  getTeacherContext,
} = require("../controllers/academics.controller");

router.use(authMiddleware);
router.use(roleGuard(["principal", "admin", "superadmin", "teacher"]));

// Academic Analytics Endpoints
router.get("/overview", getAcademicsOverview);
router.get("/class-comparison", getClassComparison);
router.get("/subject-analysis", getSubjectAnalysis);
router.get("/trend", getAcademicsTrend);
router.get("/toppers", getExamToppers);
router.get("/teacher-context", getTeacherContext);

module.exports = router;
