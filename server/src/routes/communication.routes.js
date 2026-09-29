const express = require("express");
const router = express.Router();
const commCtrl = require("../controllers/communication.controller");
const { verifyToken, authorizeRoles } = require("../middlewares/auth.middleware");

// Public / Authenticated route to view teacher office hours
router.get("/office-hours/:teacherId", verifyToken, commCtrl.getTeacherOfficeHours);

// Teacher Communication Preferences & Settings
router.get(
  "/preferences",
  verifyToken,
  authorizeRoles("teacher", "admin", "principal"),
  commCtrl.getTeacherPreference
);

router.put(
  "/preferences",
  verifyToken,
  authorizeRoles("teacher", "admin", "principal"),
  commCtrl.updateTeacherPreference
);

// Class Notices & Templates
router.get(
  "/notices/templates",
  verifyToken,
  authorizeRoles("teacher", "admin", "principal"),
  commCtrl.getNoticeTemplates
);

router.post(
  "/notices",
  verifyToken,
  authorizeRoles("teacher", "admin", "principal"),
  commCtrl.createClassNotice
);

router.get(
  "/notices",
  verifyToken,
  authorizeRoles("teacher", "admin", "principal"),
  commCtrl.getMyClassNotices
);

module.exports = router;
