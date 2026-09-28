const Expense = require("../models/Expense.model");
const FinanceSettings = require("../models/FinanceSettings.model");
const insertLedgerEntry = require("../utils/insertLedgerEntry");
const { notify, notifyMany } = require("../services/notification.service");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const { toPaise, toRupees, formatMoney } = require("../utils/money");
const auditLog = require("../utils/auditLog");
const { safeDel } = require("../config/redis");

/**
 * POST /api/expenses
 * Create expense with approval threshold check and duplicate guard
 */
exports.createExpense = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    let {
      categoryId,
      vendorId,
      title,
      description,
      amount,
      expenseDate,
      paymentMode,
      billNumber,
      billUrl,
      confirmDuplicate,
    } = req.body;

    if (!categoryId || !title || !amount || !expenseDate || !paymentMode) {
      throw new ApiError(400, "Category, title, amount, expenseDate, and paymentMode are required.");
    }

    // Support amount in paise or rupees (if amount < 1000 and user entered rupees, handle properly)
    // By spec: "amount (paise) via money.js"
    const amountPaise = Number(amount);
    if (isNaN(amountPaise) || amountPaise <= 0) {
      throw new ApiError(400, "Amount must be a positive number in paise.");
    }

    // If file was uploaded via multer, use its path or Cloudinary URL
    if (req.file) {
      billUrl = req.file.cloudinaryUrl || `/uploads/${req.file.filename}`;
    }

    const expDate = new Date(expenseDate);
    if (isNaN(expDate.getTime())) {
      throw new ApiError(400, "Invalid expense date.");
    }

    // ── Duplicate Guard ───────────────────────────────────────────────────
    if (!confirmDuplicate) {
      const startOfDay = new Date(expDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(expDate);
      endOfDay.setHours(23, 59, 59, 999);

      const duplicateQuery = {
        schoolId,
        amount: amountPaise,
        expenseDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: "rejected" },
      };
      if (vendorId) {
        duplicateQuery.vendorId = vendorId;
      }

      const existingDuplicate = await Expense.findOne(duplicateQuery)
        .populate("vendorId", "name")
        .lean();

      if (existingDuplicate) {
        return res.status(409).json({
          success: false,
          duplicateDetected: true,
          message: `A similar expense ("${existingDuplicate.title}") of ₹${toRupees(amountPaise)} on this date already exists for this vendor. Set confirmDuplicate: true to proceed.`,
        });
      }
    }

    // ── Threshold & Status Check ──────────────────────────────────────────
    const settings = await FinanceSettings.findOne({ schoolId }).lean();
    const thresholdRupees = settings?.expenseApprovalThreshold ?? 10000;
    const thresholdPaise = toPaise(thresholdRupees);

    let status = "approved";
    if (amountPaise > thresholdPaise) {
      status = "pending_approval";
    }

    const expense = await Expense.create({
      schoolId,
      categoryId,
      vendorId: vendorId || null,
      title: title.trim(),
      description: description?.trim() || "",
      amount: amountPaise,
      expenseDate: expDate,
      paymentMode,
      billNumber: billNumber?.trim() || "",
      billUrl: billUrl || "",
      status,
      createdBy: req.user.id,
    });

    // Notify admins if approval needed
    if (status === "pending_approval") {
      notifyMany(
        { schoolId, role: { $in: ["admin", "superadmin"] } },
        {
          type: "expense_approval_needed",
          title: "Expense Approval Required",
          message: `New expense "${expense.title}" of ₹${toRupees(amountPaise)} exceeds threshold ₹${thresholdRupees} and awaits approval.`,
          data: { expenseId: expense._id },
        }
      );
    }

    await auditLog({
      schoolId,
      userId: req.user.id,
      action: "EXPENSE_CREATED",
      targetType: "Expense",
      targetId: expense._id,
      details: {
        title: expense.title,
        amount: amountPaise,
        status,
        paymentMode,
      },
    });

    await safeDel(`dashboard:${schoolId}`);

    res.status(201).json(new ApiResponse(201, expense, `Expense created with status "${status}".`));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/expenses
 * Filtered & paginated expenses list
 */
exports.getExpenses = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const {
      status,
      categoryId,
      vendorId,
      startDate,
      endDate,
      paymentMode,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { schoolId };

    if (status && status !== "all") query.status = status;
    if (categoryId) query.categoryId = categoryId;
    if (vendorId) query.vendorId = vendorId;
    if (paymentMode) query.paymentMode = paymentMode;

    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.expenseDate.$lte = end;
      }
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ title: regex }, { description: regex }, { billNumber: regex }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate("categoryId", "name")
        .populate("vendorId", "name contactPerson phone")
        .populate("createdBy", "name")
        .populate("approvedBy", "name")
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Expense.countDocuments(query),
    ]);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          expenses,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
        "Expenses retrieved."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/expenses/:id
 */
exports.getExpenseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const expense = await Expense.findOne({ _id: id, schoolId })
      .populate("categoryId", "name")
      .populate("vendorId", "name contactPerson phone email address")
      .populate("createdBy", "name")
      .populate("approvedBy", "name")
      .lean();

    if (!expense) throw new ApiError(404, "Expense not found.");
    res.status(200).json(new ApiResponse(200, expense, "Expense retrieved."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/expenses/:id/decide
 * Admin/Principal decides (approve or reject) a pending expense
 */
exports.decideExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;
    const { decision, remarks } = req.body;

    if (!["approved", "rejected"].includes(decision)) {
      throw new ApiError(400, "Decision must be 'approved' or 'rejected'.");
    }

    const expense = await Expense.findOne({ _id: id, schoolId });
    if (!expense) throw new ApiError(404, "Expense not found.");

    if (expense.status !== "pending_approval") {
      throw new ApiError(400, `Cannot decide expense with status '${expense.status}'.`);
    }

    expense.status = decision;
    expense.approvedBy = req.user.id;
    expense.decidedAt = new Date();
    expense.decisionRemarks = remarks?.trim() || "";
    await expense.save();

    // Notify creator
    notify(expense.createdBy, {
      type: "expense_decision",
      title: `Expense ${decision.toUpperCase()}`,
      message: `Your expense "${expense.title}" for ₹${toRupees(expense.amount)} was ${decision}.${remarks ? " Remarks: " + remarks : ""}`,
      data: { expenseId: expense._id, decision },
    });

    await auditLog({
      schoolId,
      userId: req.user.id,
      action: decision === "approved" ? "EXPENSE_APPROVED" : "EXPENSE_REJECTED",
      targetType: "Expense",
      targetId: expense._id,
      details: { decision, remarks },
    });

    await safeDel(`dashboard:${schoolId}`);

    res.status(200).json(new ApiResponse(200, expense, `Expense ${decision} successfully.`));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/expenses/:id/pay
 * Accountant/Admin marks approved expense as paid -> inserts LedgerEntry (out, expense)
 */
exports.payExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const expense = await Expense.findOne({ _id: id, schoolId });
    if (!expense) throw new ApiError(404, "Expense not found.");

    if (expense.status !== "approved") {
      throw new ApiError(400, `Only approved expenses can be paid. Current status: '${expense.status}'.`);
    }

    // Insert LedgerEntry using the shared helper that checks closed days!
    const ledgerEntry = await insertLedgerEntry({
      schoolId,
      date: new Date(),
      account: expense.paymentMode, // "cash", "bank", "online"
      direction: "out",
      category: "expense",
      amount: expense.amount,
      referenceType: "Expense",
      referenceId: expense._id,
      narration: `Expense: ${expense.title}${expense.billNumber ? " [Bill #" + expense.billNumber + "]" : ""}`,
      createdBy: req.user.id,
    });

    expense.status = "paid";
    expense.paidOn = new Date();
    expense.ledgerEntryId = ledgerEntry._id;
    await expense.save();

    await auditLog({
      schoolId,
      userId: req.user.id,
      action: "EXPENSE_PAID",
      targetType: "Expense",
      targetId: expense._id,
      details: {
        amount: expense.amount,
        paymentMode: expense.paymentMode,
        ledgerEntryId: ledgerEntry._id,
      },
    });

    await safeDel(`dashboard:${schoolId}`);

    res.status(200).json(new ApiResponse(200, expense, "Expense marked as paid and posted to ledger."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/expenses/:id/cancel
 * Cancel a draft or pending expense (status change only, no hard delete)
 */
exports.cancelExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;
    const { reason } = req.body;

    const expense = await Expense.findOne({ _id: id, schoolId });
    if (!expense) throw new ApiError(404, "Expense not found.");

    if (["paid"].includes(expense.status)) {
      throw new ApiError(400, "Paid expenses cannot be cancelled. Use an adjustment or reversal entry.");
    }

    expense.status = "rejected";
    expense.decisionRemarks = reason ? `Cancelled: ${reason}` : "Cancelled by user";
    expense.decidedAt = new Date();
    await expense.save();

    await auditLog({
      schoolId,
      userId: req.user.id,
      action: "EXPENSE_CANCELLED",
      targetType: "Expense",
      targetId: expense._id,
      details: { reason },
    });

    await safeDel(`dashboard:${schoolId}`);

    res.status(200).json(new ApiResponse(200, expense, "Expense cancelled successfully."));
  } catch (err) {
    next(err);
  }
};
