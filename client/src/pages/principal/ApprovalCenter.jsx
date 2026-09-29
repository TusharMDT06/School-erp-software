import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, XCircle, AlertCircle, Clock, Check, X,
  Layers, Filter, RefreshCw, ChevronRight, Eye, AlertTriangle,
  IndianRupee, Calendar, User, FileText, CheckSquare, Square,
} from "lucide-react";
import {
  getApprovalsApi,
  getApprovalCountsApi,
  decideApprovalApi,
  bulkDecideApprovalsApi,
} from "../../api/approvalApi";
import toast from "react-hot-toast";

const TYPES = [
  { key: "all", label: "All Items" },
  { key: "teacher_leave", label: "Teacher Leaves", bulkAllowed: true },
  { key: "concession", label: "Concessions", bulkAllowed: true },
  { key: "refund", label: "Refunds", bulkAllowed: false },
  { key: "expense", label: "Expenses", bulkAllowed: true },
  { key: "payroll_run", label: "Payroll Runs", bulkAllowed: false },
];

const SLA_BADGE = {
  ok: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "<2d Normal" },
  warn: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "2-4d Attention" },
  breach: { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "5d+ SLA Breach" },
};

const fmt = (paise) => "₹" + ((paise || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function ApprovalCenter() {
  const [activeType, setActiveType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("pending"); // "pending" | "decided"
  const [counts, setCounts] = useState({});
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Selected items for bulk decision
  const [selectedKeys, setSelectedKeys] = useState(new Set()); // set of `${type}:${id}`
  const [bulkAction, setBulkAction] = useState(null); // "approved" | "rejected" | null
  const [bulkRemarks, setBulkRemarks] = useState("");
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Single Item Decision Modal / Drawer
  const [activeItem, setActiveItem] = useState(null);
  const [decideAction, setDecideAction] = useState(null); // "approved" | "rejected" | null
  const [remarks, setRemarks] = useState("");
  const [isProcessingSingle, setIsProcessingSingle] = useState(false);

  const loadCounts = useCallback(async () => {
    try {
      const res = await getApprovalCountsApi();
      setCounts(res.data || {});
    } catch {}
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getApprovalsApi({
        type: activeType,
        status: statusFilter,
        page,
        limit: 25,
      });
      setItems(res.data?.items || []);
      setTotal(res.data?.total || 0);
      setSelectedKeys(new Set());
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load approval items.");
    } finally {
      setLoading(false);
    }
  }, [activeType, statusFilter, page]);

  useEffect(() => {
    loadCounts();
    loadItems();
  }, [loadCounts, loadItems]);

  // Bulk selection toggles
  const toggleSelect = (type, id) => {
    const key = `${type}:${id}`;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedKeys(next);
  };

  const isEligibleForBulk = (type) => ["teacher_leave", "concession", "expense"].includes(type);

  const toggleSelectAllEligible = () => {
    const eligible = items.filter((it) => isEligibleForBulk(it.type));
    if (selectedKeys.size === eligible.length && eligible.length > 0) {
      setSelectedKeys(new Set());
    } else {
      const next = new Set();
      eligible.forEach((it) => next.add(`${it.type}:${it.id}`));
      setSelectedKeys(next);
    }
  };

  // Execute Single Decision
  const handleSingleDecide = async () => {
    if (!activeItem || !decideAction) return;
    setIsProcessingSingle(true);
    try {
      await decideApprovalApi({
        type: activeItem.type,
        id: activeItem.id,
        decision: decideAction,
        remarks,
      });
      toast.success(`Request ${decideAction} successfully.`);
      setActiveItem(null);
      setDecideAction(null);
      setRemarks("");
      loadCounts();
      loadItems();
    } catch (err) {
      toast.error(err?.response?.data?.message || `Failed to ${decideAction} item.`);
    } finally {
      setIsProcessingSingle(false);
    }
  };

  // Execute Bulk Decision
  const handleBulkDecide = async () => {
    if (selectedKeys.size === 0 || !bulkAction) return;
    setIsProcessingBulk(true);

    const itemsToDecide = Array.from(selectedKeys).map((k) => {
      const [type, id] = k.split(":");
      return { type, id };
    });

    try {
      const res = await bulkDecideApprovalsApi({
        items: itemsToDecide,
        decision: bulkAction,
        remarks: bulkRemarks,
      });

      const results = res.data || [];
      const successes = results.filter((r) => r.success).length;
      const failures = results.filter((r) => !r.success).length;

      if (failures === 0) {
        toast.success(`Successfully ${bulkAction} all ${successes} items!`);
      } else {
        toast.success(`${successes} succeeded, ${failures} failed.`);
      }

      setBulkAction(null);
      setBulkRemarks("");
      setSelectedKeys(new Set());
      loadCounts();
      loadItems();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed bulk decision.");
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const eligibleItems = items.filter((it) => isEligibleForBulk(it.type));
  const isAllEligibleSelected =
    eligibleItems.length > 0 && selectedKeys.size === eligibleItems.length;

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 lg:p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-100 text-indigo-700">
              Unified Governance
            </span>
            <span className="text-xs text-slate-400">Phase 8A</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">Approval Center</h1>
          <p className="text-sm text-slate-500">Centralized sign-off for teacher leaves, concessions, refunds, expenses & payroll</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadCounts();
              loadItems();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white text-slate-700 border border-slate-200 text-sm font-semibold rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Filter Bars & Tabs ───────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Module Type Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TYPES.map((t) => {
            const count = counts[t.key] !== undefined ? counts[t.key] : counts.total || 0;
            const isActive = activeType === t.key;
            return (
              <button
                key={t.key}
                onClick={() => {
                  setActiveType(t.key);
                  setPage(1);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>{t.label}</span>
                {statusFilter === "pending" && count > 0 && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-white text-indigo-700" : "bg-indigo-100 text-indigo-700"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Status Toggle & Bulk Actions Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mr-1">Status:</span>
            <button
              onClick={() => {
                setStatusFilter("pending");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "pending"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Pending ({counts.total || 0})
            </button>
            <button
              onClick={() => {
                setStatusFilter("decided");
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === "decided"
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Decided History
            </button>
          </div>

          {/* Bulk Selection Bar (only when in pending status) */}
          {statusFilter === "pending" && (
            <div className="flex items-center gap-3">
              {eligibleItems.length > 0 && (
                <button
                  onClick={toggleSelectAllEligible}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600"
                >
                  {isAllEligibleSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                  Select Eligible ({eligibleItems.length})
                </button>
              )}

              {selectedKeys.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">
                    {selectedKeys.size} selected
                  </span>
                  <button
                    onClick={() => setBulkAction("rejected")}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg hover:bg-rose-100 transition-colors"
                  >
                    Reject Bulk
                  </button>
                  <button
                    onClick={() => setBulkAction("approved")}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-2xs"
                  >
                    Approve Bulk
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Items Table / Cards ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
            <p className="text-sm font-semibold text-slate-600">Fetching approvals...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-80" />
            <p className="text-base font-bold text-slate-700">No {statusFilter} approvals found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {statusFilter === "pending"
                ? "All caught up! All pending items for this category have been decided."
                : "No historical decisions recorded under this filter."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => {
              const sla = SLA_BADGE[item.slaLevel] || SLA_BADGE.ok;
              const key = `${item.type}:${item.id}`;
              const isSelected = selectedKeys.has(key);
              const canBulk = isEligibleForBulk(item.type);

              return (
                <div
                  key={key}
                  className={`p-4 md:p-5 flex items-start gap-3.5 hover:bg-slate-50/50 transition-colors ${
                    isSelected ? "bg-indigo-50/40" : ""
                  }`}
                >
                  {/* Bulk Select Checkbox */}
                  {statusFilter === "pending" && (
                    <div className="pt-1">
                      {canBulk ? (
                        <button
                          onClick={() => toggleSelect(item.type, item.id)}
                          className="text-slate-400 hover:text-indigo-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      ) : (
                        <span
                          title="Requires individual inspection"
                          className="w-5 h-5 rounded border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-bold"
                        >
                          1:1
                        </span>
                      )}
                    </div>
                  )}

                  {/* Main Item Content */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                          {item.type.replace("_", " ")}
                        </span>
                        {item.amount && (
                          <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                            {fmt(item.amount)}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${sla.bg}`}>
                          {item.ageDays}d old · {sla.label}
                        </span>
                      </div>

                      {/* Status Badge if decided */}
                      {statusFilter === "decided" && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                            item.status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm md:text-base font-bold text-slate-800">{item.title}</h4>
                    <p className="text-xs md:text-sm text-slate-600">{item.summary}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                      <span>Requested by: <strong className="text-slate-600">{item.requesterName}</strong> ({item.requesterRole})</span>
                      <span>Date: {new Date(item.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                      {item.decidedBy && <span>Decided by: <strong className="text-slate-600">{item.decidedBy}</strong></span>}
                    </div>

                    {item.remarks && (
                      <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-2">
                        <strong>Remarks:</strong> {item.remarks}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1 flex-shrink-0">
                    <button
                      onClick={() => setActiveItem(item)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>

                    {statusFilter === "pending" && (
                      <>
                        <button
                          onClick={() => {
                            setActiveItem(item);
                            setDecideAction("rejected");
                          }}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors title='Reject'"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setActiveItem(item);
                            setDecideAction("approved");
                          }}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors shadow-2xs flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Single Item Decision Modal ───────────────────────────────────── */}
      {activeItem && decideAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    decideAction === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {decideAction === "approved" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                </span>
                <h3 className="text-lg font-bold text-slate-800">
                  {decideAction === "approved" ? "Approve Request" : "Reject Request"}
                </h3>
              </div>
              <button onClick={() => setDecideAction(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
              <p className="font-bold text-slate-800">{activeItem.title}</p>
              <p className="text-slate-600">{activeItem.summary}</p>
              {activeItem.amount && <p className="font-bold text-emerald-700">Amount: {fmt(activeItem.amount)}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Remarks / Comments {decideAction === "rejected" ? "(Required for rejection)" : "(Optional)"}
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter remarks or justification..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDecideAction(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSingleDecide}
                disabled={isProcessingSingle || (decideAction === "rejected" && !remarks.trim())}
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl transition-all shadow-sm ${
                  decideAction === "approved"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                } disabled:opacity-50`}
              >
                {isProcessingSingle ? "Processing..." : `Confirm ${decideAction}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail View Drawer / Modal ────────────────────────────────────── */}
      {activeItem && !decideAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
                  {activeItem.type.replace("_", " ")}
                </span>
                <h3 className="text-base font-bold text-slate-800">{activeItem.title}</h3>
              </div>
              <button onClick={() => setActiveItem(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <p><strong>Summary:</strong> {activeItem.summary}</p>
                {activeItem.amount && <p><strong>Amount:</strong> {fmt(activeItem.amount)}</p>}
                <p><strong>Requester:</strong> {activeItem.requesterName} ({activeItem.requesterRole})</p>
                <p><strong>Created:</strong> {new Date(activeItem.createdAt).toLocaleString("en-IN")}</p>
                <p><strong>SLA Age:</strong> {activeItem.ageDays} day(s)</p>
              </div>

              {activeItem.rawDetails && (
                <div className="max-h-48 overflow-y-auto p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono">
                  <pre>{JSON.stringify(activeItem.rawDetails, null, 2)}</pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href={activeItem.deepLink}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Open in Source Module →
              </a>
              <button
                onClick={() => setActiveItem(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Decision Confirmation Modal ─────────────────────────────── */}
      {bulkAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">
                Bulk {bulkAction === "approved" ? "Approve" : "Reject"} ({selectedKeys.size} Items)
              </h3>
              <button onClick={() => setBulkAction(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              You are about to <strong>{bulkAction}</strong> {selectedKeys.size} selected request(s).
              Requesters will receive formal notifications.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Batch Remarks
              </label>
              <textarea
                value={bulkRemarks}
                onChange={(e) => setBulkRemarks(e.target.value)}
                placeholder="Optional batch remarks..."
                rows={2}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setBulkAction(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDecide}
                disabled={isProcessingBulk}
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-sm ${
                  bulkAction === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                } disabled:opacity-50`}
              >
                {isProcessingBulk ? "Executing..." : `Confirm ${bulkAction} (${selectedKeys.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
