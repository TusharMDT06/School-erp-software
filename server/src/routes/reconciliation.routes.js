const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const ctrl = require("../controllers/reconciliation.controller");

router.use(authMiddleware);

const canAccess = authorizeRoles("accountant", "admin", "superadmin", "principal");

router.get("/online", canAccess, ctrl.getOnlineReconciliation);
router.post("/flag", canAccess, ctrl.flagReconciliationIssue);

module.exports = router;
