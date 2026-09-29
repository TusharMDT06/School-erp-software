const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { homeworkUpload } = require("../middlewares/homeworkUpload.middleware");
const {
  createHomework,
  updateHomework,
  closeHomework,
  deleteHomework,
  getMyHomework,
  getHomeworkSubmissions,
  reviewSubmission,
  nudgeNonSubmittingStudents,
} = require("../controllers/homework.controller");

const router = express.Router();

router.use(authMiddleware);

// ── Teacher Endpoints ──────────────────────────────────────────────────────
router.post(
  "/",
  authorizeRoles("teacher"),
  homeworkUpload.array("attachments", 5),
  createHomework
);

router.get("/mine", authorizeRoles("teacher"), getMyHomework);

router.put(
  "/:id",
  authorizeRoles("teacher"),
  homeworkUpload.array("attachments", 5),
  updateHomework
);

router.put("/:id/close", authorizeRoles("teacher"), closeHomework);

router.delete("/:id", authorizeRoles("teacher"), deleteHomework);

router.get("/:id/submissions", authorizeRoles("teacher"), getHomeworkSubmissions);

router.put("/submissions/:id/review", authorizeRoles("teacher"), reviewSubmission);

router.post("/:id/nudge", authorizeRoles("teacher"), nudgeNonSubmittingStudents);

module.exports = router;
