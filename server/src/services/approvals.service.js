const mongoose = require("mongoose");
const LeaveRequest = require("../models/LeaveRequest.model");
const FeeConcession = require("../models/FeeConcession.model");
const Refund = require("../models/Refund.model");
const Expense = require("../models/Expense.model");
const PayrollRun = require("../models/PayrollRun.model");
const Payslip = require("../models/Payslip.model");
const User = require("../models/User.model");
const { safeGet, safeSet, safeDel } = require("../config/redis");
const { notify, notifyMany } = require("./notification.service");
const auditLog = require("../utils/auditLog");
const { ApiError } = require("../utils/apiResponse");

const COUNTS_CACHE_TTL = 30; // 30 seconds

/**
 * Calculates days difference and assigns SLA badge
 * <2 days: "ok", 2-4 days: "warn", 5+ days: "breach"
 */
const computeSla = (createdAt) => {
  const now = new Date();
  const created = new Date(createdAt);
  const ageDays = Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
  let slaLevel = "ok";
  if (ageDays >= 5) slaLevel = "breach";
  else if (ageDays >= 2) slaLevel = "warn";
  return { ageDays, slaLevel };
};

/**
 * Fetches pending approval counts across all modules
 */
const getApprovalCounts = async (schoolId) => {
  const cacheKey = `approvals:counts:${schoolId}`;
  const cached = await safeGet(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {}
  }

  const [teacherLeave, concession, refund, expense, payrollRun] = await Promise.all([
    LeaveRequest.countDocuments({ schoolId, requesterRole: "teacher", status: "pending" }),
    FeeConcession.countDocuments({ schoolId, status: "pending" }),
    Refund.countDocuments({ schoolId, status: "pending" }),
    Expense.countDocuments({ schoolId, status: "pending_approval" }),
    PayrollRun.countDocuments({ schoolId, status: "draft" }),
  ]);

  const counts = {
    teacher_leave: teacherLeave,
    concession,
    refund,
    expense,
    payroll_run: payrollRun,
    total: teacherLeave + concession + refund + expense + payrollRun,
  };

  await safeSet(cacheKey, JSON.stringify(counts), COUNTS_CACHE_TTL);
  return counts;
};

/**
 * Normalizes list of pending or decided approvals from all modules
 */
const getApprovalsList = async (schoolId, { type = "all", status = "pending", page = 1, limit = 25 }) => {
  const results = [];
  const isPending = status === "pending";

  const fetchTasks = [];

  // 1. Teacher Leave
  if (type === "all" || type === "teacher_leave") {
    fetchTasks.push(
      LeaveRequest.find({
        schoolId,
        requesterRole: "teacher",
        status: isPending ? "pending" : { $in: ["approved", "rejected"] },
      })
        .populate("applicantId", "name email role")
        .populate("decidedBy", "name")
        .sort({ createdAt: isPending ? 1 : -1 })
        .limit(50)
        .lean()
        .then((items) =>
          items.map((i) => {
            const { ageDays, slaLevel } = computeSla(i.createdAt);
            const fromStr = new Date(i.fromDate).toLocaleDateString("en-IN");
            const toStr = new Date(i.toDate).toLocaleDateString("en-IN");
            return {
              type: "teacher_leave",
              id: i._id.toString(),
              title: `Teacher Leave: ${i.applicantId?.name || "Teacher"} (${i.leaveType})`,
              summary: `${i.reason || "Leave requested"} (${fromStr} to ${toStr})`,
              requesterName: i.applicantId?.name || "Teacher",
              requesterRole: "teacher",
              applicantId: i.applicantId?._id?.toString(),
              amount: null,
              status: i.status,
              createdAt: i.createdAt,
              decidedAt: i.decidedAt,
              decidedBy: i.decidedBy?.name,
              remarks: i.decisionRemarks,
              ageDays,
              slaLevel,
              deepLink: `/admin/leaves?id=${i._id}`,
              rawDetails: i,
            };
          })
        )
    );
  }

  // 2. Fee Concession
  if (type === "all" || type === "concession") {
    fetchTasks.push(
      FeeConcession.find({
        schoolId,
        status: isPending ? "pending" : { $in: ["approved", "rejected"] },
      })
        .populate("studentId", "admissionNumber rollNumber userId")
        .populate({ path: "studentId", populate: { path: "userId", select: "name" } })
        .populate("requestedBy", "name role")
        .populate("decidedBy", "name")
        .sort({ createdAt: isPending ? 1 : -1 })
        .limit(50)
        .lean()
        .then((items) =>
          items.map((i) => {
            const { ageDays, slaLevel } = computeSla(i.createdAt);
            const studentName = i.studentId?.userId?.name || "Student";
            return {
              type: "concession",
              id: i._id.toString(),
              title: `Fee Concession: ${studentName}`,
              summary: `Requested: ${i.concessionType === "percentage" ? `${i.percentageValue}%` : `₹${((i.concessionAmount || 0) / 100).toLocaleString("en-IN")}`} - Reason: ${i.reason || "N/A"}`,
              requesterName: i.requestedBy?.name || "Staff",
              requesterRole: i.requestedBy?.role || "staff",
              applicantId: i.requestedBy?._id?.toString(),
              amount: i.concessionAmount || null,
              status: i.status,
              createdAt: i.createdAt,
              decidedAt: i.decidedAt,
              decidedBy: i.decidedBy?.name,
              remarks: i.decisionRemarks,
              ageDays,
              slaLevel,
              deepLink: `/accountant/concessions?id=${i._id}`,
              rawDetails: i,
            };
          })
        )
    );
  }

  // 3. Refund
  if (type === "all" || type === "refund") {
    fetchTasks.push(
      Refund.find({
        schoolId,
        status: isPending ? "pending" : { $in: ["approved", "rejected", "processed"] },
      })
        .populate("studentId", "admissionNumber rollNumber userId")
        .populate({ path: "studentId", populate: { path: "userId", select: "name" } })
        .populate("requestedBy", "name role")
        .populate("decidedBy", "name")
        .sort({ createdAt: isPending ? 1 : -1 })
        .limit(50)
        .lean()
        .then((items) =>
          items.map((i) => {
            const { ageDays, slaLevel } = computeSla(i.createdAt);
            const studentName = i.studentId?.userId?.name || "Student";
            return {
              type: "refund",
              id: i._id.toString(),
              title: `Fee Refund: ${studentName}`,
              summary: `Refund of ₹${((i.amount || 0) / 100).toLocaleString("en-IN")} requested. Reason: ${i.reason || "N/A"}`,
              requesterName: i.requestedBy?.name || "Accountant",
              requesterRole: i.requestedBy?.role || "accountant",
              applicantId: i.requestedBy?._id?.toString(),
              amount: i.amount || null,
              status: i.status,
              createdAt: i.createdAt,
              decidedAt: i.decidedAt,
              decidedBy: i.decidedBy?.name,
              remarks: i.decisionRemarks,
              ageDays,
              slaLevel,
              deepLink: `/accountant/refunds?id=${i._id}`,
              rawDetails: i,
            };
          })
        )
    );
  }

  // 4. Expense
  if (type === "all" || type === "expense") {
    fetchTasks.push(
      Expense.find({
        schoolId,
        status: isPending ? "pending_approval" : { $in: ["approved", "rejected", "paid"] },
      })
        .populate("categoryId", "name")
        .populate("vendorId", "name")
        .populate("createdBy", "name role")
        .populate("approvedBy", "name")
        .sort({ createdAt: isPending ? 1 : -1 })
        .limit(50)
        .lean()
        .then((items) =>
          items.map((i) => {
            const { ageDays, slaLevel } = computeSla(i.createdAt);
            return {
              type: "expense",
              id: i._id.toString(),
              title: `Expense: ${i.title} (${i.categoryId?.name || "General"})`,
              summary: `₹${((i.amount || 0) / 100).toLocaleString("en-IN")} via ${i.paymentMode || "cash"}${i.vendorId ? ` to ${i.vendorId.name}` : ""}. Description: ${i.description || "N/A"}`,
              requesterName: i.createdBy?.name || "Staff",
              requesterRole: i.createdBy?.role || "staff",
              applicantId: i.createdBy?._id?.toString(),
              amount: i.amount || null,
              status: i.status,
              createdAt: i.createdAt,
              decidedAt: i.decidedAt,
              decidedBy: i.approvedBy?.name,
              remarks: i.decisionRemarks,
              ageDays,
              slaLevel,
              deepLink: `/accountant/expenses?id=${i._id}`,
              rawDetails: i,
            };
          })
        )
    );
  }

  // 5. Payroll Run
  if (type === "all" || type === "payroll_run") {
    fetchTasks.push(
      PayrollRun.find({
        schoolId,
        status: isPending ? "draft" : { $in: ["approved", "rejected", "paid"] },
      })
        .populate("generatedBy", "name role")
        .populate("approvedBy", "name")
        .sort({ createdAt: isPending ? 1 : -1 })
        .limit(50)
        .lean()
        .then((items) =>
          items.map((i) => {
            const { ageDays, slaLevel } = computeSla(i.createdAt);
            return {
              type: "payroll_run",
              id: i._id.toString(),
              title: `Payroll Run: ${i.month}/${i.year}`,
              summary: `Total Net Payout: ₹${((i.totalNet || 0) / 100).toLocaleString("en-IN")} for month ${i.month}/${i.year}. Status: ${i.status}`,
              requesterName: i.generatedBy?.name || "Accountant",
              requesterRole: i.generatedBy?.role || "accountant",
              applicantId: i.generatedBy?._id?.toString(),
              amount: i.totalNet || null,
              status: i.status,
              createdAt: i.createdAt,
              decidedAt: i.approvedAt,
              decidedBy: i.approvedBy?.name,
              remarks: i.decisionRemarks,
              ageDays,
              slaLevel,
              deepLink: `/accountant/payroll?runId=${i._id}`,
              rawDetails: i,
            };
          })
        )
    );
  }

  const moduleResults = await Promise.all(fetchTasks);
  moduleResults.forEach((arr) => results.push(...arr));

  // Sort: For pending, oldest first (urgency); for decided, newest first
  results.sort((a, b) => {
    if (isPending) return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return new Date(b.decidedAt || b.createdAt).getTime() - new Date(a.decidedAt || a.createdAt).getTime();
  });

  const startIndex = (page - 1) * limit;
  const paginated = results.slice(startIndex, startIndex + Number(limit));

  return {
    items: paginated,
    total: results.length,
    page: Number(page),
    limit: Number(limit),
  };
};

/**
 * Executes decision for a single approval item.
 * Enforces self-approval guard (403) and optimistic locking (409 Conflict).
 */
const decideItem = async ({ schoolId, approverUser, type, id, decision, remarks = "", ip = "" }) => {
  if (!["approved", "rejected"].includes(decision)) {
    throw new ApiError(400, "Decision must be 'approved' or 'rejected'.");
  }

  const approverId = approverUser._id.toString();

  // Invalidate approval counts cache
  await safeDel(`approvals:counts:${schoolId}`);

  switch (type) {
    case "teacher_leave": {
      const leave = await LeaveRequest.findOne({ _id: id, schoolId });
      if (!leave) throw new ApiError(404, "Teacher leave request not found.");

      // Self approval guard
      if (leave.applicantId?.toString() === approverId) {
        throw new ApiError(403, "You cannot approve or reject your own leave request.");
      }

      // Optimistic concurrency check
      if (leave.status !== "pending") {
        throw new ApiError(409, `Leave request has already been decided (${leave.status}).`);
      }

      leave.status = decision;
      leave.decisionRemarks = remarks;
      leave.decidedBy = approverUser._id;
      leave.decidedAt = new Date();
      await leave.save();

      // Notify applicant
      notify(leave.applicantId, {
        type: "approval_decided",
        title: `Leave Application ${decision.toUpperCase()}`,
        message: `Your leave request for ${new Date(leave.fromDate).toLocaleDateString("en-IN")} has been ${decision}.`,
        data: { decision, remarks, schoolId },
        sendEmailFlag: true,
        schoolId,
      });

      await auditLog({
        schoolId,
        userId: approverUser._id,
        action: `TEACHER_LEAVE_${decision.toUpperCase()}`,
        module: "leave",
        targetId: leave._id,
        details: { decision, remarks },
        ip,
      });

      return { type, id, status: decision, message: `Teacher leave ${decision}.` };
    }

    case "concession": {
      const concession = await FeeConcession.findOne({ _id: id, schoolId });
      if (!concession) throw new ApiError(404, "Fee concession not found.");

      // Self approval guard
      if (concession.requestedBy?.toString() === approverId) {
        throw new ApiError(403, "You cannot approve your own concession request.");
      }

      if (concession.status !== "pending") {
        throw new ApiError(409, `Concession is already ${concession.status}.`);
      }

      concession.status = decision;
      concession.decisionRemarks = remarks;
      concession.decidedBy = approverUser._id;
      concession.decidedAt = new Date();
      await concession.save();

      notify(concession.requestedBy, {
        type: "approval_decided",
        title: `Fee Concession ${decision.toUpperCase()}`,
        message: `Concession request for student has been ${decision}.`,
        data: { decision, remarks, schoolId },
        sendEmailFlag: true,
        schoolId,
      });

      await auditLog({
        schoolId,
        userId: approverUser._id,
        action: `CONCESSION_${decision.toUpperCase()}`,
        module: "concession",
        targetId: concession._id,
        details: { decision, remarks },
        ip,
      });

      return { type, id, status: decision, message: `Fee concession ${decision}.` };
    }

    case "refund": {
      const refund = await Refund.findOne({ _id: id, schoolId });
      if (!refund) throw new ApiError(404, "Refund not found.");

      if (refund.requestedBy?.toString() === approverId) {
        throw new ApiError(403, "You cannot approve your own refund request.");
      }

      if (refund.status !== "pending") {
        throw new ApiError(409, `Refund is already ${refund.status}.`);
      }

      refund.status = decision;
      refund.decisionRemarks = remarks;
      refund.decidedBy = approverUser._id;
      refund.decidedAt = new Date();
      await refund.save();

      notify(refund.requestedBy, {
        type: "approval_decided",
        title: `Fee Refund ${decision.toUpperCase()}`,
        message: `Refund of ₹${((refund.amount || 0) / 100).toLocaleString("en-IN")} has been ${decision}.`,
        data: { decision, remarks, schoolId },
        sendEmailFlag: true,
        schoolId,
      });

      await auditLog({
        schoolId,
        userId: approverUser._id,
        action: `REFUND_${decision.toUpperCase()}`,
        module: "refund",
        targetId: refund._id,
        details: { decision, remarks },
        ip,
      });

      return { type, id, status: decision, message: `Refund ${decision}.` };
    }

    case "expense": {
      const expense = await Expense.findOne({ _id: id, schoolId });
      if (!expense) throw new ApiError(404, "Expense voucher not found.");

      if (expense.createdBy?.toString() === approverId) {
        throw new ApiError(403, "You cannot approve your own expense voucher.");
      }

      if (expense.status !== "pending_approval") {
        throw new ApiError(409, `Expense is already ${expense.status}.`);
      }

      expense.status = decision;
      expense.decisionRemarks = remarks;
      expense.approvedBy = approverUser._id;
      expense.decidedAt = new Date();
      await expense.save();

      notify(expense.createdBy, {
        type: "approval_decided",
        title: `Expense Voucher ${decision.toUpperCase()}`,
        message: `Expense voucher "${expense.title}" has been ${decision}.`,
        data: { decision, remarks, schoolId },
        sendEmailFlag: true,
        schoolId,
      });

      await auditLog({
        schoolId,
        userId: approverUser._id,
        action: `EXPENSE_${decision.toUpperCase()}`,
        module: "expense",
        targetId: expense._id,
        details: { decision, remarks },
        ip,
      });

      return { type, id, status: decision, message: `Expense voucher ${decision}.` };
    }

    case "payroll_run": {
      const run = await PayrollRun.findOne({ _id: id, schoolId });
      if (!run) throw new ApiError(404, "Payroll run not found.");

      if (run.generatedBy?.toString() === approverId) {
        throw new ApiError(403, "You cannot approve a payroll run you generated.");
      }

      if (run.status !== "draft") {
        throw new ApiError(409, `Payroll run is currently in '${run.status}' status.`);
      }

      run.status = decision;
      run.approvedBy = approverUser._id;
      run.approvedAt = new Date();
      if (remarks) run.decisionRemarks = remarks;
      await run.save();

      if (decision === "approved") {
        await Payslip.updateMany({ runId: run._id }, { $set: { status: "approved" } });
      }

      notifyMany(
        { schoolId, role: "accountant" },
        {
          type: "approval_decided",
          title: `Payroll Run ${decision.toUpperCase()}`,
          message: `Payroll run for ${run.month}/${run.year} has been ${decision} by ${approverUser.name}.`,
          data: { runId: run._id, decision, remarks, schoolId },
          sendEmailFlag: true,
          schoolId,
        }
      );

      await auditLog({
        schoolId,
        userId: approverUser._id,
        action: `PAYROLL_RUN_${decision.toUpperCase()}`,
        module: "payroll",
        targetId: run._id,
        details: { decision, remarks },
        ip,
      });

      return { type, id, status: decision, message: `Payroll run ${decision}.` };
    }

    default:
      throw new ApiError(400, `Unknown approval type: ${type}`);
  }
};

/**
 * Bulk decision processing. Allowed only for teacher_leave, concession, expense.
 * Max 25 items. Never allowed for refund or payroll_run.
 */
const bulkDecideItems = async ({ schoolId, approverUser, items = [], decision, remarks = "", ip = "" }) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Items array must not be empty.");
  }
  if (items.length > 25) {
    throw new ApiError(400, "Maximum 25 items allowed in a single bulk approval.");
  }

  const allowedTypes = ["teacher_leave", "concession", "expense"];
  const disallowed = items.filter((it) => !allowedTypes.includes(it.type));
  if (disallowed.length > 0) {
    throw new ApiError(
      400,
      `Bulk approvals are not allowed for ${disallowed.map((d) => d.type).join(", ")}. Refunds and Payroll runs must be decided individually.`
    );
  }

  const results = [];

  for (const item of items) {
    try {
      const res = await decideItem({
        schoolId,
        approverUser,
        type: item.type,
        id: item.id,
        decision,
        remarks,
        ip,
      });
      results.push({ ...item, success: true, message: res.message });
    } catch (err) {
      results.push({ ...item, success: false, error: err.message || "Failed" });
    }
  }

  return results;
};

module.exports = {
  getApprovalCounts,
  getApprovalsList,
  decideItem,
  bulkDecideItems,
};
