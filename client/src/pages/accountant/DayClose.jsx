import { useState, useEffect, useCallback } from "react";
import {
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  RefreshCw,
  Clock,
  History,
  Info,
} from "lucide-react";
import {
  getCashClosingPreviewApi,
  closeDayApi,
  getCashClosingHistoryApi,
} from "../../api/expenseApi";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

const fmt = (paise) =>
  "₹" + ((paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const fmtRupees = (paise) => Math.round((paise || 0) / 100);

export default function DayClose() {
  const { user } = useSelector((s) => s.auth);
  const canClose = ["admin", "superadmin", "accountant"].includes(user?.role);

  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);

  // Physical cash input
  const [countedRupees, setCountedRupees] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // History state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const res = await getCashClosingPreviewApi(selectedDate);
      setPreview(res.data);
      if (res.data?.isClosed && res.data?.existingClosing) {
        setCountedRupees(fmtRupees(res.data.existingClosing.actualCash));
        setRemarks(res.data.existingClosing.remarks || "");
      } else {
        setCountedRupees("");
        setRemarks("");
      }
    } catch {
      toast.error("Failed to load cash closing preview.");
    } finally {
      setLoadingPreview(false);
    }
  }, [selectedDate]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await getCashClosingHistoryApi({ limit: 15 });
      setHistory(res.data?.closings || []);
    } catch {
      toast.error("Failed to load closing history.");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Live difference computation
  const countedPaise = countedRupees === "" ? null : Math.round(Number(countedRupees) * 100);
  const expectedPaise = preview?.expectedClosingCash || 0;
  const liveDifferencePaise =
    countedPaise !== null && !isNaN(countedPaise) ? countedPaise - expectedPaise : null;

  const handleOpenConfirm = () => {
    if (countedPaise === null || isNaN(countedPaise) || countedPaise < 0) {
      return toast.error("Please enter a valid physical cash count.");
    }
    if (liveDifferencePaise !== 0 && (!remarks || !remarks.trim())) {
      return toast.error("Remarks explaining the cash discrepancy are required.");
    }
    setConfirmModalOpen(true);
  };

  const handleConfirmClose = async () => {
    setSubmitting(true);
    try {
      await closeDayApi({
        date: selectedDate,
        actualCash: countedPaise,
        remarks: remarks?.trim() || "",
      });

      toast.success(`Day ${selectedDate} closed and locked successfully!`);
      setConfirmModalOpen(false);
      loadPreview();
      loadHistory();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to close day.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Lock className="w-7 h-7 text-rose-600" />
            Day Close & Physical Cash Reconciliation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Reconcile physical cash counted against system transactions and permanently lock the day.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-600">Register Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-sm font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>
      </div>

      {/* ── Status Banner ────────────────────────────────────────────────────── */}
      {preview?.isClosed ? (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between text-emerald-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="font-bold text-base">This Day is Closed & Locked</div>
              <div className="text-xs text-emerald-700">
                Closed by {preview.existingClosing?.closedBy?.name || "User"} on{" "}
                {new Date(preview.existingClosing?.closedAt).toLocaleString("en-IN")}. No new
                ledger entries can be posted on {selectedDate}.
              </div>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-200 text-emerald-900 font-bold text-xs rounded-full uppercase">
            Day Locked
          </span>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between text-amber-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <Unlock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="font-bold text-base">Register Open for {selectedDate}</div>
              <div className="text-xs text-amber-700">
                Count the physical cash in the cash drawer at end of day and submit closing to lock the book.
              </div>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-200 text-amber-900 font-bold text-xs rounded-full uppercase">
            Pending Close
          </span>
        </div>
      )}

      {/* ── Preview Numbers & Physical Cash Input ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Preview Numbers */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-rose-600" />
              Calculated Cash Movement ({selectedDate})
            </h2>

            {loadingPreview ? (
              <div className="flex items-center justify-center p-12">
                <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Opening Cash</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {fmt(preview?.openingCash)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Previous closing&apos;s actual cash</div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
                  <div className="text-xs font-semibold text-emerald-700 uppercase flex items-center gap-1">
                    <ArrowDownLeft className="w-3.5 h-3.5" /> Cash Collected Today (+)
                  </div>
                  <div className="text-2xl font-bold text-emerald-700 mt-1">
                    +{fmt(preview?.cashCollected)}
                  </div>
                  <div className="text-xs text-emerald-600 mt-1">Fee counter receipts in cash</div>
                </div>

                <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200">
                  <div className="text-xs font-semibold text-rose-700 uppercase flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Cash Paid Out Today (-)
                  </div>
                  <div className="text-2xl font-bold text-rose-700 mt-1">
                    -{fmt(preview?.cashExpensesAndRefunds)}
                  </div>
                  <div className="text-xs text-rose-600 mt-1">Cash expenses & refunds</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-white shadow-md">
                  <div className="text-xs font-semibold text-slate-300 uppercase">
                    Expected Closing Cash (=)
                  </div>
                  <div className="text-2xl font-bold text-white mt-1">
                    {fmt(preview?.expectedClosingCash)}
                  </div>
                  <div className="text-xs text-slate-300 mt-1">Opening + Inflows - Outflows</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Physical Cash Counted & Difference */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-rose-600" />
              Physical Count & Lock
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Physically count cash in the register drawer and enter amount below.
            </p>

            <div className="mt-5 space-y-4">
              {/* Physical Cash Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Physical Cash Counted (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-base">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    disabled={preview?.isClosed || !canClose}
                    placeholder="0"
                    value={countedRupees}
                    onChange={(e) => setCountedRupees(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-lg font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
              </div>

              {/* Live Difference Badge */}
              {countedPaise !== null && !isNaN(countedPaise) && (
                <div
                  className={`p-3 rounded-xl border text-sm font-semibold flex items-center justify-between ${
                    liveDifferencePaise === 0
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-rose-50 text-rose-800 border-rose-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {liveDifferencePaise === 0 ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600" />
                    )}
                    <span>
                      {liveDifferencePaise === 0
                        ? "Balanced (₹0 difference)"
                        : `Discrepancy: ${liveDifferencePaise > 0 ? "+" : ""}${fmt(liveDifferencePaise)}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Remarks textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Remarks / Notes {liveDifferencePaise !== 0 && countedPaise !== null ? "(Required)" : "(Optional)"}
                </label>
                <textarea
                  rows={3}
                  disabled={preview?.isClosed || !canClose}
                  placeholder={
                    liveDifferencePaise !== 0 && countedPaise !== null
                      ? "Explain why the drawer has an excess or shortage..."
                      : "Optional closing remarks or denomination notes..."
                  }
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none disabled:bg-slate-100 ${
                    liveDifferencePaise !== 0 && countedPaise !== null && !remarks.trim()
                      ? "border-rose-400 bg-rose-50/20"
                      : "border-slate-300"
                  }`}
                />
              </div>
            </div>
          </div>

          {!preview?.isClosed && canClose && (
            <button
              onClick={handleOpenConfirm}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition active:scale-98 flex items-center justify-center gap-2"
            >
              <Lock className="w-5 h-5" />
              Close Day & Lock Register
            </button>
          )}
        </div>
      </div>

      {/* ── Closing History Table ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-2">
        <div className="p-5 border-b border-slate-100 flex items-center gap-2 font-bold text-slate-800">
          <History className="w-5 h-5 text-rose-600" />
          Cash Closing History Log
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">No days closed yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-xs">
                  <th className="py-3 px-4">Closing Date</th>
                  <th className="py-3 px-4 text-right">Opening (₹)</th>
                  <th className="py-3 px-4 text-right">Collected (₹)</th>
                  <th className="py-3 px-4 text-right">Paid Out (₹)</th>
                  <th className="py-3 px-4 text-right">Expected (₹)</th>
                  <th className="py-3 px-4 text-right">Physical Cash (₹)</th>
                  <th className="py-3 px-4 text-center">Difference</th>
                  <th className="py-3 px-4">Remarks</th>
                  <th className="py-3 px-4">Closed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {history.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">{c.date}</td>
                    <td className="py-3 px-4 text-right text-slate-600">{fmt(c.openingCash)}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                      +{fmt(c.cashCollected)}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600 font-medium">
                      -{fmt(c.cashExpensesAndRefunds)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-800 font-bold">
                      {fmt(c.expectedClosingCash)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-900 font-bold">
                      {fmt(c.actualCash)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          c.difference === 0
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {c.difference === 0 ? "Balanced" : `${c.difference > 0 ? "+" : ""}${fmt(c.difference)}`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {c.remarks || <span className="italic text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {c.closedBy?.name || "Accountant"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Confirmation Modal ──────────────────────────────────────────────── */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in-50 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <h3 className="text-lg font-bold text-slate-800">Lock Register for {selectedDate}?</h3>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Once closed, <strong>no new transactions or ledger entries</strong> dated{" "}
              <span className="font-semibold text-slate-900">{selectedDate}</span> can be created.
              Any corrections or adjustments must be posted as reversal entries dated today.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-700 border border-slate-200">
              <div className="flex justify-between">
                <span>Expected Cash:</span>
                <span className="font-bold">{fmt(expectedPaise)}</span>
              </div>
              <div className="flex justify-between">
                <span>Physical Count:</span>
                <span className="font-bold">{fmt(countedPaise)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-200 pt-1">
                <span>Difference:</span>
                <span className={liveDifferencePaise === 0 ? "text-emerald-600" : "text-rose-600"}>
                  {liveDifferencePaise === 0 ? "Balanced (₹0)" : fmt(liveDifferencePaise)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmClose}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50"
              >
                {submitting ? "Locking..." : "Confirm & Lock Day"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
