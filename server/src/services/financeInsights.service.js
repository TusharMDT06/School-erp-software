const mongoose = require("mongoose");
const FeeTransaction = require("../models/FeeTransaction.model");
const FeeStructure = require("../models/FeeStructure.model");
const Student = require("../models/Student.model");
const User = require("../models/User.model");
const Vendor = require("../models/Vendor.model");
const Expense = require("../models/Expense.model");
const ExpenseCategory = require("../models/ExpenseCategory.model");
const CashClosing = require("../models/CashClosing.model");
const LedgerEntry = require("../models/LedgerEntry.model");
const PaymentLink = require("../models/PaymentLink.model");
const razorpay = require("../config/razorpay");
const { generateText } = require("../config/geminiClient");
const { safeGet, safeSet } = require("../config/redis");
const { toRupees, formatMoney } = require("../utils/money");

const INSIGHT_CACHE_TTL = 6 * 60 * 60; // 6 hours

/**
 * Computes exact statistical numbers IN CODE for financial insights.
 * Never allows AI to calculate or hallucinate metrics.
 */
const computeWeeklyFinanceNumbers = async (schoolId) => {
  const now = new Date();

  // 1. Weekly collections: This week vs Previous week (Mon-Sun or 7-day window)
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prev14to7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [thisWeekAgg, prevWeekAgg] = await Promise.all([
    LedgerEntry.aggregate([
      {
        $match: {
          schoolId: new mongoose.Types.ObjectId(schoolId),
          direction: "in",
          category: "fee_collection",
          date: { $gte: last7Days, $lte: now },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    LedgerEntry.aggregate([
      {
        $match: {
          schoolId: new mongoose.Types.ObjectId(schoolId),
          direction: "in",
          category: "fee_collection",
          date: { $gte: prev14to7Days, $lt: last7Days },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const thisWeekTotal = thisWeekAgg[0]?.total || 0;
  const prevWeekTotal = prevWeekAgg[0]?.total || 0;
  const weekDiff = thisWeekTotal - prevWeekTotal;
  const weekPercentChange =
    prevWeekTotal > 0 ? Number(((weekDiff / prevWeekTotal) * 100).toFixed(1)) : 0;

  // 2. Top expense category change (Current month vs Previous month)
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const [currentMonthExp, prevMonthExp] = await Promise.all([
    Expense.aggregate([
      {
        $match: {
          schoolId: new mongoose.Types.ObjectId(schoolId),
          status: { $in: ["approved", "paid"] },
          expenseDate: { $gte: currentMonthStart, $lte: now },
        },
      },
      {
        $group: {
          _id: "$categoryId",
          total: { $sum: "$amount" },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 1 },
      {
        $lookup: { from: "expensecategories", localField: "_id", foreignField: "_id", as: "cat" },
      },
      { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
    ]),
    Expense.aggregate([
      {
        $match: {
          schoolId: new mongoose.Types.ObjectId(schoolId),
          status: { $in: ["approved", "paid"] },
          expenseDate: { $gte: prevMonthStart, $lte: prevMonthEnd },
        },
      },
      {
        $group: {
          _id: "$categoryId",
          total: { $sum: "$amount" },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 1 },
      {
        $lookup: { from: "expensecategories", localField: "_id", foreignField: "_id", as: "cat" },
      },
      { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
    ]),
  ]);

  const topCategoryCurrent = currentMonthExp[0]?.cat?.name || "General Expenses";
  const topCategoryCurrentAmt = currentMonthExp[0]?.total || 0;
  const topCategoryPrev = prevMonthExp[0]?.cat?.name || "General Expenses";
  const topCategoryPrevAmt = prevMonthExp[0]?.total || 0;

  // 3. Aging shift: 0-30 days vs 30+ days overdue
  const pendingTxns = await FeeTransaction.find({
    status: { $in: ["pending", "partial", "overdue"] },
  })
    .populate({
      path: "studentId",
      match: { schoolId },
      select: "_id",
    })
    .populate("feeStructureId", "dueDate")
    .lean();

  let under30DaysTotal = 0;
  let over30DaysTotal = 0;

  for (const t of pendingTxns) {
    if (!t.studentId) continue;
    const remaining = Math.max(
      0,
      (t.amountDue || 0) -
        (t.amountPaid || 0) -
        (t.concessionAmount || 0) +
        (t.lateFeeAmount || 0)
    );
    const dueDate = t.feeStructureId?.dueDate ? new Date(t.feeStructureId.dueDate) : t.createdAt;
    const diff = Math.max(0, Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)));

    if (diff <= 30) {
      under30DaysTotal += remaining;
    } else {
      over30DaysTotal += remaining;
    }
  }

  // 4. 30-day collection forecast = average of the same 30-day window across the last 3 months
  const m1Start = new Date(now.getTime() - 30 * 86400000);
  const m2Start = new Date(now.getTime() - 60 * 86400000);
  const m3Start = new Date(now.getTime() - 90 * 86400000);

  const [w1Agg, w2Agg, w3Agg] = await Promise.all([
    LedgerEntry.aggregate([
      {
        $match: {
          schoolId: new mongoose.Types.ObjectId(schoolId),
          direction: "in",
          category: "fee_collection",
          date: { $gte: m1Start, $lte: now },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    LedgerEntry.aggregate([
      {
        $match: {
          schoolId: new mongoose.Types.ObjectId(schoolId),
          direction: "in",
          category: "fee_collection",
          date: { $gte: m2Start, $lt: m1Start },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    LedgerEntry.aggregate([
      {
        $match: {
          schoolId: new mongoose.Types.ObjectId(schoolId),
          direction: "in",
          category: "fee_collection",
          date: { $gte: m3Start, $lt: m2Start },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const w1 = w1Agg[0]?.total || 0;
  const w2 = w2Agg[0]?.total || 0;
  const w3 = w3Agg[0]?.total || 0;
  const forecast30Days = Math.round((w1 + w2 + w3) / 3);

  return {
    thisWeekCollection: formatMoney(thisWeekTotal),
    previousWeekCollection: formatMoney(prevWeekTotal),
    weekChangePercentage: `${weekPercentChange > 0 ? "+" : ""}${weekPercentChange}%`,
    weeklyCollectionChangePercent: weekPercentChange,
    topExpenseThisMonth: `${topCategoryCurrent} (${formatMoney(topCategoryCurrentAmt)})`,
    topExpensePrevMonth: `${topCategoryPrev} (${formatMoney(topCategoryPrevAmt)})`,
    agingUnder30Days: formatMoney(under30DaysTotal),
    agingOver30Days: formatMoney(over30DaysTotal),
    forecastNext30Days: formatMoney(forecast30Days),
    forecastNext30DaysPaise: forecast30Days,
    rawMetrics: {
      thisWeekPaise: thisWeekTotal,
      prevWeekPaise: prevWeekTotal,
      forecastPaise: forecast30Days,
    },
  };
};

/**
 * Generates or retrieves 6-hour cached Weekly AI Insight narrative.
 * Gemini strictly narrates; never invents figures.
 */
const getWeeklyFinanceInsight = async (schoolId, forceRefresh = false) => {
  const cacheKey = `ai_insight:finance:${schoolId}`;

  if (!forceRefresh) {
    const cached = await safeGet(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }
  }

  // 1. Calculate verified metrics in code
  const metrics = await computeWeeklyFinanceNumbers(schoolId);

  // 2. Format prompt with strict instructions
  const prompt = `You are a Chief Financial Officer for an educational institution.
Review these exact, verified financial metrics computed by the system:
- Weekly Fee Collection: ${metrics.thisWeekCollection} (vs ${metrics.previousWeekCollection} last week, change: ${metrics.weekChangePercentage})
- Top Expense Category This Month: ${metrics.topExpenseThisMonth} (vs last month: ${metrics.topExpensePrevMonth})
- Aging Receivables: <30 days overdue: ${metrics.agingUnder30Days} | >30 days overdue: ${metrics.agingOver30Days}
- 30-Day Inflow Forecast (3-month moving average): ${metrics.forecastNext30Days}

Task: Write EXACTLY a 5-line executive summary for the school's finance dashboard.
Rules:
1. Must be exactly 5 concise lines (bullets or numbered).
2. DO NOT recalculate, modify, or invent any numbers. Only mention the exact figures provided above.
3. Be professional, direct, and actionable for the school accountant and principal.`;

  let narrative = "";
  try {
    narrative = await generateText(prompt);
  } catch (err) {
    console.warn("[FinanceInsight] Gemini generation failed:", err.message);
    narrative = `• Weekly Collections reached ${metrics.thisWeekCollection} (${metrics.weekChangePercentage} compared to previous week).\n• Top expenditure is concentrated in ${metrics.topExpenseThisMonth}.\n• Fresh overdue receivables (<30 days) stand at ${metrics.agingUnder30Days}.\n• Critical aged defaults (>30 days) require recovery outreach: ${metrics.agingOver30Days}.\n• 30-day projected fee inflow is estimated at ${metrics.forecastNext30Days}.`;
  }

  const result = {
    metrics,
    narrative,
    summary: narrative,
    generatedAt: new Date().toISOString(),
  };

  await safeSet(cacheKey, JSON.stringify(result), INSIGHT_CACHE_TTL);
  return result;
};

/**
 * Evaluates rule-based anomalies in code for the dashboard "Needs Attention" panel:
 * 1. Expense > 3x category's 6-month average
 * 2. Duplicate expense (same vendor + amount + date)
 * 3. Day-close difference not zero
 * 4. More than N receipt reversals by one collector in a week (default 3)
 * 5. Paid-on-Razorpay-but-missing-in-DB count > 0
 */
const checkFinancialAnomalies = async (schoolId, maxReversalsThreshold = 3) => {
  const anomalies = [];
  const now = new Date();

  try {
    // 1. Check for Duplicate Expenses (same vendor + amount + date)
    const duplicateAgg = await Expense.aggregate([
      {
        $match: {
          schoolId: new mongoose.Types.ObjectId(schoolId),
          vendorId: { $ne: null },
          status: { $in: ["pending_approval", "approved", "paid"] },
        },
      },
      {
        $group: {
          _id: {
            vendorId: "$vendorId",
            amount: "$amount",
            dateStr: { $dateToString: { format: "%Y-%m-%d", date: "$expenseDate" } },
          },
          count: { $sum: 1 },
          expenseIds: { $push: "$_id" },
        },
      },
      { $match: { count: { $gt: 1 } } },
      { $limit: 3 },
      {
        $lookup: { from: "vendors", localField: "_id.vendorId", foreignField: "_id", as: "vendor" },
      },
      { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } },
    ]);

    for (const dup of duplicateAgg) {
      anomalies.push({
        type: "DUPLICATE_EXPENSE",
        severity: "high",
        title: "Potential Duplicate Expense Detected",
        message: `${dup.count} expenses of ${formatMoney(dup._id.amount)} for vendor "${
          dup.vendor?.name || "Vendor"
        }" were recorded on the same date (${dup._id.dateStr}).`,
        details: { vendor: dup.vendor?.name, amount: dup._id.amount, count: dup.count },
      });
    }

    // 2. Check for Expense > 3x 6-month Category Average
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const catAverages = await Expense.aggregate([
      {
        $match: {
          schoolId: new mongoose.Types.ObjectId(schoolId),
          status: { $in: ["approved", "paid"] },
          expenseDate: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: "$categoryId",
          avgAmount: { $avg: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gte: 2 } } },
    ]);

    const catAvgMap = new Map();
    catAverages.forEach((c) => catAvgMap.set(c._id.toString(), c.avgAmount));

    const recentExpenses = await Expense.find({
      schoolId,
      expenseDate: { $gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) },
      status: { $in: ["pending_approval", "approved", "paid"] },
    })
      .populate("categoryId", "name")
      .limit(50)
      .lean();

    for (const exp of recentExpenses) {
      if (!exp.categoryId) continue;
      const catId = exp.categoryId._id.toString();
      const avg = catAvgMap.get(catId);
      if (avg && exp.amount > 3 * avg) {
        anomalies.push({
          type: "EXPENSE_SPIKE",
          severity: "medium",
          title: `Expense Spike in ${exp.categoryId.name}`,
          message: `Voucher "${exp.title}" for ${formatMoney(
            exp.amount
          )} exceeds 3x the 6-month category average of ${formatMoney(Math.round(avg))}.`,
          details: {
            title: exp.title,
            amount: exp.amount,
            categoryAvg: Math.round(avg),
          },
        });
        break; // Show one spike warning
      }
    }

    // 3. Day-close difference not zero
    const recentClosings = await CashClosing.find({ schoolId })
      .sort({ date: -1 })
      .limit(3)
      .lean();

    for (const c of recentClosings) {
      if (c.difference && c.difference !== 0) {
        anomalies.push({
          type: "DAY_CLOSE_DISCREPANCY",
          severity: "high",
          title: `Cash Discrepancy on ${c.date}`,
          message: `Day close for ${c.date} has an unexplained variance of ${formatMoney(
            Math.abs(c.difference)
          )} (${c.difference < 0 ? "Shortage" : "Excess"}).`,
          details: { date: c.date, difference: c.difference },
        });
        break;
      }
    }

    // 4. More than N receipt reversals by one collector in a week
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const reversalsByUser = await FeeTransaction.aggregate([
      {
        $match: {
          isReversed: true,
          reversedAt: { $gte: last7Days },
        },
      },
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "stu",
        },
      },
      { $unwind: "$stu" },
      { $match: { "stu.schoolId": new mongoose.Types.ObjectId(schoolId) } },
      {
        $group: {
          _id: "$reversedBy",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amountPaid" },
        },
      },
      { $match: { count: { $gt: maxReversalsThreshold } } },
      {
        $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
    ]);

    for (const rev of reversalsByUser) {
      anomalies.push({
        type: "EXCESSIVE_REVERSALS",
        severity: "critical",
        title: "High Frequency Fee Reversals",
        message: `Collector "${rev.user?.name || "Staff"}" has performed ${
          rev.count
        } receipt reversals in the last 7 days totaling ${formatMoney(rev.totalAmount)}.`,
        details: { collector: rev.user?.name, count: rev.count },
      });
    }

    // 5. Paid-on-Razorpay-but-missing-in-DB count > 0 (Quick reconciliation check)
    if (razorpay && process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes("placeholder")) {
      try {
        const fromTimestamp = Math.floor((now.getTime() - 7 * 86400000) / 1000);
        const rzpResponse = await razorpay.payments.all({
          from: fromTimestamp,
          count: 50,
        });

        const captured = (rzpResponse.items || []).filter(
          (p) => p.status === "captured" || p.status === "authorized"
        );

        if (captured.length > 0) {
          const pIds = captured.map((p) => p.id);
          const foundTxns = await FeeTransaction.find({
            razorpayPaymentId: { $in: pIds },
            status: "paid",
          }).select("razorpayPaymentId");

          const foundIds = new Set(foundTxns.map((t) => t.razorpayPaymentId));
          const missingCount = captured.filter((p) => !foundIds.has(p.id)).length;

          if (missingCount > 0) {
            anomalies.push({
              type: "RAZORPAY_UNRECONCILED",
              severity: "critical",
              title: "Unrecorded Online Payments",
              message: `${missingCount} online payments captured on Razorpay in the last 7 days are not linked to any paid student transaction in the ERP.`,
              details: { missingCount },
            });
          }
        }
      } catch (rzpErr) {
        // Silent fallback
      }
    }
  } catch (err) {
    console.error("[Anomalies] Anomaly check error:", err.message);
  }

  return anomalies;
};

module.exports = {
  computeWeeklyFinanceNumbers,
  getWeeklyFinanceInsight,
  checkFinancialAnomalies,
};
