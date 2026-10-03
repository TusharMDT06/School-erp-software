import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  Shield,
  Search,
  Calendar,
  User,
  Clock,
  RefreshCw,
  AlertCircle,
  Globe,
  Laptop,
  Smartphone,
  Tablet,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import { getAuditLogsApi } from "../../api/auditLogApi";

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "LOGIN", label: "LOGIN" },
  { value: "LOGOUT", label: "LOGOUT" },
  { value: "PASSWORD_RESET", label: "PASSWORD_RESET" },
  { value: "SIGNUP", label: "SIGNUP" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "SUCCESS", label: "SUCCESS" },
  { value: "FAILED", label: "FAILED" },
];

const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "admin", label: "Admin" },
  { value: "superadmin", label: "Super Admin" },
  { value: "principal", label: "Principal" },
  { value: "teacher", label: "Teacher" },
  { value: "student", label: "Student" },
  { value: "parent", label: "Parent" },
  { value: "accountant", label: "Accountant" },
];

/**
 * Formats date string to: "03 Oct 2026, 09:26:38 PM"
 */
const formatTimestamp = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  const formattedHours = hours ? String(hours).padStart(2, "0") : "12";

  return `${day} ${month} ${year}, ${formattedHours}:${minutes}:${seconds} ${ampm}`;
};

/**
 * Returns appropriate device icon based on device name or deviceType
 */
const getDeviceIcon = (deviceStr = "", deviceType = "") => {
  const str = deviceStr.toLowerCase();
  if (
    deviceType === "mobile" ||
    str.includes("android") ||
    str.includes("iphone") ||
    str.includes("mobile")
  ) {
    return <Smartphone className="w-4 h-4 text-slate-400 flex-shrink-0" />;
  }
  if (
    deviceType === "tablet" ||
    str.includes("ipad") ||
    str.includes("tablet")
  ) {
    return <Tablet className="w-4 h-4 text-slate-400 flex-shrink-0" />;
  }
  return <Laptop className="w-4 h-4 text-slate-400 flex-shrink-0" />;
};

const AuditLogs = () => {
  const { user } = useSelector((state) => state.auth);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    pages: 1,
  });
  const [stats, setStats] = useState({
    total: 0,
    todayCount: 0,
    failedCount: 0,
    successCount: 0,
  });

  // Filter States
  const [search, setSearch] = useState("");
  const [actionType, setActionType] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      try {
        const params = {
          page: targetPage,
          limit: 25,
          search: search.trim() || undefined,
          action: actionType || undefined,
          status: status || undefined,
          role: role || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        };

        const res = await getAuditLogsApi(params);
        if (res?.data) {
          setLogs(res.data.logs || []);
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
          if (res.data.stats) {
            setStats(res.data.stats);
          }
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load audit history");
      } finally {
        setLoading(false);
      }
    },
    [page, search, actionType, status, role, fromDate, toDate]
  );

  useEffect(() => {
    fetchLogs(page);
  }, [page, actionType, status, role, fromDate, toDate]);

  // Debounced search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setActionType("");
    setStatus("");
    setRole("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const hasActiveFilters =
    search || actionType || status || role || fromDate || toDate;

  return (
    <div className="space-y-6 pb-14 max-w-[1600px] mx-auto">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-200/70 shadow-sm flex-shrink-0">
            <Shield className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              User Logging & Audit History
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Security activity tracking and login audits. User sessions expire
              automatically after 1 hour.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* Session Expiry Badge matching mockup */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 shadow-sm">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Session: 1 Hour</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchLogs(page)}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-2 text-xs font-semibold shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                loading ? "animate-spin text-[#1F4E79]" : "text-slate-500"
              }`}
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Filter Card ───────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <form
          onSubmit={handleSearchSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* SEARCH */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              SEARCH
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search username, IP, name..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ACTION TYPE */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              ACTION TYPE
            </label>
            <select
              value={actionType}
              onChange={(e) => {
                setActionType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-slate-50/80 border border-slate-200 rounded-xl text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] transition-all cursor-pointer"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* FROM DATE */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              FROM DATE
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50/80 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* TO DATE */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              TO DATE
            </label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50/80 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] transition-all cursor-pointer"
              />
            </div>
          </div>
        </form>

        {/* Sub-row: Result count & Clear Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
            <span>
              Showing{" "}
              <strong className="text-slate-800 font-semibold">
                {logs.length}
              </strong>{" "}
              activity logs
              {pagination.total > 0 && (
                <span className="text-slate-400 font-normal">
                  {" "}
                  (of {pagination.total} total)
                </span>
              )}
            </span>

            {/* Quick Status Filters */}
            <div className="hidden sm:flex items-center gap-1.5 ml-4 pl-4 border-l border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setStatus("");
                  setPage(1);
                }}
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                  status === ""
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus("SUCCESS");
                  setPage(1);
                }}
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                  status === "SUCCESS"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                Success
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus("FAILED");
                  setPage(1);
                }}
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                  status === "FAILED"
                    ? "bg-rose-600 text-white"
                    : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                Failed
              </button>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold shadow-sm transition-all"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Activity Logs Table ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#1F4E79] animate-spin" />
            <p className="text-sm font-semibold text-slate-700">
              Loading audit logs...
            </p>
            <p className="text-xs text-slate-400">
              Retrieving live user access records and security events
            </p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center gap-2.5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              No activity logs found
            </p>
            <p className="text-xs text-slate-500 max-w-sm">
              No matching records found for the selected criteria. Try adjusting
              your search keywords or date range.
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="mt-2 px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-all"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-white text-[12px] font-semibold text-slate-600">
                  <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-3.5 px-4 font-semibold">User / Account</th>
                  <th className="py-3.5 px-4 font-semibold">Action</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">IP Address</th>
                  <th className="py-3.5 px-4 font-semibold">Device / Browser</th>
                  <th className="py-3.5 px-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => {
                  const isSuccess = log.status === "SUCCESS";
                  return (
                    <tr
                      key={log._id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Timestamp */}
                      <td className="py-4 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {formatTimestamp(log.createdAt)}
                      </td>

                      {/* User / Account */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 leading-tight">
                              {log.userName ||
                                log.userId?.name ||
                                (log.userId?.email
                                  ? log.userId.email.split("@")[0]
                                  : "admin")}
                            </div>
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-bold tracking-wider bg-slate-100 text-slate-600 uppercase border border-slate-200/60">
                              {log.userRole ||
                                log.userId?.role?.toUpperCase() ||
                                "ADMIN"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">
                          {log.action}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            SUCCESS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            FAILED
                          </span>
                        )}
                      </td>

                      {/* IP Address */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-slate-600">
                          <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{log.ip || "127.0.0.1"}</span>
                        </div>
                      </td>

                      {/* Device / Browser */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-slate-700 font-medium">
                          {getDeviceIcon(log.device, log.deviceType)}
                          <span>{log.device || "Windows"}</span>
                        </div>
                      </td>

                      {/* Details */}
                      <td className="py-4 px-4 text-slate-600 font-normal">
                        <div
                          className="max-w-xs md:max-w-md truncate"
                          title={log.details}
                        >
                          {log.details ||
                            (isSuccess
                              ? "User authenticated successfully"
                              : "Authentication failed")}
                        </div>
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
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing page{" "}
              <strong className="text-slate-800 font-semibold">
                {pagination.page}
              </strong>{" "}
              of{" "}
              <strong className="text-slate-800 font-semibold">
                {pagination.pages}
              </strong>{" "}
              ({pagination.total} total logs)
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-100 text-slate-700 transition-colors disabled:opacity-40 flex items-center gap-1 shadow-sm"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold hover:bg-slate-100 text-slate-700 transition-colors disabled:opacity-40 flex items-center gap-1 shadow-sm"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
