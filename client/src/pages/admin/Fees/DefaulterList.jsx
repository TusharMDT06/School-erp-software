import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Mail,
  Filter,
  Download,
  Loader2,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { getClassesApi } from "../../../api/classApi";
import { triggerFeeOverdueCallAlertApi } from "../../../api/feeApi";
import {
  fetchFeeDefaulters,
  sendFeeReminderManual,
} from "../../../features/fee/feeSlice";

const DefaulterList = () => {
  const dispatch = useDispatch();
  const { defaulters, loading } = useSelector((state) => state.fee);

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [sendingReminderId, setSendingReminderId] = useState(null);
  const [callingTxId, setCallingTxId] = useState(null);

  // Load class list for filtering
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await getClassesApi({ limit: 100 });
        const list = res.data?.data || res.data || [];
        setClasses(list);
      } catch (err) {
        toast.error("Failed to load classes.");
      }
    };
    loadClasses();
  }, []);

  // Fetch defaulters
  useEffect(() => {
    dispatch(fetchFeeDefaulters(selectedClassId ? { classId: selectedClassId } : {}));
  }, [selectedClassId, dispatch]);

  // Send single email reminder
  const handleSendReminder = async (studentId) => {
    try {
      setSendingReminderId(studentId);
      const res = await dispatch(sendFeeReminderManual(studentId)).unwrap();
      toast.success(res.message || "Fee reminder email dispatched!");
    } catch (err) {
      toast.error(err || "Failed to send fee reminder.");
    } finally {
      setSendingReminderId(null);
    }
  };

  // Trigger automated voice call + SMS/WhatsApp fallback
  const handleTriggerCall = async (transactionId) => {
    try {
      setCallingTxId(transactionId);
      const res = await triggerFeeOverdueCallAlertApi(transactionId);
      toast.success(
        res.message || "Automated voice call alert initiated! Will fallback to SMS & WhatsApp if unanswered."
      );
      // Refresh list to update CallLog indicator
      dispatch(fetchFeeDefaulters(selectedClassId ? { classId: selectedClassId } : {}));
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to initiate call alert.");
    } finally {
      setCallingTxId(null);
    }
  };

  // Export defaulters list to CSV
  const handleExportCSV = () => {
    if (defaulters.length === 0) {
      toast.error("No defaulter records to export.");
      return;
    }

    const headers = [
      "Roll No",
      "Admission No",
      "Student Name",
      "Class",
      "Email",
      "Phone",
      "Term",
      "Amount Due",
      "Amount Paid",
      "Pending Balance",
      "Due Date",
      "Days Overdue",
      "Status",
    ];

    const rows = defaulters.map((d) => [
      d.rollNumber,
      d.admissionNumber,
      `"${d.studentName}"`,
      d.className,
      d.studentEmail,
      d.studentPhone,
      d.term,
      d.amountDue,
      d.amountPaid,
      d.pendingAmount,
      new Date(d.dueDate).toLocaleDateString("en-IN"),
      d.daysOverdue,
      d.status,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Fee_Defaulters_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Defaulters CSV downloaded.");
  };

  const totalOutstanding = defaulters.reduce((sum, d) => sum + (d.pendingAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Fee Defaulters & Overdue Tracking</h2>
          <p className="text-xs text-slate-500 mt-1">
            Track students with unpaid balances, monitor overdue durations, and dispatch automated payment reminders.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={defaulters.length === 0}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition flex items-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-[#1F4E79]" />
          Export Defaulters CSV
        </button>
      </div>

      {/* Summary KPI Cards & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Defaulters</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{defaulters.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">Total Outstanding Balance</p>
            <p className="text-2xl font-extrabold text-[#1F4E79] mt-1">
              ₹{totalOutstanding.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#1F4E79]/10 text-[#1F4E79] flex items-center justify-center font-bold text-sm">
            ₹
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
          <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Filter by Class
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c._id} value={c._id}>
                Class {c.className}-{c.section}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-[#1F4E79]" />
            <p className="text-sm">Loading fee defaulters list...</p>
          </div>
        ) : defaulters.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-700">No fee defaulters found!</p>
            <p className="text-xs text-slate-400 mt-1">All invoices are settled for the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-16">Roll</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Class</th>
                  <th className="py-3.5 px-4">Term</th>
                  <th className="py-3.5 px-4 text-right">Amount Due</th>
                  <th className="py-3.5 px-4 text-right">Balance</th>
                  <th className="py-3.5 px-4 text-center">Due Date</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Call Outreach</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {defaulters.map((item) => (
                  <tr key={item.transactionId} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{item.rollNumber}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{item.studentName}</p>
                      <p className="text-xs text-slate-400">Adm: {item.admissionNumber}</p>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{item.className}</td>
                    <td className="py-3 px-4 uppercase text-xs font-semibold text-slate-600">{item.term}</td>
                    <td className="py-3 px-4 text-right text-slate-600 font-medium">
                      ₹{item.amountDue?.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600">
                      ₹{item.pendingAmount?.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-center text-xs text-slate-500">
                      {new Date(item.dueDate).toLocaleDateString("en-IN")}
                      {item.daysOverdue > 0 && (
                        <span className="block text-[10px] text-rose-500 font-bold">
                          {item.daysOverdue}d overdue
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${
                          item.status === "overdue"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : item.status === "partial"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.hasRecentCallAlert && item.latestCallAlert ? (
                        <div className="inline-flex flex-col items-center gap-1">
                          {item.latestCallAlert.callStatus === "completed" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <PhoneCall className="w-3 h-3 text-emerald-600" />
                              Answered
                            </span>
                          )}
                          {item.latestCallAlert.callStatus === "initiated" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 animate-pulse">
                              <PhoneForwarded className="w-3 h-3 text-sky-600" />
                              In Progress
                            </span>
                          )}
                          {["failed", "no-answer", "busy"].includes(item.latestCallAlert.callStatus) && (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <PhoneOff className="w-3 h-3 text-amber-600" />
                                {item.latestCallAlert.callStatus === "no-answer" ? "No Answer" : item.latestCallAlert.callStatus}
                              </span>
                              <div className="flex items-center gap-1 text-[10px]">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-medium ${
                                    item.latestCallAlert.smsFallbackStatus === "sent"
                                      ? "bg-slate-100 text-slate-700"
                                      : "bg-rose-50 text-rose-600"
                                  }`}
                                >
                                  SMS: {item.latestCallAlert.smsFallbackStatus}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded font-medium ${
                                    item.latestCallAlert.whatsappFallbackStatus === "sent"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  WA: {item.latestCallAlert.whatsappFallbackStatus}
                                </span>
                              </div>
                            </div>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.latestCallAlert.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-400 border border-slate-200">
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          Not called yet
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendReminder(item.studentId)}
                          disabled={sendingReminderId === item.studentId}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#1F4E79]/10 hover:bg-[#1F4E79] hover:text-white text-[#1F4E79] text-xs font-semibold rounded-xl transition shadow-2xs disabled:opacity-50"
                          title="Send Email Reminder"
                        >
                          {sendingReminderId === item.studentId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Mail className="w-3.5 h-3.5" />
                          )}
                          Email
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTriggerCall(item.transactionId)}
                          disabled={callingTxId === item.transactionId}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200 transition shadow-2xs disabled:opacity-50"
                          title="Initiate Voice Call + Backup SMS/WhatsApp"
                        >
                          {callingTxId === item.transactionId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <PhoneCall className="w-3.5 h-3.5" />
                          )}
                          Call Alert
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DefaulterList;
