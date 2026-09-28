const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const upload = require("../middlewares/upload.middleware");
const ctrl = require("../controllers/expense.controller");

router.use(authMiddleware);

router.post(
  "/",
  authorizeRoles("accountant", "admin", "superadmin", "principal"),
  upload.single("bill"),
  ctrl.createExpense
);
router.get("/", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.getExpenses);
router.get("/:id", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.getExpenseById);
router.put("/:id/decide", authorizeRoles("admin", "superadmin", "principal"), ctrl.decideExpense);
router.put("/:id/pay", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.payExpense);
router.put("/:id/cancel", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.cancelExpense);

module.exports = router;
