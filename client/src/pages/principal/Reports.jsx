import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Download,
  Calendar,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Plus,
  CheckCircle2,
  FileSpreadsheet,
  IndianRupee,
  Users,
  GraduationCap,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  listReportsApi,
  generateMonthlyReportApi,
  getMonthlySnapshotApi,
  downloadReportApi,
} from "../../api/reportApi";
import toast from "react-hot-toast";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  // Generate Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genMonth, setGenMonth] = useState(new Date().getMonth() === 0 ? 12 : new Date().getMonth());
  const [genYear, setGenYear] = useState(
    new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()
  );
  const [generating, setGenerating] = useState(false);
  const [previewSnapshot, setPreviewSnapshot] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listReportsApi();
      const list = res.data?.data || [];
      setReports(list);
      if (list.length > 0 && !selectedReport) {
        setSelectedReport(list[0]);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load reports archive.");
    } finally {
      setLoading(false);
    }
  }, [selectedReport]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Load preview when opening generate modal or changing month/year
  const handleOpenGenerate = async () => {
    setShowGenerateModal(true);
    fetchPreview(genMonth, genYear);
  };

  const fetchPreview = async (m, y) => {
    setLoadingPreview(true);
    try {
      const res = await getMonthlySnapshotApi({ month: m, year: y });
      setPreviewSnapshot(res.data?.data || null);
    } catch (err) {
      console.warn("Preview load error:", err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleGenerateNow = async () => {
    setGenerating(true);
    try {
      const res = await generateMonthlyReportApi({ month: genMonth, year: genYear });
      toast.success(res.data?.message || "Monthly report generated successfully!");
      setShowGenerateModal(false);
      const newReport = res.data?.data;
      setReports((prev) => [newReport, ...prev.filter((r) => r._id !== newReport._id)]);
      setSelectedReport(newReport);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to generate report.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (reportId, format, month, year) => {
    try {
      toast.loading(`Preparing ${format.toUpperCase()} download...`, { id: "dl" });
      const res = await downloadReportApi(reportId, format);
      const mimeType = format === "excel"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";
      const blob = new Blob([res.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `MIS_Report_${month}_${year}.${format === "excel" ? "xlsx" : "pdf"}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      toast.success("Download started!", { id: "dl" });
    } catch (err) {
      let errMsg = "Failed to download file.";
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.message) errMsg = parsed.message;
        } catch {}
      } else if (err?.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      toast.error(errMsg, { id: "dl" });
    }
  };

  const d = selectedReport?.dataSnapshot || {};

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 lg:p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-slate-200 text-slate-700">
              Institutional MIS
            </span>
            <span className="text-xs text-slate-400">Monthly Reports Archive</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">Monthly Principal&apos;s MIS Report</h1>
          <p className="text-sm text-slate-500">
            Comprehensive institutional snapshots with Gemini AI executive narrative, PDF and Excel workbooks
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadReports}
            className="flex items-center gap-2 px-3 py-2 bg-white text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleOpenGenerate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Generate Monthly Report
          </button>
        </div>
      </div>

      {/* ── Main Layout: Sidebar Archive List + Main Report Preview ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Report Archive List (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reports Archive</h3>

            {loading && reports.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">Loading archive...</div>
            ) : reports.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs space-y-2">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p>No monthly reports generated yet.</p>
                <button
                  onClick={handleOpenGenerate}
                  className="text-xs text-indigo-600 font-semibold hover:underline"
                >
                  Generate First Report →
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {reports.map((r) => {
                  const isSelected = selectedReport?._id === r._id;
                  const monthName = MONTH_NAMES[r.month - 1];
                  return (
                    <div
                      key={r._id}
                      onClick={() => setSelectedReport(r)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        isSelected
                          ? "bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-200"
                          : "bg-slate-50/50 border-slate-200 hover:bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          {monthName} {r.year}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(r.generatedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {r.summaryText || "Institutional MIS snapshot with ledger financials and academic indicators."}
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                        <span>Attendance: {r.dataSnapshot?.attendance?.overallPercent || 0}%</span>
                        <span>•</span>
                        <span>Fee: {r.dataSnapshot?.finance?.collectionINR || "₹0"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Report Viewer (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          {selectedReport ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
              {/* Report Header & Action Buttons */}
              <div className="flex items-start justify-between flex-wrap gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                      Report Cycle
                    </span>
                    <span className="text-xs text-slate-400">
                      Generated {new Date(selectedReport.generatedAt).toLocaleString("en-IN", { dateStyle: "medium" })}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mt-1">
                    {MONTH_NAMES[selectedReport.month - 1]} {selectedReport.year} Institutional Report
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleDownload(selectedReport._id, "pdf", selectedReport.month, selectedReport.year)
                    }
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF
                  </button>
                  <button
                    onClick={() =>
                      handleDownload(selectedReport._id, "excel", selectedReport.month, selectedReport.year)
                    }
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Download Excel
                  </button>
                </div>
              </div>

              {/* Gemini AI Executive Narrative */}
              <div className="p-4 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-slate-50/50 rounded-2xl border border-indigo-100/80 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Executive Summary Narrative (Gemini AI Verified)</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed text-justify">
                  {selectedReport.summaryText}
                </p>
                <p className="text-[10px] text-slate-400 text-right italic">
                  * Narrative generated strictly from verified institutional database and ledger numbers.
                </p>
              </div>

              {/* Key Indicators Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold">Total Enrolled</span>
                  <p className="text-lg font-bold text-slate-800">{d.enrollment?.total || 0}</p>
                  <p className="text-[10px] text-emerald-600 font-medium">+{d.enrollment?.admissions || 0} new adm</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold">Attendance Avg</span>
                  <p className="text-lg font-bold text-slate-800">{d.attendance?.overallPercent || 0}%</p>
                  <p className="text-[10px] text-slate-400 font-medium">Working days avg</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold">Ledger Fee Collection</span>
                  <p className="text-lg font-bold text-emerald-700">{d.finance?.collectionINR || "₹0"}</p>
                  <p className="text-[10px] text-slate-400 font-medium">Recorded in ledger</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 font-semibold">Net Cash Flow</span>
                  <p className="text-lg font-bold text-indigo-700">{d.finance?.netCashFlowINR || "₹0"}</p>
                  <p className="text-[10px] text-slate-400 font-medium">Expenses: {d.finance?.expensesINR || "₹0"}</p>
                </div>
              </div>

              {/* Top 5 Concerns Box */}
              {d.top5Concerns?.length > 0 && (
                <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Key Institutional Concerns & Action Items</span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-amber-900/90 pl-1">
                    {d.top5Concerns.map((concern, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-bold text-amber-700">{idx + 1}.</span>
                        <span>{concern}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Secondary Details: Academics & Staff */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <h4 className="font-bold text-slate-800">Academic Assessment</h4>
                  <div className="space-y-1 text-slate-600">
                    <p><strong>Conducted Exam:</strong> {d.academics?.examName || "None"}</p>
                    <p><strong>Pass Percentage:</strong> {d.academics?.passPercent || 0}%</p>
                    <p><strong>Class Average Score:</strong> {d.academics?.averageScore || "N/A"}%</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <h4 className="font-bold text-slate-800">Staff & Operations</h4>
                  <div className="space-y-1 text-slate-600">
                    <p><strong>Active Teachers:</strong> {d.staff?.totalTeachers || 0}</p>
                    <p><strong>Teacher Leaves Taken:</strong> {d.staff?.leaveDays || 0} days</p>
                    <p><strong>Substitutions Arranged:</strong> {d.staff?.substitutionsCovered || 0} periods</p>
                    <p><strong>Discipline Incidents:</strong> {d.incidents?.total || 0} logged</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400 space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm">Select a report from the archive to view detailed metrics and downloads.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Generate Report Modal ────────────────────────────────────────── */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">Generate Monthly MIS Report</h3>
                <p className="text-xs text-slate-400">Compile operational data, generate PDF/Excel, and trigger narrative</p>
              </div>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {/* Month & Year Select */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Month</label>
                <select
                  value={genMonth}
                  onChange={(e) => {
                    const m = Number(e.target.value);
                    setGenMonth(m);
                    fetchPreview(m, genYear);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i + 1} value={i + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Year</label>
                <input
                  type="number"
                  value={genYear}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setGenYear(y);
                    fetchPreview(genMonth, y);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            {/* Preview of snapshot */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <span className="font-bold text-slate-700">Computed Metrics Preview:</span>
              {loadingPreview ? (
                <p className="text-slate-400 py-2">Computing snapshot...</p>
              ) : previewSnapshot ? (
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <p>Enrolled: <strong>{previewSnapshot.enrollment?.total}</strong></p>
                  <p>Attendance: <strong>{previewSnapshot.attendance?.overallPercent}%</strong></p>
                  <p>Collection: <strong>{previewSnapshot.finance?.collectionINR}</strong></p>
                  <p>Net Cash Flow: <strong>{previewSnapshot.finance?.netCashFlowINR}</strong></p>
                  <p>Leaves: <strong>{previewSnapshot.staff?.leaveDays} days</strong></p>
                  <p>Exam: <strong>{previewSnapshot.academics?.passPercent}% pass</strong></p>
                </div>
              ) : (
                <p className="text-slate-400">Click below to compute and generate report.</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={generating}
                onClick={handleGenerateNow}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating PDF & Excel...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Compile & Publish Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
