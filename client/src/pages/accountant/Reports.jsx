import { useState, useEffect } from "react";
import {
  FileText,
  Calendar,
  Download,
  Printer,
  BarChart3,
  Table as TableIcon,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Clock,
  PieChart as PieChartIcon,
  Users,
  DollarSign,
  Layers,
  Percent,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  getCollectionReportApi,
  exportCollectionReportApi,
  getOutstandingReportApi,
  exportOutstandingReportApi,
  getConcessionsReportApi,
  exportConcessionsReportApi,
  getExpensesReportApi,
  exportExpensesReportApi,
  getProfitLossReportApi,
  exportProfitLossReportApi,
  getBudgetVsActualReportApi,
  exportBudgetVsActualReportApi,
  getCollectionEfficiencyReportApi,
  exportCollectionEfficiencyReportApi,
  downloadExcel,
} from "../../api/reportApi";

const COLORS = ["#1F4E79", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#EC4899", "#84CC16"];

const REPORTS = [
  {
    id: "collection",
    title: "Fee Collection",
    desc: "Grouped by day, class, fee head, mode, collector",
    icon: DollarSign,
    color: "from-blue-600 to-indigo-700",
  },
  {
    id: "outstanding",
    title: "Outstanding & Aging",
    desc: "Buckets 0-30, 31-60, 61-90, 90+ days",
    icon: Clock,
    color: "from-amber-500 to-rose-600",
  },
  {
    id: "concessions",
    title: "Concessions & Waivers",
    desc: "Discounts by category, class & approver",
    icon: Percent,
    color: "from-purple-600 to-pink-600",
  },
  {
    id: "expenses",
    title: "Expenses & Vendors",
    desc: "By category, vendor, month & top 5 vendors",
    icon: Layers,
    color: "from-emerald-600 to-teal-700",
  },
  {
    id: "profit-loss",
    title: "Profit & Loss (Ledger)",
    desc: "Strictly from LedgerEntry single source of truth",
    icon: TrendingUp,
    color: "from-slate-700 to-slate-900",
  },
  {
    id: "budget-vs-actual",
    title: "Budget vs Actual",
    desc: "Allocations, spent & variance analysis",
    icon: PieChartIcon,
    color: "from-cyan-600 to-blue-600",
  },
  {
    id: "collection-efficiency",
    title: "Collection Efficiency",
    desc: "Billed vs collected per class and month",
    icon: BarChart3,
    color: "from-violet-600 to-purple-800",
  },
];

const Reports = () => {
  const [activeReport, setActiveReport] = useState("collection");
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'chart'
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [groupBy, setGroupBy] = useState("day");

  // Report Data
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [activeReport, from, to, groupBy]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let res;
      const params = { from, to };

      if (activeReport === "collection") {
        res = await getCollectionReportApi({ ...params, groupBy });
      } else if (activeReport === "outstanding") {
        res = await getOutstandingReportApi(params);
      } else if (activeReport === "concessions") {
        res = await getConcessionsReportApi(params);
      } else if (activeReport === "expenses") {
        res = await getExpensesReportApi(params);
      } else if (activeReport === "profit-loss") {
        res = await getProfitLossReportApi(params);
      } else if (activeReport === "budget-vs-actual") {
        res = await getBudgetVsActualReportApi(params);
      } else if (activeReport === "collection-efficiency") {
        res = await getCollectionEfficiencyReportApi(params);
      }

      setReportData(res?.data || null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      let blob;
      const params = { from, to };
      const filename = `${activeReport}-report-${from}-to-${to}`;

      if (activeReport === "collection") {
        blob = await exportCollectionReportApi({ ...params, groupBy });
      } else if (activeReport === "outstanding") {
        blob = await exportOutstandingReportApi(params);
      } else if (activeReport === "concessions") {
        blob = await exportConcessionsReportApi(params);
      } else if (activeReport === "expenses") {
        blob = await exportExpensesReportApi(params);
      } else if (activeReport === "profit-loss") {
        blob = await exportProfitLossReportApi(params);
      } else if (activeReport === "budget-vs-actual") {
        blob = await exportBudgetVsActualReportApi(params);
      } else if (activeReport === "collection-efficiency") {
        blob = await exportCollectionEfficiencyReportApi(params);
      }

      if (blob) {
        downloadExcel(blob, filename);
        toast.success("Excel report exported successfully");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to export Excel");
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 print:p-0 print:m-0">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <div className="p-2 bg-[#1F4E79]/10 rounded-xl text-[#1F4E79]">
              <FileText className="w-6 h-6" />
            </div>
            Financial Reports & Analytics
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Server-side aggregated reports, 5-minute Redis caching, and real-time Excel exports.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-2 text-sm font-semibold shadow-sm shadow-emerald-600/20 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Exporting..." : "Export Excel"}
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-[#1F4E79] hover:bg-[#183E61] text-white transition-colors flex items-center gap-2 text-sm font-semibold shadow-sm shadow-[#1F4E79]/20"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      {/* ── Report Cards Selector ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 print:hidden">
        {REPORTS.map((r) => {
          const isSelected = activeReport === r.id;
          const Icon = r.icon;
          return (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              className={`p-3 rounded-2xl text-left border transition-all relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? "bg-white border-[#1F4E79] shadow-md ring-2 ring-[#1F4E79]/20"
                  : "bg-white/80 border-slate-200/80 hover:border-slate-300 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${r.color} text-white flex items-center justify-center shadow-sm`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {isSelected && (
                  <span className="w-2 h-2 rounded-full bg-[#1F4E79]" />
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 line-clamp-1">{r.title}</p>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{r.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Common Filter Bar ──────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Date Range:</span>
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

          {/* GroupBy filter for Collection report */}
          {activeReport === "collection" && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <span>Group By:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="bg-transparent text-slate-800 font-medium outline-none cursor-pointer"
              >
                <option value="day">Day</option>
                <option value="class">Class</option>
                <option value="feeHead">Fee Head</option>
                <option value="paymentMode">Payment Mode</option>
                <option value="collector">Collector</option>
              </select>
            </div>
          )}
        </div>

        {/* View Switcher: Table vs Chart */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === "table"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            Table View
          </button>
          <button
            onClick={() => setViewMode("chart")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === "chart"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Chart View
          </button>
        </div>
      </div>

      {/* ── Print Header (Only visible on print) ───────────────────── */}
      <div className="hidden print:block mb-6 border-b pb-4">
        <h1 className="text-xl font-bold">
          School ERP — {REPORTS.find((r) => r.id === activeReport)?.title}
        </h1>
        <p className="text-sm text-slate-600">
          Period: {from} to {to} | Generated on: {new Date().toLocaleString()}
        </p>
      </div>

      {/* ── Report Content Area ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#1F4E79] animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Aggregating financial report data...</p>
          </div>
        ) : !reportData ? (
          <div className="p-16 flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-8 h-8 text-amber-500" />
            <p className="text-sm font-semibold text-slate-700">No data available for this range</p>
            <p className="text-xs text-slate-400">Try adjusting your date range or filters</p>
          </div>
        ) : (
          <div>
            {/* Dynamic Report Content Render */}
            {activeReport === "collection" && (
              <CollectionReportView
                data={reportData}
                viewMode={viewMode}
                groupBy={groupBy}
              />
            )}
            {activeReport === "outstanding" && (
              <OutstandingReportView data={reportData} viewMode={viewMode} />
            )}
            {activeReport === "concessions" && (
              <ConcessionsReportView data={reportData} viewMode={viewMode} />
            )}
            {activeReport === "expenses" && (
              <ExpensesReportView data={reportData} viewMode={viewMode} />
            )}
            {activeReport === "profit-loss" && (
              <ProfitLossReportView data={reportData} viewMode={viewMode} />
            )}
            {activeReport === "budget-vs-actual" && (
              <BudgetVsActualReportView data={reportData} viewMode={viewMode} />
            )}
            {activeReport === "collection-efficiency" && (
              <CollectionEfficiencyReportView
                data={reportData}
                viewMode={viewMode}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. COLLECTION REPORT VIEW
// ─────────────────────────────────────────────────────────────────────────────
const CollectionReportView = ({ data, viewMode, groupBy }) => {
  const rows = data?.rows || [];
  const totalAmount = data?.totalAmount || 0;
  const totalCount = data?.totalCount || 0;

  const chartData = rows.map((r) => ({
    name: r._id || "Unknown",
    Amount: r.amountRupees || 0,
    Count: r.count || 0,
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Total Collection</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">₹{data?.totalRupees?.toLocaleString() || 0}</p>
        </div>
        <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Transactions Count</p>
          <p className="text-2xl font-bold text-indigo-900 mt-1">{totalCount.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Grouping Criterion</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1 capitalize">{groupBy}</p>
        </div>
      </div>

      {viewMode === "chart" ? (
        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#64748b" textAnchor="end" height={60} />
              <YAxis stroke="#64748b" />
              <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} />
              <Legend />
              <Bar dataKey="Amount" fill="#1F4E79" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-y border-slate-200/80 text-xs uppercase text-slate-500 font-semibold">
              <tr>
                <th className="py-3 px-4">Group ({groupBy})</th>
                <th className="py-3 px-4 text-right">Transactions</th>
                <th className="py-3 px-4 text-right">Total Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-800">{r._id || "—"}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{r.count}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    ₹{r.amountRupees?.toLocaleString() || 0}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
              <tr>
                <td className="py-3 px-4 text-slate-800">Total</td>
                <td className="py-3 px-4 text-right text-slate-800">{totalCount}</td>
                <td className="py-3 px-4 text-right text-[#1F4E79]">₹{data?.totalRupees?.toLocaleString() || 0}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. OUTSTANDING & AGING REPORT VIEW
// ─────────────────────────────────────────────────────────────────────────────
const OutstandingReportView = ({ data, viewMode }) => {
  const buckets = data?.agingBuckets || {};
  const classWise = data?.classWise || [];
  const studentWise = data?.studentWise || [];

  const pieData = [
    { name: "0-30 Days", value: buckets["0-30"]?.amountRupees || 0 },
    { name: "31-60 Days", value: buckets["31-60"]?.amountRupees || 0 },
    { name: "61-90 Days", value: buckets["61-90"]?.amountRupees || 0 },
    { name: "90+ Days", value: buckets["90+"]?.amountRupees || 0 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* 4 Aging Buckets Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "0-30 Days", count: buckets["0-30"]?.count || 0, amount: buckets["0-30"]?.amountRupees || 0, color: "text-emerald-600", bg: "bg-emerald-50/60" },
          { label: "31-60 Days", count: buckets["31-60"]?.count || 0, amount: buckets["31-60"]?.amountRupees || 0, color: "text-blue-600", bg: "bg-blue-50/60" },
          { label: "61-90 Days", count: buckets["61-90"]?.count || 0, amount: buckets["61-90"]?.amountRupees || 0, color: "text-amber-600", bg: "bg-amber-50/60" },
          { label: "90+ Days", count: buckets["90+"]?.count || 0, amount: buckets["90+"]?.amountRupees || 0, color: "text-rose-600", bg: "bg-rose-50/60" },
        ].map((b, i) => (
          <div key={i} className={`p-4 rounded-xl border border-slate-200/80 ${b.bg}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase">{b.label}</p>
            <p className={`text-xl font-bold mt-1 ${b.color}`}>₹{b.amount.toLocaleString()}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{b.count} Dues records</p>
          </div>
        ))}
      </div>

      {viewMode === "chart" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-80 pt-4">
          <div>
            <p className="text-xs font-bold text-slate-600 text-center mb-2">Aging Distribution</p>
            <ResponsiveContainer width="100%" height="90%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 text-center mb-2">Class-wise Outstanding</p>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={classWise}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="className" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip formatter={(val) => `₹${Number(val).toLocaleString()}`} />
                <Bar dataKey="amountRupees" fill="#EF4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">Class-wise Outstanding</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b">
                  <tr>
                    <th className="py-2.5 px-4">Class</th>
                    <th className="py-2.5 px-4 text-right">Students with Dues</th>
                    <th className="py-2.5 px-4 text-right">Outstanding (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classWise.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-4 font-semibold text-slate-800">{c.className}</td>
                      <td className="py-2.5 px-4 text-right text-slate-600">{c.count}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-rose-600">₹{c.amountRupees?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-2">Top Student Dues</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-80">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4">Class</th>
                    <th className="py-2.5 px-4">Aging Days</th>
                    <th className="py-2.5 px-4 text-right">Pending Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentWise.slice(0, 50).map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/60">
                      <td className="py-2 px-4 font-medium text-slate-800">{s.studentName}</td>
                      <td className="py-2 px-4 text-slate-600">{s.className}</td>
                      <td className="py-2 px-4 text-slate-600">{s.agingDays} days</td>
                      <td className="py-2 px-4 text-right font-bold text-rose-600">₹{s.amountRupees?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONCESSIONS REPORT VIEW
// ─────────────────────────────────────────────────────────────────────────────
const ConcessionsReportView = ({ data, viewMode }) => {
  const byType = data?.byType || [];
  const byClass = data?.byClass || [];
  const byApprover = data?.byApprover || [];
  const totalDiscountRupees = data?.totalDiscountRupees || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="p-4 rounded-xl bg-purple-50/60 border border-purple-100 max-w-sm">
        <p className="text-xs font-semibold text-purple-600 uppercase">Total Concession Given</p>
        <p className="text-2xl font-bold text-purple-900 mt-1">₹{totalDiscountRupees.toLocaleString()}</p>
        <p className="text-[11px] text-purple-500 mt-0.5">{data?.totalCount || 0} Total Concessions Approved</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* By Category */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 border-b font-bold text-xs uppercase text-slate-600">By Type / Category</div>
          <table className="w-full text-left text-sm divide-y divide-slate-100">
            <tbody>
              {byType.map((t, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-medium text-slate-800 capitalize">{t._id || "General"}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-purple-700">₹{t.amountRupees?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* By Class */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 border-b font-bold text-xs uppercase text-slate-600">By Class</div>
          <table className="w-full text-left text-sm divide-y divide-slate-100">
            <tbody>
              {byClass.map((c, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-medium text-slate-800">{c._id || "Unassigned"}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-purple-700">₹{c.amountRupees?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* By Approver */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 border-b font-bold text-xs uppercase text-slate-600">By Approver</div>
          <table className="w-full text-left text-sm divide-y divide-slate-100">
            <tbody>
              {byApprover.map((a, i) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-4 font-medium text-slate-800">{a._id || "Admin"}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-purple-700">₹{a.amountRupees?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. EXPENSES & VENDORS REPORT VIEW
// ─────────────────────────────────────────────────────────────────────────────
const ExpensesReportView = ({ data, viewMode }) => {
  const byCategory = data?.byCategory || [];
  const byMonth = data?.byMonth || [];
  const topVendors = data?.top5Vendors || [];
  const totalRupees = data?.totalRupees || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-100 max-w-sm">
        <p className="text-xs font-semibold text-teal-600 uppercase">Total Expenses</p>
        <p className="text-2xl font-bold text-teal-900 mt-1">₹{totalRupees.toLocaleString()}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-2">Category-wise Breakdown</h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm divide-y divide-slate-100">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">Bills</th>
                  <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map((c, i) => (
                  <tr key={i}>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{c.categoryName}</td>
                    <td className="py-2.5 px-4 text-right text-slate-500">{c.count}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">₹{c.amountRupees?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-2">Top 5 Vendors by Spend</h3>
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm divide-y divide-slate-100">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Vendor</th>
                  <th className="py-2.5 px-4 text-right">Bills</th>
                  <th className="py-2.5 px-4 text-right">Total Paid (₹)</th>
                </tr>
              </thead>
              <tbody>
                {topVendors.map((v, i) => (
                  <tr key={i}>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{v.vendorName}</td>
                    <td className="py-2.5 px-4 text-right text-slate-500">{v.count}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-teal-800">₹{v.amountRupees?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. PROFIT & LOSS REPORT VIEW (LedgerEntry Source)
// ─────────────────────────────────────────────────────────────────────────────
const ProfitLossReportView = ({ data, viewMode }) => {
  const months = data?.months || [];
  const totals = data?.academicYearTotal || {};

  return (
    <div className="p-6 space-y-6">
      {/* P&L Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
          <p className="text-xs font-semibold text-emerald-600 uppercase">Total Income</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">₹{totals.incomeRupees?.toLocaleString() || 0}</p>
        </div>
        <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-100">
          <p className="text-xs font-semibold text-rose-600 uppercase">Operational Expenses</p>
          <p className="text-2xl font-bold text-rose-900 mt-1">₹{totals.expensesRupees?.toLocaleString() || 0}</p>
        </div>
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100">
          <p className="text-xs font-semibold text-amber-600 uppercase">Payroll Disbursed</p>
          <p className="text-2xl font-bold text-amber-900 mt-1">₹{totals.payrollRupees?.toLocaleString() || 0}</p>
        </div>
        <div className={`p-4 rounded-xl border ${totals.netRupees >= 0 ? "bg-blue-50/60 border-blue-100" : "bg-red-50/60 border-red-200"}`}>
          <p className="text-xs font-semibold text-slate-500 uppercase">Net Surplus / (Deficit)</p>
          <p className={`text-2xl font-bold mt-1 ${totals.netRupees >= 0 ? "text-blue-900" : "text-red-700"}`}>
            ₹{totals.netRupees?.toLocaleString() || 0}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b">
            <tr>
              <th className="py-3 px-4">Month</th>
              <th className="py-3 px-4 text-right">Fee & Other Income (₹)</th>
              <th className="py-3 px-4 text-right">Expenses (₹)</th>
              <th className="py-3 px-4 text-right">Payroll (₹)</th>
              <th className="py-3 px-4 text-right">Net Profit / (Loss) (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {months.map((m, i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-bold text-slate-800">{m.month}</td>
                <td className="py-3 px-4 text-right text-emerald-600 font-semibold">₹{m.incomeRupees?.toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-rose-600">₹{m.expensesRupees?.toLocaleString()}</td>
                <td className="py-3 px-4 text-right text-amber-600">₹{m.payrollRupees?.toLocaleString()}</td>
                <td className={`py-3 px-4 text-right font-bold ${m.netRupees >= 0 ? "text-blue-700" : "text-red-600"}`}>
                  ₹{m.netRupees?.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-bold border-t">
            <tr>
              <td className="py-3 px-4 text-slate-800">Academic Year Total</td>
              <td className="py-3 px-4 text-right text-emerald-700">₹{totals.incomeRupees?.toLocaleString()}</td>
              <td className="py-3 px-4 text-right text-rose-700">₹{totals.expensesRupees?.toLocaleString()}</td>
              <td className="py-3 px-4 text-right text-amber-700">₹{totals.payrollRupees?.toLocaleString()}</td>
              <td className={`py-3 px-4 text-right ${totals.netRupees >= 0 ? "text-blue-800" : "text-red-700"}`}>
                ₹{totals.netRupees?.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-slate-400 italic">
        * Aggregated strictly from the immutable LedgerEntry collection so figures are guaranteed to match the ledger book.
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. BUDGET VS ACTUAL REPORT VIEW
// ─────────────────────────────────────────────────────────────────────────────
const BudgetVsActualReportView = ({ data, viewMode }) => {
  const items = data?.items || [];
  const totals = data?.totals || {};

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
          <p className="text-xs font-semibold text-blue-600 uppercase">Total Allocated</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">₹{totals.allocatedRupees?.toLocaleString() || 0}</p>
        </div>
        <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-100">
          <p className="text-xs font-semibold text-rose-600 uppercase">Total Spent</p>
          <p className="text-2xl font-bold text-rose-900 mt-1">₹{totals.spentRupees?.toLocaleString() || 0}</p>
        </div>
        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
          <p className="text-xs font-semibold text-emerald-600 uppercase">Remaining Buffer</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">₹{totals.remainingRupees?.toLocaleString() || 0}</p>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b">
            <tr>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 text-right">Allocated (₹)</th>
              <th className="py-3 px-4 text-right">Spent (₹)</th>
              <th className="py-3 px-4 text-right">Remaining (₹)</th>
              <th className="py-3 px-4 text-right">Utilization %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((b, i) => (
              <tr key={i} className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-semibold text-slate-800">{b.categoryName}</td>
                <td className="py-3 px-4 text-right text-slate-600">₹{b.allocatedRupees?.toLocaleString()}</td>
                <td className="py-3 px-4 text-right font-medium text-rose-600">₹{b.spentRupees?.toLocaleString()}</td>
                <td className="py-3 px-4 text-right font-medium text-emerald-600">₹{b.remainingRupees?.toLocaleString()}</td>
                <td className="py-3 px-4 text-right font-bold text-slate-900">{b.variancePercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. COLLECTION EFFICIENCY REPORT VIEW
// ─────────────────────────────────────────────────────────────────────────────
const CollectionEfficiencyReportView = ({ data, viewMode }) => {
  const overall = data?.overall || {};
  const byClass = data?.byClass || [];
  const byMonth = data?.byMonth || [];

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase">Total Billed</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">₹{overall.totalBilledRupees?.toLocaleString() || 0}</p>
        </div>
        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
          <p className="text-xs font-semibold text-emerald-600 uppercase">Total Collected</p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">₹{overall.totalCollectedRupees?.toLocaleString() || 0}</p>
        </div>
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100">
          <p className="text-xs font-semibold text-blue-600 uppercase">Overall Efficiency</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{overall.efficiency || 0}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-2">Efficiency by Class</h3>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm divide-y divide-slate-100">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Class</th>
                  <th className="py-2.5 px-4 text-right">Billed (₹)</th>
                  <th className="py-2.5 px-4 text-right">Collected (₹)</th>
                  <th className="py-2.5 px-4 text-right">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {byClass.map((c, i) => (
                  <tr key={i}>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{c.className}</td>
                    <td className="py-2.5 px-4 text-right text-slate-600">₹{c.billedRupees?.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right font-medium text-emerald-600">₹{c.collectedRupees?.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-blue-700">{c.efficiency}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-2">Efficiency by Month</h3>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm divide-y divide-slate-100">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Month</th>
                  <th className="py-2.5 px-4 text-right">Billed (₹)</th>
                  <th className="py-2.5 px-4 text-right">Collected (₹)</th>
                  <th className="py-2.5 px-4 text-right">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {byMonth.map((m, i) => (
                  <tr key={i}>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{m.month}</td>
                    <td className="py-2.5 px-4 text-right text-slate-600">₹{m.billedRupees?.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right font-medium text-emerald-600">₹{m.collectedRupees?.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-blue-700">{m.efficiency}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
