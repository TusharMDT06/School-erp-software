import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Loader2,
  Lock,
  ChevronRight,
  Plus,
  Edit3,
  CreditCard,
  Building,
  RefreshCw,
  Users,
  ShieldCheck,
  Check,
} from "lucide-react";
import {
  getPayrollRunsApi,
  getPayrollRunByIdApi,
  createPayrollRunApi,
  updatePayslipApi,
  payPayrollRunApi,
  exportPayrollRunApi,
  getPayslipPdfBlobApi,
} from "../../api/payrollApi";

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const fmt = (paise) =>
  "₹" +
  ((paise || 0) / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const toRupees = (paise) => ((paise || 0) / 100).toString();
const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100);

const PayrollRuns = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const [runs, setRuns] = useState([]);
  const [activeRunId, setActiveRunId] = useState(null);
  const [activeRunData, setActiveRunData] = useState(null); // { run, payslips }
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingRunDetails, setLoadingRunDetails] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Adjust Payslip Modal state
  const [adjustModal, setAdjustModal] = useState({
    isOpen: false,
    payslip: null,
    bonus: "",
    adjustmentNote: "",
    extraDedName: "",
    extraDedAmount: "",
  });
  const [adjustSaving, setAdjustSaving] = useState(false);

  // Mark as Paid Modal state
  const [payModal, setPayModal] = useState({
    isOpen: false,
    paymentMode: "bank",
    paidOn: new Date().toISOString().split("T")[0],
  });
  const [paying, setPaying] = useState(false);

  const fetchRuns = async (selectId = null) => {
    setLoadingRuns(true);
    try {
      const res = await getPayrollRunsApi();
      const list = res.data || [];
      setRuns(list);

      if (list.length > 0) {
        const targetId = selectId || activeRunId || list[0]._id;
        setActiveRunId(targetId);
        await fetchRunDetails(targetId);
      } else {
        setActiveRunId(null);
        setActiveRunData(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load payroll runs.");
    } finally {
      setLoadingRuns(false);
    }
  };

  const fetchRunDetails = async (id) => {
    if (!id) return;
    setLoadingRunDetails(true);
    try {
      const res = await getPayrollRunByIdApi(id);
      setActiveRunData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load run details.");
    } finally {
      setLoadingRunDetails(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleSelectRun = (id) => {
    setActiveRunId(id);
    fetchRunDetails(id);
  };

  const handleGeneratePayroll = async () => {
    setGenerating(true);
    try {
      const res = await createPayrollRunApi({
        month: Number(selectedMonth),
        year: Number(selectedYear),
      });

      toast.success(
        `Payroll generated for ${MONTH_NAMES[selectedMonth]} ${selectedYear}!`
      );
      await fetchRuns(res.data?.run?._id);
    } catch (err) {
      if (err.response?.status === 409) {
        toast(err.response?.data?.message || "Payroll run already exists.", {
          icon: "ℹ️",
        });
        if (err.response?.data?.runId) {
          setActiveRunId(err.response.data.runId);
          fetchRunDetails(err.response.data.runId);
        }
      } else {
        toast.error(
          err.response?.data?.message || "Failed to generate payroll."
        );
      }
    } finally {
      setGenerating(false);
    }
  };

  // Adjust Payslip
  const handleOpenAdjust = (p) => {
    setAdjustModal({
      isOpen: true,
      payslip: p,
      bonus: toRupees(p.bonus || 0),
      adjustmentNote: p.adjustmentNote || "",
      extraDedName: "",
      extraDedAmount: "",
    });
  };

  const handleSaveAdjust = async (e) => {
    e.preventDefault();
    const { payslip, bonus, adjustmentNote, extraDedName, extraDedAmount } =
      adjustModal;
    if (!payslip) return;

    setAdjustSaving(true);
    try {
      const payload = {
        bonus: toPaise(bonus),
        adjustmentNote,
      };

      if (extraDedName && Number(extraDedAmount) > 0) {
        payload.extraDeductions = [
          { name: extraDedName.trim(), amount: toPaise(extraDedAmount) },
        ];
      }

      await updatePayslipApi(payslip._id, payload);
      toast.success("Payslip updated successfully!");
      setAdjustModal({ isOpen: false, payslip: null, bonus: "", adjustmentNote: "", extraDedName: "", extraDedAmount: "" });
      await fetchRunDetails(activeRunId);
      // Refresh run headers
      const res = await getPayrollRunsApi();
      setRuns(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update payslip.");
    } finally {
      setAdjustSaving(false);
    }
  };

  // Export Excel / CSV
  const handleExport = async (format) => {
    if (!activeRunId) return;
    try {
      const res = await exportPayrollRunApi(activeRunId, format);
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = format === "csv" ? "csv" : "xlsx";
      a.download = `Payroll-${activeRunData?.run?.month}-${activeRunData?.run?.year}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(
        format === "csv" ? "Bank Advice CSV downloaded!" : "Salary Sheet Excel downloaded!"
      );
    } catch (err) {
      toast.error("Failed to export payroll report.");
    }
  };

  // Download Single Payslip PDF
  const handleDownloadPdf = async (payslipId, staffName) => {
    try {
      const res = await getPayslipPdfBlobApi(payslipId);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Payslip-${staffName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Payslip PDF downloaded!");
    } catch (err) {
      toast.error("Failed to download PDF payslip.");
    }
  };

  // Mark as Paid
  const handleConfirmPay = async (e) => {
    e.preventDefault();
    if (!activeRunId) return;

    setPaying(true);
    try {
      await payPayrollRunApi(activeRunId, {
        paymentMode: payModal.paymentMode,
        paidOn: payModal.paidOn,
      });

      toast.success(
        "Payroll marked as PAID! Ledger entries created & payslip generation started."
      );
      setPayModal({ isOpen: false, paymentMode: "bank", paidOn: new Date().toISOString().split("T")[0] });
      await fetchRuns(activeRunId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to process payroll payment.");
    } finally {
      setPaying(false);
    }
  };

  const currentRun = activeRunData?.run;
  const currentPayslips = activeRunData?.payslips || [];

  return (
    <div className="space-y-6">
      {/* Top Banner & Payroll Generator */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-indigo-600" />
            Payroll & Payslips
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate monthly payroll, fine-tune deductions, export bank advice, and disburse staff salaries.
          </p>
        </div>

        {/* Month/Year selector & Generate button */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {MONTH_NAMES.slice(1).map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <button
            onClick={handleGeneratePayroll}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Generate Payroll
          </button>
        </div>
      </div>

      {/* Main Grid: Runs List on Left, Active Run Details on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Payroll Runs Timeline List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
              Payroll Runs ({runs.length})
            </h2>
            <button
              onClick={() => fetchRuns()}
              className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {loadingRuns ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
            </div>
          ) : runs.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No payroll runs yet.</p>
              <p className="text-xs mt-1 text-slate-400">
                Select a month & year above and click "Generate Payroll".
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {runs.map((r) => {
                const isSelected = r._id === activeRunId;
                const statusColors = {
                  draft: "bg-amber-50 text-amber-700 border-amber-200",
                  approved: "bg-sky-50 text-sky-700 border-sky-200",
                  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
                };

                return (
                  <div
                    key={r._id}
                    onClick={() => handleSelectRun(r._id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50/70 border-indigo-400 shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-slate-800 text-base">
                        {MONTH_NAMES[r.month]} {r.year}
                      </div>
                      <span
                        className={`text-xs uppercase font-semibold px-2.5 py-0.5 rounded-full border ${
                          statusColors[r.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <span>{r.payslipsCount || 0} Staff Members</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {fmt(r.totalNet)}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                      <span>By {r.generatedBy?.name || "Admin"}</span>
                      {r.paidOn && (
                        <span>Paid: {new Date(r.paidOn).toLocaleDateString("en-IN")}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Run Details & Payslips Table */}
        <div className="lg:col-span-8 space-y-6">
          {loadingRunDetails ? (
            <div className="p-16 bg-white rounded-2xl border border-slate-200 text-center flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-sm text-slate-500">Loading payroll details...</p>
            </div>
          ) : !currentRun ? (
            <div className="p-16 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-600">Select or generate a payroll run</p>
              <p className="text-sm mt-1">Choose a run from the left or generate a new one.</p>
            </div>
          ) : (
            <>
              {/* Status Stepper & Action Header */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Payroll Run
                    </div>
                    <div className="text-2xl font-black text-slate-800">
                      {MONTH_NAMES[currentRun.month]} {currentRun.year}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleExport("excel")}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                      title="Download full salary sheet Excel workbook"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      Excel Sheet
                    </button>

                    <button
                      onClick={() => handleExport("csv")}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                      title="Download bank advice CSV (name, amount, narration)"
                    >
                      <FileText className="w-4 h-4 text-sky-600" />
                      Bank Advice CSV
                    </button>

                    {currentRun.status === "approved" && (
                      <button
                        onClick={() => setPayModal((prev) => ({ ...prev, isOpen: true }))}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                      >
                        <DollarSign className="w-4 h-4" />
                        Disburse & Mark as Paid
                      </button>
                    )}
                  </div>
                </div>

                {/* 3-Step Stepper */}
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-5">
                  {/* Step 1: Draft */}
                  <div
                    className={`flex items-center gap-2.5 p-3 rounded-xl border ${
                      currentRun.status === "draft"
                        ? "bg-amber-50/80 border-amber-300 text-amber-800"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        currentRun.status === "draft"
                          ? "bg-amber-600 text-white"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      {currentRun.status === "draft" ? "1" : <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-none">Draft</div>
                      <div className="text-[10px] opacity-75 mt-0.5">Calculated & editable</div>
                    </div>
                  </div>

                  {/* Step 2: Approved */}
                  <div
                    className={`flex items-center gap-2.5 p-3 rounded-xl border ${
                      currentRun.status === "approved"
                        ? "bg-sky-50/80 border-sky-300 text-sky-800"
                        : currentRun.status === "paid"
                        ? "bg-slate-50 border-slate-200 text-slate-500"
                        : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        currentRun.status === "paid"
                          ? "bg-emerald-600 text-white"
                          : currentRun.status === "approved"
                          ? "bg-sky-600 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {currentRun.status === "paid" ? <Check className="w-3.5 h-3.5" /> : "2"}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-none">Approved</div>
                      <div className="text-[10px] opacity-75 mt-0.5">Reviewed by admin</div>
                    </div>
                  </div>

                  {/* Step 3: Paid */}
                  <div
                    className={`flex items-center gap-2.5 p-3 rounded-xl border ${
                      currentRun.status === "paid"
                        ? "bg-emerald-50/80 border-emerald-300 text-emerald-800"
                        : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        currentRun.status === "paid"
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {currentRun.status === "paid" ? <Check className="w-3.5 h-3.5" /> : "3"}
                    </div>
                    <div>
                      <div className="text-xs font-bold leading-none">Paid</div>
                      <div className="text-[10px] opacity-75 mt-0.5">Ledger posted & PDFs sent</div>
                    </div>
                  </div>
                </div>

                {/* Status-specific banners */}
                {currentRun.status === "draft" && (
                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>
                      This payroll run is in <strong>Draft</strong>. You can adjust bonus, add notes, or apply manual deductions for individual staff members. When ready, notify Admin to approve.
                    </span>
                  </div>
                )}
                {currentRun.status === "approved" && (
                  <div className="bg-sky-50 border border-sky-200 p-3.5 rounded-xl text-xs text-sky-800 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-sky-600" />
                    <span>
                      Approved by {currentRun.approvedBy?.name || "Admin"}. Payslip edits are now locked. Click <strong>Disburse & Mark as Paid</strong> to execute payouts and generate PDFs.
                    </span>
                  </div>
                )}
                {currentRun.status === "paid" && (
                  <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>
                      Disbursed via <strong>{(currentRun.paymentMode || "bank").toUpperCase()}</strong> on{" "}
                      {currentRun.paidOn ? new Date(currentRun.paidOn).toLocaleDateString("en-IN") : "today"}. All ledger entries posted.
                    </span>
                  </div>
                )}
              </div>

              {/* Totals Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-400 font-medium uppercase">Staff Count</div>
                  <div className="text-xl font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                    <Users className="w-5 h-5 text-indigo-600" />
                    {currentPayslips.length}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-400 font-medium uppercase">Total Gross</div>
                  <div className="text-xl font-bold text-slate-800 mt-1">
                    {fmt(currentRun.totalGross)}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-xs text-slate-400 font-medium uppercase">Total Deductions</div>
                  <div className="text-xl font-bold text-rose-600 mt-1">
                    -{fmt(currentRun.totalDeductions)}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs bg-emerald-50/40">
                  <div className="text-xs text-emerald-600 font-semibold uppercase">Total Net Payout</div>
                  <div className="text-xl font-black text-emerald-700 mt-1">
                    {fmt(currentRun.totalNet)}
                  </div>
                </div>
              </div>

              {/* Detailed Payslips Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 text-sm">
                    Individual Payslips ({currentPayslips.length})
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3.5">Employee</th>
                        <th className="px-4 py-3.5 text-center">Days (W/P/LOP)</th>
                        <th className="px-4 py-3.5 text-right">Gross</th>
                        <th className="px-4 py-3.5 text-right">Deductions</th>
                        <th className="px-4 py-3.5 text-right">Bonus</th>
                        <th className="px-5 py-3.5 text-right">Net Salary</th>
                        <th className="px-4 py-3.5 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentPayslips.map((p) => {
                        const isDraft = currentRun.status === "draft";

                        return (
                          <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="font-semibold text-slate-800">{p.staffName}</div>
                              <div className="text-xs text-slate-400">
                                {p.staffUserId?.email || "Staff"}
                              </div>
                            </td>

                            <td className="px-4 py-3.5 text-center text-xs">
                              <span className="font-medium text-slate-700">{p.workingDays}</span> /{" "}
                              <span className="text-emerald-600 font-semibold">{p.presentDays}</span> /{" "}
                              <span
                                className={`font-semibold ${
                                  p.unpaidLeaveDays > 0 ? "text-rose-600" : "text-slate-400"
                                }`}
                              >
                                {p.unpaidLeaveDays || 0}d
                              </span>
                            </td>

                            <td className="px-4 py-3.5 text-right font-medium text-slate-700">
                              {fmt(p.gross)}
                            </td>

                            <td className="px-4 py-3.5 text-right text-xs">
                              <div className="text-rose-600 font-medium">-{fmt(p.totalDeductions)}</div>
                              {p.lopDeduction > 0 && (
                                <div className="text-[10px] text-slate-400">
                                  LOP: {fmt(p.lopDeduction)}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-right text-xs">
                              {p.bonus > 0 ? (
                                <span className="font-semibold text-emerald-600">+{fmt(p.bonus)}</span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 text-right font-black text-slate-900">
                              {fmt(p.netPay)}
                            </td>

                            <td className="px-4 py-3.5 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                {isDraft ? (
                                  <button
                                    onClick={() => handleOpenAdjust(p)}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Adjust Bonus or Deduction"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleDownloadPdf(p._id, p.staffName)}
                                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="Download PDF Payslip"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
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
        </div>
      </div>

      {/* Adjust Payslip Modal (Draft Only) */}
      {adjustModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">Adjust Payslip</h3>
                <p className="text-xs text-slate-500">{adjustModal.payslip?.staffName}</p>
              </div>
              <button
                onClick={() => setAdjustModal({ ...adjustModal, isOpen: false })}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdjust} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Bonus / Incentive (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-semibold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={adjustModal.bonus}
                    onChange={(e) => setAdjustModal({ ...adjustModal, bonus: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                  Adjustment Note / Reason
                </label>
                <textarea
                  rows={2}
                  value={adjustModal.adjustmentNote}
                  onChange={(e) =>
                    setAdjustModal({ ...adjustModal, adjustmentNote: e.target.value })
                  }
                  placeholder="e.g. Performance incentive for exam duties"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="border-t border-slate-100 pt-3">
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-2">
                  Add One-Off Extra Deduction (Optional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Deduction Name"
                    value={adjustModal.extraDedName}
                    onChange={(e) =>
                      setAdjustModal({ ...adjustModal, extraDedName: e.target.value })
                    }
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Amount (₹)"
                    value={adjustModal.extraDedAmount}
                    onChange={(e) =>
                      setAdjustModal({ ...adjustModal, extraDedAmount: e.target.value })
                    }
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustModal({ ...adjustModal, isOpen: false })}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl disabled:opacity-50"
                >
                  {adjustSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {payModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">Confirm Payroll Disbursement</h3>
                <p className="text-xs text-slate-500">
                  {MONTH_NAMES[currentRun.month]} {currentRun.year}
                </p>
              </div>
              <button
                onClick={() => setPayModal({ ...payModal, isOpen: false })}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPay} className="p-5 space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <div className="text-xs text-emerald-700 font-semibold uppercase">
                  Total Salary Amount to Disburse
                </div>
                <div className="text-2xl font-black text-emerald-800 mt-1">
                  {fmt(currentRun.totalNet)}
                </div>
                <div className="text-xs text-emerald-600 mt-1">
                  For {currentPayslips.length} staff members
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Payment Mode *
                </label>
                <select
                  value={payModal.paymentMode}
                  onChange={(e) =>
                    setPayModal({ ...payModal, paymentMode: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="bank">Bank Transfer / NEFT / RTGS</option>
                  <option value="online">Online / UPI / Gateway</option>
                  <option value="cash">Cash In Hand</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={payModal.paidOn}
                  onChange={(e) =>
                    setPayModal({ ...payModal, paidOn: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 leading-relaxed">
                <strong>Transaction Guarantee:</strong> One immutable LedgerEntry will be created per payslip under category <code>payroll</code> (respecting day-close locks). PDFs will be rendered and staff members notified automatically.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayModal({ ...payModal, isOpen: false })}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paying}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {paying && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollRuns;
