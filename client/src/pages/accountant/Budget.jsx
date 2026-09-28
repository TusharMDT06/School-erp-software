import { useState, useEffect, useCallback } from "react";
import {
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  DollarSign,
  Plus,
  Edit3,
  RefreshCw,
  X,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  getBudgetVsActualApi,
  setBudgetApi,
  getCategoriesApi,
} from "../../api/expenseApi";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

const fmt = (paise) =>
  "₹" + ((paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const fmtRupees = (paise) => Math.round((paise || 0) / 100);

export default function BudgetPage() {
  const { user } = useSelector((s) => s.auth);
  const canEditBudget = ["admin", "superadmin", "principal"].includes(user?.role);

  const currentYear = new Date().getFullYear();
  const [academicYear, setAcademicYear] = useState(`${currentYear}-${currentYear + 1}`);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set Budget Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [editAllocations, setEditAllocations] = useState({});
  const [saving, setSaving] = useState(false);

  const loadBudget = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBudgetVsActualApi(academicYear);
      setData(res.data);
    } catch {
      toast.error("Failed to load budget analysis.");
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    loadBudget();
  }, [loadBudget]);

  const handleOpenSetBudget = async () => {
    try {
      const catRes = await getCategoriesApi({ isActive: true });
      const cats = catRes.data || [];
      setCategories(cats);

      // Pre-fill existing allocated amounts
      const initial = {};
      if (data?.categories) {
        data.categories.forEach((c) => {
          initial[c.categoryId] = fmtRupees(c.allocatedAmount);
        });
      }
      setEditAllocations(initial);
      setModalOpen(true);
    } catch {
      toast.error("Failed to load categories.");
    }
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const items = Object.entries(editAllocations).map(([categoryId, rupees]) => ({
        categoryId,
        allocatedAmount: Math.round(Number(rupees || 0) * 100), // convert to paise
      }));

      await setBudgetApi({
        academicYear,
        items,
      });

      toast.success("Budget allocations saved successfully.");
      setModalOpen(false);
      loadBudget();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save budget.");
    } finally {
      setSaving(false);
    }
  };

  // Prepare chart data
  const chartData = (data?.categories || []).map((c) => ({
    name: c.categoryName.length > 12 ? c.categoryName.slice(0, 11) + "…" : c.categoryName,
    fullName: c.categoryName,
    Allocated: fmtRupees(c.allocatedAmount),
    Spent: fmtRupees(c.spentAmount),
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <PieIcon className="w-7 h-7 text-rose-600" />
            Budget vs Actual Spending
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor academic year category allocations, actual expenditure, and threshold warnings.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Academic Year Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-500" />
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
            >
              <option value={`${currentYear - 1}-${currentYear}`}>{`${currentYear - 1}-${currentYear}`}</option>
              <option value={`${currentYear}-${currentYear + 1}`}>{`${currentYear}-${currentYear + 1}`}</option>
              <option value={`${currentYear + 1}-${currentYear + 2}`}>{`${currentYear + 1}-${currentYear + 2}`}</option>
            </select>
          </div>

          {canEditBudget && (
            <button
              onClick={handleOpenSetBudget}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm rounded-xl shadow-md transition-all active:scale-95"
            >
              <Edit3 className="w-4 h-4" />
              Set Budget
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-24 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
        </div>
      ) : !data ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          No budget data available for {academicYear}.
        </div>
      ) : (
        <>
          {/* ── KPI Summary Cards ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Budget Allocated
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {fmt(data.totals?.totalAllocated)}
              </div>
              <div className="text-xs text-slate-400 mt-1">For academic session {academicYear}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Spent So Far
              </div>
              <div className="text-2xl font-bold text-rose-600 mt-2">
                {fmt(data.totals?.totalSpent)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Paid operational expenses</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Remaining Funds
              </div>
              <div
                className={`text-2xl font-bold mt-2 ${
                  (data.totals?.totalRemaining || 0) < 0 ? "text-rose-700" : "text-emerald-600"
                }`}
              >
                {fmt(data.totals?.totalRemaining)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {(data.totals?.totalRemaining || 0) < 0 ? "Over budget overall" : "Available balance"}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Overall Utilization
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                <span>{data.totals?.overallPercentUsed}%</span>
                {data.totals?.overallFlag === "over_budget" && (
                  <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                {data.totals?.overallFlag === "warning" && (
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                )}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${
                    data.totals?.overallPercentUsed > 100
                      ? "bg-rose-500"
                      : data.totals?.overallPercentUsed >= 75
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, data.totals?.overallPercentUsed || 0)}%` }}
                />
              </div>
            </div>
          </div>

          {/* ── Chart: Budget vs Actual ──────────────────────────────────────── */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-rose-600" />
              Category Budget vs Actual Expenditure (₹)
            </h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip
                    formatter={(val, name) => [`₹${Number(val).toLocaleString("en-IN")}`, name]}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Allocated" fill="#cbd5e1" radius={[6, 6, 0, 0]} name="Allocated Budget" />
                  <Bar dataKey="Spent" fill="#e11d48" radius={[6, 6, 0, 0]} name="Actual Spent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Detailed Category Table with Progress Bars ───────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Category Breakdown & Variance</h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> &lt; 75% Normal
                </span>
                <span className="flex items-center gap-1.5 text-amber-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 75% - 100% Near Limit
                </span>
                <span className="flex items-center gap-1.5 text-rose-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> &gt; 100% Over Budget
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4 text-right">Allocated (Budget)</th>
                    <th className="py-3.5 px-4 text-right">Spent (Actual)</th>
                    <th className="py-3.5 px-4 text-right">Remaining</th>
                    <th className="py-3.5 px-4 w-48 text-center">% Used</th>
                    <th className="py-3.5 px-4 text-center">Status Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {data.categories?.map((cat) => {
                    // Color rule: green < 75%, amber 75-100%, red > 100%
                    const barColor =
                      cat.percentUsed > 100
                        ? "bg-rose-500"
                        : cat.percentUsed >= 75
                        ? "bg-amber-500"
                        : "bg-emerald-500";

                    return (
                      <tr key={cat.categoryId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {cat.categoryName}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                          {fmt(cat.allocatedAmount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          {fmt(cat.spentAmount)}
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-semibold ${
                            cat.remainingAmount < 0 ? "text-rose-600" : "text-emerald-700"
                          }`}
                        >
                          {fmt(cat.remainingAmount)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold">
                              <span>{cat.percentUsed}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all ${barColor}`}
                                style={{ width: `${Math.min(100, cat.percentUsed)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {cat.flag === "over_budget" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              <AlertOctagon className="w-3.5 h-3.5" />
                              Over Budget (&gt;100%)
                            </span>
                          )}
                          {cat.flag === "warning" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Warning (90%+)
                            </span>
                          )}
                          {cat.flag === "normal" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              On Track
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Set Budget Modal ─────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <PieIcon className="w-6 h-6 text-rose-600" />
                Set Budget Allocations ({academicYear})
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Enter target budget amount in Rupees (₹) for each operational expense category.
            </p>

            <form onSubmit={handleSaveBudget} className="flex-1 overflow-y-auto space-y-3 pr-1">
              {categories.map((c) => (
                <div
                  key={c._id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50"
                >
                  <label className="text-sm font-semibold text-slate-800 flex-1">{c.name}</label>
                  <div className="relative w-44">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={editAllocations[c._id] ?? ""}
                      onChange={(e) =>
                        setEditAllocations({ ...editAllocations, [c._id]: e.target.value })
                      }
                      className="w-full pl-7 pr-3 py-1.5 text-sm font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>
              ))}

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium shadow-md transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
