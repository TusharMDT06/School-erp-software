const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { getChildHomework } = require("../controllers/homework.controller");
const { getParentGradebook } = require("../controllers/gradebook.controller");
const { getParentRemarks } = require("../controllers/studentRemark.controller");

const router = express.Router();

router.use(authMiddleware);

const { getParentChildren, getParentOverview } = require("../controllers/parentPortal.controller");

// ── Parent Children List ───────────────────────────────────────────────────
router.get(
  "/children",
  authorizeRoles("parent", "admin", "superadmin", "principal"),
  getParentChildren
);

// ── Parent Overview / Dashboard Summary ───────────────────────────────────
router.get(
  "/overview",
  authorizeRoles("parent", "admin", "superadmin", "principal"),
  getParentOverview
);

// ── Parent Child Homework Endpoint ─────────────────────────────────────────
router.get(
  ["/children/:studentId/homework", "/homework/:studentId"],
  authorizeRoles("parent", "admin", "superadmin", "principal"),
  getChildHomework
);

// ── Parent Child Gradebook Endpoint ────────────────────────────────────────
router.get(
  "/children/:studentId/gradebook",
  (req, res, next) => {
    // Map URL param to query param expected by controller
    req.query.studentId = req.params.studentId;
    next();
  },
  authorizeRoles("parent", "admin", "superadmin", "principal"),
  getParentGradebook
);

// ── Parent Child Remarks Endpoint (Phase 9C) ──────────────────────────────
router.get(
  ["/children/:id/remarks", "/remarks/:id"],
  authorizeRoles("parent", "admin", "superadmin", "principal"),
  getParentRemarks
);

module.exports = router;
