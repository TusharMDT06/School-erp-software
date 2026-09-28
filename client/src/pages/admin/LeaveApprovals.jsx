import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  UserCheck,
  AlertCircle,
  Loader2,
  RefreshCw,
  PhoneCall,
  Mail,
  MessageSquare,
  ShieldCheck,
  CreditCard,
  FileText,
  Building2,
  DollarSign,
  ExternalLink,
  Wallet,
} from "lucide-react";
import { getLeaveRequestsApi, decideLeaveRequestApi } from "../../api/leaveApi";
import { getExpensesApi, decideExpenseApi } from "../../api/expenseApi";
import { getPayrollRunsApi, approvePayrollRunApi } from "../../api/payrollApi";

const fmt = (paise) =>
  "₹" + ((paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const LeaveApprovals = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [roleFilter, setRoleFilter] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [remarkModal, setRemarkModal] = useState({
    isOpen: false,
    leaveId: null,
    action: null, // "approved" or "rejected"
    applicantName: "",
    requesterRole: "",
    remarks: "",
  });

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (roleFilter) params.requesterRole = roleFilter;

      const res = await getLeaveRequestsApi(params);
      setLeaves(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load leave requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [statusFilter, roleFilter]);

  const handleOpenDecision = (leave, action) => {
    setRemarkModal({
      isOpen: true,
      leaveId: leave._id,
      action,
      applicantName: leave.applicantId?.name || "Applicant",
      requesterRole: leave.requesterRole,
      remarks: action === "approved" ? "Approved as requested." : "",
    });
  };

  const handleConfirmDecision = async () => {
    const { leaveId, action, remarks, requesterRole } = remarkModal;
    if (!leaveId || !action) return;

    setProcessingId(leaveId);
    try {
      await decideLeaveRequestApi(leaveId, {
        status: action,
        decisionRemarks: remarks,
      });

      if (action === "approved") {
        if (requesterRole === "student") {
          toast.success(
            "Leave approved. Parent notified via email, call, and backup SMS/WhatsApp if unanswered.",
            { duration: 5500 }
          );
        } else {
          toast.success("Leave approved. Staff notified successfully.");
        }
      } else {
        toast.error("Leave application rejected.");
      }

      setRemarkModal({
        isOpen: false,
        leaveId: null,
        action: null,
        applicantName: "",
        requesterRole: "",
        remarks: "",
      });

      // Reload leave list
      await fetchLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} leave.`);
    } finally {
      setProcessingId(null);
    }
  };

  const [activeTab, setActiveTab] = useState("leaves"); // "leaves" | "expenses"

  // ── Expense approvals state ────────────────────────────────────────────────
  const [expenses, setExpenses] = useState([]);
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseStatusFilter, setExpenseStatusFilter] = useState("pending_approval");
  const [expenseProcessingId, setExpenseProcessingId] = useState(null);
  const [pendingExpenseCount, setPendingExpenseCount] = useState(0);

  const [expenseModal, setExpenseModal] = useState({
    isOpen: false,
    expense: null,
    decision: "approved",
    remarks: "",
  });

  const fetchExpenses = async () => {
    setExpenseLoading(true);
    try {
      const params = {};
      if (expenseStatusFilter !== "all") params.status = expenseStatusFilter;
      const res = await getExpensesApi(params);
      setExpenses(res.data?.expenses || []);

      // Also get count of pending
      const pendingRes = await getExpensesApi({ status: "pending_approval", limit: 1 });
      setPendingExpenseCount(pendingRes.data?.pagination?.total || 0);
    } catch {
      toast.error("Failed to load expenses for approval.");
    } finally {
      setExpenseLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [expenseStatusFilter]);

  const handleOpenExpenseDecision = (expense, decision) => {
    setExpenseModal({
      isOpen: true,
      expense,
      decision,
      remarks: decision === "approved" ? "Approved for payment." : "",
    });
  };

  const handleConfirmExpenseDecision = async () => {
    const { expense, decision, remarks } = expenseModal;
    if (!expense || !decision) return;

    setExpenseProcessingId(expense._id);
    try {
      await decideExpenseApi(expense._id, {
        decision,
        remarks: remarks?.trim() || "",
      });

      toast.success(`Expense "${expense.title}" ${decision} successfully.`);
      setExpenseModal({ isOpen: false, expense: null, decision: "approved", remarks: "" });
      await fetchExpenses();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${decision} expense.`);
    } finally {
      setExpenseProcessingId(null);
    }
  };

  // ── Payroll Approvals state ────────────────────────────────────────────────
  const [payrollRuns, setPayrollRuns] = useState([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollApprovingId, setPayrollApprovingId] = useState(null);
  const [pendingPayrollCount, setPendingPayrollCount] = useState(0);
  const [payrollModal, setPayrollModal] = useState({
    isOpen: false,
    run: null,
  });

  const fetchPayrollRuns = async () => {
    setPayrollLoading(true);
    try {
      const res = await getPayrollRunsApi();
      const all = res.data || [];
      setPayrollRuns(all);
      const draftCount = all.filter((r) => r.status === "draft").length;
      setPendingPayrollCount(draftCount);
    } catch {
      toast.error("Failed to load payroll runs for approval.");
    } finally {
      setPayrollLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrollRuns();
  }, []);

  const handleOpenPayrollApprove = (run) => {
    setPayrollModal({
      isOpen: true,
      run,
    });
  };

  const handleConfirmPayrollApprove = async () => {
    if (!payrollModal.run) return;
    const runId = payrollModal.run._id;
    setPayrollApprovingId(runId);
    try {
      await approvePayrollRunApi(runId);
      toast.success(
        `Payroll run for ${payrollModal.run.month}/${payrollModal.run.year} approved! Accountant notified.`
      );
      setPayrollModal({ isOpen: false, run: null });
      await fetchPayrollRuns();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve payroll run.");
    } finally {
      setPayrollApprovingId(null);
    }
  };

  const pendingCount = leaves.filter((l) => l.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1F4E79]/10 text-[#1F4E79] flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Leave Approvals & Management</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review student and teacher leave applications with automated multi-channel voice call, SMS & WhatsApp notifications.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchLeaves}
          disabled={loading}
          className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#1F4E79] ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Top Tabs: Leaves vs Expense Approvals */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-2 rounded-xl shadow-xs">
        <button
          onClick={() => setActiveTab("leaves")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === "leaves"
              ? "border-[#1F4E79] text-[#1F4E79]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Leave Requests
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 font-bold">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("expenses")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === "expenses"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Expense Approvals
          {pendingExpenseCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-800 font-bold animate-pulse">
              {pendingExpenseCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("payroll")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition ${
            activeTab === "payroll"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Wallet className="w-4 h-4" />
          Payroll Approvals
          {pendingPayrollCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-800 font-bold animate-pulse">
              {pendingPayrollCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === "leaves" && (
        <>
          {/* Multi-Channel Outreach Banner */}
          <div className="bg-gradient-to-r from-[#1F4E79]/10 via-sky-50 to-indigo-50 border border-[#1F4E79]/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1F4E79] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
            <PhoneCall className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#1F4E79] uppercase tracking-wider">
              Automated Multi-Channel Parent Alert System Active
            </h4>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              When approving a student's leave, an automated Hindi voice call is placed to the registered parent. If unanswered or busy, fallback SMS and WhatsApp messages are instantly dispatched.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 flex-shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg shadow-2xs border border-slate-200">
            <PhoneCall className="w-3 h-3 text-sky-600" /> Voice Call
          </span>
          <span className="text-slate-300">→</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg shadow-2xs border border-slate-200">
            <Mail className="w-3 h-3 text-[#1F4E79]" /> SMS
          </span>
          <span className="text-slate-300">→</span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg shadow-2xs border border-slate-200">
            <MessageSquare className="w-3 h-3 text-emerald-600" /> WhatsApp
          </span>
        </div>
      </div>

      {/* Filter Tabs & Role Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: "pending", label: "Pending Review" },
            { id: "approved", label: "Approved" },
            { id: "rejected", label: "Rejected" },
            { id: "", label: "All Statuses" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? "bg-[#1F4E79] text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Roles (Students & Teachers)</option>
            <option value="student">Students Only</option>
            <option value="teacher">Teachers Only</option>
          </select>
        </div>
      </div>

      {/* Leaves Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-[#1F4E79]" />
          <p className="text-sm">Loading leave applications...</p>
        </div>
      ) : leaves.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center text-slate-400">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-700">No leave applications found</h3>
          <p className="text-xs text-slate-400 mt-1">There are no leave requests matching your current filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {leaves.map((leave) => {
            const applicant = leave.applicantId || {};
            const studentInfo = leave.studentId;
            const fromStr = new Date(leave.fromDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            const toStr = new Date(leave.toDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            // Calculate duration in days
            const diffTime = Math.abs(new Date(leave.toDate) - new Date(leave.fromDate));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            return (
              <div
                key={leave._id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-slate-200 transition"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left Column: Applicant and Dates */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm">
                        {applicant.name ? applicant.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-800">{applicant.name || "Unknown"}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              leave.requesterRole === "student"
                                ? "bg-sky-50 text-sky-700 border border-sky-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {leave.requesterRole}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-100 text-slate-600">
                            {leave.leaveType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {applicant.email} {applicant.phone ? `• ${applicant.phone}` : ""}
                          {studentInfo?.classId && ` • Class ${studentInfo.classId.className}-${studentInfo.classId.section}`}
                        </p>
                      </div>
                    </div>

                    {/* Leave Dates & Duration */}
                    <div className="flex items-center gap-4 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 w-fit">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#1F4E79]" />
                        <span className="font-semibold">{fromStr}</span>
                        <span>to</span>
                        <span className="font-semibold">{toStr}</span>
                      </div>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <span className="font-bold text-[#1F4E79]">{diffDays} {diffDays === 1 ? "day" : "days"}</span>
                    </div>

                    {/* Reason */}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason for Leave:</p>
                      <p className="text-xs text-slate-700 mt-1 bg-slate-50/50 p-2.5 rounded-xl border border-dashed border-slate-200 leading-relaxed">
                        "{leave.reason}"
                      </p>
                    </div>

                    {/* Decision Remarks if Decided */}
                    {leave.status !== "pending" && (
                      <div className="text-xs text-slate-500 pt-1">
                        <span className="font-semibold">Decision Remarks:</span> {leave.decisionRemarks || "No remarks"}
                        {leave.decidedBy && ` • By ${leave.decidedBy.name || "Admin"}`}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Status & Decision Actions */}
                  <div className="flex flex-col items-start md:items-end justify-between gap-3 min-w-[160px]">
                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        leave.status === "approved"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : leave.status === "rejected"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {leave.status === "approved" && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {leave.status === "rejected" && <XCircle className="w-3.5 h-3.5" />}
                      {leave.status === "pending" && <Clock className="w-3.5 h-3.5" />}
                      {leave.status}
                    </span>

                    {/* Decision Buttons for Pending Status */}
                    {leave.status === "pending" && (
                      <div className="flex items-center gap-2 mt-auto w-full md:w-auto">
                        <button
                          type="button"
                          onClick={() => handleOpenDecision(leave, "approved")}
                          disabled={processingId === leave._id}
                          className="flex-1 md:flex-initial px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {processingId === leave._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Approve
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDecision(leave, "rejected")}
                          disabled={processingId === leave._id}
                          className="flex-1 md:flex-initial px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* ── Expense Approvals Tab ── */}
      {activeTab === "expenses" && (
        <div className="space-y-4">
          {/* Expense Filter Bar */}
          <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Filter Status:</span>
              <select
                value={expenseStatusFilter}
                onChange={(e) => setExpenseStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="all">All Expenses</option>
              </select>
            </div>

            <button
              onClick={fetchExpenses}
              disabled={expenseLoading}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${expenseLoading ? "animate-spin text-rose-600" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Expenses List */}
          {expenseLoading ? (
            <div className="flex items-center justify-center p-16 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-700">No expenses requiring approval</p>
              <p className="text-xs text-slate-400 mt-1">
                Any expense exceeding the school&apos;s approval threshold will appear here.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs">
                      <th className="py-3 px-4">Expense Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Vendor</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Amount (₹)</th>
                      <th className="py-3 px-4 text-center">Receipt</th>
                      <th className="py-3 px-4">Created By</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {expenses.map((exp) => (
                      <tr key={exp._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{exp.title}</div>
                          {exp.description && (
                            <div className="text-xs text-slate-500 truncate max-w-xs">{exp.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                            {exp.categoryId?.name || "General"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-700">
                          {exp.vendorId?.name || <span className="italic text-slate-400">None</span>}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {new Date(exp.expenseDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 text-base">
                          {fmt(exp.amount)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {exp.billUrl ? (
                            <a
                              href={exp.billUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 underline"
                            >
                              <FileText className="w-3.5 h-3.5" /> View
                            </a>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {exp.createdBy?.name || "Accountant"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              exp.status === "pending_approval"
                                ? "bg-amber-100 text-amber-800"
                                : exp.status === "approved"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {exp.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {exp.status === "pending_approval" && (
                            <>
                              <button
                                onClick={() => handleOpenExpenseDecision(exp, "approved")}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleOpenExpenseDecision(exp, "rejected")}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Payroll Approvals Tab ── */}
      {activeTab === "payroll" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Pending & Recent Payroll Runs</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and approve monthly salary sheets before accounts processes the payout.
              </p>
            </div>
            <button
              onClick={fetchPayrollRuns}
              disabled={payrollLoading}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${payrollLoading ? "animate-spin" : ""}`} />
              Refresh Runs
            </button>
          </div>

          {payrollLoading ? (
            <div className="bg-white p-12 rounded-2xl shadow-xs border border-slate-200 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Loading payroll runs...</p>
            </div>
          ) : payrollRuns.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl shadow-xs border border-slate-200 text-center">
              <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No payroll runs found</p>
              <p className="text-xs text-slate-400 mt-1">
                When the accounts department generates monthly payroll, it will appear here for your review and approval.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs">
                      <th className="py-3 px-4">Pay Period</th>
                      <th className="py-3 px-4 text-center">Staff Count</th>
                      <th className="py-3 px-4 text-right">Total Gross</th>
                      <th className="py-3 px-4 text-right">Total Deductions</th>
                      <th className="py-3 px-4 text-right">Total Net Payout</th>
                      <th className="py-3 px-4">Submitted By</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {payrollRuns.map((r) => {
                      const MONTH_NAMES = [
                        "", "January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"
                      ];
                      const isDraft = r.status === "draft";
                      const isApproved = r.status === "approved";
                      const isPaid = r.status === "paid";

                      return (
                        <tr key={r._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {MONTH_NAMES[r.month]} {r.year}
                          </td>
                          <td className="py-3 px-4 text-center text-xs font-semibold text-slate-600">
                            {r.payslipsCount || 0} Staff
                          </td>
                          <td className="py-3 px-4 text-right text-xs font-medium text-slate-600">
                            {fmt(r.totalGross)}
                          </td>
                          <td className="py-3 px-4 text-right text-xs font-medium text-rose-600">
                            -{fmt(r.totalDeductions)}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900 text-base">
                            {fmt(r.totalNet)}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {r.generatedBy?.name || "Accountant"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                isDraft
                                  ? "bg-amber-100 text-amber-800"
                                  : isApproved
                                  ? "bg-sky-100 text-sky-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {isDraft ? "Pending Approval" : r.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isDraft && (
                              <button
                                onClick={() => handleOpenPayrollApprove(r)}
                                disabled={payrollApprovingId === r._id}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition inline-flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {payrollApprovingId === r._id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                                Approve Run
                              </button>
                            )}
                            {isApproved && (
                              <span className="text-xs text-sky-600 font-semibold italic">
                                Ready for Payout
                              </span>
                            )}
                            {isPaid && (
                              <span className="text-xs text-emerald-600 font-semibold flex items-center justify-end gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Disbursed
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payroll Approval Confirmation Modal */}
      {payrollModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Approve Payroll Run
                </h3>
                <p className="text-xs text-slate-500">
                  Month: {payrollModal.run?.month}/{payrollModal.run?.year}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
              <div className="text-xs text-slate-500 uppercase font-semibold">Total Net Amount</div>
              <div className="text-2xl font-black text-slate-900">
                {fmt(payrollModal.run?.totalNet)}
              </div>
              <div className="text-xs text-slate-500">
                Gross: {fmt(payrollModal.run?.totalGross)} | Deductions: {fmt(payrollModal.run?.totalDeductions)}
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              By approving this payroll run, you verify the compensation amounts and authorize the accounts department to disburse payments. Individual payslip editing will be locked.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPayrollModal({ isOpen: false, run: null })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPayrollApprove}
                disabled={payrollApprovingId !== null}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                {payrollApprovingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decision Modal with remarks */}
      {remarkModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  remarkModal.action === "approved"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                {remarkModal.action === "approved" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 capitalize">
                  {remarkModal.action} Leave Request
                </h3>
                <p className="text-xs text-slate-500">
                  Applicant: <strong>{remarkModal.applicantName}</strong> ({remarkModal.requesterRole})
                </p>
              </div>
            </div>

            {remarkModal.action === "approved" && remarkModal.requesterRole === "student" && (
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-800 leading-relaxed">
                <strong>Parent Outreach Notice:</strong> Approving this student's leave will automatically place a Hindi voice call to the parent and dispatch fallback SMS/WhatsApp if unanswered.
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Decision Remarks (Optional)
              </label>
              <textarea
                value={remarkModal.remarks}
                onChange={(e) =>
                  setRemarkModal((prev) => ({ ...prev, remarks: e.target.value }))
                }
                placeholder="Enter any guidance, remarks, or conditions..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1F4E79]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setRemarkModal({
                    isOpen: false,
                    leaveId: null,
                    action: null,
                    applicantName: "",
                    requesterRole: "",
                    remarks: "",
                  })
                }
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecision}
                disabled={processingId !== null}
                className={`px-4 py-2 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 ${
                  remarkModal.action === "approved"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {processingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Confirm {remarkModal.action === "approved" ? "Approval" : "Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Decision Modal */}
      {expenseModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  expenseModal.decision === "approved"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-rose-50 text-rose-600"
                }`}
              >
                {expenseModal.decision === "approved" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 capitalize">
                  {expenseModal.decision === "approved" ? "Approve Expense" : "Reject Expense"}
                </h3>
                <p className="text-xs text-slate-500">
                  {expenseModal.expense?.title} — {fmt(expenseModal.expense?.amount)}
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 block">
                Decision Remarks
              </label>
              <textarea
                value={expenseModal.remarks}
                onChange={(e) =>
                  setExpenseModal((prev) => ({ ...prev, remarks: e.target.value }))
                }
                placeholder="Enter remarks or approval notes..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setExpenseModal({ isOpen: false, expense: null, decision: "approved", remarks: "" })
                }
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmExpenseDecision}
                disabled={expenseProcessingId !== null}
                className={`px-4 py-2 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5 ${
                  expenseModal.decision === "approved"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {expenseProcessingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Confirm {expenseModal.decision === "approved" ? "Approval" : "Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveApprovals;
