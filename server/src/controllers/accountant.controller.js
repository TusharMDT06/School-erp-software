/**
 * accountant.controller.js
 * Phase 7A — Fee Counter, UPI QR, Receipts, Reversal, Dashboard Summary
 */

const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");

const Student = require("../models/Student.model");
const FeeTransaction = require("../models/FeeTransaction.model");
const FeeStructure = require("../models/FeeStructure.model");
const FeeConcession = require("../models/FeeConcession.model");
const LedgerEntry = require("../models/LedgerEntry.model");
const FinanceSettings = require("../models/FinanceSettings.model");
const Expense = require("../models/Expense.model");
const Refund = require("../models/Refund.model");
const CashClosing = require("../models/CashClosing.model");
const User = require("../models/User.model");

const insertLedgerEntry = require("../utils/insertLedgerEntry");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const { toPaise, addMoney, formatMoney } = require("../utils/money");
const { calculateLateFee } = require("../utils/lateFee");
const auditLog = require("../utils/auditLog");
const generateReceipt = require("../utils/generateReceipt");
const sendEmail = require("../utils/sendEmail");
const { safeGet, safeSet, safeDel } = require("../config/redis");
const { getWeeklyFinanceInsight, checkFinancialAnomalies } = require("../services/financeInsights.service");

// ── Helper: mode → ledger account ─────────────────────────────────────────
const modeToAccount = (mode) => {
  if (mode === "cash") return "cash";
  if (mode === "cheque") return "bank";
  return "online"; // upi, card, netbanking, online
};

// ── Helper: get or auto-create FinanceSettings ────────────────────────────
const getSettings = async (schoolId) => {
  let settings = await FinanceSettings.findOne({ schoolId });
  if (!settings) settings = await FinanceSettings.create({ schoolId });
  return settings;
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/accountant/students/search?q=
// ─────────────────────────────────────────────────────────────────────────
exports.searchStudents = async (req, res, next) => {
  try {
    const { q = "" } = req.query;
    const schoolId = req.user.schoolId;

    if (!q.trim()) {
      return res.status(200).json(new ApiResponse(200, [], "Provide a search query."));
    }

    // Find user ids that match name / email
    const userFilter = { role: "student" };
    if (schoolId) userFilter.schoolId = schoolId;
    const matchingUsers = await User.find({
      ...userFilter,
      name: { $regex: q, $options: "i" },
    })
      .select("_id name")
      .limit(20)
      .lean();

    const userIds = matchingUsers.map((u) => u._id);

    const students = await Student.find({
      $or: [
        { userId: { $in: userIds } },
        { admissionNumber: { $regex: q, $options: "i" } },
        { rollNumber: { $regex: q, $options: "i" } },
      ],
      status: "active",
    })
      .populate("userId", "name email phone")
      .populate("classId", "className section")
      .select("admissionNumber rollNumber userId classId")
      .limit(10)
      .lean();

    res.status(200).json(new ApiResponse(200, students, "Students found."));
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/accountant/students/:studentId/dues
// Returns all unpaid/partial transactions with concession & late fee
// ─────────────────────────────────────────────────────────────────────────
exports.getStudentDues = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const schoolId = req.user.schoolId;
    const settings = await getSettings(schoolId);
    const today = new Date();

    const student = await Student.findById(studentId)
      .populate("userId", "name email phone profileImage")
      .populate("classId", "className section")
      .lean();

    if (!student) throw new ApiError(404, "Student not found.");

    // Approved concessions for this student
    const concessions = await FeeConcession.find({
      studentId,
      status: "approved",
    }).lean();

    const transactions = await FeeTransaction.find({
      studentId,
      status: { $in: ["pending", "partial", "overdue"] },
      isReversed: { $ne: true },
    })
      .populate("feeStructureId", "feeHeads academicYear term dueDate totalAmount")
      .sort({ createdAt: 1 })
      .lean();

    const enriched = transactions.map((tx) => {
      const amountDuePaise = tx.amountDue || 0;
      const amountPaidPaise = tx.amountPaid || 0;

      // Apply approved concessions
      let concessionPaise = 0;
      for (const c of concessions) {
        if (c.applyOn === "total" || !c.applyOn) {
          if (c.valueType === "percent") {
            concessionPaise += Math.round((c.value / 100) * amountDuePaise);
          } else {
            concessionPaise += toPaise(c.value);
          }
        }
      }
      concessionPaise = Math.min(concessionPaise, amountDuePaise);

      // Compute late fee
      const latePaise = calculateLateFee(
        { ...tx, amountDue: amountDuePaise, amountPaid: amountPaidPaise },
        settings.lateFee,
        today
      );

      const effectiveDue = Math.max(0, amountDuePaise - amountPaidPaise - concessionPaise);
      const balance = Math.max(0, effectiveDue + latePaise);

      return {
        ...tx,
        concessionAmount: concessionPaise,
        lateFeeAmount: latePaise,
        effectiveDue,
        balance,
        concessionBreakdown: concessions,
      };
    });

    res.status(200).json(
      new ApiResponse(200, { student, dues: enriched, lateFeeSettings: settings.lateFee }, "Student dues fetched.")
    );
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/accountant/collect
// ─────────────────────────────────────────────────────────────────────────
exports.collectFee = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      studentId,
      items = [],          // [{ transactionId, payNowAmount }] — amounts in paise
      payments = [],        // [{ mode, amount, reference, chequeNo, chequeBank, chequeDate }]
      remarks = "",
      idempotencyKey,
    } = req.body;

    const schoolId = req.user.schoolId;

    // ── Idempotency check ─────────────────────────────────────────────────
    if (idempotencyKey) {
      const existing = await FeeTransaction.findOne({ idempotencyKey }).lean();
      if (existing) {
        await session.abortTransaction();
        return res.status(200).json(
          new ApiResponse(200, { idempotent: true, transactionId: existing._id }, "Already processed.")
        );
      }
    }

    if (!studentId || !items.length || !payments.length) {
      throw new ApiError(400, "studentId, items[], and payments[] are required.");
    }

    // ── Validate amounts balance ──────────────────────────────────────────
    const totalPayNow = items.reduce((s, i) => s + (i.payNowAmount || 0), 0);
    const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0);

    if (totalPayNow !== totalPayments) {
      throw new ApiError(400, `Payment total mismatch: items sum ${totalPayNow} paise ≠ payments sum ${totalPayments} paise.`);
    }

    const settings = await getSettings(schoolId);
    const today = new Date();

    // ── Generate receipt number (atomic) ──────────────────────────────────
    const updatedSettings = await FinanceSettings.findOneAndUpdate(
      { schoolId },
      { $inc: { receiptSeq: 1 } },
      { new: true, session, upsert: true }
    );
    const yearStr = String(today.getFullYear());
    const seqStr = String(updatedSettings.receiptSeq).padStart(5, "0");
    const receiptNumber = `${updatedSettings.receiptPrefix || "RCPT"}-${yearStr}-${seqStr}`;

    // ── Process each item ─────────────────────────────────────────────────
    const processedTxIds = [];
    for (const item of items) {
      const { transactionId, payNowAmount } = item;
      if (!payNowAmount || payNowAmount <= 0) continue;

      const tx = await FeeTransaction.findById(transactionId).session(session);
      if (!tx) throw new ApiError(404, `Transaction ${transactionId} not found.`);
      if (tx.isReversed) throw new ApiError(400, `Transaction ${transactionId} is reversed.`);

      // Compute & freeze concession
      const concessions = await FeeConcession.find({ studentId, status: "approved" }).lean();
      let frozenConcession = 0;
      for (const c of concessions) {
        if (c.valueType === "percent") {
          frozenConcession += Math.round((c.value / 100) * tx.amountDue);
        } else {
          frozenConcession += toPaise(c.value);
        }
      }
      frozenConcession = Math.min(frozenConcession, tx.amountDue);

      // Compute & freeze late fee
      const frozenLateFee = calculateLateFee(
        { amountDue: tx.amountDue, amountPaid: tx.amountPaid, feeStructureId: tx.feeStructureId },
        settings.lateFee,
        today
      );

      tx.concessionAmount = frozenConcession;
      tx.lateFeeAmount = frozenLateFee;
      tx.amountPaid = addMoney(tx.amountPaid, payNowAmount);
      tx.collectedBy = req.user.id;
      tx.counterReceiptNumber = receiptNumber;
      tx.remarks = remarks;
      tx.paidOn = today;
      if (idempotencyKey && items.length === 1) tx.idempotencyKey = idempotencyKey;

      const effectiveDue = Math.max(0, tx.amountDue - frozenConcession);
      if (tx.amountPaid >= effectiveDue + frozenLateFee) {
        tx.status = "paid";
      } else if (tx.amountPaid > 0) {
        tx.status = "partial";
      }

      // Append payment splits
      const paymentRecord = payments.map((p) => ({
        mode: p.mode,
        amount: p.amount,
        reference: p.reference || "",
        chequeNo: p.chequeNo || "",
        chequeBank: p.chequeBank || "",
        chequeDate: p.chequeDate || null,
        chequeStatus: p.mode === "cheque" ? "pending_clearance" : "na",
        paidOn: today,
      }));
      tx.payments.push(...paymentRecord);

      await tx.save({ session });
      processedTxIds.push(tx._id);
    }

    // ── Insert Ledger entries per payment mode ────────────────────────────
    const ledgerDocs = payments.map((p) => ({
      schoolId,
      date: today,
      account: modeToAccount(p.mode),
      direction: "in",
      category: "fee_collection",
      amount: p.amount,   // paise
      referenceType: "FeeTransaction",
      referenceId: processedTxIds[0] || null,
      narration: `Fee collection — ${receiptNumber} (${p.mode})`,
      createdBy: req.user.id,
    }));
    await insertLedgerEntry(ledgerDocs, { session });

    await session.commitTransaction();

    // ── Post-commit: generate PDF receipt ────────────────────────────────
    const firstTx = await FeeTransaction.findById(processedTxIds[0])
      .populate({
        path: "studentId",
        populate: [
          { path: "userId", select: "name email" },
          { path: "classId", select: "className section" },
        ],
      })
      .populate("feeStructureId");

    if (firstTx && !firstTx.receiptUrl) {
      try {
        const receiptUrl = await generateReceipt(firstTx);
        firstTx.receiptUrl = receiptUrl;
        await firstTx.save();
      } catch (e) {
        console.error("[accountant] Receipt PDF failed:", e.message);
      }
    }

    // ── Invalidate Redis cache ────────────────────────────────────────────
    await safeDel(`dashboard:${schoolId}`, `defaulters:${schoolId}`);

    // ── Audit log ─────────────────────────────────────────────────────────
    await auditLog({
      userId: req.user.id,
      action: "fee_collected",
      module: "fee_counter",
      targetId: processedTxIds[0],
      newValue: { receiptNumber, totalPayNow, payments },
      ip: req.ip,
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          receiptNumber,
          transactionIds: processedTxIds,
          receiptUrl: firstTx?.receiptUrl || null,
        },
        "Fee collected successfully!"
      )
    );
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/accountant/receipts/:transactionId  → PDF stream
// ─────────────────────────────────────────────────────────────────────────
exports.getReceipt = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const tx = await FeeTransaction.findById(transactionId);
    if (!tx) throw new ApiError(404, "Transaction not found.");
    if (!tx.receiptUrl) throw new ApiError(404, "Receipt not yet generated.");

    const filePath = path.join(__dirname, "../../", tx.receiptUrl);
    if (!fs.existsSync(filePath)) throw new ApiError(404, "Receipt PDF not found on disk.");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${tx.receiptNumber || "receipt"}.pdf"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/accountant/receipts/:transactionId/resend → email receipt
// ─────────────────────────────────────────────────────────────────────────
exports.resendReceipt = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const tx = await FeeTransaction.findById(transactionId)
      .populate({
        path: "studentId",
        populate: [
          { path: "userId", select: "name email" },
          { path: "guardianIds", select: "name email" },
        ],
      });

    if (!tx) throw new ApiError(404, "Transaction not found.");

    const studentEmail = tx.studentId?.userId?.email;
    const parentEmails = (tx.studentId?.guardianIds || [])
      .map((g) => g.email)
      .filter(Boolean);

    const recipients = [...new Set([studentEmail, ...parentEmails].filter(Boolean))];
    if (!recipients.length) throw new ApiError(400, "No email addresses found for this student.");

    const filePath = tx.receiptUrl ? path.join(__dirname, "../../", tx.receiptUrl) : null;

    for (const email of recipients) {
      await sendEmail({
        to: email,
        subject: `Fee Receipt — ${tx.receiptNumber || tx._id}`,
        html: `<p>Dear Parent/Student,</p><p>Please find your fee receipt <strong>${tx.receiptNumber}</strong> attached.</p><p>Amount Paid: ${formatMoney(tx.amountPaid)}</p><p>Thank you.</p>`,
        ...(filePath && fs.existsSync(filePath)
          ? { attachments: [{ filename: `${tx.receiptNumber}.pdf`, path: filePath }] }
          : {}),
      });
    }

    res.status(200).json(new ApiResponse(200, { sent: recipients }, "Receipt resent successfully."));
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/accountant/receipts/:transactionId/reverse
// Body: { reason }  — NEVER deletes, only reverses
// ─────────────────────────────────────────────────────────────────────────
exports.reverseReceipt = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { transactionId } = req.params;
    const { reason } = req.body;
    const schoolId = req.user.schoolId;

    if (!reason || reason.trim().length < 10) {
      throw new ApiError(400, "Reversal reason must be at least 10 characters.");
    }

    const tx = await FeeTransaction.findById(transactionId).session(session);
    if (!tx) throw new ApiError(404, "Transaction not found.");
    if (tx.isReversed) throw new ApiError(400, "This transaction is already reversed.");

    const oldStatus = tx.status;
    const oldPaid = tx.amountPaid;

    // Insert reversing ledger entries
    const reversalEntries = [];
    for (const pay of tx.payments) {
      if (pay.amount > 0) {
        reversalEntries.push({
          schoolId,
          date: new Date(),
          account: modeToAccount(pay.mode),
          direction: "out",
          category: "reversal",
          amount: pay.amount,
          referenceType: "FeeTransaction",
          referenceId: tx._id,
          narration: `Reversal of ${tx.receiptNumber || tx._id}: ${reason}`,
          createdBy: req.user.id,
        });
      }
    }

    // Fallback: if no split payments recorded, reverse the full amount
    if (!reversalEntries.length && tx.amountPaid > 0) {
      reversalEntries.push({
        schoolId,
        date: new Date(),
        account: modeToAccount(tx.paymentMode || "cash"),
        direction: "out",
        category: "reversal",
        amount: tx.amountPaid,
        referenceType: "FeeTransaction",
        referenceId: tx._id,
        narration: `Reversal of ${tx.receiptNumber || tx._id}: ${reason}`,
        createdBy: req.user.id,
      });
    }

    const ledgerDocs = await insertLedgerEntry(reversalEntries, { session });

    // Mark transaction as reversed
    tx.isReversed = true;
    tx.reversalReason = reason;
    tx.reversedBy = req.user.id;
    tx.reversedAt = new Date();
    tx.status = "reversed";
    tx.reversalLedgerEntryId = ledgerDocs[0]?._id || null;

    // Restore to pending so student can pay again
    tx.amountPaid = 0;
    tx.paidOn = null;

    await tx.save({ session });
    await session.commitTransaction();

    await safeDel(`dashboard:${schoolId}`, `defaulters:${schoolId}`);

    await auditLog({
      userId: req.user.id,
      action: "fee_reversed",
      module: "fee_counter",
      targetId: tx._id,
      oldValue: { status: oldStatus, amountPaid: oldPaid },
      newValue: { status: "reversed", reason },
      ip: req.ip,
    });

    res.status(200).json(new ApiResponse(200, { transactionId: tx._id }, "Transaction reversed successfully."));
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────────────────────────────────
// PUT /api/accountant/cheques/:paymentId/clear   (mark cheque cleared)
// PUT /api/accountant/cheques/:paymentId/bounce  (mark cheque bounced)
// ─────────────────────────────────────────────────────────────────────────
exports.updateChequeStatus = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const action = req.path.includes("bounce") ? "bounced" : "cleared";
    const schoolId = req.user.schoolId;

    const tx = await FeeTransaction.findOne({ "payments._id": paymentId });
    if (!tx) throw new ApiError(404, "Payment not found.");

    const paymentEntry = tx.payments.id(paymentId);
    if (!paymentEntry) throw new ApiError(404, "Payment sub-document not found.");
    if (paymentEntry.mode !== "cheque") throw new ApiError(400, "Only cheque payments can be cleared/bounced.");

    paymentEntry.chequeStatus = action;

    if (action === "bounced") {
      // Insert reversal ledger entry
      await insertLedgerEntry({
        schoolId,
        date: new Date(),
        account: "bank",
        direction: "out",
        category: "reversal",
        amount: paymentEntry.amount,
        referenceType: "FeeTransaction",
        referenceId: tx._id,
        narration: `Cheque bounce reversal — ${tx.receiptNumber || tx._id}`,
        createdBy: req.user.id,
      });

      // Restore transaction to pending
      tx.amountPaid = Math.max(0, tx.amountPaid - paymentEntry.amount);
      tx.status = tx.amountPaid > 0 ? "partial" : "pending";
    }

    await tx.save();

    await auditLog({
      userId: req.user.id,
      action: `cheque_${action}`,
      module: "fee_counter",
      targetId: tx._id,
      newValue: { paymentId, action },
      ip: req.ip,
    });

    res.status(200).json(new ApiResponse(200, { action }, `Cheque marked as ${action}.`));
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/accountant/upi-qr?amount=&note=
// Returns QR code data URL for UPI payment
// ─────────────────────────────────────────────────────────────────────────
exports.getUpiQr = async (req, res, next) => {
  try {
    const { amount = 0, note = "Fee Payment" } = req.query;
    const schoolId = req.user.schoolId;

    const settings = await getSettings(schoolId);
    if (!settings.upiId) {
      throw new ApiError(400, "UPI ID not configured. Please update Finance Settings.");
    }

    const upiUrl = `upi://pay?pa=${encodeURIComponent(settings.upiId)}&pn=${encodeURIComponent(settings.schoolDisplayName || "School")}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

    const qrDataUrl = await QRCode.toDataURL(upiUrl, {
      width: 256,
      margin: 2,
      color: { dark: "#1F4E79", light: "#FFFFFF" },
    });

    res.status(200).json(new ApiResponse(200, { qr: qrDataUrl, upiUrl }, "UPI QR generated."));
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/accountant/dashboard-summary
// Aggregated financial stats, cached 60s per school
// ─────────────────────────────────────────────────────────────────────────
exports.getDashboardSummary = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const cacheKey = `dashboard:${schoolId}`;

    // ── Try Redis cache ───────────────────────────────────────────────────
    const cached = await safeGet(cacheKey);
    if (cached) {
      return res.status(200).json(new ApiResponse(200, JSON.parse(cached), "Dashboard summary (cached)."));
    }

    const now = new Date();
    const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOf30Days = new Date(now); startOf30Days.setDate(startOf30Days.getDate() - 29);

    // Build school-scoped filters
    let feeStructureIds = [];
    if (schoolId) {
      const structs = await FeeStructure.find({ schoolId }).select("_id").lean();
      feeStructureIds = structs.map((s) => s._id);
    }
    const txFilter = feeStructureIds.length ? { feeStructureId: { $in: feeStructureIds } } : {};
    const ledgerFilter = schoolId ? { schoolId } : {};

    // ── Run all aggregations in parallel ─────────────────────────────────
    const [
      todayLedger,
      monthLedger,
      outstandingAgg,
      overdueAgg,
      billedThisTerm,
      paidThisTerm,
      dailyTrend,
      modeWise,
      classWise,
      recentTx,
      pendingConcessions,
      pendingRefunds,
      pendingCheques,
      pendingExpenseApprovals,
      monthExpensesAgg,
    ] = await Promise.all([
      // Today's inflows from ledger
      LedgerEntry.aggregate([
        { $match: { ...ledgerFilter, direction: "in", category: "fee_collection", date: { $gte: startOfDay } } },
        { $group: { _id: "$account", total: { $sum: "$amount" } } },
      ]),
      // Month's collection
      LedgerEntry.aggregate([
        { $match: { ...ledgerFilter, direction: "in", category: "fee_collection", date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      // Outstanding (pending + partial + overdue)
      FeeTransaction.aggregate([
        { $match: { ...txFilter, status: { $in: ["pending", "partial", "overdue"] }, isReversed: { $ne: true } } },
        { $group: { _id: null, total: { $sum: { $subtract: ["$amountDue", "$amountPaid"] } } } },
      ]),
      // Overdue (only truly past due)
      FeeTransaction.aggregate([
        { $match: { ...txFilter, status: { $in: ["pending", "overdue"] }, isReversed: { $ne: true } } },
        { $group: { _id: null, total: { $sum: { $subtract: ["$amountDue", "$amountPaid"] } } } },
      ]),
      // Billed this term (all non-reversed amountDue)
      FeeTransaction.aggregate([
        { $match: { ...txFilter, isReversed: { $ne: true } } },
        { $group: { _id: null, total: { $sum: "$amountDue" } } },
      ]),
      // Paid this term
      FeeTransaction.aggregate([
        { $match: { ...txFilter, isReversed: { $ne: true } } },
        { $group: { _id: null, total: { $sum: "$amountPaid" } } },
      ]),
      // Daily collection trend (last 30 days)
      LedgerEntry.aggregate([
        { $match: { ...ledgerFilter, direction: "in", category: "fee_collection", date: { $gte: startOf30Days } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, total: { $sum: "$amount" } } },
        { $sort: { _id: 1 } },
      ]),
      // Mode-wise split this month
      LedgerEntry.aggregate([
        { $match: { ...ledgerFilter, direction: "in", category: "fee_collection", date: { $gte: startOfMonth } } },
        { $group: { _id: "$account", total: { $sum: "$amount" } } },
      ]),
      // Class-wise outstanding (top 10)
      FeeTransaction.aggregate([
        { $match: { ...txFilter, status: { $in: ["pending", "partial", "overdue"] }, isReversed: { $ne: true } } },
        { $group: { _id: "$feeStructureId", outstanding: { $sum: { $subtract: ["$amountDue", "$amountPaid"] } } } },
        { $sort: { outstanding: -1 } },
        { $limit: 10 },
        { $lookup: { from: "feestructures", localField: "_id", foreignField: "_id", as: "fs" } },
        { $unwind: { path: "$fs", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "classsections", localField: "fs.classId", foreignField: "_id", as: "cls" } },
        { $unwind: { path: "$cls", preserveNullAndEmptyArrays: true } },
        { $project: { outstanding: 1, className: "$cls.className", section: "$cls.section" } },
      ]),
      // Recent 8 transactions
      FeeTransaction.find({ ...txFilter, status: { $in: ["paid", "partial"] }, isReversed: { $ne: true } })
        .sort({ paidOn: -1, updatedAt: -1 })
        .limit(8)
        .populate({ path: "studentId", populate: { path: "userId", select: "name" } })
        .select("receiptNumber amountPaid paidOn status studentId counterReceiptNumber")
        .lean(),
      // Pending concessions
      FeeConcession.countDocuments({ schoolId, status: "pending" }),
      // Pending refunds
      Refund.countDocuments({ schoolId, status: "pending" }),
      // Pending / bounced cheques
      FeeTransaction.countDocuments({ ...txFilter, "payments.chequeStatus": { $in: ["pending_clearance", "bounced"] } }),
      // Pending expense approvals
      Expense.countDocuments({ schoolId, status: "pending_approval" }),
      // Month expenses from ledger
      LedgerEntry.aggregate([
        { $match: { ...ledgerFilter, direction: "out", category: "expense", date: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    // Check if yesterday had cash activity but was not closed
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const startOfYesterday = new Date(yesterday); startOfYesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday); endOfYesterday.setHours(23, 59, 59, 999);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const [yesterdayCashEntries, yesterdayClosed] = await Promise.all([
      LedgerEntry.countDocuments({
        ...ledgerFilter,
        account: "cash",
        date: { $gte: startOfYesterday, $lte: endOfYesterday },
      }),
      CashClosing.countDocuments({ schoolId, date: yesterdayStr }),
    ]);
    const dayNotClosedYesterday = yesterdayCashEntries > 0 && yesterdayClosed === 0;

    // Build today collection breakdown
    const todayMap = {};
    todayLedger.forEach((l) => { todayMap[l._id] = l.total; });
    const todayTotal = Object.values(todayMap).reduce((s, v) => s + v, 0);

    const billedTotal = billedThisTerm[0]?.total || 0;
    const paidTotal = paidThisTerm[0]?.total || 0;
    const efficiency = billedTotal > 0 ? Math.round((paidTotal / billedTotal) * 100) : 0;
    const monthExpensesTotal = monthExpensesAgg[0]?.total || 0;

    // Check rule-based anomalies
    const anomalies = await checkFinancialAnomalies(schoolId);

    const summary = {
      todayCollection: {
        total: todayTotal,
        cash: todayMap.cash || 0,
        bank: todayMap.bank || 0,
        online: todayMap.online || 0,
      },
      monthCollection: monthLedger[0]?.total || 0,
      monthExpenses: monthExpensesTotal,
      netThisMonth: (monthLedger[0]?.total || 0) - monthExpensesTotal,
      totalOutstanding: outstandingAgg[0]?.total || 0,
      overdueAmount: overdueAgg[0]?.total || 0,
      collectionEfficiencyPercent: efficiency,
      dailyCollectionTrend: dailyTrend,
      modeWiseSplit: modeWise,
      classWiseOutstanding: classWise,
      recentTransactions: recentTx,
      alerts: {
        pendingConcessions,
        pendingRefunds,
        pendingExpenseApprovals,
        dayNotClosedYesterday,
        bouncedOrPendingCheques: pendingCheques,
      },
      anomalies,
    };

    // Cache 60s
    await safeSet(cacheKey, JSON.stringify(summary), 60);

    res.status(200).json(new ApiResponse(200, summary, "Dashboard summary."));
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// GET /api/accountant/insights
// Weekly AI Finance Insight (6-hr cached narrative + metrics)
// ─────────────────────────────────────────────────────────────────────────
exports.getFinanceInsight = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const insight = await getWeeklyFinanceInsight(schoolId, false);
    res.status(200).json(new ApiResponse(200, insight, "Weekly finance insight fetched"));
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────
// POST /api/accountant/insights/refresh
// Force re-generation of Weekly AI Finance Insight
// ─────────────────────────────────────────────────────────────────────────
exports.refreshFinanceInsight = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const insight = await getWeeklyFinanceInsight(schoolId, true);
    res.status(200).json(new ApiResponse(200, insight, "Weekly finance insight refreshed"));
  } catch (err) {
    next(err);
  }
};
