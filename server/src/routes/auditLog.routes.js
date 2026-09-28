const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const ctrl = require("../controllers/auditLog.controller");

router.use(authMiddleware);

// Admin & Principal: all logs with filters and pagination
router.get("/", authorizeRoles("admin", "principal", "superadmin"), ctrl.getAuditLogs);

// Staff / Accountant: own recent activity only
router.get("/mine", authorizeRoles("accountant", "admin", "principal", "superadmin", "teacher"), ctrl.getMyAuditLogs);

module.exports = router;
