const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const ctrl = require("../controllers/financeSettings.controller");

router.use(authMiddleware);

router.get("/", authorizeRoles("admin", "superadmin", "principal", "accountant"), ctrl.getFinanceSettings);
router.put("/", authorizeRoles("admin", "superadmin", "principal"), ctrl.updateFinanceSettings);

module.exports = router;
