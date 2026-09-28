const Budget = require("../models/Budget.model");
const Expense = require("../models/Expense.model");
const ExpenseCategory = require("../models/ExpenseCategory.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const auditLog = require("../utils/auditLog");

/**
 * Helper to parse academic year string (e.g. "2025-2026") into start & end Dates
 * Defaults to April 1st of start year to March 31st of end year.
 */
const getAcademicYearDates = (academicYear) => {
  const parts = (academicYear || "").split("-");
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const startYear = parseInt(parts[0], 10);
    const endYear = parseInt(parts[1], 10);
    const start = new Date(Date.UTC(startYear, 3, 1, 0, 0, 0, 0)); // April 1
    const end = new Date(Date.UTC(endYear, 2, 31, 23, 59, 59, 999)); // March 31
    return { start, end };
  }
  // Fallback to current calendar year
  const now = new Date();
  const start = new Date(Date.UTC(now.getFullYear(), 0, 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getFullYear(), 11, 31, 23, 59, 59, 999));
  return { start, end };
};

/**
 * POST / PUT /api/budgets
 * Set or update budget for categories in an academic year
 * Body can be single { academicYear, categoryId, allocatedAmount }
 * or batch { academicYear, items: [{ categoryId, allocatedAmount }] }
 */
exports.setBudget = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { academicYear, categoryId, allocatedAmount, items } = req.body;

    if (!academicYear) {
      throw new ApiError(400, "Academic year is required (e.g. '2025-2026').");
    }

    const budgetItems = Array.isArray(items) ? items : [{ categoryId, allocatedAmount }];

    const results = [];
    for (const item of budgetItems) {
      if (!item.categoryId) continue;
      const amountPaise = Number(item.allocatedAmount ?? 0);
      if (amountPaise < 0) {
        throw new ApiError(400, "Allocated amount cannot be negative.");
      }

      const budget = await Budget.findOneAndUpdate(
        { schoolId, academicYear: academicYear.trim(), categoryId: item.categoryId },
        { allocatedAmount: amountPaise },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      results.push(budget);
    }

    await auditLog({
      schoolId,
      userId: req.user.id,
      action: "BUDGET_UPDATED",
      targetType: "Budget",
      details: { academicYear, count: results.length },
    });

    res.status(200).json(new ApiResponse(200, results, "Budget saved successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/budgets
 * List all budgets for an academic year
 */
exports.getBudgets = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { academicYear } = req.query;

    const query = { schoolId };
    if (academicYear) query.academicYear = academicYear;

    const budgets = await Budget.find(query)
      .populate("categoryId", "name isActive")
      .sort({ academicYear: -1 })
      .lean();

    res.status(200).json(new ApiResponse(200, budgets, "Budgets retrieved."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/budgets/vs-actual?academicYear=
 * Per category: allocated, spent, remaining, percentUsed;
 * flag categories above 90% (warning) and above 100% (over budget)
 */
exports.getBudgetVsActual = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    let { academicYear } = req.query;

    if (!academicYear) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const nextYear = currentYear + 1;
      academicYear = `${currentYear}-${nextYear}`;
    }

    const { start, end } = getAcademicYearDates(academicYear);

    // Fetch all active categories, budgets, and spent amounts in parallel
    const [categories, budgets, spentAgg] = await Promise.all([
      ExpenseCategory.find({ schoolId, isActive: true }).sort({ name: 1 }).lean(),
      Budget.find({ schoolId, academicYear }).lean(),
      Expense.aggregate([
        {
          $match: {
            schoolId,
            status: "paid",
            expenseDate: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: "$categoryId",
            totalSpent: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    // Build lookup maps
    const budgetMap = {};
    budgets.forEach((b) => {
      budgetMap[b.categoryId.toString()] = b.allocatedAmount;
    });

    const spentMap = {};
    spentAgg.forEach((s) => {
      spentMap[s._id.toString()] = s.totalSpent;
    });

    let totalAllocated = 0;
    let totalSpent = 0;

    const categoryBreakdown = categories.map((cat) => {
      const catId = cat._id.toString();
      const allocated = budgetMap[catId] || 0;
      const spent = spentMap[catId] || 0;
      const remaining = allocated - spent;

      totalAllocated += allocated;
      totalSpent += spent;

      let percentUsed = 0;
      if (allocated > 0) {
        percentUsed = Math.round((spent / allocated) * 100);
      } else if (spent > 0) {
        percentUsed = 100;
      }

      let flag = "normal";
      if (percentUsed > 100) {
        flag = "over_budget";
      } else if (percentUsed >= 90) {
        flag = "warning";
      }

      return {
        categoryId: cat._id,
        categoryName: cat.name,
        allocatedAmount: allocated,
        spentAmount: spent,
        remainingAmount: remaining,
        percentUsed,
        flag, // "normal" | "warning" | "over_budget"
      };
    });

    const totalRemaining = totalAllocated - totalSpent;
    const overallPercentUsed =
      totalAllocated > 0
        ? Math.round((totalSpent / totalAllocated) * 100)
        : totalSpent > 0
        ? 100
        : 0;

    let overallFlag = "normal";
    if (overallPercentUsed > 100) overallFlag = "over_budget";
    else if (overallPercentUsed >= 90) overallFlag = "warning";

    res.status(200).json(
      new ApiResponse(
        200,
        {
          academicYear,
          dateRange: { start, end },
          totals: {
            totalAllocated,
            totalSpent,
            totalRemaining,
            overallPercentUsed,
            overallFlag,
          },
          categories: categoryBreakdown,
        },
        "Budget vs actual analysis retrieved."
      )
    );
  } catch (err) {
    next(err);
  }
};
