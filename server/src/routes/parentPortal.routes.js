const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { getChildHomework } = require("../controllers/homework.controller");
const { getParentGradebook } = require("../controllers/gradebook.controller");

const router = express.Router();

router.use(authMiddleware);

// ── Parent Child Homework Endpoint ─────────────────────────────────────────
router.get(
  "/children/:studentId/homework",
  authorizeRoles("parent", "admin", "superadmin"),
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
  authorizeRoles("parent", "admin", "superadmin"),
  getParentGradebook
);

module.exports = router;
