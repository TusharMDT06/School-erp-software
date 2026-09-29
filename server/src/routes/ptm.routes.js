const express = require("express");
const router = express.Router();
const ptmCtrl = require("../controllers/ptm.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

// Protect all PTM routes
router.use(authMiddleware);

// Create PTM Event (Principal, Admin, Superadmin)
router.post(
  "/",
  authorizeRoles("admin", "principal", "superadmin"),
  ptmCtrl.createPTMEvent
);

// List PTM Events
router.get(
  "/",
  authorizeRoles("admin", "principal", "superadmin", "teacher", "parent"),
  ptmCtrl.getPTMEvents
);

// Get single PTM Event details
router.get(
  "/:id",
  authorizeRoles("admin", "principal", "superadmin", "teacher", "parent"),
  ptmCtrl.getPTMEventById
);

// Get slots for a PTM Event
router.get(
  "/:id/slots",
  authorizeRoles("admin", "principal", "superadmin", "teacher", "parent"),
  ptmCtrl.getSlots
);

// Book a slot (Parent, Admin)
router.post(
  "/slots/:id/book",
  authorizeRoles("parent", "admin", "principal"),
  ptmCtrl.bookSlot
);

// Cancel a slot (Parent <= 6h, Teacher anytime with reason)
router.put(
  "/slots/:id/cancel",
  authorizeRoles("parent", "teacher", "admin", "principal"),
  ptmCtrl.cancelSlot
);

// Teacher agenda route
router.get(
  "/teacher/agenda",
  authorizeRoles("teacher", "principal", "admin"),
  ptmCtrl.getTeacherAgenda
);

// Complete a slot (Teacher)
router.put(
  "/slots/:id/complete",
  authorizeRoles("teacher", "admin", "principal"),
  ptmCtrl.completeSlot
);

module.exports = router;
