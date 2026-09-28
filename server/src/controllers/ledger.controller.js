const LedgerEntry = require("../models/LedgerEntry.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

/**
 * GET /api/ledger
 * General ledger entries with filters, search, and pagination
 */
exports.getLedgerEntries = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const {
      startDate,
      endDate,
      account,
      category,
      direction,
      search,
      page = 1,
      limit = 25,
      exportCsv,
    } = req.query;

    const query = { schoolId };

    if (account) query.account = account;
    if (category) query.category = category;
    if (direction) query.direction = direction;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    if (search && search.trim()) {
      query.narration = new RegExp(search.trim(), "i");
    }

    if (exportCsv === "true") {
      const allEntries = await LedgerEntry.find(query)
        .populate("createdBy", "name")
        .sort({ date: -1, createdAt: -1 })
        .lean();

      // Return array directly for CSV generation or let frontend handle it
      return res.status(200).json(new ApiResponse(200, allEntries, "Full ledger for CSV export."));
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [entries, total] = await Promise.all([
      LedgerEntry.find(query)
        .populate("createdBy", "name")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      LedgerEntry.countDocuments(query),
    ]);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          entries,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
        "Ledger entries retrieved."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ledger/daybook?date=
 * All entries on a specific day + totals in/out per account
 */
exports.getDaybook = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { date } = req.query;

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const dateStr = startOfDay.toISOString().split("T")[0];

    const entries = await LedgerEntry.find({
      schoolId,
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("createdBy", "name")
      .sort({ date: 1, createdAt: 1 })
      .lean();

    // Compute totals in/out per account
    const accountTotals = {
      cash: { in: 0, out: 0, net: 0 },
      bank: { in: 0, out: 0, net: 0 },
      online: { in: 0, out: 0, net: 0 },
    };

    let totalIn = 0;
    let totalOut = 0;

    entries.forEach((e) => {
      const acc = e.account || "cash";
      if (!accountTotals[acc]) {
        accountTotals[acc] = { in: 0, out: 0, net: 0 };
      }

      if (e.direction === "in") {
        accountTotals[acc].in += e.amount;
        totalIn += e.amount;
      } else if (e.direction === "out") {
        accountTotals[acc].out += e.amount;
        totalOut += e.amount;
      }
      accountTotals[acc].net = accountTotals[acc].in - accountTotals[acc].out;
    });

    const grandTotals = {
      totalIn,
      totalOut,
      net: totalIn - totalOut,
    };

    res.status(200).json(
      new ApiResponse(
        200,
        {
          date: dateStr,
          entries,
          accountTotals,
          grandTotals,
        },
        "Daybook retrieved."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ledger/cashbook?from=&to=
 * Cash-account entries with opening balance and RUNNING balance per row,
 * computed via MongoDB aggregation on the server.
 */
exports.getCashbook = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    let { from, to } = req.query;

    const now = new Date();
    if (!to) {
      to = now.toISOString().split("T")[0];
    }
    if (!from) {
      // Default to 1st of current month
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      from = firstOfMonth.toISOString().split("T")[0];
    }

    const startFrom = new Date(from);
    startFrom.setHours(0, 0, 0, 0);

    const endTo = new Date(to);
    endTo.setHours(23, 59, 59, 999);

    // ── 1. Calculate Opening Balance before `startFrom` ──────────────────
    const openingAgg = await LedgerEntry.aggregate([
      {
        $match: {
          schoolId,
          account: "cash",
          date: { $lt: startFrom },
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

    const openingIn = openingAgg[0]?.totalIn || 0;
    const openingOut = openingAgg[0]?.totalOut || 0;
    const openingBalance = openingIn - openingOut;

    // ── 2. Run Aggregation with Server-Side Running Balance ───────────────
    let entries = [];
    try {
      entries = await LedgerEntry.aggregate([
        {
          $match: {
            schoolId,
            account: "cash",
            date: { $gte: startFrom, $lte: endTo },
          },
        },
        { $sort: { date: 1, createdAt: 1, _id: 1 } },
        {
          $lookup: {
            from: "users",
            localField: "createdBy",
            foreignField: "_id",
            as: "creator",
          },
        },
        {
          $unwind: { path: "$creator", preserveNullAndEmptyArrays: true },
        },
        {
          $set: {
            createdByName: "$creator.name",
            netEffect: {
              $cond: [{ $eq: ["$direction", "in"] }, "$amount", { $multiply: ["$amount", -1] }],
            },
          },
        },
        {
          $setWindowFields: {
            sortBy: { date: 1, createdAt: 1, _id: 1 },
            output: {
              cumulativeNet: {
                $sum: "$netEffect",
                window: { documents: ["unbounded", "current"] },
              },
            },
          },
        },
        {
          $set: {
            runningBalance: { $add: [openingBalance, "$cumulativeNet"] },
          },
        },
        {
          $project: {
            creator: 0,
            cumulativeNet: 0,
            netEffect: 0,
          },
        },
      ]);
    } catch (windowErr) {
      // Fallback running balance computation if $setWindowFields is unsupported
      console.warn("[getCashbook] $setWindowFields fallback invoked:", windowErr.message);
      const rawEntries = await LedgerEntry.find({
        schoolId,
        account: "cash",
        date: { $gte: startFrom, $lte: endTo },
      })
        .populate("createdBy", "name")
        .sort({ date: 1, createdAt: 1, _id: 1 })
        .lean();

      let currentBal = openingBalance;
      entries = rawEntries.map((e) => {
        if (e.direction === "in") {
          currentBal += e.amount;
        } else {
          currentBal -= e.amount;
        }
        return {
          ...e,
          createdByName: e.createdBy?.name || "System",
          runningBalance: currentBal,
        };
      });
    }

    // ── 3. Calculate Summary Stats for this period ────────────────────────
    let periodIn = 0;
    let periodOut = 0;
    entries.forEach((e) => {
      if (e.direction === "in") periodIn += e.amount;
      else if (e.direction === "out") periodOut += e.amount;
    });

    const closingBalance = openingBalance + periodIn - periodOut;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          from,
          to,
          openingBalance,
          periodIn,
          periodOut,
          periodNet: periodIn - periodOut,
          closingBalance,
          entries,
        },
        "Cashbook with running balance retrieved."
      )
    );
  } catch (err) {
    next(err);
  }
};
