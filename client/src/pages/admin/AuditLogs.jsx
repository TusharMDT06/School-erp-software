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
  Camera,
  CameraOff,
  Eye,
  Image as ImageIcon,
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
  const [withPhotoOnly, setWithPhotoOnly] = useState(false);
  const [selectedPhotoLog, setSelectedPhotoLog] = useState(null);
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
          hasPhoto: withPhotoOnly ? "true" : undefined,
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
    [page, search, actionType, status, role, fromDate, toDate, withPhotoOnly]
  );

  useEffect(() => {
    fetchLogs(page);
  }, [page, actionType, status, role, fromDate, toDate, withPhotoOnly]);

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
    setWithPhotoOnly(false);
    setPage(1);
  };

  const hasActiveFilters =
    search || actionType || status || role || fromDate || toDate || withPhotoOnly;

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
              <button
                type="button"
                onClick={() => {
                  setWithPhotoOnly((prev) => !prev);
                  setPage(1);
                }}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                  withPhotoOnly
                    ? "bg-[#1F4E79] text-white shadow-xs"
                    : "bg-blue-50 text-[#1F4E79] hover:bg-blue-100 border border-blue-200/60"
                }`}
                title="Filter logs that have a login snapshot photo"
              >
                <Camera className="w-3 h-3" />
                <span>{withPhotoOnly ? "Showing With Photo" : "Photo Only"}</span>
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
                  <th className="py-3.5 px-4 font-semibold">Security Photo</th>
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
                        <div className="flex items-center gap-2.5">
                          {log.photo ? (
                            <div
                              onClick={() => setSelectedPhotoLog(log)}
                              className="relative cursor-pointer group"
                              title="Click to view full security snapshot"
                            >
                              <img
                                src={log.photo}
                                alt={log.userName}
                                className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/40 group-hover:ring-emerald-500 transition-all shadow-xs"
                              />
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                          )}
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

                      {/* Security Photo */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {log.photo ? (
                          <div className="flex items-center gap-2">
                            <div
                              onClick={() => setSelectedPhotoLog(log)}
                              className="relative group cursor-pointer"
                              title="Click to view security photo"
                            >
                              <img
                                src={log.photo}
                                alt="Security Snapshot"
                                className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/30 shadow-xs group-hover:scale-105 group-hover:ring-emerald-500 transition-all"
                              />
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full flex items-center justify-center ring-2 ring-white text-[8px] font-bold">
                                ✓
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedPhotoLog(log)}
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 shadow-2xs"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Snapshot</span>
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                            <CameraOff className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                            No photo
                          </span>
                        )}
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

      {/* ── Security Photo Verification Modal ─────────────────────── */}
      {selectedPhotoLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn"
          onClick={() => setSelectedPhotoLog(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 leading-tight">
                    Login Security Snapshot
                  </h3>
                  <p className="text-xs text-slate-500">
                    Biometric / webcam photo recorded upon portal authentication
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhotoLog(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Photo Display Card */}
            <div className="p-6 space-y-4">
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center min-h-[240px] max-h-[350px]">
                <img
                  src={selectedPhotoLog.photo}
                  alt="Login security snapshot"
                  className="w-full max-h-[350px] object-contain"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-emerald-400 text-[11px] font-bold flex items-center gap-1.5 border border-emerald-500/40 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  VERIFIED PORTAL SNAPSHOT
                </div>
                <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md text-white text-[11px] font-mono">
                  {formatTimestamp(selectedPhotoLog.createdAt)}
                </div>
              </div>

              {/* Metadata Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    USER / ACCOUNT
                  </span>
                  <p className="font-bold text-slate-800 text-sm truncate">
                    {selectedPhotoLog.userName}
                  </p>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                    {selectedPhotoLog.userRole}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    ACTION & STATUS
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <span>{selectedPhotoLog.action}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedPhotoLog.status === "SUCCESS"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {selectedPhotoLog.status}
                    </span>
                  </div>
                  <p
                    className="text-[11px] text-slate-500 mt-1 truncate"
                    title={selectedPhotoLog.details}
                  >
                    {selectedPhotoLog.details}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    IP ADDRESS
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-slate-800 font-semibold">
                    <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{selectedPhotoLog.ip || "127.0.0.1"}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    DEVICE & BROWSER
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                    {getDeviceIcon(
                      selectedPhotoLog.device,
                      selectedPhotoLog.deviceType
                    )}
                    <span className="truncate">
                      {selectedPhotoLog.device || "Windows"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono truncate max-w-[240px]">
                Audit ID: {selectedPhotoLog._id}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPhotoLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-sm transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
