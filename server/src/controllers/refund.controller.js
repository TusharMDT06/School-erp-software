/**
 * refund.controller.js
 * Phase 7A — Refund flow with approval
 */

const mongoose = require("mongoose");
const Refund = require("../models/Refund.model");
const FeeTransaction = require("../models/FeeTransaction.model");
const LedgerEntry = require("../models/LedgerEntry.model");
const FinanceSettings = require("../models/FinanceSettings.model");
const insertLedgerEntry = require("../utils/insertLedgerEntry");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const auditLog = require("../utils/auditLog");
const { safeDel } = require("../config/redis");

/**
 * POST /api/refunds
 * Create refund request. Auto-approved if refundApprovalRequired = false.
 */
exports.createRefund = async (req, res, next) => {
  try {
    const { transactionId, amount, reason, mode = "cash" } = req.body;
    const schoolId = req.user.schoolId;

    if (!transactionId || !amount || !reason) {
      throw new ApiError(400, "transactionId, amount (paise), and reason are required.");
    }

    const tx = await FeeTransaction.findById(transactionId);
    if (!tx) throw new ApiError(404, "Transaction not found.");
    if (tx.isReversed) throw new ApiError(400, "Cannot refund a reversed transaction.");

    // Check: amount <= amountPaid – already refunded
    const existingRefunds = await Refund.find({ transactionId, status: { $in: ["pending", "approved", "paid"] } }).lean();
    const alreadyRefunded = existingRefunds.reduce((s, r) => s + r.amount, 0);
    if (amount > tx.amountPaid - alreadyRefunded) {
      throw new ApiError(400, `Refund amount exceeds refundable amount. Max: ${tx.amountPaid - alreadyRefunded} paise.`);
    }

    const settings = await FinanceSettings.findOne({ schoolId }).lean();
    const autoApprove = !settings?.refundApprovalRequired;

    const refund = await Refund.create({
      schoolId,
      transactionId,
      studentId: tx.studentId,
      amount,
      reason,
      mode,
      requestedBy: req.user.id,
      status: autoApprove ? "approved" : "pending",
      decidedBy: autoApprove ? req.user.id : null,
      decidedAt: autoApprove ? new Date() : null,
    });

    await auditLog({
      userId: req.user.id,
      action: "refund_requested",
      module: "refund",
      targetId: refund._id,
      newValue: { transactionId, amount, autoApprove },
      ip: req.ip,
    });

    res.status(201).json(
      new ApiResponse(201, refund, autoApprove ? "Refund auto-approved." : "Refund request submitted for approval.")
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/refunds
 * List refunds with optional filters.
 */
exports.getRefunds = async (req, res, next) => {
  try {
    const { status, studentId, page = 1, limit = 20 } = req.query;
    const schoolId = req.user.schoolId;

    const filter = {};
    if (schoolId) filter.schoolId = schoolId;
    if (status) filter.status = status;
    if (studentId) filter.studentId = studentId;

    const [refunds, total] = await Promise.all([
      Refund.find(filter)
        .populate("transactionId", "receiptNumber amountPaid amountDue")
        .populate({ path: "studentId", populate: { path: "userId", select: "name email" } })
        .populate("requestedBy", "name role")
        .populate("decidedBy", "name role")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .lean(),
      Refund.countDocuments(filter),
    ]);

    res.status(200).json(new ApiResponse(200, { refunds, total, page: Number(page) }, "Refunds retrieved."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/refunds/:id/decide
 * Approve / reject — admin / principal only
 */
exports.decideRefund = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, decisionRemarks = "" } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      throw new ApiError(400, "status must be 'approved' or 'rejected'.");
    }

    const refund = await Refund.findById(id);
    if (!refund) throw new ApiError(404, "Refund not found.");
    if (refund.status !== "pending") throw new ApiError(400, `Refund is already ${refund.status}.`);

    refund.status = status;
    refund.decidedBy = req.user.id;
    refund.decidedAt = new Date();

    await refund.save();

    await auditLog({
      userId: req.user.id,
      action: `refund_${status}`,
      module: "refund",
      targetId: refund._id,
      oldValue: { status: "pending" },
      newValue: { status },
      ip: req.ip,
    });

    res.status(200).json(new ApiResponse(200, refund, `Refund ${status}.`));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/refunds/:id/pay
 * Mark refund as paid — inserts LedgerEntry (out, refund)
 */
exports.payRefund = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const refund = await Refund.findById(id).session(session);
    if (!refund) throw new ApiError(404, "Refund not found.");
    if (refund.status !== "approved") throw new ApiError(400, "Refund must be approved before marking as paid.");

    const modeToAccount = (m) => m === "cash" ? "cash" : m === "bank" ? "bank" : "online";

    const ledger = await insertLedgerEntry(
      [{
        schoolId,
        date: new Date(),
        account: modeToAccount(refund.mode),
        direction: "out",
        category: "refund",
        amount: refund.amount,
        referenceType: "Refund",
        referenceId: refund._id,
        narration: `Refund paid — ${refund._id}`,
        createdBy: req.user.id,
      }],
      { session }
    );

    refund.status = "paid";
    refund.paidOn = new Date();
    refund.ledgerEntryId = ledger[0]._id;
    await refund.save({ session });

    // Update transaction's net amountPaid
    const tx = await FeeTransaction.findById(refund.transactionId).session(session);
    if (tx) {
      tx.amountPaid = Math.max(0, tx.amountPaid - refund.amount);
      if (tx.amountPaid < tx.amountDue) tx.status = tx.amountPaid > 0 ? "partial" : "pending";
      await tx.save({ session });
    }

    await session.commitTransaction();
    await safeDel(`dashboard:${schoolId}`);

    await auditLog({
      userId: req.user.id,
      action: "refund_paid",
      module: "refund",
      targetId: refund._id,
      newValue: { amount: refund.amount, ledgerEntryId: ledger[0]._id },
      ip: req.ip,
    });

    res.status(200).json(new ApiResponse(200, refund, "Refund marked as paid."));
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};
