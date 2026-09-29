import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Users, UserCheck, Calendar, Bell, CheckCircle2,
  Clock, IndianRupee, GraduationCap, ChevronRight,
  TrendingUp, RefreshCw, AlertCircle, FileText, Check, X,
  HeartHandshake, ShieldAlert, BarChart3, Sparkles, Sun,
} from "lucide-react";
import { getPrincipalDashboardApi } from "../../api/principalApi";
import { getApprovalsApi, decideApprovalApi } from "../../api/approvalApi";
import { getMorningBriefApi, refreshMorningBriefApi } from "../../api/morningBriefApi";
import toast from "react-hot-toast";

const fmt = (paise) => "₹" + ((paise || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const SLA_BADGE = {
  ok: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "<2d SLA" },
  warn: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "2-4d SLA" },
  breach: { bg: "bg-rose-50 text-rose-700 border-rose-200", label: "5d+ Breach" },
};

const EVENT_TYPE_STYLES = {
  holiday: "bg-rose-100 text-rose-700 border-rose-200",
  vacation: "bg-orange-100 text-orange-700 border-orange-200",
  exam: "bg-purple-100 text-purple-700 border-purple-200",
  ptm: "bg-blue-100 text-blue-700 border-blue-200",
  event: "bg-indigo-100 text-indigo-700 border-indigo-200",
  half_day: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function PrincipalDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [decidingId, setDecidingId] = useState(null);
  const [morningBrief, setMorningBrief] = useState(null);
  const [refreshingBrief, setRefreshingBrief] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resDash, resAppr, resBrief] = await Promise.allSettled([
        getPrincipalDashboardApi(),
        getApprovalsApi({ status: "pending", limit: 5 }),
        getMorningBriefApi(),
      ]);
      if (resDash.status === "fulfilled") setData(resDash.value.data);
      if (resAppr.status === "fulfilled") setPendingApprovals(resAppr.value.data?.items || []);
      if (resBrief.status === "fulfilled") setMorningBrief(resBrief.value.data?.data || null);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load principal dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefreshBrief = async () => {
    setRefreshingBrief(true);
    try {
      const res = await refreshMorningBriefApi();
      setMorningBrief(res.data?.data);
      toast.success("AI Morning Brief refreshed!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Please wait before refreshing again.");
    } finally {
      setRefreshingBrief(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  const handleQuickDecide = async (item, decision) => {
    setDecidingId(item.id);
    try {
      await decideApprovalApi({
        type: item.type,
        id: item.id,
        decision,
        remarks: `Quick ${decision} from Principal Dashboard`,
      });
      toast.success(`Request ${decision} successfully.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to decide request.");
    } finally {
      setDecidingId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading executive dashboard…</p>
        </div>
      </div>
    );
  }

  const d = data || {};
  const enrollment = d.enrollment || {};
  const approvals = d.approvals || {};
  const counts = approvals.countsByType || {};
  const finance = d.finance || {};
  const exam = d.latestExam || null;
  const upcoming = d.upcomingEvents || [];
  const trendData = d.attendanceTrend30d || [];
  const classFillData = (enrollment.byClass || []).map((c) => ({
    name: `${c.className}-${c.section}`,
    enrolled: c.count,
    capacity: c.capacity,
    fillPercent: c.fillPercent || 0,
  }));

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 lg:p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-100 text-indigo-700">
              Executive View
            </span>
            <span className="text-xs text-slate-400">Principal Portal</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">Principal Dashboard</h1>
          <p className="text-sm text-slate-500">Institutional overview, academic metrics & pending decisions</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white text-slate-700 border border-slate-200 text-sm font-semibold rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            Refresh
          </button>
          <Link
            to="/principal/admissions"
            className="flex items-center gap-2 px-3.5 py-2 bg-white text-slate-700 border border-slate-200 text-sm font-semibold rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
          >
            <Users className="w-4 h-4 text-blue-600" />
            Admissions
          </Link>
          <Link
            to="/principal/reports"
            className="flex items-center gap-2 px-3.5 py-2 bg-white text-slate-700 border border-slate-200 text-sm font-semibold rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
          >
            <FileText className="w-4 h-4 text-purple-600" />
            MIS Reports
          </Link>
          <Link
            to="/principal/academics"
            className="flex items-center gap-2 px-3.5 py-2 bg-white text-slate-700 border border-slate-200 text-sm font-semibold rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            Academics
          </Link>
          <Link
            to="/principal/approvals"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approval Center ({counts.total || 0})
          </Link>
          <Link
            to="/principal/calendar"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-900 active:scale-95 transition-all shadow-sm"
          >
            <Calendar className="w-4 h-4" />
            Calendar
          </Link>
        </div>
      </div>

      {/* ── AI Morning Executive Brief ───────────────────────────────────── */}
      {morningBrief && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-indigo-700/50 space-y-3 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between flex-wrap gap-2 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-300/30">
                <Sun className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                  AI Morning Executive Brief
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                    Working Day Brief
                  </span>
                </h3>
                <p className="text-[11px] text-indigo-200/80">
                  Synthesized at 7:30 AM from attendance, staff leaves, ledger financials, and pending actions
                </p>
              </div>
            </div>

            <button
              onClick={handleRefreshBrief}
              disabled={refreshingBrief}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 active:scale-95 text-indigo-100 text-xs font-semibold rounded-xl border border-white/15 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingBrief ? "animate-spin text-amber-300" : ""}`} />
              Refresh Brief
            </button>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 text-xs text-indigo-100 leading-relaxed space-y-1.5 font-normal whitespace-pre-line relative z-10">
            {morningBrief.brief}
          </div>
        </div>
      )}

      {/* ── KPI Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-4">
        {/* Total Students */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs p-4 flex flex-col gap-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-400">
              {enrollment.byClass?.length || 0} Classes
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{enrollment.total || 0}</p>
            <p className="text-xs font-medium text-slate-500">Total Enrolled</p>
          </div>
        </div>

        {/* Student Attendance Today */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs p-4 flex flex-col gap-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-emerald-600">
              Today
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{d.studentAttendanceToday || 0}%</p>
            <p className="text-xs font-medium text-slate-500">Student Attendance</p>
          </div>
        </div>

        {/* Teachers on Leave */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs p-4 flex flex-col gap-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-amber-600">Active Leave</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{d.teachersOnLeaveToday || 0}</p>
            <p className="text-xs font-medium text-slate-500">Teachers on Leave</p>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs p-4 flex flex-col gap-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            {approvals.oldestAgeDays > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${approvals.oldestAgeDays >= 5 ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                Oldest {approvals.oldestAgeDays}d
              </span>
            )}
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{counts.total || 0}</p>
            <p className="text-xs font-medium text-slate-500">Approvals Pending</p>
          </div>
        </div>

        {/* Month Collection */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs p-4 flex flex-col gap-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-indigo-600">
              {finance.collectionEfficiency || 0}% Eff.
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{fmt(finance.monthCollection)}</p>
            <p className="text-xs font-medium text-slate-500">Month Collection</p>
          </div>
        </div>

        {/* Early Warning At-Risk Students */}
        <Link
          to="/principal/welfare"
          className="bg-white rounded-2xl border border-slate-100 hover:border-rose-300 shadow-2xs p-4 flex flex-col gap-2 relative overflow-hidden group transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 group-hover:scale-105 transition-transform flex items-center justify-center">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
              High Risk
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{d.atRiskCount || 0}</p>
            <p className="text-xs font-medium text-slate-500">At-Risk Welfare</p>
          </div>
        </Link>

        {/* Open Discipline Incidents */}
        <Link
          to="/principal/incidents"
          className="bg-white rounded-2xl border border-slate-100 hover:border-amber-300 shadow-2xs p-4 flex flex-col gap-2 relative overflow-hidden group transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
              Active
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{d.openIncidents || 0}</p>
            <p className="text-xs font-medium text-slate-500">Open Incidents</p>
          </div>
        </Link>
      </div>

      {/* ── Main Dashboard Layout ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Charts & Trends */}
        <div className="lg:col-span-2 space-y-6">
          {/* 30-Day Attendance Trend */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">30-Day Student Attendance Trend</h3>
                <p className="text-xs text-slate-400">Institutional daily attendance percentage</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                Last 30 Days
              </span>
            </div>
            <div className="h-64">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis domain={[0, 100]} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" />
                    <Tooltip
                      formatter={(val) => [`${val}%`, "Attendance"]}
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                    />
                    <Area type="monotone" dataKey="percent" stroke="#4f46e5" strokeWidth={2.5} fill="url(#attendanceGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No attendance records logged in the last 30 days.
                </div>
              )}
            </div>
          </div>

          {/* Class Enrollment & Capacity Fill */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Class Enrollment & Capacity Fill</h3>
                <p className="text-xs text-slate-400">Student count per class section</p>
              </div>
            </div>
            <div className="h-64">
              {classFillData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classFillData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip
                      formatter={(val, name, item) => [
                        `${val} Students (${item.payload.fillPercent ? `${item.payload.fillPercent}% full` : "No limit"})`,
                        "Enrolled",
                      ]}
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                    />
                    <Bar dataKey="enrolled" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  No class data available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): "Needs Decision" + Upcoming Events */}
        <div className="space-y-6">
          {/* Needs Decision Panel */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Needs Your Decision</h3>
                <p className="text-xs text-slate-400">Oldest pending items across school</p>
              </div>
              <Link to="/principal/approvals" className="text-xs font-semibold text-indigo-600 hover:underline">
                View All ({counts.total || 0}) →
              </Link>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50/60 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-slate-700">All caught up!</p>
                <p className="text-xs text-slate-400 mt-0.5">No pending approvals requiring sign-off.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.map((item) => {
                  const sla = SLA_BADGE[item.slaLevel] || SLA_BADGE.ok;
                  const isDeciding = decidingId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-white hover:shadow-2xs transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.title}</p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.summary}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border flex-shrink-0 ${sla.bg}`}>
                          {item.ageDays}d old
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                        <span className="text-slate-400 font-medium">By {item.requesterName}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleQuickDecide(item, "rejected")}
                            disabled={isDeciding}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors title='Reject'"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleQuickDecide(item, "approved")}
                            disabled={isDeciding}
                            className="px-2.5 py-1 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Approve
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Events & Holidays (next 7 days) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Upcoming Events (7 Days)</h3>
                <p className="text-xs text-slate-400">Scheduled holidays, exams & meetings</p>
              </div>
              <Link to="/principal/calendar" className="text-xs font-semibold text-indigo-600 hover:underline">
                Calendar →
              </Link>
            </div>

            {upcoming.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No events scheduled in the next 7 days.</p>
            ) : (
              <div className="space-y-2.5">
                {upcoming.map((ev, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-100 bg-slate-50/30">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex flex-col items-center justify-center font-bold text-xs flex-shrink-0">
                      <span>{new Date(ev.startDate).getDate()}</span>
                      <span className="text-[9px] uppercase font-semibold text-indigo-500">
                        {new Date(ev.startDate).toLocaleString("default", { month: "short" })}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{ev.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${EVENT_TYPE_STYLES[ev.type] || "bg-slate-100 text-slate-600"}`}>
                          {ev.type.toUpperCase()}
                        </span>
                        <span className="text-[11px] text-slate-400">{ev.audience}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Module Glances */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Exam Glance */}
            <Link
              to="/principal/academics"
              className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-2xs space-y-1 hover:border-indigo-200 transition-colors block"
            >
              <div className="flex items-center gap-2 text-indigo-600">
                <GraduationCap className="w-4 h-4" />
                <span className="text-xs font-bold text-slate-700">Academics</span>
              </div>
              <p className="text-sm font-bold text-slate-800 truncate">{exam?.name || "View Exams"}</p>
              <p className="text-[11px] text-slate-500">Pass Rate: <strong className="text-emerald-600">{exam?.passPercent || 0}%</strong></p>
            </Link>

            {/* Circulars Glance */}
            <Link
              to="/principal/circulars"
              className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-2xs space-y-1 hover:border-indigo-200 transition-colors block"
            >
              <div className="flex items-center gap-2 text-blue-600">
                <FileText className="w-4 h-4" />
                <span className="text-xs font-bold text-slate-700">Circulars</span>
              </div>
              <p className="text-sm font-bold text-slate-800">{d.circularsPendingAck || 0} Pending</p>
              <p className="text-[11px] text-indigo-600 font-medium">Notices & Ack →</p>
            </Link>

            {/* Staff Overview Glance */}
            <Link
              to="/principal/staff"
              className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-2xs space-y-1 hover:border-indigo-200 transition-colors block"
            >
              <div className="flex items-center gap-2 text-teal-600">
                <UserCheck className="w-4 h-4" />
                <span className="text-xs font-bold text-slate-700">Staff & Subs</span>
              </div>
              <p className="text-sm font-bold text-slate-800">{d.teachersOnLeaveToday || 0} on Leave</p>
              <p className="text-[11px] text-teal-600 font-medium">Cover & Timetable →</p>
            </Link>

            {/* Incident Glance */}
            <Link
              to="/principal/incidents"
              className="p-3.5 bg-white rounded-2xl border border-slate-100 shadow-2xs space-y-1 hover:border-amber-200 transition-colors block"
            >
              <div className="flex items-center gap-2 text-amber-600">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-xs font-bold text-slate-700">Incidents</span>
              </div>
              <p className="text-sm font-bold text-slate-800">{d.openIncidents || 0} Active</p>
              <p className="text-[11px] text-amber-600 font-medium">Discipline Log →</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
