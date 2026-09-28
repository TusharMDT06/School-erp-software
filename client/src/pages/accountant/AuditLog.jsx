import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  History,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Calendar,
  User,
  Shield,
  Clock,
  Layers,
  RefreshCw,
  AlertCircle,
  FileCode,
} from "lucide-react";
import toast from "react-hot-toast";
import { getAuditLogsApi, getMyAuditLogsApi } from "../../api/auditLogApi";

const MODULES = [
  { value: "", label: "All Modules" },
  { value: "fee_counter", label: "Fee Counter" },
  { value: "payment_link", label: "Payment Links" },
  { value: "expense", label: "Expenses" },
  { value: "vendor", label: "Vendors" },
  { value: "budget", label: "Budget" },
  { value: "concession", label: "Concessions" },
  { value: "refund", label: "Refunds" },
  { value: "cash_closing", label: "Cash Closing" },
  { value: "payroll", label: "Payroll" },
  { value: "salary_structure", label: "Salary Structures" },
  { value: "reconciliation", label: "Reconciliation" },
  { value: "finance_settings", label: "Finance Settings" },
];

const AuditLog = ({ isMineOnly = false }) => {
  const { user } = useSelector((state) => state.auth);
  const isAdminOrPrincipal = ["admin", "superadmin", "principal"].includes(user?.role);
  const isMine = isMineOnly || !isAdminOrPrincipal;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Filters
  const [selectedModule, setSelectedModule] = useState("");
  const [actionSearch, setActionSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 20 });

  useEffect(() => {
    fetchLogs();
  }, [page, selectedModule, from, to, isMine]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        module: selectedModule || undefined,
        action: actionSearch || undefined,
        from: from || undefined,
        to: to || undefined,
      };

      const res = isMine
        ? await getMyAuditLogsApi(params)
        : await getAuditLogsApi(params);

      setLogs(res?.data?.logs || []);
      setPagination(res?.data?.pagination || { total: 0, pages: 1, limit: 20 });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const parseJsonSafe = (str) => {
    if (!str) return null;
    try {
      return typeof str === "string" ? JSON.parse(str) : str;
    } catch {
      return str;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
              <History className="w-6 h-6" />
            </div>
            {isMine ? "My Activity Log" : "System Audit Trail"}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isMine
              ? "Chronological history of all financial mutations, fee collections, and receipts performed by your account."
              : "Institutional audit log of all financial mutations, approvals, reversals, and configurations across the school."}
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-semibold shadow-sm self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#1F4E79]" : ""}`} />
          Refresh
        </button>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Module Selector */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Layers className="w-4 h-4 text-slate-400" />
            <span>Module:</span>
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-slate-800 font-medium outline-none cursor-pointer"
            >
              {MODULES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Range:</span>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-slate-700 outline-none font-medium cursor-pointer"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-slate-700 outline-none font-medium cursor-pointer"
            />
          </div>
        </div>

        {/* Action text search */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            fetchLogs();
          }}
          className="relative min-w-[240px]"
        >
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search action name (e.g. fee_collected)..."
            value={actionSearch}
            onChange={(e) => setActionSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79]"
          />
        </form>
      </div>

      {/* ── Audit Logs Table with Expandable Rows ─────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#1F4E79] animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading audit history...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-8 h-8 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">No audit records found</p>
            <p className="text-xs text-slate-400">Try adjusting your filters or search keywords</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="w-8 py-3 pl-4 pr-1"></th>
                  <th className="py-3 px-3">Timestamp</th>
                  {!isMine && <th className="py-3 px-3">Actor</th>}
                  <th className="py-3 px-3">Module</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Target ID</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isExpanded = expandedId === log._id;
                  const oldParsed = parseJsonSafe(log.oldValue);
                  const newParsed = parseJsonSafe(log.newValue);

                  return (
                    <tr key={log._id} className="group">
                      <td colSpan={7} className="p-0">
                        {/* Summary Row */}
                        <div
                          onClick={() => toggleExpand(log._id)}
                          className={`flex items-center px-4 py-3 cursor-pointer hover:bg-slate-50/80 transition-colors ${
                            isExpanded ? "bg-slate-50" : ""
                          }`}
                        >
                          <div className="w-6 flex-shrink-0 text-slate-400">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[#1F4E79]" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>

                          <div className="w-40 flex-shrink-0 text-xs text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(log.createdAt).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </div>

                          {!isMine && (
                            <div className="w-44 flex-shrink-0 text-xs text-slate-800 font-medium truncate pr-2">
                              {log.userId?.name || "System Actor"}
                              <span className="block text-[10px] text-slate-400 font-normal capitalize">
                                {log.userId?.role || "System"}
                              </span>
                            </div>
                          )}

                          <div className="w-36 flex-shrink-0">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 capitalize">
                              {log.module?.replace(/_/g, " ") || "General"}
                            </span>
                          </div>

                          <div className="flex-1 font-mono text-xs font-bold text-slate-800">
                            {log.action}
                          </div>

                          <div className="w-32 flex-shrink-0 font-mono text-[11px] text-slate-400 truncate">
                            {log.targetId || "—"}
                          </div>

                          <div className="w-24 flex-shrink-0 text-right text-xs font-semibold text-[#1F4E79]">
                            {isExpanded ? "Hide diff" : "View diff"}
                          </div>
                        </div>

                        {/* Expandable Details Row */}
                        {isExpanded && (
                          <div className="px-8 py-4 bg-slate-50/60 border-t border-b border-slate-200/80 space-y-3">
                            <div className="flex items-center gap-6 text-xs text-slate-500">
                              <div>
                                <span className="font-semibold text-slate-700">Audit ID:</span>{" "}
                                <span className="font-mono text-slate-600">{log._id}</span>
                              </div>
                              {log.ip && (
                                <div>
                                  <span className="font-semibold text-slate-700">Client IP:</span>{" "}
                                  <span className="font-mono text-slate-600">{log.ip}</span>
                                </div>
                              )}
                              {log.targetId && (
                                <div>
                                  <span className="font-semibold text-slate-700">Target Entity ID:</span>{" "}
                                  <span className="font-mono text-slate-600">{log.targetId}</span>
                                </div>
                              )}
                            </div>

                            {/* Side by side JSON Diff */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                              {/* Before / Old Value */}
                              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                                  <FileCode className="w-3.5 h-3.5" />
                                  Previous State (Old Value)
                                </p>
                                {oldParsed ? (
                                  <pre className="text-[11px] font-mono bg-slate-50 p-2.5 rounded-lg text-slate-700 overflow-x-auto max-h-56 leading-relaxed">
                                    {typeof oldParsed === "object"
                                      ? JSON.stringify(oldParsed, null, 2)
                                      : String(oldParsed)}
                                  </pre>
                                ) : (
                                  <p className="text-xs text-slate-400 italic py-2">
                                    No prior state recorded (New entity creation)
                                  </p>
                                )}
                              </div>

                              {/* After / New Value */}
                              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                                  <FileCode className="w-3.5 h-3.5" />
                                  Mutated State (New Value)
                                </p>
                                {newParsed ? (
                                  <pre className="text-[11px] font-mono bg-slate-50 p-2.5 rounded-lg text-slate-700 overflow-x-auto max-h-56 leading-relaxed">
                                    {typeof newParsed === "object"
                                      ? JSON.stringify(newParsed, null, 2)
                                      : String(newParsed)}
                                  </pre>
                                ) : (
                                  <p className="text-xs text-slate-400 italic py-2">
                                    No state changes captured
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination Footer ────────────────────────────────────── */}
        {pagination.pages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing page <span className="font-bold text-slate-700">{pagination.page}</span> of{" "}
              <span className="font-bold text-slate-700">{pagination.pages}</span> (
              {pagination.total} total logs)
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
