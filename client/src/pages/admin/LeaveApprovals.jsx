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
} from "lucide-react";
import { getLeaveRequestsApi, decideLeaveRequestApi } from "../../api/leaveApi";

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
    </div>
  );
};

export default LeaveApprovals;
