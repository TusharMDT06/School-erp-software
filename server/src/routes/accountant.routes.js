const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const ctrl = require("../controllers/accountant.controller");
const paymentLinkCtrl = require("../controllers/paymentLink.controller");

const canAccess = authorizeRoles("accountant", "admin", "superadmin", "principal");
const adminOrPrincipal = authorizeRoles("admin", "superadmin", "principal");

router.use(authMiddleware);

// Student search & dues
router.get("/students/search", canAccess, ctrl.searchStudents);
router.get("/students/:studentId/dues", canAccess, ctrl.getStudentDues);

// Fee collection
router.post("/collect", canAccess, ctrl.collectFee);

// Receipts
router.get("/receipts/:transactionId", canAccess, ctrl.getReceipt);
router.post("/receipts/:transactionId/resend", canAccess, ctrl.resendReceipt);
router.post("/receipts/:transactionId/reverse", canAccess, ctrl.reverseReceipt);

// Cheque clearing
router.put("/cheques/:paymentId/clear",  canAccess, ctrl.updateChequeStatus);
router.put("/cheques/:paymentId/bounce", canAccess, ctrl.updateChequeStatus);

// UPI QR
router.get("/upi-qr", canAccess, ctrl.getUpiQr);

// Payment Links
router.post("/payment-link", canAccess, paymentLinkCtrl.createPaymentLink);
router.get("/payment-links", canAccess, paymentLinkCtrl.getPaymentLinks);

// Dashboard summary & AI Insights
router.get("/dashboard-summary", canAccess, ctrl.getDashboardSummary);
router.get("/insights", canAccess, ctrl.getFinanceInsight);
router.post("/insights/refresh", canAccess, ctrl.refreshFinanceInsight);

module.exports = router;
