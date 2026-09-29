const express = require("express");
const router = express.Router();
const commCtrl = require("../controllers/communication.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

// Protect all communication routes
router.use(authMiddleware);

// Public / Authenticated route to view teacher office hours
router.get("/office-hours/:teacherId", commCtrl.getTeacherOfficeHours);

// Teacher Communication Preferences & Settings
router.get(
  "/preferences",
  authorizeRoles("teacher", "admin", "principal"),
  commCtrl.getTeacherPreference
);

router.put(
  "/preferences",
  authorizeRoles("teacher", "admin", "principal"),
  commCtrl.updateTeacherPreference
);

// Class Notices & Templates
router.get(
  "/notices/templates",
  authorizeRoles("teacher", "admin", "principal"),
  commCtrl.getNoticeTemplates
);

router.post(
  "/notices",
  authorizeRoles("teacher", "admin", "principal"),
  commCtrl.createClassNotice
);

router.get(
  "/notices",
  authorizeRoles("teacher", "admin", "principal"),
  commCtrl.getMyClassNotices
);

module.exports = router;
