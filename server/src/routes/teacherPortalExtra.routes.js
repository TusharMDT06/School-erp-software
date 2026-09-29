const express = require("express");
const router = express.Router();
const subCtrl = require("../controllers/teacherSubstitution.controller");
const classTeacherCtrl = require("../controllers/classTeacher.controller");
const ptmCtrl = require("../controllers/ptm.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

// Protect all routes
router.use(authMiddleware);

// ============================================
// Substitutions (Teacher view)
// ============================================
router.get(
  "/substitutions",
  authorizeRoles("teacher", "admin", "principal"),
  subCtrl.getTeacherSubstitutions
);

router.put(
  "/substitutions/:id/acknowledge",
  authorizeRoles("teacher", "admin", "principal"),
  subCtrl.acknowledgeSubstitution
);

router.post(
  "/substitutions/suggestions",
  authorizeRoles("teacher", "admin", "principal"),
  subCtrl.createSubstituteSuggestion
);

router.get(
  "/substitutions/suggestions",
  authorizeRoles("teacher", "admin", "principal"),
  subCtrl.getSubstituteSuggestions
);

router.put(
  "/substitutions/suggestions/:id/confirm",
  authorizeRoles("admin", "principal"),
  subCtrl.confirmSubstituteSuggestion
);

// ============================================
// Class Teacher Tools
// ============================================
router.get(
  "/my-class",
  authorizeRoles("teacher", "admin", "principal"),
  classTeacherCtrl.getMyClass
);

router.get(
  "/my-class/message-absentees/preview",
  authorizeRoles("teacher", "admin", "principal"),
  classTeacherCtrl.previewAbsenteeMessage
);

router.post(
  "/my-class/message-absentees",
  authorizeRoles("teacher", "admin", "principal"),
  classTeacherCtrl.sendAbsenteeMessage
);

router.post(
  "/report-remarks/draft",
  authorizeRoles("teacher", "admin", "principal"),
  classTeacherCtrl.draftReportRemarks
);

// PTM teacher agenda alias
router.get(
  "/ptm/agenda",
  authorizeRoles("teacher", "admin", "principal"),
  ptmCtrl.getTeacherAgenda
);

module.exports = router;
