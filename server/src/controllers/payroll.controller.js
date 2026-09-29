const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const PayrollRun = require("../models/PayrollRun.model");
const Payslip = require("../models/Payslip.model");
const SalaryStructure = require("../models/SalaryStructure.model");
const LeaveRequest = require("../models/LeaveRequest.model");
const FinanceSettings = require("../models/FinanceSettings.model");
const School = require("../models/School.model");
const User = require("../models/User.model");
const insertLedgerEntry = require("../utils/insertLedgerEntry");
const auditLog = require("../utils/auditLog");
const { notify, notifyMany } = require("../services/notification.service");
const { safeDel } = require("../config/redis");
const { ApiError, ApiResponse } = require("../utils/apiResponse");
const { toRupees, formatMoney, addMoney, subMoney } = require("../utils/money");
const {
  calculateWorkingDaysInMonth,
  calculateApprovedLeaveDaysInMonth,
  calculateStaffPayroll,
} = require("../utils/payrollCalculator");
const { calculateSchoolWorkingDaysInMonth } = require("../utils/workingDay");
const { generatePayslipPdf } = require("../utils/generatePayslipPdf");

/**
 * POST /api/payroll/runs
 * Idempotent payroll generation for a given month and year.
 * Creates a DRAFT Payslip for every active SalaryStructure.
 */
const createPayrollRun = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { month, year } = req.body;

    const numMonth = Number(month);
    const numYear = Number(year);

    if (!numMonth || numMonth < 1 || numMonth > 12) {
      throw new ApiError(400, "Valid month (1-12) is required");
    }
    if (!numYear || numYear < 2000) {
      throw new ApiError(400, "Valid year is required");
    }

    // Idempotency: Check if a run for that month & year already exists
    const existingRun = await PayrollRun.findOne({
      schoolId,
      month: numMonth,
      year: numYear,
    }).lean();

    if (existingRun) {
      return res.status(409).json({
        success: false,
        message: `Payroll run for ${numMonth}/${numYear} already exists.`,
        runId: existingRun._id,
        run: existingRun,
      });
    }

    // 1. Fetch active salary structures
    const structures = await SalaryStructure.find({
      schoolId,
      isActive: true,
    })
      .populate("staffUserId", "name email role phone")
      .lean();

    if (!structures || structures.length === 0) {
      throw new ApiError(
        400,
        "No active salary structures found. Please configure salary structures for staff first."
      );
    }

    // 2. School settings for paid leaves quota
    const settings = (await FinanceSettings.findOne({ schoolId }).lean()) || {};
    const paidLeavesPerMonth = settings.paidLeavesPerMonth ?? 1;

    // 3. Working days for the month (Sundays & declared holidays excluded via isWorkingDay)
    const workingDays = await calculateSchoolWorkingDaysInMonth(schoolId, numMonth, numYear);

    // 4. Overlapping approved leaves
    const staffUserIds = structures.map((s) => s.staffUserId?._id).filter(Boolean);
    const daysInMonth = new Date(Date.UTC(numYear, numMonth, 0)).getUTCDate();
    const monthStart = new Date(Date.UTC(numYear, numMonth - 1, 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(numYear, numMonth - 1, daysInMonth, 23, 59, 59, 999));

    const approvedLeaves = await LeaveRequest.find({
      schoolId,
      status: "approved",
      applicantId: { $in: staffUserIds },
      fromDate: { $lte: monthEnd },
      toDate: { $gte: monthStart },
    }).lean();

    // Map leaves by applicant user ID
    const leavesByUser = new Map();
    for (const l of approvedLeaves) {
      const uid = l.applicantId.toString();
      if (!leavesByUser.has(uid)) leavesByUser.set(uid, []);
      leavesByUser.get(uid).push(l);
    }

    // 5. Create Draft PayrollRun document
    const payrollRun = await PayrollRun.create({
      schoolId,
      month: numMonth,
      year: numYear,
      status: "draft",
      generatedBy: req.user._id,
    });

    // 6. Generate Payslip for each active salary structure
    const payslipDocs = [];
    let totalGross = 0;
    let totalDeductions = 0;
    let totalNet = 0;

    for (const s of structures) {
      const staffUser = s.staffUserId;
      if (!staffUser) continue;

      const staffLeaves = leavesByUser.get(staffUser._id.toString()) || [];
      const approvedLeaveDays = calculateApprovedLeaveDaysInMonth(
        staffLeaves,
        numMonth,
        numYear
      );

      const calc = calculateStaffPayroll({
        basic: s.basic,
        allowances: s.allowances || [],
        deductions: s.deductions || [],
        workingDays,
        approvedLeaveDays,
        paidLeavesPerMonth,
        bonus: 0,
      });

      payslipDocs.push({
        runId: payrollRun._id,
        schoolId,
        staffUserId: staffUser._id,
        staffName: staffUser.name,
        month: numMonth,
        year: numYear,
        workingDays: calc.workingDays,
        presentDays: calc.presentDays,
        unpaidLeaveDays: calc.unpaidLeaveDays,
        earnings: calc.earnings,
        deductions: calc.deductions,
        lopDeduction: calc.lopDeduction,
        bonus: 0,
        adjustmentNote: "",
        gross: calc.gross,
        totalDeductions: calc.totalDeductions,
        netPay: calc.netPay,
        status: "draft",
      });

      totalGross = addMoney(totalGross, calc.gross);
      totalDeductions = addMoney(totalDeductions, calc.totalDeductions);
      totalNet = addMoney(totalNet, calc.netPay);
    }

    const createdPayslips = await Payslip.insertMany(payslipDocs);

    // Update run totals
    payrollRun.totalGross = totalGross;
    payrollRun.totalDeductions = totalDeductions;
    payrollRun.totalNet = totalNet;
    await payrollRun.save();

    await auditLog({
      userId: req.user._id,
      action: "payroll_run_generated",
      module: "payroll",
      targetId: payrollRun._id,
      newValue: {
        runId: payrollRun._id,
        month: numMonth,
        year: numYear,
        totalNet,
        payslipsCount: createdPayslips.length,
      },
      ip: req.ip,
    });

    return res.status(201).json(
      new ApiResponse(
        201,
        { run: payrollRun, payslips: createdPayslips },
        "Payroll run generated successfully"
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/payroll/runs
 * List all payroll runs for the school.
 */
const getPayrollRuns = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const runs = await PayrollRun.find({ schoolId })
      .populate("generatedBy", "name email")
      .populate("approvedBy", "name email")
      .sort({ year: -1, month: -1 })
      .lean();

    // Get count of payslips for each run
    const runIds = runs.map((r) => r._id);
    const counts = await Payslip.aggregate([
      { $match: { runId: { $in: runIds } } },
      { $group: { _id: "$runId", count: { $sum: 1 } } },
    ]);

    const countMap = new Map();
    for (const c of counts) {
      countMap.set(c._id.toString(), c.count);
    }

    const result = runs.map((r) => ({
      ...r,
      payslipsCount: countMap.get(r._id.toString()) || 0,
    }));

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Payroll runs fetched successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/payroll/runs/:id
 * Get single payroll run with all payslips.
 */
const getPayrollRunById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const run = await PayrollRun.findOne({ _id: id, schoolId })
      .populate("generatedBy", "name email")
      .populate("approvedBy", "name email");

    if (!run) throw new ApiError(404, "Payroll run not found");

    const payslips = await Payslip.find({ runId: id })
      .populate("staffUserId", "name email role phone")
      .sort({ staffName: 1 });

    return res
      .status(200)
      .json(new ApiResponse(200, { run, payslips }, "Payroll run fetched successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/payroll/payslips/:id
 * Edit a payslip (bonus, adjustmentNote, extraDeductions) while run is in draft.
 */
const updatePayslip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;
    const { bonus, adjustmentNote, extraDeductions } = req.body;

    const payslip = await Payslip.findOne({ _id: id, schoolId });
    if (!payslip) throw new ApiError(404, "Payslip not found");

    const run = await PayrollRun.findById(payslip.runId);
    if (!run) throw new ApiError(404, "Payroll run not found");

    if (run.status !== "draft") {
      throw new ApiError(
        400,
        `Cannot edit payslip: payroll run has already been ${run.status}. Edits are locked.`
      );
    }

    const oldValue = payslip.toObject();

    if (bonus !== undefined) {
      payslip.bonus = Math.max(0, Math.round(Number(bonus) || 0));
    }

    if (adjustmentNote !== undefined) {
      payslip.adjustmentNote = String(adjustmentNote || "").trim();
    }

    // Add extra manual deductions if provided
    if (Array.isArray(extraDeductions)) {
      // Retain standard deductions and append/replace extra deductions
      const standardDeds = (payslip.deductions || []).filter(
        (d) => !d.name.startsWith("[Manual]")
      );
      for (const extra of extraDeductions) {
        if (extra.name && Number(extra.amount) > 0) {
          standardDeds.push({
            name: `[Manual] ${extra.name}`,
            amount: Math.round(Number(extra.amount)),
          });
        }
      }
      payslip.deductions = standardDeds;
    }

    // Recalculate totals
    const standardDedsSum = (payslip.deductions || []).reduce(
      (acc, curr) => addMoney(acc, curr.amount),
      0
    );
    payslip.totalDeductions = addMoney(standardDedsSum, payslip.lopDeduction || 0);

    const totalPayableBeforeDeductions = addMoney(payslip.gross, payslip.bonus || 0);
    payslip.netPay = subMoney(totalPayableBeforeDeductions, payslip.totalDeductions);

    await payslip.save();

    // Recalculate parent PayrollRun totals
    const allRunPayslips = await Payslip.find({ runId: run._id });
    run.totalGross = allRunPayslips.reduce((sum, p) => addMoney(sum, p.gross), 0);
    run.totalDeductions = allRunPayslips.reduce((sum, p) => addMoney(sum, p.totalDeductions), 0);
    run.totalNet = allRunPayslips.reduce((sum, p) => addMoney(sum, p.netPay), 0);
    await run.save();

    await auditLog({
      userId: req.user._id,
      action: "payslip_adjusted",
      module: "payroll",
      targetId: payslip._id,
      oldValue,
      newValue: payslip.toObject(),
      ip: req.ip,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { payslip, run }, "Payslip updated successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/payroll/runs/:id/approve
 * Admin/Principal approval for a draft payroll run.
 * Locks payslips and notifies accountants.
 */
const approvePayrollRun = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const run = await PayrollRun.findOne({ _id: id, schoolId });
    if (!run) throw new ApiError(404, "Payroll run not found");

    if (run.status !== "draft") {
      throw new ApiError(400, `Cannot approve: run is currently in '${run.status}' status`);
    }

    run.status = "approved";
    run.approvedBy = req.user._id;
    run.approvedAt = new Date();
    await run.save();

    await Payslip.updateMany({ runId: run._id }, { $set: { status: "approved" } });

    await auditLog({
      userId: req.user._id,
      action: "payroll_run_approved",
      module: "payroll",
      targetId: run._id,
      newValue: { status: "approved", approvedBy: req.user._id, approvedAt: run.approvedAt },
      ip: req.ip,
    });

    // Real-time socket & email notification to accountants
    await notifyMany(
      { schoolId, role: "accountant" },
      {
        type: "payroll_approved",
        title: "Payroll Approved",
        message: `Payroll run for ${run.month}/${run.year} has been approved by admin and is ready for payment.`,
        data: { runId: run._id },
        sendEmailFlag: true,
      }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, run, "Payroll run approved successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/payroll/runs/:id/pay
 * Mark run and payslips as paid.
 * Transactional: updates run + payslips, inserts ONE LedgerEntry per payslip, enforces closed-day rule.
 * After commit: generates PDFs, notifies staff, invalidates dashboard cache.
 */
const payPayrollRun = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;
    const { paymentMode = "bank", paidOn } = req.body;

    const validModes = ["cash", "bank", "online"];
    if (!validModes.includes(paymentMode)) {
      throw new ApiError(400, "paymentMode must be 'cash', 'bank', or 'online'");
    }

    const paidDate = paidOn ? new Date(paidOn) : new Date();
    if (isNaN(paidDate.getTime())) {
      throw new ApiError(400, "Invalid paidOn date");
    }

    const run = await PayrollRun.findOne({ _id: id, schoolId }).session(session);
    if (!run) throw new ApiError(404, "Payroll run not found");

    if (run.status !== "approved") {
      throw new ApiError(
        400,
        `Payroll run must be approved before payment. Current status: ${run.status}`
      );
    }

    const payslips = await Payslip.find({ runId: run._id }).session(session);
    if (payslips.length === 0) {
      throw new ApiError(400, "No payslips found in this payroll run");
    }

    // Prepare ledger entries for each payslip
    const ledgerEntries = payslips.map((p) => ({
      schoolId,
      date: paidDate,
      account: paymentMode,
      direction: "out",
      category: "payroll",
      amount: p.netPay,
      referenceType: "Payslip",
      referenceId: p._id,
      narration: `Salary payout for ${p.staffName} (${p.month}/${p.year})`,
      createdBy: req.user._id,
    }));

    // Enforce day-close lock and insert immutable entries
    await insertLedgerEntry(ledgerEntries, { session });

    // Mark payslips as paid
    await Payslip.updateMany(
      { runId: run._id },
      {
        $set: {
          status: "paid",
          paymentMode,
          paidOn: paidDate,
        },
      },
      { session }
    );

    // Mark run as paid
    run.status = "paid";
    run.paymentMode = paymentMode;
    run.paidOn = paidDate;
    await run.save({ session });

    await session.commitTransaction();
    session.endSession();

    // ── Post-Commit Operations ───────────────────────────────────────────────
    // Audit Log
    await auditLog({
      userId: req.user._id,
      action: "payroll_run_paid",
      module: "payroll",
      targetId: run._id,
      newValue: {
        status: "paid",
        paymentMode,
        paidOn: paidDate,
        totalNet: run.totalNet,
      },
      ip: req.ip,
    });

    // Invalidate dashboard cache
    await safeDel(`dashboard:${schoolId}`);

    // Fetch school info for PDF branding
    const school =
      (await School.findById(schoolId).lean()) ||
      (await FinanceSettings.findOne({ schoolId }).lean()) ||
      {};

    // Generate PDFs and notify staff members asynchronously
    (async () => {
      for (const p of payslips) {
        try {
          const freshPayslip = await Payslip.findById(p._id).lean();
          if (!freshPayslip) continue;

          const pdfUrl = await generatePayslipPdf(freshPayslip, school);
          await Payslip.findByIdAndUpdate(p._id, { payslipUrl: pdfUrl });

          await notify(p.staffUserId, {
            type: "payslip_generated",
            title: "Salary Payslip Generated",
            message: `Your salary payslip for ${p.month}/${p.year} is now available. Net Pay: ${formatMoney(
              p.netPay
            )}`,
            data: { payslipId: p._id, runId: run._id },
            sendEmailFlag: true,
          });
        } catch (genErr) {
          console.error(
            `[Payroll] Background PDF/Notification failed for payslip ${p._id}:`,
            genErr.message
          );
        }
      }
    })();

    return res.status(200).json(
      new ApiResponse(
        200,
        run,
        "Payroll run marked as paid successfully. Ledger entries created and payslip generation started."
      )
    );
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

/**
 * GET /api/payroll/runs/:id/export
 * Export salary sheet as Excel (.xlsx) and bank-advice CSV.
 * (Does NOT store or export bank account numbers).
 */
const exportPayrollRun = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format = "excel" } = req.query; // 'excel' | 'csv'
    const schoolId = req.user.schoolId;

    const run = await PayrollRun.findOne({ _id: id, schoolId });
    if (!run) throw new ApiError(404, "Payroll run not found");

    const payslips = await Payslip.find({ runId: id }).sort({ staffName: 1 }).lean();

    if (format === "csv") {
      // Bank Advice CSV: Employee Name, Amount (INR), Narration
      let csv = "Employee Name,Amount (INR),Narration\n";
      for (const p of payslips) {
        const cleanName = `"${(p.staffName || "Staff").replace(/"/g, '""')}"`;
        const amt = toRupees(p.netPay).toFixed(2);
        const narration = `"Salary payout for ${p.month}/${p.year}"`;
        csv += `${cleanName},${amt},${narration}\n`;
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=BankAdvice-${run.month}-${run.year}.csv`
      );
      return res.status(200).send(csv);
    }

    // Default: Excel workbook with "Salary Sheet" and "Bank Advice" tabs
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "School ERP";
    workbook.created = new Date();

    // ── Sheet 1: Salary Sheet ────────────────────────────────────────────────
    const sheet1 = workbook.addWorksheet("Salary Sheet");
    sheet1.columns = [
      { header: "Sr.", key: "sr", width: 6 },
      { header: "Employee Name", key: "staffName", width: 26 },
      { header: "Working Days", key: "workingDays", width: 14 },
      { header: "Present Days", key: "presentDays", width: 14 },
      { header: "LOP Days", key: "unpaidLeaveDays", width: 12 },
      { header: "Gross (INR)", key: "gross", width: 16 },
      { header: "Standard Deductions (INR)", key: "standardDeductions", width: 24 },
      { header: "LOP Ded (INR)", key: "lopDeduction", width: 16 },
      { header: "Bonus (INR)", key: "bonus", width: 14 },
      { header: "Total Deductions (INR)", key: "totalDeductions", width: 22 },
      { header: "Net Pay (INR)", key: "netPay", width: 18 },
      { header: "Status", key: "status", width: 12 },
    ];

    sheet1.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet1.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" },
    };

    payslips.forEach((p, idx) => {
      const standardDeds = (p.deductions || []).reduce((acc, curr) => acc + curr.amount, 0);
      sheet1.addRow({
        sr: idx + 1,
        staffName: p.staffName,
        workingDays: p.workingDays,
        presentDays: p.presentDays,
        unpaidLeaveDays: p.unpaidLeaveDays,
        gross: toRupees(p.gross),
        standardDeductions: toRupees(standardDeds),
        lopDeduction: toRupees(p.lopDeduction),
        bonus: toRupees(p.bonus),
        totalDeductions: toRupees(p.totalDeductions),
        netPay: toRupees(p.netPay),
        status: (p.status || "").toUpperCase(),
      });
    });

    // Totals row in Sheet 1
    const totalRow = sheet1.addRow({
      sr: "",
      staffName: "TOTAL",
      workingDays: "",
      presentDays: "",
      unpaidLeaveDays: "",
      gross: toRupees(run.totalGross),
      standardDeductions: "",
      lopDeduction: "",
      bonus: "",
      totalDeductions: toRupees(run.totalDeductions),
      netPay: toRupees(run.totalNet),
      status: "",
    });
    totalRow.font = { bold: true };

    // ── Sheet 2: Bank Advice ────────────────────────────────────────────────
    const sheet2 = workbook.addWorksheet("Bank Advice");
    sheet2.columns = [
      { header: "Sr.", key: "sr", width: 6 },
      { header: "Employee Name", key: "staffName", width: 28 },
      { header: "Amount (INR)", key: "amount", width: 18 },
      { header: "Narration", key: "narration", width: 40 },
    ];

    sheet2.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet2.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" },
    };

    payslips.forEach((p, idx) => {
      sheet2.addRow({
        sr: idx + 1,
        staffName: p.staffName,
        amount: toRupees(p.netPay),
        narration: `Salary payout for ${p.month}/${p.year}`,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Payroll-${run.month}-${run.year}.xlsx`
    );

    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/payroll/my-payslips
 * Teachers, accountants, and staff members fetch their own payslips.
 */
const getMyPayslips = async (req, res, next) => {
  try {
    const payslips = await Payslip.find({
      staffUserId: req.user._id,
      status: { $in: ["approved", "paid"] },
    })
      .sort({ year: -1, month: -1 })
      .lean();

    return res
      .status(200)
      .json(new ApiResponse(200, payslips, "My payslips fetched successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/payroll/payslips/:id/pdf
 * Download or stream PDF for a payslip.
 * Allowed for the owner OR accountant/admin/principal.
 */
const getPayslipPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const payslip = await Payslip.findById(id);
    if (!payslip) throw new ApiError(404, "Payslip not found");

    // Check authorization: Owner or accountant/admin/principal
    const isOwner = payslip.staffUserId.toString() === req.user._id.toString();
    const canManage = ["admin", "superadmin", "accountant", "principal"].includes(req.user.role);

    if (!isOwner && !canManage) {
      throw new ApiError(403, "You do not have permission to view this payslip");
    }

    let filePath = null;
    if (payslip.payslipUrl) {
      const candidatePath = path.join(__dirname, "../../", payslip.payslipUrl);
      if (fs.existsSync(candidatePath)) {
        filePath = candidatePath;
      }
    }

    // If PDF does not exist on disk, regenerate now
    if (!filePath) {
      const school =
        (await School.findById(payslip.schoolId).lean()) ||
        (await FinanceSettings.findOne({ schoolId: payslip.schoolId }).lean()) ||
        {};
      const newUrl = await generatePayslipPdf(payslip, school);
      payslip.payslipUrl = newUrl;
      await payslip.save();
      filePath = path.join(__dirname, "../../", newUrl);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=Payslip-${payslip.staffName}-${payslip.month}-${payslip.year}.pdf`
    );
    return res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createPayrollRun,
  getPayrollRuns,
  getPayrollRunById,
  updatePayslip,
  approvePayrollRun,
  payPayrollRun,
  exportPayrollRun,
  getMyPayslips,
  getPayslipPdf,
};
