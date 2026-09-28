const mongoose = require("mongoose");
const razorpay = require("../config/razorpay");
const FeeTransaction = require("../models/FeeTransaction.model");
const Student = require("../models/Student.model");
const auditLog = require("../utils/auditLog");
const { notifyMany } = require("../services/notification.service");
const { ApiError, ApiResponse } = require("../utils/apiResponse");
const { toRupees } = require("../utils/money");

/**
 * GET /api/reconciliation/online
 * Fetch captured payments from Razorpay and compare against FeeTransaction.
 */
const getOnlineReconciliation = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { from, to } = req.query;

    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();
    toDate.setHours(23, 59, 59, 999);

    const fromTimestamp = Math.floor(fromDate.getTime() / 1000);
    const toTimestamp = Math.floor(toDate.getTime() / 1000);

    // 1. Fetch payments from Razorpay
    let rzpPayments = [];
    if (razorpay) {
      try {
        const response = await razorpay.payments.all({
          from: fromTimestamp,
          to: toTimestamp,
          count: 100,
        });
        rzpPayments = response.items || [];
      } catch (err) {
        console.warn("[Reconciliation] Razorpay API warning:", err.message);
      }
    }

    // Filter to captured/authorized payments only
    const capturedRzpPayments = rzpPayments.filter(
      (p) => p.status === "captured" || p.status === "authorized"
    );

    // 2. Fetch FeeTransactions with online payments in the date window
    const dbTransactions = await FeeTransaction.find({
      $or: [
        { razorpayPaymentId: { $ne: null } },
        { paymentMode: "online", status: "paid" },
      ],
      updatedAt: { $gte: fromDate, $lte: toDate },
    })
      .populate({
        path: "studentId",
        match: { schoolId },
        select: "admissionNumber rollNumber userId classId",
        populate: [
          { path: "userId", select: "name email phone" },
          { path: "classId", select: "className section" },
        ],
      })
      .lean();

    const validDbTxns = dbTransactions.filter((t) => t.studentId);

    // Build Maps
    const rzpMap = new Map();
    capturedRzpPayments.forEach((p) => rzpMap.set(p.id, p));

    const dbMap = new Map();
    validDbTxns.forEach((t) => {
      if (t.razorpayPaymentId) {
        dbMap.set(t.razorpayPaymentId, t);
      }
    });

    // 3. Classify into 4 lists
    const matched = [];
    const missingInDb = []; // PAID_ON_RAZORPAY_BUT_MISSING_IN_DB (CRITICAL)
    const notFoundOnRzp = []; // IN_DB_BUT_NOT_FOUND_ON_RAZORPAY
    const amountMismatch = []; // AMOUNT_MISMATCH

    // Check each Razorpay payment
    for (const p of capturedRzpPayments) {
      const dbTxn = dbMap.get(p.id);

      if (!dbTxn || dbTxn.status !== "paid") {
        missingInDb.push({
          razorpayPaymentId: p.id,
          razorpayOrderId: p.order_id || "N/A",
          amount: p.amount,
          amountRupees: toRupees(p.amount),
          email: p.email || "N/A",
          contact: p.contact || "N/A",
          paidAt: new Date(p.created_at * 1000).toISOString(),
          notes: p.notes || {},
          issueType: "PAID_ON_RAZORPAY_BUT_MISSING_IN_DB",
          severity: "critical",
        });
      } else {
        // Compare amounts
        if (p.amount !== dbTxn.amountPaid) {
          amountMismatch.push({
            razorpayPaymentId: p.id,
            dbTxnId: dbTxn._id,
            studentName: dbTxn.studentId?.userId?.name || "Student",
            rzpAmount: p.amount,
            rzpAmountRupees: toRupees(p.amount),
            dbAmount: dbTxn.amountPaid,
            dbAmountRupees: toRupees(dbTxn.amountPaid),
            difference: Math.abs(p.amount - dbTxn.amountPaid),
            differenceRupees: toRupees(Math.abs(p.amount - dbTxn.amountPaid)),
            issueType: "AMOUNT_MISMATCH",
            severity: "high",
          });
        } else {
          matched.push({
            razorpayPaymentId: p.id,
            dbTxnId: dbTxn._id,
            studentName: dbTxn.studentId?.userId?.name || "Student",
            className: dbTxn.studentId?.classId
              ? `${dbTxn.studentId.classId.className}-${dbTxn.studentId.classId.section}`
              : "N/A",
            amount: p.amount,
            amountRupees: toRupees(p.amount),
            paidOn: dbTxn.paidOn || new Date(p.created_at * 1000),
            receiptNumber: dbTxn.receiptNumber || "—",
          });
        }
      }
    }

    // Check transactions in DB that have razorpayPaymentId but aren't in Rzp
    for (const dbTxn of validDbTxns) {
      if (dbTxn.razorpayPaymentId && !rzpMap.has(dbTxn.razorpayPaymentId)) {
        notFoundOnRzp.push({
          dbTxnId: dbTxn._id,
          razorpayPaymentId: dbTxn.razorpayPaymentId,
          studentName: dbTxn.studentId?.userId?.name || "Student",
          className: dbTxn.studentId?.classId
            ? `${dbTxn.studentId.classId.className}-${dbTxn.studentId.classId.section}`
            : "N/A",
          amount: dbTxn.amountPaid,
          amountRupees: toRupees(dbTxn.amountPaid),
          paidOn: dbTxn.paidOn,
          issueType: "IN_DB_BUT_NOT_FOUND_ON_RAZORPAY",
          severity: "medium",
        });
      }
    }

    const report = {
      window: { from: fromDate.toISOString(), to: toDate.toISOString() },
      summary: {
        totalRzpPayments: capturedRzpPayments.length,
        matchedCount: matched.length,
        missingInDbCount: missingInDb.length,
        notFoundOnRzpCount: notFoundOnRzp.length,
        amountMismatchCount: amountMismatch.length,
        hasCriticalIssues: missingInDb.length > 0,
      },
      matched,
      missingInDb,
      notFoundOnRzp,
      amountMismatch,
    };

    return res
      .status(200)
      .json(new ApiResponse(200, report, "Online reconciliation fetched successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reconciliation/flag
 * Flag a reconciliation discrepancy for Admin investigation.
 */
const flagReconciliationIssue = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { issueType, paymentId, details } = req.body;

    if (!issueType || !paymentId) {
      throw new ApiError(400, "issueType and paymentId are required");
    }

    await auditLog({
      userId: req.user._id,
      action: "reconciliation_issue_flagged",
      module: "reconciliation",
      targetId: paymentId,
      newValue: { issueType, details },
      ip: req.ip,
    });

    // Notify admins
    await notifyMany(
      { schoolId, role: { $in: ["admin", "superadmin"] } },
      {
        type: "reconciliation_issue",
        title: "⚠️ Online Payment Discrepancy Flagged",
        message: `Accountant flagged an issue for payment ${paymentId}: ${issueType}. Details: ${
          typeof details === "object" ? JSON.stringify(details) : details || "N/A"
        }`,
        data: { paymentId, issueType, details },
        sendEmailFlag: true,
      }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Discrepancy flagged for admin review"));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOnlineReconciliation,
  flagReconciliationIssue,
};
