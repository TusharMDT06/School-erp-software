import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ChevronLeft,
  Download,
  BarChart3,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle2,
  Users,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import {
  getQuizByIdApi,
  getQuizAttemptsApi,
  getQuizAnalysisApi,
  exportQuizExcelApi,
} from "../../api/quizApi";

const QuizResults = () => {
  const { id } = useParams();

  const [quiz, setQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getQuizByIdApi(id),
      getQuizAttemptsApi(id),
      getQuizAnalysisApi(id),
    ])
      .then(([quizRes, attRes, analRes]) => {
        setQuiz(quizRes.data?.data || quizRes.data);
        setAttempts(attRes.data?.data || attRes.data || []);
        setAnalysis(analRes.data?.data || analRes.data || null);
      })
      .catch((err) => toast.error("Failed to load quiz results."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleExportExcel = async () => {
    try {
      toast.loading("Generating Excel report...");
      const res = await exportQuizExcelApi(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Quiz_Report_${quiz?.title || "Quiz"}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.dismiss();
      toast.success("Excel downloaded.");
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to download Excel report.");
    }
  };

  const filteredAttempts = attempts.filter(
    (a) =>
      a.studentId?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.studentId?.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.studentId?.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ── Top Header Bar ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/teacher/quizzes"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">{quiz?.title || "Quiz Results"}</h1>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold capitalize">
                  {quiz?.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {quiz?.subject} â€¢ Class {quiz?.classId?.className} {quiz?.classId?.section ? `(${quiz.classId.section})` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Download className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </div>

        {/* Top Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Total Submissions</p>
            <p className="text-2xl font-black text-slate-800 mt-0.5">
              {analysis?.totalSubmissions || attempts.length}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Average Score</p>
            <p className="text-2xl font-black text-indigo-600 mt-0.5">
              {analysis?.averageScore || 0} / {analysis?.maxPossibleScore || 0}
            </p>
            <p className="text-[10px] text-slate-400">{analysis?.averageScorePercentage || 0}% avg</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Average Time Taken</p>
            <p className="text-2xl font-black text-slate-800 mt-0.5">
              {analysis?.averageTimeMinutes || 0} mins
            </p>
            <p className="text-[10px] text-slate-400">Quiz limit: {quiz?.durationMinutes || 0}m</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Auto-Submissions</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">
              {attempts.filter((a) => a.autoSubmitted).length}
            </p>
            <p className="text-[10px] text-slate-400">Timed out attempts</p>
          </div>
        </div>
      </div>

      {/* ── Per-Question Analysis Bar Chart ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            Per-Question Accuracy (% Correct)
          </h3>
          <span className="text-xs text-slate-400">{analysis?.perQuestionAnalysis?.length || 0} Questions</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={
                analysis?.perQuestionAnalysis?.map((q, idx) => ({
                  name: `Q${idx + 1}`,
                  percentCorrect: q.percentCorrect,
                  correctCount: q.correctCount,
                  totalSubmissions: q.totalSubmissions,
                  text: q.text,
                })) || []
              }
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                formatter={(val, name, item) => [`${val}% (${item.payload.correctCount}/${item.payload.totalSubmissions} students)`, "Accuracy"]}
              />
              <Bar dataKey="percentCorrect" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hardest Questions Callout */}
        {analysis?.hardestQuestions && analysis.hardestQuestions.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
            <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Hardest Questions (Lowest Accuracy)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {analysis.hardestQuestions.map((hq, idx) => (
                <div key={idx} className="bg-white p-3 rounded-lg border border-amber-200/60 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="truncate flex-1">{hq.text}</span>
                    <span className="text-rose-600 font-black ml-2">{hq.percentCorrect}%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {hq.correctCount} of {hq.totalSubmissions} answered correctly
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Student Attempts Table ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name or roll..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-400">
            Showing {filteredAttempts.length} of {attempts.length} attempts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="p-3 w-16 text-center">Roll No</th>
                <th className="p-3 min-w-[150px]">Student Name</th>
                <th className="p-3 text-center">Score</th>
                <th className="p-3 text-center">Percentage</th>
                <th className="p-3 text-center">Submitted At</th>
                <th className="p-3 text-center">Type</th>
                <th className="p-3 text-center">
                  Tab Shifts
                  <span className="block text-[9px] font-normal text-slate-400">Integrity signal</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredAttempts.map((att, idx) => {
                const max = att.maxScore || analysis?.maxPossibleScore || 1;
                const pct = Math.round((att.score / max) * 100);

                return (
                  <tr key={att._id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 text-center text-slate-400 font-mono">
                      {att.studentId?.rollNumber || idx + 1}
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-slate-800">{att.studentId?.name || "Student"}</p>
                      <p className="text-[10px] text-slate-400">{att.studentId?.admissionNumber}</p>
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800">
                      {att.score} / {max}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`font-black px-2 py-0.5 rounded-full ${
                          pct >= 75
                            ? "bg-emerald-50 text-emerald-700"
                            : pct < 40
                            ? "bg-rose-50 text-rose-700"
                            : "bg-indigo-50 text-indigo-700"
                        }`}
                      >
                        {pct}%
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-500">
                      {att.submittedAt
                        ? new Date(att.submittedAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "In Progress"}
                    </td>
                    <td className="p-3 text-center">
                      {att.autoSubmitted ? (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          Auto-Timed Out
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          Standard
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {att.hiddenTabCount > 0 ? (
                        <span
                          className={`font-bold text-[11px] px-2 py-0.5 rounded-full ${
                            att.hiddenTabCount >= 3
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                          title={`${att.hiddenTabCount} window/tab unfocus events during quiz`}
                        >
                          {att.hiddenTabCount} shifts
                        </span>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
