const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const ctrl = require("../controllers/budget.controller");

router.use(authMiddleware);

router.post("/", authorizeRoles("admin", "superadmin", "principal"), ctrl.setBudget);
router.put("/", authorizeRoles("admin", "superadmin", "principal"), ctrl.setBudget);
router.get("/vs-actual", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.getBudgetVsActual);
router.get("/", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.getBudgets);

module.exports = router;
