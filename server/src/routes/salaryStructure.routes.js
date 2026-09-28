const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const ctrl = require("../controllers/salaryStructure.controller");

router.use(authMiddleware);

const canManage = authorizeRoles("accountant", "admin", "superadmin", "principal");

router.get("/staff-users", canManage, ctrl.getEligibleStaffUsers);
router.get("/", canManage, ctrl.getSalaryStructures);
router.get("/:id", canManage, ctrl.getSalaryStructureById);
router.post("/", canManage, ctrl.createSalaryStructure);
router.put("/:id", canManage, ctrl.updateSalaryStructure);
router.delete("/:id", canManage, ctrl.deactivateSalaryStructure);

module.exports = router;
