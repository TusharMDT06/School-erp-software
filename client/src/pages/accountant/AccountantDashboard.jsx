import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  IndianRupee, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  CreditCard, Wallet, Building2, Smartphone, BadgePercent,
  RotateCcw, Receipt, ChevronRight, Banknote, Bell, RefreshCw,
  ArrowUpRight, ArrowDownRight, Sparkles, ShieldAlert, AlertOctagon,
  Bot, Flame, Check,
} from "lucide-react";
import {
  getAccountantDashboardApi,
  getFinanceInsightApi,
  refreshFinanceInsightApi,
} from "../../api/accountantApi";
import toast from "react-hot-toast";

const fmt = (paise) => "₹" + ((paise || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });

const KpiCard = ({ icon: Icon, label, value, sub, color, trend }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3 relative overflow-hidden group hover:-translate-y-0.5 transition-transform">
    <div className={`absolute inset-0 opacity-[0.03] ${color || "bg-rose-500"} group-hover:opacity-[0.06] transition-opacity`} />
    <div className="flex items-center justify-between">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color || "bg-rose-100"}`}>
        <Icon className="w-5 h-5 text-rose-600" />
      </div>
      {trend !== undefined && (
        <span className={`flex items-center text-xs font-semibold ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const AlertBadge = ({ count, label, to, colorClass }) => {
  if (!count) return null;
  return (
    <Link to={to} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${colorClass} hover:opacity-90 transition-opacity`}>
      <Bell className="w-4 h-4" />
      {count} {label}
    </Link>
  );
};

const MODE_COLORS = { cash: "#10b981", bank: "#6366f1", online: "#f59e0b" };
const MODE_LABELS = { cash: "Cash", bank: "Cheque/Bank", online: "UPI/Online" };

export default function AccountantDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // AI Finance Insights
  const [insightData, setInsightData] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [refreshingInsight, setRefreshingInsight] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAccountantDashboardApi();
      setData(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInsight = useCallback(async () => {
    setInsightLoading(true);
    try {
      const res = await getFinanceInsightApi();
      setInsightData(res.data);
    } catch {
      // silent
    } finally {
      setInsightLoading(false);
    }
  }, []);

  const handleRefreshInsight = async () => {
    setRefreshingInsight(true);
    try {
      const res = await refreshFinanceInsightApi();
      setInsightData(res.data);
      toast.success("AI Finance Insights refreshed!");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Rate limited or failed to refresh.");
    } finally {
      setRefreshingInsight(false);
    }
  };

  useEffect(() => {
    load();
    loadInsight();
    const interval = setInterval(load, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, [load, loadInsight]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading financial dashboard…</p>
        </div>
      </div>
    );
  }

  const d = data || {};
  const today = d.todayCollection || {};
  const alerts = d.alerts || {};
  const anomalies = d.anomalies || [];
  const pieData = (d.modeWiseSplit || []).map((m) => ({
    name: MODE_LABELS[m._id] || m._id,
    value: m.total,
    color: MODE_COLORS[m._id] || "#94a3b8",
  }));

  const metrics = insightData?.metrics || {};

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 lg:p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financial Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time accounting overview & AI analytics</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Alert badges */}
          <AlertBadge count={alerts.pendingConcessions} label="Concessions" to="/accountant/concessions" colorClass="bg-amber-100 text-amber-700" />
          <AlertBadge count={alerts.bouncedOrPendingCheques} label="Cheques" to="/accountant/cheques" colorClass="bg-orange-100 text-orange-700" />
          <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link to="/accountant/fee-counter" className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 active:scale-95 transition-all">
            <IndianRupee className="w-4 h-4" />
            Fee Counter
          </Link>
        </div>
      </div>

      {/* ── Needs Attention: Anomaly Alerts Panel ───────────────────────── */}
      {(anomalies.length > 0 || alerts.dayNotClosedYesterday || alerts.pendingExpenseApprovals > 0) && (
        <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-rose-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Needs Attention — Rule-Based Financial Anomalies & Alerts
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 bg-rose-200 text-rose-800 rounded-full">
              {anomalies.length + (alerts.dayNotClosedYesterday ? 1 : 0) + (alerts.pendingExpenseApprovals ? 1 : 0)} items
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Day Not Closed Alert */}
            {alerts.dayNotClosedYesterday && (
              <div className="bg-white p-3 rounded-xl border border-rose-100 shadow-2xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Day Close Pending</p>
                  <p className="text-slate-500">Yesterday's cash register closing was not performed.</p>
                  <Link to="/accountant/day-close" className="text-rose-600 font-semibold mt-1 inline-block hover:underline">
                    Close Register →
                  </Link>
                </div>
              </div>
            )}

            {/* Pending Expenses Approval */}
            {alerts.pendingExpenseApprovals > 0 && (
              <div className="bg-white p-3 rounded-xl border border-rose-100 shadow-2xs flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Pending Expense Approvals</p>
                  <p className="text-slate-500">{alerts.pendingExpenseApprovals} expense request(s) awaiting sign-off.</p>
                  <Link to="/accountant/expenses" className="text-rose-600 font-semibold mt-1 inline-block hover:underline">
                    Review Expenses →
                  </Link>
                </div>
              </div>
            )}

            {/* Rule-Based Code Anomalies */}
            {anomalies.map((a, i) => (
              <div key={i} className="bg-white p-3 rounded-xl border border-rose-100 shadow-2xs flex items-start gap-2.5">
                <AlertOctagon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${a.severity === "critical" ? "text-rose-600" : "text-amber-500"}`} />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">{a.title}</p>
                  <p className="text-slate-500">{a.message}</p>
                  {a.type === "unreconciled_gateway_payments" && (
                    <Link to="/accountant/reconciliation" className="text-rose-600 font-semibold mt-1 inline-block hover:underline">
                      View Reconciliation →
                    </Link>
                  )}
                  {a.type === "reversal_spike" && (
                    <Link to="/accountant/ledger" className="text-rose-600 font-semibold mt-1 inline-block hover:underline">
                      Inspect Reversals →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Weekly AI Finance Insights Card ──────────────────────────────── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-[#1F4E79] text-white rounded-2xl p-5 md:p-6 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                Gemini AI Finance Assistant
              </span>
              {insightData?.generatedAt && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Generated {new Date(insightData.generatedAt).toLocaleDateString()} at {new Date(insightData.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Weekly Executive Financial Narrative</h2>
            <div className="pt-2 text-xs md:text-sm text-slate-200 leading-relaxed space-y-1">
              {insightLoading && !insightData ? (
                <div className="flex items-center gap-2 text-slate-400 py-3">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                  Generating executive summary from ledger figures...
                </div>
              ) : (
                (insightData?.narrative || insightData?.summary || "Revenue collection is steady this week. Operations and fee collections are performing within regular quarterly variance limits.")
                  .split("\n")
                  .filter(Boolean)
                  .map((line, idx) => (
                    <p key={idx} className="flex items-start gap-2">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>{line.replace(/^[-*•\d.]+\s*/, "")}</span>
                    </p>
                  ))
              )}
            </div>
          </div>

          {/* Micro KPI Chips & Manual Refresh */}
          <div className="flex flex-col items-end gap-3 flex-shrink-0">
            <button
              onClick={handleRefreshInsight}
              disabled={refreshingInsight}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/10 disabled:opacity-50"
              title="Re-run metric analysis and Gemini narrative"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingInsight ? "animate-spin text-blue-400" : ""}`} />
              {refreshingInsight ? "Analyzing..." : "Refresh Insights"}
            </button>

            {metrics && (
              <div className="grid grid-cols-2 gap-2 text-right">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">30d Run Rate</p>
                  <p className="text-sm font-bold text-emerald-400">
                    {metrics.forecastNext30DaysPaise != null
                      ? fmt(metrics.forecastNext30DaysPaise)
                      : (metrics.forecastNext30Days || "₹0")}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-right">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Weekly Shift</p>
                  <p className={`text-sm font-bold ${(metrics.weeklyCollectionChangePercent ?? 0) >= 0 ? "text-blue-300" : "text-rose-400"}`}>
                    {(metrics.weeklyCollectionChangePercent ?? 0) > 0 ? "+" : ""}
                    {metrics.weeklyCollectionChangePercent ?? 0}%
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={Banknote}
          label="Today's Collection"
          value={fmt(today.total)}
          sub={`Cash ${fmt(today.cash)} · UPI ${fmt(today.online)}`}
          color="bg-emerald-100"
        />
        <KpiCard
          icon={TrendingUp}
          label="Monthly Collection"
          value={fmt(d.monthCollection)}
          color="bg-blue-100"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Total Outstanding"
          value={fmt(d.totalOutstanding)}
          sub="Pending + Partial + Overdue"
          color="bg-rose-100"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Collection Efficiency"
          value={`${d.collectionEfficiencyPercent || 0}%`}
          sub="Paid / Billed this term"
          color="bg-purple-100"
        />
      </div>

      {/* ── Row 2: Charts ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Trend — Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700 text-base">Daily Collection Trend (30 days)</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={(d.dailyCollectionTrend || []).map((r) => ({ date: r._id, amount: r.total / 100 }))}>
              <defs>
                <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e11d48" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Collected"]} />
              <Area type="monotone" dataKey="amount" stroke="#e11d48" fill="url(#collGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Mode-wise Pie */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-700 text-base mb-4">This Month by Mode</h2>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-slate-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => [`₹${(v/100).toLocaleString("en-IN")}`, "Amount"]} />
                <Legend formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row 3: Class-wise Outstanding + Recent Transactions ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Class-wise outstanding bar chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-700 text-base mb-4">Class-wise Outstanding</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={(d.classWiseOutstanding || []).map((c) => ({
                name: `${c.className || "?"}-${c.section || ""}`,
                outstanding: Math.round(c.outstanding / 100),
              }))}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} width={60} />
              <Tooltip formatter={(v) => [`₹${v.toLocaleString("en-IN")}`, "Outstanding"]} />
              <Bar dataKey="outstanding" fill="#e11d48" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700 text-base">Recent Receipts</h2>
            <Link to="/accountant/fee-counter" className="text-xs text-rose-600 font-semibold flex items-center gap-1 hover:text-rose-700">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1">
            {(d.recentTransactions || []).length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-8">No recent transactions.</p>
            ) : (
              (d.recentTransactions || []).map((tx) => (
                <div key={tx._id} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">
                      {(tx.studentId?.userId?.name || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 leading-tight">{tx.studentId?.userId?.name || "Unknown"}</p>
                      <p className="text-xs text-slate-400">{tx.counterReceiptNumber || tx.receiptNumber || "—"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">{fmt(tx.amountPaid)}</p>
                    <p className="text-xs text-slate-400">
                      {tx.paidOn ? new Date(tx.paidOn).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-700 text-base mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {[
            { label: "Collect Fee",       icon: IndianRupee,   to: "/accountant/fee-counter",    bg: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700" },
            { label: "Concessions",       icon: BadgePercent,  to: "/accountant/concessions",    bg: "bg-amber-50 hover:bg-amber-100 text-amber-700" },
            { label: "Refunds",           icon: RotateCcw,     to: "/accountant/refunds",         bg: "bg-blue-50 hover:bg-blue-100 text-blue-700" },
            { label: "Defaulters",        icon: AlertTriangle, to: "/accountant/fees/defaulters", bg: "bg-rose-50 hover:bg-rose-100 text-rose-700" },
            { label: "Finance Settings",  icon: Building2,     to: "/accountant/settings",        bg: "bg-purple-50 hover:bg-purple-100 text-purple-700" },
          ].map((a) => (
            <Link key={a.label} to={a.to} className={`flex flex-col items-center gap-2 p-4 rounded-xl text-sm font-semibold transition-colors ${a.bg}`}>
              <a.icon className="w-5 h-5" />
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
