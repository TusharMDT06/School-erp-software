const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const ctrl = require("../controllers/expenseCategory.controller");

router.use(authMiddleware);

router.get("/", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.getCategories);
router.post("/", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.createCategory);
router.put("/:id", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.updateCategory);
router.delete("/:id", authorizeRoles("accountant", "admin", "superadmin", "principal"), ctrl.deleteCategory);

module.exports = router;
