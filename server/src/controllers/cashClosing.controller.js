const CashClosing = require("../models/CashClosing.model");
const LedgerEntry = require("../models/LedgerEntry.model");
const { notifyMany } = require("../services/notification.service");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const { toRupees } = require("../utils/money");
const auditLog = require("../utils/auditLog");
const { safeDel } = require("../config/redis");
const { formatDateStr } = require("../utils/insertLedgerEntry");

/**
 * GET /api/cash-closing/preview?date=
 * Computes openingCash, cashCollected, cashExpensesAndRefunds, expectedClosingCash for a date.
 */
exports.getCashClosingPreview = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { date } = req.query;

    const dateStr = formatDateStr(date);
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    // Check if day is already closed
    const existingClosing = await CashClosing.findOne({ schoolId, date: dateStr })
      .populate("closedBy", "name")
      .lean();

    // 1. Opening Cash: check previous closing first
    const prevClosing = await CashClosing.findOne({
      schoolId,
      date: { $lt: dateStr },
    })
      .sort({ date: -1 })
      .lean();

    let openingCash = 0;
    if (prevClosing) {
      openingCash = prevClosing.actualCash;
    } else {
      // Sum all cash ledger entries before this day
      const priorAgg = await LedgerEntry.aggregate([
        {
          $match: {
            schoolId,
            account: "cash",
            date: { $lt: startOfDay },
          },
        },
        {
          $group: {
            _id: null,
            totalIn: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$amount", 0] } },
            totalOut: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$amount", 0] } },
          },
        },
      ]);
      const pIn = priorAgg[0]?.totalIn || 0;
      const pOut = priorAgg[0]?.totalOut || 0;
      openingCash = pIn - pOut;
    }

    // 2. Day's cash collected (in) and paid out (out)
    const dayAgg = await LedgerEntry.aggregate([
      {
        $match: {
          schoolId,
          account: "cash",
          date: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: "$direction",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let cashCollected = 0;
    let cashExpensesAndRefunds = 0;

    dayAgg.forEach((g) => {
      if (g._id === "in") cashCollected = g.total;
      if (g._id === "out") cashExpensesAndRefunds = g.total;
    });

    const expectedClosingCash = openingCash + cashCollected - cashExpensesAndRefunds;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          date: dateStr,
          openingCash,
          cashCollected,
          cashExpensesAndRefunds,
          expectedClosingCash,
          isClosed: !!existingClosing,
          existingClosing,
        },
        "Cash closing preview computed."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/cash-closing
 * Performs day close, calculates discrepancy, locks day against future ledger entries
 */
exports.closeDay = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { date, actualCash, remarks } = req.body;

    if (!date) {
      throw new ApiError(400, "Date (YYYY-MM-DD) is required.");
    }
    if (actualCash === undefined || actualCash === null) {
      throw new ApiError(400, "Actual cash counted (in paise) is required.");
    }

    const actualCashPaise = Number(actualCash);
    if (isNaN(actualCashPaise) || actualCashPaise < 0) {
      throw new ApiError(400, "Actual cash must be a valid non-negative number of paise.");
    }

    const dateStr = formatDateStr(date);
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    // Verify not already closed
    const alreadyClosed = await CashClosing.findOne({ schoolId, date: dateStr });
    if (alreadyClosed) {
      throw new ApiError(400, `Day ${dateStr} has already been closed and locked.`);
    }

    // Compute expectedClosingCash accurately on server
    const prevClosing = await CashClosing.findOne({
      schoolId,
      date: { $lt: dateStr },
    })
      .sort({ date: -1 })
      .lean();

    let openingCash = 0;
    if (prevClosing) {
      openingCash = prevClosing.actualCash;
    } else {
      const priorAgg = await LedgerEntry.aggregate([
        {
          $match: {
            schoolId,
            account: "cash",
            date: { $lt: startOfDay },
          },
        },
        {
          $group: {
            _id: null,
            totalIn: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$amount", 0] } },
            totalOut: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$amount", 0] } },
          },
        },
      ]);
      openingCash = (priorAgg[0]?.totalIn || 0) - (priorAgg[0]?.totalOut || 0);
    }

    const dayAgg = await LedgerEntry.aggregate([
      {
        $match: {
          schoolId,
          account: "cash",
          date: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $group: {
          _id: "$direction",
          total: { $sum: "$amount" },
        },
      },
    ]);

    let cashCollected = 0;
    let cashExpensesAndRefunds = 0;

    dayAgg.forEach((g) => {
      if (g._id === "in") cashCollected = g.total;
      if (g._id === "out") cashExpensesAndRefunds = g.total;
    });

    const expectedClosingCash = openingCash + cashCollected - cashExpensesAndRefunds;
    const difference = actualCashPaise - expectedClosingCash;

    // Discrepancy rule: if difference != 0, require remarks
    if (difference !== 0 && (!remarks || !remarks.trim())) {
      throw new ApiError(
        400,
        `Physical cash differs from expected by ₹${toRupees(Math.abs(difference))}. Remarks explaining the discrepancy are required.`
      );
    }

    const closing = await CashClosing.create({
      schoolId,
      date: dateStr,
      openingCash,
      cashCollected,
      cashExpensesAndRefunds,
      expectedClosingCash,
      actualCash: actualCashPaise,
      difference,
      remarks: remarks?.trim() || "",
      closedBy: req.user.id,
      closedAt: new Date(),
    });

    // Notify admins if difference != 0
    if (difference !== 0) {
      notifyMany(
        { schoolId, role: { $in: ["admin", "superadmin"] } },
        {
          type: "cash_closing_discrepancy",
          title: "Day Close Cash Discrepancy Alert",
          message: `Cash register for ${dateStr} closed with a difference of ₹${toRupees(difference)} (Expected: ₹${toRupees(expectedClosingCash)}, Counted: ₹${toRupees(actualCashPaise)}). Remarks: ${remarks?.trim()}`,
          data: { date: dateStr, difference, actualCash: actualCashPaise, expectedClosingCash },
        }
      );
    }

    await auditLog({
      schoolId,
      userId: req.user.id,
      action: "DAY_CLOSED",
      targetType: "CashClosing",
      targetId: closing._id,
      details: {
        date: dateStr,
        expectedClosingCash,
        actualCash: actualCashPaise,
        difference,
        remarks: remarks?.trim(),
      },
    });

    await safeDel(`dashboard:${schoolId}`);

    res.status(201).json(new ApiResponse(201, closing, `Day ${dateStr} successfully closed and locked.`));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/cash-closing
 * History of cash closings
 */
exports.getCashClosingHistory = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = { schoolId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [closings, total] = await Promise.all([
      CashClosing.find(query)
        .populate("closedBy", "name")
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      CashClosing.countDocuments(query),
    ]);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          closings,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
        "Cash closing history retrieved."
      )
    );
  } catch (err) {
    next(err);
  }
};
