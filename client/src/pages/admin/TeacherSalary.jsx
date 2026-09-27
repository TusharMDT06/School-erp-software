import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { getTeacherSalaryApi } from "../../api/teacherAttendanceApi";
import {
  DollarSign,
  TrendingDown,
  Users,
  Download,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const fmt = (n) =>
  n !== undefined && n !== null
    ? "₹" + Number(n).toLocaleString("en-IN")
    : "—";

const TeacherSalaryPage = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [data, setData]   = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getTeacherSalaryApi({ month, year });
      const salaryList = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : [];
      setData(salaryList);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load salary data.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const totals = (Array.isArray(data) ? data : []).reduce(
    (acc, d) => ({
      base:       acc.base       + (d.baseSalary      || 0),
      deductions: acc.deductions + (d.totalDeduction  || 0),
      net:        acc.net        + (d.netSalary        || 0),
    }),
    { base: 0, deductions: 0, net: 0 }
  );

  const handleExport = () => {
    if (!Array.isArray(data) || !data.length) return toast.error("No data to export.");
    const rows = [
      ["Emp. ID", "Name", "Email", "Base Salary", "Days", "Present", "Absent", "Late", "Leave", "Absent Deduction", "Leave Deduction", "Late Deduction", "Total Deduction", "Net Salary"],
      ...data.map((d) => [
        d.employeeId, d.name, d.email, d.baseSalary, d.daysInMonth,
        d.present, d.absent, d.late, d.leave,
        d.absentDeduction, d.leaveDeduction, d.lateDeduction,
        d.totalDeduction, d.netSalary,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `teacher-salary-${MONTHS[month - 1]}-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#1F4E79]" />
            Teacher Salary
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Monthly salary with automatic deductions for absences and leaves.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month picker */}
          <div className="relative">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="appearance-none border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 bg-white"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          {/* Year picker */}
          <div className="relative">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="appearance-none border border-slate-200 rounded-xl pl-3 pr-8 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 bg-white"
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <button onClick={load} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#1F4E79] to-[#2563a8] rounded-2xl p-5 text-white">
          <p className="text-white/70 text-xs uppercase tracking-wider font-medium">Total Base Salary</p>
          <p className="text-2xl font-bold mt-1">{fmt(totals.base)}</p>
          <p className="text-white/60 text-xs mt-1">{data.length} teacher(s) · {MONTHS[month - 1]} {year}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white">
          <p className="text-white/80 text-xs uppercase tracking-wider font-medium">Total Deductions</p>
          <p className="text-2xl font-bold mt-1">{fmt(totals.deductions)}</p>
          <p className="text-white/60 text-xs mt-1">Absent + Leave + Late</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white">
          <p className="text-white/80 text-xs uppercase tracking-wider font-medium">Net Payable</p>
          <p className="text-2xl font-bold mt-1">{fmt(totals.net)}</p>
          <p className="text-white/60 text-xs mt-1">After all deductions</p>
        </div>
      </div>

      {/* Deduction Formula Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-700 leading-relaxed">
          <strong>Salary Deduction Formula:</strong> Base Salary ₹25,000 per month (default, editable per teacher).
          <span className="mx-1">·</span>
          <strong>Absent/Leave:</strong> 1 day deduction = Base ÷ Days in Month.
          <span className="mx-1">·</span>
          <strong>Late:</strong> ½ day deduction.
          <span className="mx-1">·</span>
          Deductions are based on marked Teacher Attendance only.
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#1F4E79] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Users className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">No salary data found for {MONTHS[month - 1]} {year}.</p>
          <p className="text-xs mt-1 text-slate-400">Mark teacher attendance first to calculate salaries.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["#", "Teacher", "Base Salary", "Attendance", "Deductions", "Net Salary", "Status"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map((row, idx) => {
                  const hasDeduction = row.totalDeduction > 0;
                  return (
                    <tr key={row.teacherId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 text-xs text-slate-400 font-medium">{idx + 1}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1F4E79] to-[#2563a8] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {row.name?.charAt(0)?.toUpperCase() || "T"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{row.name || "—"}</p>
                            <p className="text-xs text-slate-400">{row.employeeId || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-slate-700">{fmt(row.baseSalary)}</span>
                        <p className="text-xs text-slate-400">/{row.daysInMonth} days</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-3 text-xs">
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full" />{row.present}P
                          </span>
                          <span className="flex items-center gap-1 text-red-500 font-medium">
                            <span className="w-2 h-2 bg-red-400 rounded-full" />{row.absent}A
                          </span>
                          <span className="flex items-center gap-1 text-amber-500 font-medium">
                            <span className="w-2 h-2 bg-amber-400 rounded-full" />{row.late}L
                          </span>
                          <span className="flex items-center gap-1 text-blue-500 font-medium">
                            <span className="w-2 h-2 bg-blue-400 rounded-full" />{row.leave}Lv
                          </span>
                        </div>
                        {row.markedDays > 0 && (
                          <p className="text-xs text-slate-400 mt-0.5">{row.attendancePercent}% attendance</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {hasDeduction ? (
                          <div className="space-y-0.5">
                            {row.absentDeduction > 0 && (
                              <p className="text-xs text-red-500">-{fmt(row.absentDeduction)} (absent)</p>
                            )}
                            {row.leaveDeduction > 0 && (
                              <p className="text-xs text-blue-500">-{fmt(row.leaveDeduction)} (leave)</p>
                            )}
                            {row.lateDeduction > 0 && (
                              <p className="text-xs text-amber-500">-{fmt(row.lateDeduction)} (late)</p>
                            )}
                            <p className="text-xs font-semibold text-red-600 border-t border-slate-100 pt-0.5">
                              -{fmt(row.totalDeduction)} total
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">No deduction</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-base font-bold ${hasDeduction ? "text-orange-600" : "text-emerald-600"}`}>
                          {fmt(row.netSalary)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {row.markedDays === 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">
                            Not marked
                          </span>
                        ) : hasDeduction ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-medium">
                            <TrendingDown className="w-3 h-3" />Deducted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                            <CheckCircle className="w-3 h-3" />Full Pay
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={2} className="px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Total ({data.length} teachers)</td>
                  <td className="px-5 py-3 text-sm font-bold text-slate-800">{fmt(totals.base)}</td>
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3 text-sm font-bold text-red-600">-{fmt(totals.deductions)}</td>
                  <td className="px-5 py-3 text-sm font-bold text-emerald-700">{fmt(totals.net)}</td>
                  <td className="px-5 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherSalaryPage;
