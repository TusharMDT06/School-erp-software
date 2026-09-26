const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  createLeaveRequest,
  getLeaveRequests,
  decide,
} = require("../controllers/leaveRequest.controller");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createLeaveRequest);
router.get("/", getLeaveRequests);

// Decide endpoint (supports both PATCH and PUT)
router.patch("/:id/decide", authorizeRoles("admin", "superadmin", "teacher"), decide);
router.put("/:id/decide", authorizeRoles("admin", "superadmin", "teacher"), decide);

module.exports = router;
