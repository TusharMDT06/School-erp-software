const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  createUnit,
  getUnits,
  getUnitById,
  updateUnit,
  deleteUnit,
  updateTopicStatus,
  getSyllabusProgress,
} = require("../controllers/syllabus.controller");

const router = express.Router();

router.use(authMiddleware);

// Progress summary endpoint (accessible to teacher, principal, admin, superadmin)
router.get(
  "/progress",
  authorizeRoles("teacher", "principal", "admin", "superadmin"),
  getSyllabusProgress
);

// Units CRUD
router.get(
  "/units",
  authorizeRoles("teacher", "principal", "admin", "superadmin"),
  getUnits
);

router.post(
  "/units",
  authorizeRoles("teacher"),
  createUnit
);

router.get(
  "/units/:id",
  authorizeRoles("teacher", "principal", "admin", "superadmin"),
  getUnitById
);

router.put(
  "/units/:id",
  authorizeRoles("teacher"),
  updateUnit
);

router.delete(
  "/units/:id",
  authorizeRoles("teacher"),
  deleteUnit
);

// Topic status update
router.put(
  "/units/:id/topics/:topicId",
  authorizeRoles("teacher"),
  updateTopicStatus
);

module.exports = router;
