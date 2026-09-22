const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const {
  createFeeStructure,
  getFeeStructuresByClass,
  getStudentFeeTransactions,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getReceiptPdf,
  getFeeDefaulters,
  triggerManualReminder,
} = require("../controllers/fee.controller");

const router = express.Router();

// All fee routes require authentication
router.use(authMiddleware);

// ── Fee Structure Setup ────────────────────────────────────────────────────
router.post(
  "/structure",
  authorizeRoles("admin", "superadmin", "accountant"),
  createFeeStructure
);

router.get(
  "/structure/:classId",
  authorizeRoles("admin", "superadmin", "accountant"),
  getFeeStructuresByClass
);

// ── Student Invoices & Payment ─────────────────────────────────────────────
router.get(
  "/student/:studentId",
  authorizeRoles("admin", "superadmin", "accountant", "student", "parent"),
  getStudentFeeTransactions
);

router.post(
  "/create-order",
  authorizeRoles("admin", "superadmin", "accountant", "parent", "student"),
  createRazorpayOrder
);

router.post(
  "/verify-payment",
  authorizeRoles("admin", "superadmin", "accountant", "parent", "student"),
  verifyRazorpayPayment
);

// ── Receipt Download ───────────────────────────────────────────────────────
router.get("/receipt/:transactionId", getReceiptPdf);

// ── Defaulters & Reminders ─────────────────────────────────────────────────
router.get(
  "/defaulters",
  authorizeRoles("admin", "superadmin", "accountant"),
  getFeeDefaulters
);

router.post(
  "/reminder/:studentId",
  authorizeRoles("admin", "superadmin", "accountant"),
  triggerManualReminder
);

module.exports = router;
