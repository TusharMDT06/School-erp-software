const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  createExam,
  getExamsByClass,
  getExamById,
  updateExam,
  deleteExam,
} = require("../controllers/exam.controller");

const router = express.Router();

router.use(authMiddleware);

// ── Exam Configuration ─────────────────────────────────────────────────────
router.post("/", authorizeRoles("admin", "superadmin"), createExam);
router.get("/class/:classId", getExamsByClass);
router.get("/:id", getExamById);
router.put("/:id", authorizeRoles("admin", "superadmin"), updateExam);
router.delete("/:id", authorizeRoles("admin", "superadmin"), deleteExam);

module.exports = router;
