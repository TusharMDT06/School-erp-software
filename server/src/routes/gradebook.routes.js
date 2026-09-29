const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  createComponent,
  getComponents,
  getComponentById,
  updateComponent,
  deleteComponent,
  saveComponentScores,
  getClassGradebook,
  getGradebookAnalytics,
  exportGradebookExcel,
} = require("../controllers/gradebook.controller");

const router = express.Router();

router.use(authMiddleware);

// Components CRUD
router.post(
  "/components",
  authorizeRoles("teacher"),
  createComponent
);

router.get(
  "/components",
  authorizeRoles("teacher", "principal", "admin", "superadmin"),
  getComponents
);

router.get(
  "/components/:id",
  authorizeRoles("teacher", "principal", "admin", "superadmin"),
  getComponentById
);

router.put(
  "/components/:id",
  authorizeRoles("teacher"),
  updateComponent
);

router.delete(
  "/components/:id",
  authorizeRoles("teacher"),
  deleteComponent
);

// Bulk spreadsheet score saving
router.put(
  "/components/:id/scores",
  authorizeRoles("teacher"),
  saveComponentScores
);

// Class Gradebook Grid View
router.get(
  "/class",
  authorizeRoles("teacher", "principal", "admin", "superadmin"),
  getClassGradebook
);

// Analytics: distribution, needs support, most-improved
router.get(
  "/analytics",
  authorizeRoles("teacher", "principal", "admin", "superadmin"),
  getGradebookAnalytics
);

// Excel export
router.get(
  "/export",
  authorizeRoles("teacher", "principal", "admin", "superadmin"),
  exportGradebookExcel
);

module.exports = router;
