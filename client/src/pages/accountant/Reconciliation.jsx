import { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  RefreshCw,
  Flag,
  Calendar,
  Search,
  ExternalLink,
  ShieldAlert,
  ArrowRightLeft,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getOnlineReconciliationApi,
  flagReconciliationIssueApi,
} from "../../api/reconciliationApi";

const Reconciliation = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("missingInDb"); // 'missingInDb' | 'amountMismatch' | 'notFoundOnRzp' | 'matched'
  const [flagModal, setFlagModal] = useState(null); // { issueType, paymentId, details }
  const [flagNotes, setFlagNotes] = useState("");
  const [flagging, setFlagging] = useState(false);

  // Filters
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchReconciliation();
  }, [from, to]);

  const fetchReconciliation = async () => {
    setLoading(true);
    try {
      const res = await getOnlineReconciliationApi({ from, to });
      setData(res?.data || null);

      // Auto-switch to critical issues if present
      if (res?.data?.missingInDb?.length > 0) {
        setActiveTab("missingInDb");
      } else if (res?.data?.amountMismatch?.length > 0) {
        setActiveTab("amountMismatch");
      } else if (res?.data?.notFoundOnRzp?.length > 0) {
        setActiveTab("notFoundOnRzp");
      } else {
        setActiveTab("matched");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch reconciliation");
    } finally {
      setLoading(false);
    }
  };

  const handleFlagSubmit = async () => {
    if (!flagModal) return;
    setFlagging(true);
    try {
      await flagReconciliationIssueApi({
        issueType: flagModal.issueType,
        paymentId: flagModal.paymentId,
        details: {
          ...flagModal.details,
          flaggedNotes: flagNotes,
          flaggedAt: new Date().toISOString(),
        },
      });
      toast.success("Discrepancy flagged! Admin has been notified.");
      setFlagModal(null);
      setFlagNotes("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to flag discrepancy");
    } finally {
      setFlagging(false);
    }
  };

  const summary = data?.summary || {
    matchedCount: 0,
    missingInDbCount: 0,
    notFoundOnRzpCount: 0,
    amountMismatchCount: 0,
    hasCriticalIssues: false,
  };

  const filterRows = (list = []) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (r) =>
        r.razorpayPaymentId?.toLowerCase().includes(q) ||
        r.studentName?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.contact?.includes(q) ||
        r.receiptNumber?.toLowerCase().includes(q)
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-700">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            Online Payment Reconciliation
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Automated verification between captured Razorpay gateway transactions and ERP Fee Records.
          </p>
        </div>

        <button
          onClick={fetchReconciliation}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-semibold shadow-sm self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          Reconcile Now
        </button>
      </div>

      {/* ── Date Range Bar ─────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Range:</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-transparent text-slate-700 outline-none font-medium cursor-pointer"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-transparent text-slate-700 outline-none font-medium cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 7);
                setFrom(d.toISOString().split("T")[0]);
                setTo(new Date().toISOString().split("T")[0]);
              }}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                setFrom(d.toISOString().split("T")[0]);
                setTo(new Date().toISOString().split("T")[0]);
              }}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Last 30 Days
            </button>
          </div>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search payment ID, student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* ── Summary Chips (Red if Critical) ────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Missing in DB (CRITICAL) */}
        <div
          onClick={() => setActiveTab("missingInDb")}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            summary.missingInDbCount > 0
              ? "bg-rose-50/80 border-rose-200 ring-2 ring-rose-500/20"
              : "bg-white border-slate-200/80"
          } ${activeTab === "missingInDb" ? "shadow-md" : ""}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              Missing in DB
            </span>
            {summary.missingInDbCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-rose-600 text-white rounded-full animate-pulse">
                Critical
              </span>
            )}
          </div>
          <p className="text-2xl font-black text-rose-900 mt-2">{summary.missingInDbCount}</p>
          <p className="text-[11px] text-rose-600/80 mt-0.5">Parent charged on gateway, missing in ERP</p>
        </div>

        {/* Amount Mismatch */}
        <div
          onClick={() => setActiveTab("amountMismatch")}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            summary.amountMismatchCount > 0
              ? "bg-amber-50/80 border-amber-200"
              : "bg-white border-slate-200/80"
          } ${activeTab === "amountMismatch" ? "shadow-md ring-2 ring-amber-500/20" : ""}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Amount Mismatch
            </span>
          </div>
          <p className="text-2xl font-black text-amber-900 mt-2">{summary.amountMismatchCount}</p>
          <p className="text-[11px] text-amber-600/80 mt-0.5">Discrepancy between gateway & recorded fee</p>
        </div>

        {/* Not Found on Razorpay */}
        <div
          onClick={() => setActiveTab("notFoundOnRzp")}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            summary.notFoundOnRzpCount > 0
              ? "bg-purple-50/80 border-purple-200"
              : "bg-white border-slate-200/80"
          } ${activeTab === "notFoundOnRzp" ? "shadow-md ring-2 ring-purple-500/20" : ""}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-purple-600" />
              Not on Gateway
            </span>
          </div>
          <p className="text-2xl font-black text-purple-900 mt-2">{summary.notFoundOnRzpCount}</p>
          <p className="text-[11px] text-purple-600/80 mt-0.5">Recorded as online in DB but unverified</p>
        </div>

        {/* Matched Payments */}
        <div
          onClick={() => setActiveTab("matched")}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === "matched" ? "bg-emerald-50/80 border-emerald-300 shadow-md ring-2 ring-emerald-500/20" : "bg-white border-slate-200/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Fully Matched
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-900 mt-2">{summary.matchedCount}</p>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">Reconciled successfully with receipt</p>
        </div>
      </div>

      {/* ── Tabbed Tables ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Tab Headers */}
        <div className="flex items-center border-b border-slate-100 overflow-x-auto bg-slate-50/50 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab("missingInDb")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === "missingInDb"
                ? "bg-white text-rose-700 border-rose-600 shadow-sm"
                : "text-slate-500 border-transparent hover:text-slate-800"
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            Paid on Gateway, Missing in DB
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${summary.missingInDbCount > 0 ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-600"}`}>
              {summary.missingInDbCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("amountMismatch")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === "amountMismatch"
                ? "bg-white text-amber-700 border-amber-600 shadow-sm"
                : "text-slate-500 border-transparent hover:text-slate-800"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Amount Mismatch
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-600">
              {summary.amountMismatchCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("notFoundOnRzp")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === "notFoundOnRzp"
                ? "bg-white text-purple-700 border-purple-600 shadow-sm"
                : "text-slate-500 border-transparent hover:text-slate-800"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
            In DB, Not Found on Gateway
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-600">
              {summary.notFoundOnRzpCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("matched")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === "matched"
                ? "bg-white text-emerald-700 border-emerald-600 shadow-sm"
                : "text-slate-500 border-transparent hover:text-slate-800"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Matched Payments
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-700">
              {summary.matchedCount}
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm text-slate-500 font-medium">Reconciling transactions with Razorpay API...</p>
            </div>
          ) : (
            <div>
              {/* TAB 1: MISSING IN DB */}
              {activeTab === "missingInDb" && (
                <div>
                  {summary.missingInDbCount > 0 && (
                    <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs font-semibold">
                      <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
                      <span>
                        CRITICAL DISCREPANCY: The parents below were debited by Razorpay, but no corresponding fee transaction exists in the ERP. Flag for Admin review immediately.
                      </span>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b">
                        <tr>
                          <th className="py-2.5 px-4">Payment ID</th>
                          <th className="py-2.5 px-4">Order ID</th>
                          <th className="py-2.5 px-4">Parent Email / Contact</th>
                          <th className="py-2.5 px-4">Date / Time</th>
                          <th className="py-2.5 px-4 text-right">Charged Amount</th>
                          <th className="py-2.5 px-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filterRows(data?.missingInDb).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                              No unrecorded gateway payments found in this date window.
                            </td>
                          </tr>
                        ) : (
                          filterRows(data?.missingInDb).map((r, i) => (
                            <tr key={i} className="hover:bg-rose-50/30 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.razorpayPaymentId}</td>
                              <td className="py-3 px-4 font-mono text-xs text-slate-500">{r.razorpayOrderId}</td>
                              <td className="py-3 px-4 text-slate-700">
                                <div>{r.email}</div>
                                <div className="text-xs text-slate-400">{r.contact}</div>
                              </td>
                              <td className="py-3 px-4 text-xs text-slate-500">{new Date(r.paidAt).toLocaleString()}</td>
                              <td className="py-3 px-4 text-right font-bold text-rose-600">₹{r.amountRupees?.toLocaleString()}</td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() =>
                                    setFlagModal({
                                      issueType: r.issueType,
                                      paymentId: r.razorpayPaymentId,
                                      details: r,
                                    })
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 mx-auto transition-colors shadow-sm shadow-rose-600/20"
                                >
                                  <Flag className="w-3.5 h-3.5" />
                                  Flag for Admin
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: AMOUNT MISMATCH */}
              {activeTab === "amountMismatch" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b">
                      <tr>
                        <th className="py-2.5 px-4">Payment ID</th>
                        <th className="py-2.5 px-4">Student</th>
                        <th className="py-2.5 px-4 text-right">Gateway Amount (₹)</th>
                        <th className="py-2.5 px-4 text-right">DB Recorded (₹)</th>
                        <th className="py-2.5 px-4 text-right">Variance (₹)</th>
                        <th className="py-2.5 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filterRows(data?.amountMismatch).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                            No amount discrepancies detected.
                          </td>
                        </tr>
                      ) : (
                        filterRows(data?.amountMismatch).map((r, i) => (
                          <tr key={i} className="hover:bg-amber-50/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.razorpayPaymentId}</td>
                            <td className="py-3 px-4 font-medium text-slate-800">{r.studentName}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-900">₹{r.rzpAmountRupees?.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-600">₹{r.dbAmountRupees?.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-bold text-amber-600">₹{r.differenceRupees?.toLocaleString()}</td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() =>
                                  setFlagModal({
                                    issueType: r.issueType,
                                    paymentId: r.razorpayPaymentId,
                                    details: r,
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 mx-auto transition-colors shadow-sm"
                              >
                                <Flag className="w-3.5 h-3.5" />
                                Flag for Admin
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 3: NOT FOUND ON RAZORPAY */}
              {activeTab === "notFoundOnRzp" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b">
                      <tr>
                        <th className="py-2.5 px-4">Recorded Payment ID</th>
                        <th className="py-2.5 px-4">Student</th>
                        <th className="py-2.5 px-4">Class</th>
                        <th className="py-2.5 px-4">Paid Date</th>
                        <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                        <th className="py-2.5 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filterRows(data?.notFoundOnRzp).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                            All online payments in ERP exist on Razorpay.
                          </td>
                        </tr>
                      ) : (
                        filterRows(data?.notFoundOnRzp).map((r, i) => (
                          <tr key={i} className="hover:bg-purple-50/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.razorpayPaymentId}</td>
                            <td className="py-3 px-4 font-medium text-slate-800">{r.studentName}</td>
                            <td className="py-3 px-4 text-slate-600">{r.className}</td>
                            <td className="py-3 px-4 text-xs text-slate-500">{new Date(r.paidOn).toLocaleDateString()}</td>
                            <td className="py-3 px-4 text-right font-bold text-purple-700">₹{r.amountRupees?.toLocaleString()}</td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() =>
                                  setFlagModal({
                                    issueType: r.issueType,
                                    paymentId: r.razorpayPaymentId,
                                    details: r,
                                  })
                                }
                                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 mx-auto transition-colors shadow-sm"
                              >
                                <Flag className="w-3.5 h-3.5" />
                                Flag for Admin
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 4: MATCHED PAYMENTS */}
              {activeTab === "matched" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b">
                      <tr>
                        <th className="py-2.5 px-4">Payment ID</th>
                        <th className="py-2.5 px-4">Student</th>
                        <th className="py-2.5 px-4">Class</th>
                        <th className="py-2.5 px-4">Receipt No</th>
                        <th className="py-2.5 px-4">Paid On</th>
                        <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filterRows(data?.matched).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                            No matched payments found for this range.
                          </td>
                        </tr>
                      ) : (
                        filterRows(data?.matched).map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.razorpayPaymentId}</td>
                            <td className="py-3 px-4 font-medium text-slate-800">{r.studentName}</td>
                            <td className="py-3 px-4 text-slate-600">{r.className}</td>
                            <td className="py-3 px-4 font-mono text-xs text-slate-500">{r.receiptNumber}</td>
                            <td className="py-3 px-4 text-xs text-slate-500">{new Date(r.paidOn).toLocaleDateString()}</td>
                            <td className="py-3 px-4 text-right font-bold text-emerald-700">₹{r.amountRupees?.toLocaleString()}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Verified
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Flag Discrepancy Modal ─────────────────────────────────── */}
      {flagModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Flag className="w-5 h-5 text-rose-600" />
                Flag Discrepancy for Admin
              </h3>
              <button
                onClick={() => setFlagModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl space-y-1 text-xs text-slate-600 border border-slate-200">
              <p>
                <span className="font-semibold text-slate-800">Issue:</span> {flagModal.issueType}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Payment ID:</span> {flagModal.paymentId}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Investigation Notes for Principal / Admin
              </label>
              <textarea
                rows={3}
                placeholder="Explain the discrepancy or attach relevant details..."
                value={flagNotes}
                onChange={(e) => setFlagNotes(e.target.value)}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFlagModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitFlag => handleFlagSubmit()}
                disabled={flagging}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {flagging ? "Sending Notification..." : "Confirm & Notify Admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reconciliation;
