const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  getApprovals,
  getApprovalCounts,
  decideApproval,
  bulkDecideApprovals,
} = require("../controllers/approval.controller");

const router = express.Router();

router.use(authMiddleware);
router.use(authorizeRoles("principal", "admin", "superadmin"));

router.get("/", getApprovals);
router.get("/counts", getApprovalCounts);
router.post("/decide", decideApproval);
router.post("/bulk-decide", bulkDecideApprovals);

module.exports = router;
