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

module.exports = router;
