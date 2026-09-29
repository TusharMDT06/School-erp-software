const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  createLessonPlan,
  getLessonPlans,
  getLessonPlanById,
  updateLessonPlan,
  deleteLessonPlan,
  draftLessonPlanAi,
} = require("../controllers/lessonPlan.controller");

const router = express.Router();

router.use(authMiddleware);

// AI Lesson Plan Draft generation (Rate limited, returns editable draft)
router.post(
  "/ai-draft",
  authorizeRoles("teacher"),
  draftLessonPlanAi
);

// Lesson Plans CRUD
router.get(
  "/",
  authorizeRoles("teacher", "principal", "admin", "superadmin"),
  getLessonPlans
);

router.post(
  "/",
  authorizeRoles("teacher"),
  createLessonPlan
);

router.get(
  "/:id",
  authorizeRoles("teacher", "principal", "admin", "superadmin"),
  getLessonPlanById
);

router.put(
  "/:id",
  authorizeRoles("teacher"),
  updateLessonPlan
);

router.delete(
  "/:id",
  authorizeRoles("teacher"),
  deleteLessonPlan
);

module.exports = router;
