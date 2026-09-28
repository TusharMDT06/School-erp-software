const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const FeeTransaction = require("../models/FeeTransaction.model");
const FeeConcession = require("../models/FeeConcession.model");
const Expense = require("../models/Expense.model");
const LedgerEntry = require("../models/LedgerEntry.model");
const Budget = require("../models/Budget.model");
const Student = require("../models/Student.model");
const ClassSection = require("../models/ClassSection.model");
const ExpenseCategory = require("../models/ExpenseCategory.model");
const Vendor = require("../models/Vendor.model");
const { safeGet, safeSet } = require("../config/redis");
const { ApiError, ApiResponse } = require("../utils/apiResponse");
const { toRupees, formatMoney } = require("../utils/money");

const CACHE_TTL_SECONDS = 300; // 5 minutes

// Helper to set excel headers
const setupExcelResponse = (res, filename) => {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename=${filename}.xlsx`);
};

/**
 * 1. GET /api/reports/collection
 * Collection report grouped by day | class | feeHead | paymentMode | collector
 */
const getCollectionReport = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { from, to, groupBy = "day", format } = req.query;

    const cacheKey = `report:collection:${schoolId}:${from || ""}:${to || ""}:${groupBy}:${format || "json"}`;
    if (format !== "xlsx") {
      const cached = await safeGet(cacheKey);
      if (cached) {
        return res
          .status(200)
          .json(new ApiResponse(200, JSON.parse(cached), "Collection report fetched (cached)"));
      }
    }

    const match = {
      status: "paid",
    };

    if (from || to) {
      match.paidOn = {};
      if (from) match.paidOn.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        match.paidOn.$lte = toDate;
      }
    }

    // Lookup student to filter by schoolId
    const pipeline = [
      { $match: match },
      {
        $lookup: {
          from: "students",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
      { $match: { "student.schoolId": new mongoose.Types.ObjectId(schoolId) } },
      {
        $lookup: {
          from: "classsections",
          localField: "student.classId",
          foreignField: "_id",
          as: "classInfo",
        },
      },
      { $unwind: { path: "$classInfo", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "feestructures",
          localField: "feeStructureId",
          foreignField: "_id",
          as: "feeStructure",
        },
      },
      { $unwind: { path: "$feeStructure", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "collectedBy",
          foreignField: "_id",
          as: "collector",
        },
      },
      { $unwind: { path: "$collector", preserveNullAndEmptyArrays: true } },
    ];

    let groupStage = {};
    if (groupBy === "day") {
      groupStage = {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidOn" } },
        totalAmount: { $sum: "$amountPaid" },
        count: { $sum: 1 },
      };
    } else if (groupBy === "class") {
      groupStage = {
        _id: {
          $concat: [
            { $ifNull: ["$classInfo.className", "Unknown"] },
            " - ",
            { $ifNull: ["$classInfo.section", "A"] },
          ],
        },
        totalAmount: { $sum: "$amountPaid" },
        count: { $sum: 1 },
      };
    } else if (groupBy === "feeHead") {
      groupStage = {
        _id: { $ifNull: ["$feeStructure.name", "General Fee"] },
        totalAmount: { $sum: "$amountPaid" },
        count: { $sum: 1 },
      };
    } else if (groupBy === "paymentMode") {
      groupStage = {
        _id: { $ifNull: ["$paymentMode", "online"] },
        totalAmount: { $sum: "$amountPaid" },
        count: { $sum: 1 },
      };
    } else if (groupBy === "collector") {
      groupStage = {
        _id: { $ifNull: ["$collector.name", "Online / System"] },
        totalAmount: { $sum: "$amountPaid" },
        count: { $sum: 1 },
      };
    }

    pipeline.push(
      { $group: groupStage },
      { $sort: { _id: 1 } }
    );

    const rows = await FeeTransaction.aggregate(pipeline);
    const overallTotal = rows.reduce((sum, r) => sum + r.totalAmount, 0);
    const overallCount = rows.reduce((sum, r) => sum + r.count, 0);

    const reportData = {
      groupBy,
      rows: rows.map((r) => ({
        groupKey: r._id,
        amount: r.totalAmount,
        amountRupees: toRupees(r.totalAmount),
        count: r.count,
      })),
      totalAmount: overallTotal,
      totalAmountRupees: toRupees(overallTotal),
      totalCount: overallCount,
    };

    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Fee Collection");
      sheet.columns = [
        { header: "Group (" + groupBy + ")", key: "groupKey", width: 28 },
        { header: "Transaction Count", key: "count", width: 18 },
        { header: "Total Amount (₹)", key: "amountRupees", width: 22 },
      ];
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };

      reportData.rows.forEach((r) => {
        sheet.addRow({
          groupKey: r.groupKey,
          count: r.count,
          amountRupees: r.amountRupees,
        });
      });

      const totRow = sheet.addRow({
        groupKey: "TOTAL",
        count: reportData.totalCount,
        amountRupees: reportData.totalAmountRupees,
      });
      totRow.font = { bold: true };

      setupExcelResponse(res, `Collection-Report-${groupBy}`);
      await workbook.xlsx.write(res);
      return res.end();
    }

    await safeSet(cacheKey, JSON.stringify(reportData), CACHE_TTL_SECONDS);
    return res
      .status(200)
      .json(new ApiResponse(200, reportData, "Collection report fetched successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * 2. GET /api/reports/outstanding
 * Aging buckets (0-30, 31-60, 61-90, 90+ days), class-wise & student-wise.
 */
const getOutstandingReport = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { format } = req.query;

    const cacheKey = `report:outstanding:${schoolId}:${format || "json"}`;
    if (format !== "xlsx") {
      const cached = await safeGet(cacheKey);
      if (cached) {
        return res
          .status(200)
          .json(new ApiResponse(200, JSON.parse(cached), "Outstanding report fetched (cached)"));
      }
    }

    const txns = await FeeTransaction.find({
      status: { $in: ["pending", "partial", "overdue"] },
    })
      .populate({
        path: "studentId",
        match: { schoolId },
        select: "rollNumber admissionNumber userId classId",
        populate: [
          { path: "userId", select: "name email phone" },
          { path: "classId", select: "className section" },
        ],
      })
      .populate("feeStructureId", "name dueDate term")
      .lean();

    const validTxns = txns.filter((t) => t.studentId);
    const now = new Date();

    const buckets = {
      "0-30": { count: 0, amount: 0, students: new Set() },
      "31-60": { count: 0, amount: 0, students: new Set() },
      "61-90": { count: 0, amount: 0, students: new Set() },
      "90+": { count: 0, amount: 0, students: new Set() },
    };

    const classWise = {};
    const studentWise = [];

    for (const t of validTxns) {
      const remainingDue = Math.max(
        0,
        (t.amountDue || 0) -
          (t.amountPaid || 0) -
          (t.concessionAmount || 0) +
          (t.lateFeeAmount || 0)
      );

      if (remainingDue <= 0) continue;

      const dueDate = t.feeStructureId?.dueDate ? new Date(t.feeStructureId.dueDate) : t.createdAt;
      const diffDays = Math.max(0, Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)));

      let bucketKey = "0-30";
      if (diffDays > 90) bucketKey = "90+";
      else if (diffDays > 60) bucketKey = "61-90";
      else if (diffDays > 30) bucketKey = "31-60";

      buckets[bucketKey].count += 1;
      buckets[bucketKey].amount += remainingDue;
      buckets[bucketKey].students.add(t.studentId._id.toString());

      // Class wise
      const className = t.studentId.classId
        ? `${t.studentId.classId.className}-${t.studentId.classId.section}`
        : "Unassigned";

      if (!classWise[className]) {
        classWise[className] = {
          className,
          totalDue: 0,
          "0-30": 0,
          "31-60": 0,
          "61-90": 0,
          "90+": 0,
          studentCount: new Set(),
        };
      }
      classWise[className].totalDue += remainingDue;
      classWise[className][bucketKey] += remainingDue;
      classWise[className].studentCount.add(t.studentId._id.toString());

      // Student item
      studentWise.push({
        studentName: t.studentId.userId?.name || "Student",
        admissionNumber: t.studentId.admissionNumber || "—",
        rollNumber: t.studentId.rollNumber || "—",
        className,
        feeHead: t.feeStructureId?.name || "Fee",
        dueDate: dueDate.toISOString().split("T")[0],
        overdueDays: diffDays,
        bucket: bucketKey,
        amountDue: remainingDue,
        amountDueRupees: toRupees(remainingDue),
      });
    }

    const summaryBuckets = Object.entries(buckets).map(([bKey, val]) => ({
      bucket: bKey,
      count: val.count,
      amount: val.amount,
      amountRupees: toRupees(val.amount),
      uniqueStudents: val.students.size,
    }));

    const classWiseList = Object.values(classWise).map((c) => ({
      className: c.className,
      totalDue: c.totalDue,
      totalDueRupees: toRupees(c.totalDue),
      bucket0_30: toRupees(c["0-30"]),
      bucket31_60: toRupees(c["31-60"]),
      bucket61_90: toRupees(c["61-90"]),
      bucket90Plus: toRupees(c["90+"]),
      studentsCount: c.studentCount.size,
    }));

    const totalOutstanding = summaryBuckets.reduce((sum, b) => sum + b.amount, 0);

    const reportData = {
      summaryBuckets,
      classWise: classWiseList,
      studentWise: studentWise.slice(0, 500),
      totalOutstanding,
      totalOutstandingRupees: toRupees(totalOutstanding),
    };

    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      // Sheet 1: Aging Summary
      const s1 = workbook.addWorksheet("Aging Summary");
      s1.columns = [
        { header: "Aging Bucket", key: "bucket", width: 16 },
        { header: "Pending Items", key: "count", width: 16 },
        { header: "Unique Students", key: "uniqueStudents", width: 18 },
        { header: "Total Overdue (₹)", key: "amountRupees", width: 22 },
      ];
      s1.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      s1.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      summaryBuckets.forEach((b) => s1.addRow(b));

      // Sheet 2: Class-wise
      const s2 = workbook.addWorksheet("Class-wise Aging");
      s2.columns = [
        { header: "Class", key: "className", width: 18 },
        { header: "Students", key: "studentsCount", width: 12 },
        { header: "0-30 Days (₹)", key: "bucket0_30", width: 16 },
        { header: "31-60 Days (₹)", key: "bucket31_60", width: 16 },
        { header: "61-90 Days (₹)", key: "bucket61_90", width: 16 },
        { header: "90+ Days (₹)", key: "bucket90Plus", width: 16 },
        { header: "Total Due (₹)", key: "totalDueRupees", width: 20 },
      ];
      s2.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      s2.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      classWiseList.forEach((c) => s2.addRow(c));

      setupExcelResponse(res, "Outstanding-Aging-Report");
      await workbook.xlsx.write(res);
      return res.end();
    }

    await safeSet(cacheKey, JSON.stringify(reportData), CACHE_TTL_SECONDS);
    return res
      .status(200)
      .json(new ApiResponse(200, reportData, "Outstanding report fetched successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * 3. GET /api/reports/concessions
 * Grouped by type, class, approver; total discount given.
 */
const getConcessionsReport = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { format } = req.query;

    const cacheKey = `report:concessions:${schoolId}:${format || "json"}`;
    if (format !== "xlsx") {
      const cached = await safeGet(cacheKey);
      if (cached) {
        return res
          .status(200)
          .json(new ApiResponse(200, JSON.parse(cached), "Concessions report fetched (cached)"));
      }
    }

    const concessions = await FeeConcession.find({
      schoolId,
      status: "approved",
    })
      .populate({
        path: "studentId",
        select: "admissionNumber userId classId",
        populate: [
          { path: "userId", select: "name" },
          { path: "classId", select: "className section" },
        ],
      })
      .populate("approvedBy", "name email")
      .lean();

    const byType = {};
    const byClass = {};
    const byApprover = {};
    let grandTotal = 0;

    for (const c of concessions) {
      const type = c.type || "other";
      const amt = c.amount || 0;
      grandTotal += amt;

      // By type
      if (!byType[type]) byType[type] = { type, count: 0, amount: 0 };
      byType[type].count += 1;
      byType[type].amount += amt;

      // By class
      const clsName = c.studentId?.classId
        ? `${c.studentId.classId.className}-${c.studentId.classId.section}`
        : "Unassigned";
      if (!byClass[clsName]) byClass[clsName] = { className: clsName, count: 0, amount: 0 };
      byClass[clsName].count += 1;
      byClass[clsName].amount += amt;

      // By approver
      const approverName = c.approvedBy?.name || "Auto-Approved / System";
      if (!byApprover[approverName])
        byApprover[approverName] = { approver: approverName, count: 0, amount: 0 };
      byApprover[approverName].count += 1;
      byApprover[approverName].amount += amt;
    }

    const reportData = {
      byType: Object.values(byType).map((t) => ({ ...t, amountRupees: toRupees(t.amount) })),
      byClass: Object.values(byClass).map((c) => ({ ...c, amountRupees: toRupees(c.amount) })),
      byApprover: Object.values(byApprover).map((a) => ({
        ...a,
        amountRupees: toRupees(a.amount),
      })),
      totalDiscount: grandTotal,
      totalDiscountRupees: toRupees(grandTotal),
      totalCount: concessions.length,
    };

    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Concessions Summary");
      sheet.columns = [
        { header: "Concession Type", key: "type", width: 22 },
        { header: "Students Count", key: "count", width: 16 },
        { header: "Total Discount (₹)", key: "amountRupees", width: 22 },
      ];
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      reportData.byType.forEach((t) => sheet.addRow(t));

      setupExcelResponse(res, "Concessions-Report");
      await workbook.xlsx.write(res);
      return res.end();
    }

    await safeSet(cacheKey, JSON.stringify(reportData), CACHE_TTL_SECONDS);
    return res
      .status(200)
      .json(new ApiResponse(200, reportData, "Concessions report fetched successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * 4. GET /api/reports/expenses
 * By category, vendor, month; top 5 vendors.
 */
const getExpensesReport = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { from, to, format } = req.query;

    const cacheKey = `report:expenses:${schoolId}:${from || ""}:${to || ""}:${format || "json"}`;
    if (format !== "xlsx") {
      const cached = await safeGet(cacheKey);
      if (cached) {
        return res
          .status(200)
          .json(new ApiResponse(200, JSON.parse(cached), "Expenses report fetched (cached)"));
      }
    }

    const match = {
      schoolId: new mongoose.Types.ObjectId(schoolId),
      status: { $in: ["approved", "paid"] },
    };

    if (from || to) {
      match.expenseDate = {};
      if (from) match.expenseDate.$gte = new Date(from);
      if (to) {
        const toD = new Date(to);
        toD.setHours(23, 59, 59, 999);
        match.expenseDate.$lte = toD;
      }
    }

    // Category breakdown
    const byCategory = await Expense.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "expensecategories",
          localField: "categoryId",
          foreignField: "_id",
          as: "cat",
        },
      },
      { $unwind: { path: "$cat", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ["$cat.name", "General"] },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    // Monthly breakdown
    const byMonth = await Expense.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$expenseDate" } },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Vendor breakdown + top 5
    const byVendor = await Expense.aggregate([
      { $match: { ...match, vendorId: { $ne: null } } },
      {
        $lookup: {
          from: "vendors",
          localField: "vendorId",
          foreignField: "_id",
          as: "vend",
        },
      },
      { $unwind: "$vend" },
      {
        $group: {
          _id: "$vend.name",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    const totalExpense = byCategory.reduce((sum, c) => sum + c.totalAmount, 0);

    const reportData = {
      byCategory: byCategory.map((c) => ({
        category: c._id,
        amount: c.totalAmount,
        amountRupees: toRupees(c.totalAmount),
        count: c.count,
      })),
      byMonth: byMonth.map((m) => ({
        month: m._id,
        amount: m.totalAmount,
        amountRupees: toRupees(m.totalAmount),
        count: m.count,
      })),
      topVendors: byVendor.slice(0, 5).map((v) => ({
        vendor: v._id,
        amount: v.totalAmount,
        amountRupees: toRupees(v.totalAmount),
        count: v.count,
      })),
      totalExpense,
      totalExpenseRupees: toRupees(totalExpense),
    };

    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Expense Breakdown");
      sheet.columns = [
        { header: "Expense Category", key: "category", width: 26 },
        { header: "Vouchers Count", key: "count", width: 16 },
        { header: "Total Amount (₹)", key: "amountRupees", width: 22 },
      ];
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      reportData.byCategory.forEach((c) => sheet.addRow(c));

      setupExcelResponse(res, "Expenses-Report");
      await workbook.xlsx.write(res);
      return res.end();
    }

    await safeSet(cacheKey, JSON.stringify(reportData), CACHE_TTL_SECONDS);
    return res
      .status(200)
      .json(new ApiResponse(200, reportData, "Expenses report fetched successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * 5. GET /api/reports/profit-loss
 * Monthly & Academic-year P&L strictly from the LedgerEntry collection.
 */
const getProfitLossReport = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { year = new Date().getFullYear(), format } = req.query;

    const cacheKey = `report:profit-loss:${schoolId}:${year}:${format || "json"}`;
    if (format !== "xlsx") {
      const cached = await safeGet(cacheKey);
      if (cached) {
        return res
          .status(200)
          .json(new ApiResponse(200, JSON.parse(cached), "Profit & Loss report fetched (cached)"));
      }
    }

    const startDate = new Date(Date.UTC(Number(year), 0, 1));
    const endDate = new Date(Date.UTC(Number(year), 11, 31, 23, 59, 59, 999));

    const entries = await LedgerEntry.find({
      schoolId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // Group by month: 1 to 12
    const monthlyData = {};
    for (let m = 1; m <= 12; m++) {
      monthlyData[m] = {
        month: m,
        income: 0, // fee_collection + other_income
        expenses: 0,
        payroll: 0,
        refunds: 0,
        net: 0,
      };
    }

    for (const e of entries) {
      const m = new Date(e.date).getUTCMonth() + 1;
      const amt = e.amount || 0;

      if (e.direction === "in") {
        if (e.category === "fee_collection" || e.category === "other_income") {
          monthlyData[m].income += amt;
        }
      } else if (e.direction === "out") {
        if (e.category === "expense") monthlyData[m].expenses += amt;
        else if (e.category === "payroll") monthlyData[m].payroll += amt;
        else if (e.category === "refund") monthlyData[m].refunds += amt;
      }
    }

    let yrIncome = 0;
    let yrExpenses = 0;
    let yrPayroll = 0;
    let yrRefunds = 0;

    const MONTH_NAMES = [
      "", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const monthsList = Object.values(monthlyData).map((d) => {
      const net = d.income - d.expenses - d.payroll - d.refunds;
      yrIncome += d.income;
      yrExpenses += d.expenses;
      yrPayroll += d.payroll;
      yrRefunds += d.refunds;

      return {
        month: d.month,
        monthName: MONTH_NAMES[d.month],
        income: d.income,
        incomeRupees: toRupees(d.income),
        expenses: d.expenses,
        expensesRupees: toRupees(d.expenses),
        payroll: d.payroll,
        payrollRupees: toRupees(d.payroll),
        refunds: d.refunds,
        refundsRupees: toRupees(d.refunds),
        net,
        netRupees: toRupees(net),
      };
    });

    const yrTotalNet = yrIncome - yrExpenses - yrPayroll - yrRefunds;

    const reportData = {
      year: Number(year),
      months: monthsList,
      annualSummary: {
        totalIncome: yrIncome,
        totalIncomeRupees: toRupees(yrIncome),
        totalExpenses: yrExpenses,
        totalExpensesRupees: toRupees(yrExpenses),
        totalPayroll: yrPayroll,
        totalPayrollRupees: toRupees(yrPayroll),
        totalRefunds: yrRefunds,
        totalRefundsRupees: toRupees(yrRefunds),
        netProfitLoss: yrTotalNet,
        netProfitLossRupees: toRupees(yrTotalNet),
      },
    };

    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(`P&L ${year}`);
      sheet.columns = [
        { header: "Month", key: "monthName", width: 14 },
        { header: "Total Income (₹)", key: "incomeRupees", width: 18 },
        { header: "Expenses (₹)", key: "expensesRupees", width: 18 },
        { header: "Payroll (₹)", key: "payrollRupees", width: 18 },
        { header: "Refunds (₹)", key: "refundsRupees", width: 18 },
        { header: "Net Margin (₹)", key: "netRupees", width: 18 },
      ];
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };

      monthsList.forEach((m) => sheet.addRow(m));

      const totRow = sheet.addRow({
        monthName: "ANNUAL TOTAL",
        incomeRupees: reportData.annualSummary.totalIncomeRupees,
        expensesRupees: reportData.annualSummary.totalExpensesRupees,
        payrollRupees: reportData.annualSummary.totalPayrollRupees,
        refundsRupees: reportData.annualSummary.totalRefundsRupees,
        netRupees: reportData.annualSummary.netProfitLossRupees,
      });
      totRow.font = { bold: true };

      setupExcelResponse(res, `Profit-Loss-${year}`);
      await workbook.xlsx.write(res);
      return res.end();
    }

    await safeSet(cacheKey, JSON.stringify(reportData), CACHE_TTL_SECONDS);
    return res
      .status(200)
      .json(new ApiResponse(200, reportData, "Profit & Loss report fetched successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * 6. GET /api/reports/budget-vs-actual
 * Reuses 7B logic with Excel export support.
 */
const getBudgetVsActualReport = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { academicYear = "2025-26", format } = req.query;

    const cacheKey = `report:budget-vs-actual:${schoolId}:${academicYear}:${format || "json"}`;
    if (format !== "xlsx") {
      const cached = await safeGet(cacheKey);
      if (cached) {
        return res
          .status(200)
          .json(new ApiResponse(200, JSON.parse(cached), "Budget vs Actual fetched (cached)"));
      }
    }

    const budgets = await Budget.find({ schoolId, academicYear })
      .populate("categoryId", "name")
      .lean();

    const categoryIds = budgets.map((b) => b.categoryId?._id).filter(Boolean);

    // Sum actual expenses for each category
    const actuals = await Expense.aggregate([
      {
        $match: {
          schoolId: new mongoose.Types.ObjectId(schoolId),
          status: "paid",
          categoryId: { $in: categoryIds },
        },
      },
      {
        $group: {
          _id: "$categoryId",
          totalSpent: { $sum: "$amount" },
        },
      },
    ]);

    const actualMap = new Map();
    for (const a of actuals) {
      actualMap.set(a._id.toString(), a.totalSpent);
    }

    const rows = budgets.map((b) => {
      const catId = b.categoryId?._id?.toString();
      const spent = actualMap.get(catId) || 0;
      const allocated = b.amount || 0;
      const variance = allocated - spent;
      const percentUsed = allocated > 0 ? ((spent / allocated) * 100).toFixed(1) : "0.0";

      return {
        category: b.categoryId?.name || "Uncategorized",
        allocated,
        allocatedRupees: toRupees(allocated),
        spent,
        spentRupees: toRupees(spent),
        variance,
        varianceRupees: toRupees(variance),
        percentUsed: Number(percentUsed),
      };
    });

    const reportData = { academicYear, rows };

    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Budget vs Actual");
      sheet.columns = [
        { header: "Category", key: "category", width: 24 },
        { header: "Budget Allocated (₹)", key: "allocatedRupees", width: 22 },
        { header: "Actual Spent (₹)", key: "spentRupees", width: 22 },
        { header: "Variance (₹)", key: "varianceRupees", width: 18 },
        { header: "% Consumed", key: "percentUsed", width: 14 },
      ];
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };

      rows.forEach((r) => sheet.addRow(r));

      setupExcelResponse(res, `Budget-vs-Actual-${academicYear}`);
      await workbook.xlsx.write(res);
      return res.end();
    }

    await safeSet(cacheKey, JSON.stringify(reportData), CACHE_TTL_SECONDS);
    return res
      .status(200)
      .json(new ApiResponse(200, reportData, "Budget vs Actual fetched successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * 7. GET /api/reports/collection-efficiency
 * Billed vs Collected per class and per month.
 */
const getCollectionEfficiencyReport = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { format } = req.query;

    const cacheKey = `report:efficiency:${schoolId}:${format || "json"}`;
    if (format !== "xlsx") {
      const cached = await safeGet(cacheKey);
      if (cached) {
        return res
          .status(200)
          .json(new ApiResponse(200, JSON.parse(cached), "Collection efficiency fetched (cached)"));
      }
    }

    const txns = await FeeTransaction.find({})
      .populate({
        path: "studentId",
        match: { schoolId },
        select: "classId",
        populate: { path: "classId", select: "className section" },
      })
      .lean();

    const validTxns = txns.filter((t) => t.studentId);
    const byClass = {};
    const byMonth = {};

    let totalBilled = 0;
    let totalCollected = 0;

    for (const t of validTxns) {
      const billed = t.amountDue || 0;
      const collected = t.amountPaid || 0;
      totalBilled += billed;
      totalCollected += collected;

      // Class
      const clsName = t.studentId.classId
        ? `${t.studentId.classId.className}-${t.studentId.classId.section}`
        : "Unassigned";

      if (!byClass[clsName]) byClass[clsName] = { className: clsName, billed: 0, collected: 0 };
      byClass[clsName].billed += billed;
      byClass[clsName].collected += collected;

      // Month
      const d = t.createdAt ? new Date(t.createdAt) : new Date();
      const mKey = d.toISOString().slice(0, 7); // YYYY-MM
      if (!byMonth[mKey]) byMonth[mKey] = { month: mKey, billed: 0, collected: 0 };
      byMonth[mKey].billed += billed;
      byMonth[mKey].collected += collected;
    }

    const classRows = Object.values(byClass).map((c) => ({
      className: c.className,
      billed: c.billed,
      billedRupees: toRupees(c.billed),
      collected: c.collected,
      collectedRupees: toRupees(c.collected),
      efficiency: c.billed > 0 ? Number(((c.collected / c.billed) * 100).toFixed(1)) : 0,
    }));

    const monthRows = Object.values(byMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({
        month: m.month,
        billed: m.billed,
        billedRupees: toRupees(m.billed),
        collected: m.collected,
        collectedRupees: toRupees(m.collected),
        efficiency: m.billed > 0 ? Number(((m.collected / m.billed) * 100).toFixed(1)) : 0,
      }));

    const overallEfficiency =
      totalBilled > 0 ? Number(((totalCollected / totalBilled) * 100).toFixed(1)) : 0;

    const reportData = {
      overall: {
        totalBilled,
        totalBilledRupees: toRupees(totalBilled),
        totalCollected,
        totalCollectedRupees: toRupees(totalCollected),
        efficiency: overallEfficiency,
      },
      byClass: classRows,
      byMonth: monthRows,
    };

    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Collection Efficiency");
      sheet.columns = [
        { header: "Class", key: "className", width: 20 },
        { header: "Total Billed (₹)", key: "billedRupees", width: 20 },
        { header: "Total Collected (₹)", key: "collectedRupees", width: 20 },
        { header: "Efficiency %", key: "efficiency", width: 16 },
      ];
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      classRows.forEach((r) => sheet.addRow(r));

      setupExcelResponse(res, "Collection-Efficiency-Report");
      await workbook.xlsx.write(res);
      return res.end();
    }

    await safeSet(cacheKey, JSON.stringify(reportData), CACHE_TTL_SECONDS);
    return res
      .status(200)
      .json(new ApiResponse(200, reportData, "Collection efficiency fetched successfully"));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCollectionReport,
  getOutstandingReport,
  getConcessionsReport,
  getExpensesReport,
  getProfitLossReport,
  getBudgetVsActualReport,
  getCollectionEfficiencyReport,
};
