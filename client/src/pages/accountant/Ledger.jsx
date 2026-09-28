import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  Calendar,
  Download,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Wallet,
  Building,
  Globe,
  Search,
  RefreshCw,
  Clock,
  Layers,
} from "lucide-react";
import {
  getDaybookApi,
  getCashbookApi,
  getLedgerEntriesApi,
} from "../../api/expenseApi";
import toast from "react-hot-toast";

const fmt = (paise) =>
  "₹" + ((paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const CATEGORY_NAMES = {
  fee_collection: "Fee Collection",
  refund: "Refund",
  expense: "Expense",
  payroll: "Payroll",
  reversal: "Reversal",
  other_income: "Other Income",
};

export default function Ledger() {
  const [tab, setTab] = useState("daybook"); // "daybook" | "cashbook" | "all"
  const [loading, setLoading] = useState(false);

  // ── 1. Daybook State ───────────────────────────────────────────────────────
  const [daybookDate, setDaybookDate] = useState(new Date().toISOString().split("T")[0]);
  const [daybookData, setDaybookData] = useState(null);

  const loadDaybook = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDaybookApi(daybookDate);
      setDaybookData(res.data);
    } catch {
      toast.error("Failed to load daybook.");
    } finally {
      setLoading(false);
    }
  }, [daybookDate]);

  // ── 2. Cashbook State ──────────────────────────────────────────────────────
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const todayStr = now.toISOString().split("T")[0];

  const [cashbookFrom, setCashbookFrom] = useState(firstOfMonth);
  const [cashbookTo, setCashbookTo] = useState(todayStr);
  const [cashbookData, setCashbookData] = useState(null);

  const loadCashbook = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCashbookApi({ from: cashbookFrom, to: cashbookTo });
      setCashbookData(res.data);
    } catch {
      toast.error("Failed to load cashbook.");
    } finally {
      setLoading(false);
    }
  }, [cashbookFrom, cashbookTo]);

  // ── 3. All Entries State ───────────────────────────────────────────────────
  const [allEntries, setAllEntries] = useState([]);
  const [allTotal, setAllTotal] = useState(0);
  const [allPage, setAllPage] = useState(1);
  const [filterAccount, setFilterAccount] = useState("");
  const [filterDirection, setFilterDirection] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  const loadAllEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: allPage,
        limit: 20,
      };
      if (filterAccount) params.account = filterAccount;
      if (filterDirection) params.direction = filterDirection;
      if (filterCategory) params.category = filterCategory;
      if (filterSearch) params.search = filterSearch;
      if (filterStart) params.startDate = filterStart;
      if (filterEnd) params.endDate = filterEnd;

      const res = await getLedgerEntriesApi(params);
      setAllEntries(res.data?.entries || []);
      setAllTotal(res.data?.pagination?.total || 0);
    } catch {
      toast.error("Failed to load ledger entries.");
    } finally {
      setLoading(false);
    }
  }, [allPage, filterAccount, filterDirection, filterCategory, filterSearch, filterStart, filterEnd]);

  useEffect(() => {
    if (tab === "daybook") loadDaybook();
    else if (tab === "cashbook") loadCashbook();
    else if (tab === "all") loadAllEntries();
  }, [tab, loadDaybook, loadCashbook, loadAllEntries]);

  // ── CSV Export Function ────────────────────────────────────────────────────
  const exportToCSV = () => {
    let rows = [];
    let filename = `ledger_${tab}_${new Date().toISOString().split("T")[0]}.csv`;

    if (tab === "daybook") {
      rows.push(["Time", "Account", "Category", "Direction", "Amount (Rs)", "Narration", "Created By"]);
      (daybookData?.entries || []).forEach((e) => {
        rows.push([
          new Date(e.date).toLocaleTimeString("en-IN"),
          e.account,
          e.category,
          e.direction.toUpperCase(),
          ((e.amount || 0) / 100).toFixed(2),
          `"${(e.narration || "").replace(/"/g, '""')}"`,
          e.createdBy?.name || "System",
        ]);
      });
    } else if (tab === "cashbook") {
      rows.push(["Date", "Particulars / Narration", "Category", "Debit / Out (Rs)", "Credit / In (Rs)", "Running Balance (Rs)"]);
      (cashbookData?.entries || []).forEach((e) => {
        rows.push([
          new Date(e.date).toLocaleDateString("en-IN"),
          `"${(e.narration || "").replace(/"/g, '""')}"`,
          e.category,
          e.direction === "out" ? ((e.amount || 0) / 100).toFixed(2) : "0.00",
          e.direction === "in" ? ((e.amount || 0) / 100).toFixed(2) : "0.00",
          ((e.runningBalance || 0) / 100).toFixed(2),
        ]);
      });
    } else {
      rows.push(["Date", "Account", "Category", "Direction", "Amount (Rs)", "Narration", "Created By"]);
      allEntries.forEach((e) => {
        rows.push([
          new Date(e.date).toLocaleDateString("en-IN"),
          e.account,
          e.category,
          e.direction.toUpperCase(),
          ((e.amount || 0) / 100).toFixed(2),
          `"${(e.narration || "").replace(/"/g, '""')}"`,
          e.createdBy?.name || "System",
        ]);
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((r) => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-rose-600" />
            General Ledger & Daybook
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable financial book of record. Real-time cashbook with running balance and daybook.
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-xl transition shadow-xs"
        >
          <Download className="w-4 h-4 text-slate-600" />
          Export CSV
        </button>
      </div>

      {/* ── Tabs Navigation ─────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-200 bg-white px-6 pt-3 rounded-t-2xl">
        <button
          onClick={() => setTab("daybook")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${
            tab === "daybook"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Daybook
        </button>
        <button
          onClick={() => setTab("cashbook")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${
            tab === "cashbook"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Cashbook (Running Balance)
        </button>
        <button
          onClick={() => setTab("all")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition ${
            tab === "all"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          All Entries
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 1: DAYBOOK
         ════════════════════════════════════════════════════════════════════════ */}
      {tab === "daybook" && (
        <div className="space-y-6">
          {/* Date Picker Bar */}
          <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-600">Select Date:</span>
              <input
                type="date"
                value={daybookDate}
                onChange={(e) => setDaybookDate(e.target.value)}
                className="px-3 py-1.5 text-sm font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            <button
              onClick={loadDaybook}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-rose-600" : ""}`} />
            </button>
          </div>

          {/* Account Breakdown Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Cash */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-600" /> Cash Account
                </span>
                <span className="text-xs font-semibold text-slate-400">Today</span>
              </div>
              <div className="text-xl font-bold text-slate-900 mt-2">
                Net: {fmt(daybookData?.accountTotals?.cash?.net)}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex justify-between">
                <span className="text-emerald-600">+In: {fmt(daybookData?.accountTotals?.cash?.in)}</span>
                <span className="text-rose-600">-Out: {fmt(daybookData?.accountTotals?.cash?.out)}</span>
              </div>
            </div>

            {/* Bank */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-blue-600" /> Bank Account
                </span>
                <span className="text-xs font-semibold text-slate-400">Today</span>
              </div>
              <div className="text-xl font-bold text-slate-900 mt-2">
                Net: {fmt(daybookData?.accountTotals?.bank?.net)}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex justify-between">
                <span className="text-emerald-600">+In: {fmt(daybookData?.accountTotals?.bank?.in)}</span>
                <span className="text-rose-600">-Out: {fmt(daybookData?.accountTotals?.bank?.out)}</span>
              </div>
            </div>

            {/* Online */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-600" /> Online / Gateway
                </span>
                <span className="text-xs font-semibold text-slate-400">Today</span>
              </div>
              <div className="text-xl font-bold text-slate-900 mt-2">
                Net: {fmt(daybookData?.accountTotals?.online?.net)}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex justify-between">
                <span className="text-emerald-600">+In: {fmt(daybookData?.accountTotals?.online?.in)}</span>
                <span className="text-rose-600">-Out: {fmt(daybookData?.accountTotals?.online?.out)}</span>
              </div>
            </div>

            {/* Total Net */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-xs font-bold uppercase tracking-wider">Grand Total Net</span>
                <span className="text-xs font-semibold text-slate-400">All Accounts</span>
              </div>
              <div
                className={`text-xl font-bold mt-2 ${
                  (daybookData?.grandTotals?.net || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {fmt(daybookData?.grandTotals?.net)}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex justify-between">
                <span className="text-emerald-600">+In: {fmt(daybookData?.grandTotals?.totalIn)}</span>
                <span className="text-rose-600">-Out: {fmt(daybookData?.grandTotals?.totalOut)}</span>
              </div>
            </div>
          </div>

          {/* Table of Entries */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-16">
                <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
              </div>
            ) : !daybookData?.entries?.length ? (
              <div className="p-12 text-center text-slate-500">
                No ledger entries posted on this date ({daybookDate}).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Account</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Narration</th>
                      <th className="py-3 px-4 text-center">Direction</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Posted By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {daybookData.entries.map((e) => (
                      <tr key={e._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {new Date(e.date).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold uppercase text-xs text-slate-800">
                          {e.account}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                            {CATEGORY_NAMES[e.category] || e.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-sm">
                          <div className="truncate font-medium text-slate-900">{e.narration}</div>
                          {e.reversalOf && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-100 border border-purple-300 px-1.5 py-0.5 rounded mt-0.5">
                              <RotateCcw className="w-3 h-3" /> Reversal
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {e.direction === "in" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              <ArrowDownLeft className="w-3.5 h-3.5" /> Inflow
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                              <ArrowUpRight className="w-3.5 h-3.5" /> Outflow
                            </span>
                          )}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-bold ${
                            e.direction === "in" ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {e.direction === "in" ? "+" : "-"}
                          {fmt(e.amount)}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {e.createdBy?.name || "System"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 2: CASHBOOK (RUNNING BALANCE)
         ════════════════════════════════════════════════════════════════════════ */}
      {tab === "cashbook" && (
        <div className="space-y-6">
          {/* Date Range Selector */}
          <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-600">Period:</span>
              <input
                type="date"
                value={cashbookFrom}
                onChange={(e) => setCashbookFrom(e.target.value)}
                className="px-3 py-1.5 text-sm font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={cashbookTo}
                onChange={(e) => setCashbookTo(e.target.value)}
                className="px-3 py-1.5 text-sm font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            <button
              onClick={loadCashbook}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-rose-600" : ""}`} />
            </button>
          </div>

          {/* Cashbook Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Opening Balance
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {fmt(cashbookData?.openingBalance)}
              </div>
              <div className="text-xs text-slate-400 mt-1">As of {cashbookFrom}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Cash Collected (+)
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-2">
                +{fmt(cashbookData?.periodIn)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Total cash credits</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Cash Paid Out (-)
              </div>
              <div className="text-2xl font-bold text-rose-600 mt-2">
                -{fmt(cashbookData?.periodOut)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Expenses & Refunds</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Closing Cash Balance
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {fmt(cashbookData?.closingBalance)}
              </div>
              <div className="text-xs text-slate-400 mt-1">Calculated running total</div>
            </div>
          </div>

          {/* Cashbook Table with Running Balance */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-16">
                <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
              </div>
            ) : !cashbookData?.entries?.length ? (
              <div className="p-12 text-center text-slate-500">
                No cash transactions in this period ({cashbookFrom} to {cashbookTo}).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Particulars / Narration</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Debit / Out (₹)</th>
                      <th className="py-3 px-4 text-right">Credit / In (₹)</th>
                      <th className="py-3 px-4 text-right font-bold text-slate-900 bg-slate-100/60">
                        Running Balance (₹)
                      </th>
                      <th className="py-3 px-4">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {cashbookData.entries.map((e) => (
                      <tr key={e._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {new Date(e.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div>{e.narration}</div>
                          {e.reversalOf && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-100 border border-purple-300 px-1.5 py-0.5 rounded mt-0.5">
                              <RotateCcw className="w-3 h-3" /> Reversal
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                            {CATEGORY_NAMES[e.category] || e.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-rose-600">
                          {e.direction === "out" ? fmt(e.amount) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                          {e.direction === "in" ? fmt(e.amount) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900 bg-slate-50/80">
                          {fmt(e.runningBalance)}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {e.createdByName || e.createdBy?.name || "System"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          TAB 3: ALL ENTRIES
         ════════════════════════════════════════════════════════════════════════ */}
      {tab === "all" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search narration..."
                value={filterSearch}
                onChange={(e) => {
                  setFilterSearch(e.target.value);
                  setAllPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <select
              value={filterAccount}
              onChange={(e) => {
                setFilterAccount(e.target.value);
                setAllPage(1);
              }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">All Accounts</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="online">Online</option>
            </select>

            <select
              value={filterDirection}
              onChange={(e) => {
                setFilterDirection(e.target.value);
                setAllPage(1);
              }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">All Directions</option>
              <option value="in">Inflow (+)</option>
              <option value="out">Outflow (-)</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setAllPage(1);
              }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">All Categories</option>
              <option value="fee_collection">Fee Collection</option>
              <option value="refund">Refund</option>
              <option value="expense">Expense</option>
              <option value="reversal">Reversal</option>
              <option value="payroll">Payroll</option>
              <option value="other_income">Other Income</option>
            </select>

            <input
              type="date"
              value={filterStart}
              onChange={(e) => {
                setFilterStart(e.target.value);
                setAllPage(1);
              }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              title="From date"
            />

            <input
              type="date"
              value={filterEnd}
              onChange={(e) => {
                setFilterEnd(e.target.value);
                setAllPage(1);
              }}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              title="To date"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-16">
                <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
              </div>
            ) : !allEntries.length ? (
              <div className="p-12 text-center text-slate-500">No ledger entries match criteria.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Account</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Narration</th>
                      <th className="py-3 px-4 text-center">Direction</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {allEntries.map((e) => (
                      <tr key={e._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {new Date(e.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold uppercase text-xs text-slate-800">
                          {e.account}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                            {CATEGORY_NAMES[e.category] || e.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-sm">
                          <div className="truncate font-medium text-slate-900">{e.narration}</div>
                          {e.reversalOf && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-100 border border-purple-300 px-1.5 py-0.5 rounded mt-0.5">
                              <RotateCcw className="w-3 h-3" /> Reversal
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {e.direction === "in" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              <ArrowDownLeft className="w-3.5 h-3.5" /> In
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                              <ArrowUpRight className="w-3.5 h-3.5" /> Out
                            </span>
                          )}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-bold ${
                            e.direction === "in" ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {e.direction === "in" ? "+" : "-"}
                          {fmt(e.amount)}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {e.createdBy?.name || "System"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
