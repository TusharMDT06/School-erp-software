const mongoose = require("mongoose");
const FeeTransaction = require("../../models/FeeTransaction.model");
const Expense = require("../../models/Expense.model");
const Budget = require("../../models/Budget.model");
const ExpenseCategory = require("../../models/ExpenseCategory.model");
const PayrollRun = require("../../models/PayrollRun.model");
const Refund = require("../../models/Refund.model");
const FeeConcession = require("../../models/FeeConcession.model");
const Student = require("../../models/Student.model");
const ClassSection = require("../../models/ClassSection.model");
const { toRupees, formatMoney } = require("../../utils/money");

// ─── Tool Declarations ───────────────────────────────────────────────────────
const accountantToolDeclarations = [
  {
    name: "getTodayCollection",
    description:
      "Get total fee collections received today, including total amount, transaction count, and breakdown by payment mode (cash, online, upi).",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "getCollectionSummary",
    description:
      "Get total fee collection summary between two dates (fromDate to toDate in YYYY-MM-DD format).",
    parameters: {
      type: "OBJECT",
      properties: {
        fromDate: { type: "STRING", description: "Start date in YYYY-MM-DD format" },
        toDate: { type: "STRING", description: "End date in YYYY-MM-DD format" },
      },
    },
  },
  {
    name: "getOutstandingByClass",
    description: "Get outstanding unpaid fee summary grouped by class and section.",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "getTopDefaulters",
    description: "Get the top fee defaulters (students with the highest pending fees).",
    parameters: {
      type: "OBJECT",
      properties: {
        limit: {
          type: "NUMBER",
          description: "Number of students to return (e.g. 5 or 10, default 5)",
        },
      },
    },
  },
  {
    name: "getExpenseSummary",
    description:
      "Get total school expenses and top category breakdown for a specific month (1-12) and year.",
    parameters: {
      type: "OBJECT",
      properties: {
        month: { type: "NUMBER", description: "Month number (1-12)" },
        year: { type: "NUMBER", description: "Year (e.g. 2026)" },
      },
    },
  },
  {
    name: "getPendingApprovalsCount",
    description:
      "Get the count of items requiring management action (pending expenses, draft payroll runs, pending concessions, pending refunds).",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "getBudgetStatus",
    description:
      "Check allocated budget, actual spend, variance, and % consumed for a specific expense category name (or all categories if not provided).",
    parameters: {
      type: "OBJECT",
      properties: {
        categoryName: {
          type: "STRING",
          description: "Optional expense category name (e.g. Stationery, Electricity)",
        },
      },
    },
  },
];

// ─── Tool Handlers (Strictly Read-Only, School-Scoped) ────────────────────────
const getScopedSchoolId = (args, context) => context?.schoolId || args?.schoolId;

const accountantToolHandlers = {
  getTodayCollection: async (args = {}, context) => {
    const schoolId = getScopedSchoolId(args, context);
    if (!schoolId) return { error: "schoolId is required" };

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const txns = await FeeTransaction.find({
      status: "paid",
      paidOn: { $gte: startOfDay },
    })
      .populate({
        path: "studentId",
        match: { schoolId },
        select: "_id",
      })
      .lean();

    const valid = txns.filter((t) => t.studentId);
    let totalPaise = 0;
    const byMode = {};

    for (const t of valid) {
      const amt = t.amountPaid || 0;
      totalPaise += amt;
      const m = t.paymentMode || "online";
      byMode[m] = (byMode[m] || 0) + amt;
    }

    const modeBreakdown = Object.entries(byMode).map(([mode, amt]) => ({
      mode,
      amount: formatMoney(amt),
    }));

    return {
      date: startOfDay.toISOString().split("T")[0],
      totalAmount: formatMoney(totalPaise),
      totalRupees: toRupees(totalPaise),
      transactionCount: valid.length,
      modeBreakdown,
    };
  },

  getCollectionSummary: async (args = {}, context) => {
    const schoolId = getScopedSchoolId(args, context);
    if (!schoolId) return { error: "schoolId is required" };
    const from = args.fromDate ? new Date(args.fromDate) : new Date(Date.now() - 30 * 86400000);
    const to = args.toDate ? new Date(args.toDate) : new Date();
    to.setHours(23, 59, 59, 999);

    const txns = await FeeTransaction.find({
      status: "paid",
      paidOn: { $gte: from, $lte: to },
    })
      .populate({
        path: "studentId",
        match: { schoolId },
        select: "_id",
      })
      .lean();

    const valid = txns.filter((t) => t.studentId);
    const totalPaise = valid.reduce((sum, t) => sum + (t.amountPaid || 0), 0);

    return {
      fromDate: from.toISOString().split("T")[0],
      toDate: to.toISOString().split("T")[0],
      totalCollected: formatMoney(totalPaise),
      totalRupees: toRupees(totalPaise),
      count: valid.length,
    };
  },

  getOutstandingByClass: async (args = {}, context) => {
    const schoolId = getScopedSchoolId(args, context);
    if (!schoolId) return { error: "schoolId is required" };
    const txns = await FeeTransaction.find({
      status: { $in: ["pending", "partial", "overdue"] },
    })
      .populate({
        path: "studentId",
        match: { schoolId },
        select: "classId",
        populate: { path: "classId", select: "className section" },
      })
      .lean();

    const valid = txns.filter((t) => t.studentId);
    const byClass = {};
    let grandTotal = 0;

    for (const t of valid) {
      const remaining = Math.max(
        0,
        (t.amountDue || 0) -
          (t.amountPaid || 0) -
          (t.concessionAmount || 0) +
          (t.lateFeeAmount || 0)
      );
      grandTotal += remaining;

      const cls = t.studentId.classId
        ? `${t.studentId.classId.className}-${t.studentId.classId.section}`
        : "Unassigned";

      byClass[cls] = (byClass[cls] || 0) + remaining;
    }

    const breakdown = Object.entries(byClass)
      .map(([className, amt]) => ({
        class: className,
        outstandingAmount: formatMoney(amt),
        outstandingRupees: toRupees(amt),
      }))
      .sort((a, b) => b.outstandingRupees - a.outstandingRupees);

    return {
      grandTotalOutstanding: formatMoney(grandTotal),
      classBreakdown: breakdown,
    };
  },

  getTopDefaulters: async (args = {}, context) => {
    const schoolId = getScopedSchoolId(args, context);
    if (!schoolId) return { error: "schoolId is required" };
    const limit = Math.min(20, Math.max(1, Number(args.limit) || 5));

    const txns = await FeeTransaction.find({
      status: { $in: ["pending", "partial", "overdue"] },
    })
      .populate({
        path: "studentId",
        match: { schoolId },
        select: "admissionNumber rollNumber userId classId",
        populate: [
          { path: "userId", select: "name phone" },
          { path: "classId", select: "className section" },
        ],
      })
      .lean();

    const studentMap = new Map();

    for (const t of txns) {
      if (!t.studentId) continue;
      const sid = t.studentId._id.toString();
      const remaining = Math.max(
        0,
        (t.amountDue || 0) -
          (t.amountPaid || 0) -
          (t.concessionAmount || 0) +
          (t.lateFeeAmount || 0)
      );

      if (!studentMap.has(sid)) {
        studentMap.set(sid, {
          name: t.studentId.userId?.name || "Student",
          admissionNumber: t.studentId.admissionNumber || "—",
          className: t.studentId.classId
            ? `${t.studentId.classId.className}-${t.studentId.classId.section}`
            : "—",
          totalDue: 0,
        });
      }
      studentMap.get(sid).totalDue += remaining;
    }

    const sorted = Array.from(studentMap.values())
      .filter((s) => s.totalDue > 0)
      .sort((a, b) => b.totalDue - a.totalDue)
      .slice(0, limit)
      .map((s) => ({
        name: s.name,
        admissionNumber: s.admissionNumber,
        className: s.className,
        amountDue: formatMoney(s.totalDue),
        amountDueRupees: toRupees(s.totalDue),
      }));

    return {
      count: sorted.length,
      topDefaulters: sorted,
    };
  },

  getExpenseSummary: async (args = {}, context) => {
    const schoolId = getScopedSchoolId(args, context);
    if (!schoolId) return { error: "schoolId is required" };
    const now = new Date();
    const month = Number(args.month) || now.getMonth() + 1;
    const year = Number(args.year) || now.getFullYear();

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const expenses = await Expense.find({
      schoolId,
      status: { $in: ["approved", "paid"] },
      expenseDate: { $gte: start, $lte: end },
    })
      .populate("categoryId", "name")
      .lean();

    let total = 0;
    const catMap = {};

    for (const e of expenses) {
      const amt = e.amount || 0;
      total += amt;
      const c = e.categoryId?.name || "General";
      catMap[c] = (catMap[c] || 0) + amt;
    }

    const topCategories = Object.entries(catMap)
      .map(([category, amount]) => ({
        category,
        amount: formatMoney(amount),
        amountRupees: toRupees(amount),
      }))
      .sort((a, b) => b.amountRupees - a.amountRupees);

    return {
      month,
      year,
      totalExpense: formatMoney(total),
      voucherCount: expenses.length,
      topCategories,
    };
  },

  getPendingApprovalsCount: async (args = {}, context) => {
    const schoolId = getScopedSchoolId(args, context);
    if (!schoolId) return { error: "schoolId is required" };

    const [pendingExpenses, draftPayroll, pendingConcessions, pendingRefunds] =
      await Promise.all([
        Expense.countDocuments({ schoolId, status: "pending_approval" }),
        PayrollRun.countDocuments({ schoolId, status: "draft" }),
        FeeConcession.countDocuments({ schoolId, status: "pending" }),
        Refund.countDocuments({ schoolId, status: "pending" }),
      ]);

    return {
      pendingExpensesCount: pendingExpenses,
      draftPayrollRunsCount: draftPayroll,
      pendingConcessionsCount: pendingConcessions,
      pendingRefundsCount: pendingRefunds,
      totalPendingItems:
        pendingExpenses + draftPayroll + pendingConcessions + pendingRefunds,
    };
  },

  getBudgetStatus: async (args = {}, context) => {
    const schoolId = getScopedSchoolId(args, context);
    if (!schoolId) return { error: "schoolId is required" };
    const { categoryName } = args;

    const budgets = await Budget.find({ schoolId })
      .populate("categoryId", "name")
      .lean();

    let filtered = budgets;
    if (categoryName) {
      filtered = budgets.filter((b) =>
        b.categoryId?.name?.toLowerCase().includes(categoryName.toLowerCase())
      );
    }

    const catIds = filtered.map((b) => b.categoryId?._id).filter(Boolean);

    const actuals = await Expense.aggregate([
      {
        $match: {
          schoolId: new mongoose.Types.ObjectId(schoolId),
          status: "paid",
          categoryId: { $in: catIds },
        },
      },
      { $group: { _id: "$categoryId", totalSpent: { $sum: "$amount" } } },
    ]);

    const actualMap = new Map();
    actuals.forEach((a) => actualMap.set(a._id.toString(), a.totalSpent));

    const results = filtered.map((b) => {
      const catId = b.categoryId?._id?.toString();
      const spent = actualMap.get(catId) || 0;
      const allocated = b.amount || 0;
      const variance = allocated - spent;
      const pct = allocated > 0 ? ((spent / allocated) * 100).toFixed(1) : "0.0";

      return {
        category: b.categoryId?.name || "Uncategorized",
        academicYear: b.academicYear,
        allocatedBudget: formatMoney(allocated),
        actualSpent: formatMoney(spent),
        remainingVariance: formatMoney(variance),
        percentageConsumed: `${pct}%`,
        status:
          Number(pct) >= 100 ? "EXHAUSTED" : Number(pct) >= 80 ? "NEAR_LIMIT" : "HEALTHY",
      };
    });

    return {
      categoriesCount: results.length,
      budgets: results,
    };
  },
};

module.exports = {
  accountantToolDeclarations,
  accountantToolHandlers,
};
