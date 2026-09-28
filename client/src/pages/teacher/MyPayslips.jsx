import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Receipt,
  Download,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingDown,
  TrendingUp,
  FileText,
  AlertCircle,
  Loader2,
  Wallet,
  Sparkles,
} from "lucide-react";
import { getMyPayslipsApi, getPayslipPdfBlobApi } from "../../api/payrollApi";

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

const MyPayslips = () => {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchPayslips = async () => {
    setLoading(true);
    try {
      const res = await getMyPayslipsApi();
      setPayslips(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load your payslips.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, []);

  const handleDownloadPdf = async (payslip) => {
    setDownloadingId(payslip._id);
    try {
      const res = await getPayslipPdfBlobApi(payslip._id);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Payslip-${MONTH_NAMES[payslip.month]}-${payslip.year}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Payslip PDF downloaded successfully!");
    } catch (err) {
      toast.error("Failed to download PDF payslip.");
    } finally {
      setDownloadingId(null);
    }
  };

  const totalEarnings = payslips.reduce((sum, p) => sum + (p.netPay || 0), 0);
  const latestPayslip = payslips[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 rounded-2xl text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-emerald-200" />
            My Salary Payslips
          </h1>
          <p className="text-emerald-100 text-sm mt-1">
            Access and download your verified monthly salary slips and tax deduction summaries.
          </p>
        </div>
        {latestPayslip && (
          <div className="bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/20 text-right">
            <div className="text-xs uppercase text-emerald-200 font-medium">
              Latest Payout ({MONTH_NAMES[latestPayslip.month]} {latestPayslip.year})
            </div>
            <div className="text-xl font-black mt-0.5">{fmt(latestPayslip.netPay)}</div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">
              Total Disbursed Net
            </div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">
              {fmt(totalEarnings)}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">
              Payslips Available
            </div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">
              {payslips.length} Slips
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase">
              Active Pay Cycle
            </div>
            <div className="text-xl font-bold text-slate-800 mt-0.5">
              Monthly
            </div>
          </div>
        </div>
      </div>

      {/* Payslips Grid / List */}
      {loading ? (
        <div className="p-16 bg-white rounded-2xl border border-slate-200 text-center flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm text-slate-500">Loading your payslips...</p>
        </div>
      ) : payslips.length === 0 ? (
        <div className="p-16 bg-white rounded-2xl border border-slate-200 text-center text-slate-400">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-slate-700">No payslips available yet</p>
          <p className="text-sm mt-1 text-slate-500">
            When payroll is processed and approved by the finance department, your payslips will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {payslips.map((p) => {
            const isPaid = p.status === "paid";
            const isDownloading = downloadingId === p._id;

            return (
              <div
                key={p._id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 hover:shadow-md transition-shadow space-y-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {MONTH_NAMES[p.month]} {p.year}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Working Days: {p.workingDays} | Present: {p.presentDays}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      isPaid
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-sky-50 text-sky-700 border border-sky-200"
                    }`}
                  >
                    {isPaid ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    {p.status}
                  </span>
                </div>

                {/* Net Pay Amount Card */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-400 uppercase font-semibold">
                      Net Salary Paid
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-0.5">
                      {fmt(p.netPay)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadPdf(p)}
                    disabled={isDownloading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download PDF
                  </button>
                </div>

                {/* Breakdown Mini-grid */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs border-t border-slate-100 pt-3">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">Gross</span>
                    <span className="font-semibold text-slate-700">{fmt(p.gross)}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">Deductions</span>
                    <span className="font-semibold text-rose-600">-{fmt(p.totalDeductions)}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-slate-400 block text-[10px] uppercase font-medium">Unpaid LOP</span>
                    <span className={`font-semibold ${p.unpaidLeaveDays > 0 ? "text-rose-600" : "text-slate-700"}`}>
                      {p.unpaidLeaveDays || 0} Days
                    </span>
                  </div>
                </div>

                {p.adjustmentNote && (
                  <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <strong>Note:</strong> {p.adjustmentNote}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyPayslips;
