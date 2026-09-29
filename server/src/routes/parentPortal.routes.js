const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { getChildHomework } = require("../controllers/homework.controller");

const router = express.Router();

router.use(authMiddleware);

// ── Parent Child Homework Endpoint ─────────────────────────────────────────
router.get(
  "/children/:studentId/homework",
  authorizeRoles("parent", "admin", "superadmin"),
  getChildHomework
);

module.exports = router;
