const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const ctrl = require("../controllers/payroll.controller");

router.use(authMiddleware);

// Staff self-service
router.get("/my-payslips", ctrl.getMyPayslips);
router.get("/payslips/:id/pdf", ctrl.getPayslipPdf);

// Payroll Management (Accountant / Admin / Superadmin / Principal)
const canManage = authorizeRoles("accountant", "admin", "superadmin", "principal");
const canApprove = authorizeRoles("admin", "superadmin", "principal");

router.post("/runs", canManage, ctrl.createPayrollRun);
router.get("/runs", canManage, ctrl.getPayrollRuns);
router.get("/runs/:id", canManage, ctrl.getPayrollRunById);
router.put("/payslips/:id", canManage, ctrl.updatePayslip);
router.put("/runs/:id/approve", canApprove, ctrl.approvePayrollRun);
router.put("/runs/:id/pay", canManage, ctrl.payPayrollRun);
router.get("/runs/:id/export", canManage, ctrl.exportPayrollRun);

module.exports = router;
