const express = require("express");
const router = express.Router();
const remarkCtrl = require("../controllers/studentRemark.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

// Protect all remark routes
router.use(authMiddleware);

// Create remark (Teacher, Admin, Principal)
router.post(
  "/",
  authorizeRoles("teacher", "admin", "principal"),
  remarkCtrl.createRemark
);

// Update remark within 24h (Teacher, Admin, Principal)
router.put(
  "/:id",
  authorizeRoles("teacher", "admin", "principal"),
  remarkCtrl.updateRemark
);

// Get remarks for student (Teachers of student, Admin, Principal)
router.get(
  "/student/:id",
  authorizeRoles("teacher", "admin", "principal"),
  remarkCtrl.getStudentRemarks
);

// Parent view for student remarks (only visibleToParent)
router.get(
  "/parent/student/:id",
  authorizeRoles("parent", "admin", "principal"),
  remarkCtrl.getParentRemarks
);

// Appreciate positive remark (notifies parent or acknowledges teacher)
router.post(
  "/:id/appreciate",
  authorizeRoles("teacher", "admin", "principal", "parent"),
  remarkCtrl.appreciateRemark
);

// Escalate remark (creates Incident & notifies principal)
router.post(
  "/:id/escalate",
  authorizeRoles("teacher", "admin", "principal"),
  remarkCtrl.escalateRemark
);

// Delete remark forbidden
router.delete("/:id", remarkCtrl.deleteRemark);

module.exports = router;
