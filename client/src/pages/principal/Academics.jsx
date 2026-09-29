import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Award,
  TrendingUp,
  BarChart2,
  Users,
  AlertTriangle,
  CheckCircle,
  Filter,
  RefreshCw,
  Search,
  BookOpen,
  Info,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  getAcademicsOverviewApi,
  getClassComparisonApi,
  getSubjectAnalysisApi,
  getExamToppersApi,
  getTeacherContextApi,
} from "../../api/academicsApi";

const Academics = () => {
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState("");
  const [overviewData, setOverviewData] = useState({ exams: [], summary: {} });

  const [selectedExamId, setSelectedExamId] = useState("");
  const [classComparison, setClassComparison] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [toppers, setToppers] = useState([]);
  const [teacherContext, setTeacherContext] = useState([]);
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "subjects" | "teachers" | "toppers"

  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await getAcademicsOverviewApi({ academicYear });
      const data = res.data?.data || res.data || { exams: [], summary: {} };
      setOverviewData(data);

      if (data.exams && data.exams.length > 0) {
        if (!selectedExamId || !data.exams.some((e) => e.examId === selectedExamId)) {
          setSelectedExamId(data.exams[0].examId);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load academic overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [academicYear]);

  // Load detailed exam metrics when selectedExamId changes
  useEffect(() => {
    if (!selectedExamId) return;

    const loadExamDetails = async () => {
      try {
        const [compRes, subRes, topRes, teaRes] = await Promise.allSettled([
          getClassComparisonApi({ examId: selectedExamId }),
          getSubjectAnalysisApi({ examId: selectedExamId }),
          getExamToppersApi({ examId: selectedExamId, limit: 10 }),
          getTeacherContextApi({ examId: selectedExamId }),
        ]);

        if (compRes.status === "fulfilled") {
          setClassComparison(compRes.value.data?.data?.classes || []);
        }
        if (subRes.status === "fulfilled") {
          setSubjects(subRes.value.data?.data?.subjects || []);
        }
        if (topRes.status === "fulfilled") {
          setToppers(topRes.value.data?.data?.toppers || []);
        }
        if (teaRes.status === "fulfilled") {
          setTeacherContext(teaRes.value.data?.data?.teachers || []);
        }
      } catch (err) {
        toast.error("Failed to load exam analytics details");
      }
    };

    loadExamDetails();
  }, [selectedExamId]);

  const summary = overviewData.summary || {};
  const selectedExam = overviewData.exams?.find((e) => e.examId === selectedExamId);

  // Prepare trend data across published exams
  const trendChartData = (overviewData.exams || []).map((e) => ({
    name: e.examName,
    avg: e.avgPercentage,
    pass: e.passPercentage,
  }));

  // Prepare class comparison chart data
  const classChartData = (classComparison || []).map((c) => ({
    name: `${c.className}-${c.section}`,
    avg: c.avgPercentage,
    pass: c.passPercentage,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-[#1F4E79]" />
            Academic Analytics & Results
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Institutional performance metrics, subject mastery, and teacher review across published exams.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Academic Year (e.g. 2025-2026)"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl shadow-2xs focus:ring-2 focus:ring-[#1F4E79]/20 focus:outline-none"
          />
          <button
            onClick={loadOverview}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl shadow-2xs transition"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Macro KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Published Exams</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{summary.totalPublishedExams || 0}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Across classes</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Evaluated Students</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{summary.totalStudentsEvaluated || 0}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">With published marks</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">School Average</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-0.5">
              {summary.schoolAveragePercentage != null ? `${summary.schoolAveragePercentage}%` : "0%"}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Macro student aggregate</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Overall Pass Rate</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-0.5">
              {summary.overallPassPercentage != null ? `${summary.overallPassPercentage}%` : "0%"}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Minimum passing criteria</p>
          </div>
        </div>
      </div>

      {/* Exam Selector Bar */}
      {overviewData.exams?.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-700">Detailed Exam Focus:</span>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
            >
              {overviewData.exams.map((ex) => (
                <option key={ex.examId} value={ex.examId}>
                  {ex.examName} ({ex.classInfo} - {ex.academicYear})
                </option>
              ))}
            </select>
          </div>

          {/* Sub Tabs */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "overview" ? "bg-white text-[#1F4E79] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Class Comparison
            </button>
            <button
              onClick={() => setActiveTab("subjects")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "subjects" ? "bg-white text-[#1F4E79] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Subject Analysis
            </button>
            <button
              onClick={() => setActiveTab("teachers")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "teachers" ? "bg-white text-[#1F4E79] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Teacher Review
            </button>
            <button
              onClick={() => setActiveTab("toppers")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === "toppers" ? "bg-white text-[#1F4E79] shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Exam Toppers
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: Class Comparison & Trend */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Class Comparison Chart */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#1F4E79]" />
              Class Comparison: Average % & Pass %
            </h3>
            {classChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avg" name="Average %" fill="#1F4E79" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pass" name="Pass %" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-12 text-center">No class performance records for this exam.</p>
            )}
          </div>

          {/* Exam Average Trend */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Published Exams Performance Trend
            </h3>
            {trendChartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="avg"
                      name="Average %"
                      stroke="#2563a8"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="pass"
                      name="Pass Rate %"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-12 text-center">No trend data available.</p>
            )}
          </div>

          {/* Class Detailed Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Class Performance Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Evaluated</th>
                    <th className="py-3 px-4">Class Avg %</th>
                    <th className="py-3 px-4">Pass Rate</th>
                    <th className="py-3 px-4">Top Scorer</th>
                    <th className="py-3 px-4">Bottom Scorer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classComparison.map((cls, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        Class {cls.className} - {cls.section}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{cls.totalStudents}</td>
                      <td className="py-3 px-4 font-bold text-blue-700">{cls.avgPercentage}%</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold ${
                            cls.passPercentage >= 75
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {cls.passPercentage}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {cls.topScorer ? (
                          <div className="text-emerald-700 font-medium">
                            {cls.topScorer.name} ({cls.topScorer.percentage}%)
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {cls.bottomScorer ? (
                          <div className="text-slate-500">
                            {cls.bottomScorer.name} ({cls.bottomScorer.percentage}%)
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Subject Analysis */}
      {activeTab === "subjects" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Subject Mastery & Attention Indicators</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Flags subjects where failure rate exceeds 25% for proactive curriculum revision.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Max Marks</th>
                  <th className="py-3 px-4">Passing</th>
                  <th className="py-3 px-4">Students</th>
                  <th className="py-3 px-4">Avg Marks</th>
                  <th className="py-3 px-4">Avg %</th>
                  <th className="py-3 px-4">Fail %</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-800">{sub.subjectName}</td>
                    <td className="py-3 px-4 text-slate-600">{sub.maxMarks}</td>
                    <td className="py-3 px-4 text-slate-600">{sub.passingMarks}</td>
                    <td className="py-3 px-4 text-slate-600">{sub.studentsCount}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{sub.avgMarks}</td>
                    <td className="py-3 px-4 font-bold text-[#1F4E79]">{sub.avgPercentage}%</td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${sub.failPercentage > 20 ? "text-rose-600" : "text-slate-600"}`}>
                        {sub.failPercentage}% ({sub.failCount})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {sub.needsAttention ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Needs Attention
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Healthy
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Teacher Review (MANDATORY: "for review, not ranking" alphabetical default) */}
      {activeTab === "teachers" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Teacher Contextual Review</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Classroom delivery outcomes grouped by assigned instructor across timetable periods.
              </p>
            </div>
            {/* MANDATORY NOTICE BANNER */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
              <Info className="w-4 h-4 text-amber-600" />
              For review, not ranking
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4">Instructor Name</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Strength</th>
                  <th className="py-3 px-4">Class Average</th>
                  <th className="py-3 px-4">Pass Rate</th>
                  <th className="py-3 px-4">Change vs Previous</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teacherContext.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-800">{t.teacherName}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{t.subject}</td>
                    <td className="py-3 px-4 text-slate-600">{t.className}</td>
                    <td className="py-3 px-4 text-slate-600">{t.classStrength} students</td>
                    <td className="py-3 px-4 font-bold text-blue-700">{t.avgPercentage}%</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{t.passPercentage}%</td>
                    <td className="py-3 px-4">
                      {t.changeVsPrevious != null ? (
                        <span
                          className={`font-bold px-2 py-0.5 rounded-full ${
                            t.changeVsPrevious >= 0
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {t.changeVsPrevious >= 0 ? `+${t.changeVsPrevious}%` : `${t.changeVsPrevious}%`}
                        </span>
                      ) : (
                        <span className="text-slate-400">Baseline</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Exam Toppers */}
      {activeTab === "toppers" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Honor Roll & Exam Toppers
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Top-ranking students for {selectedExam?.examName}.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3 px-4 w-16 text-center">Rank</th>
                  <th className="py-3 px-4">Student Details</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Marks Obtained</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {toppers.map((top) => (
                  <tr key={top.rank} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs ${
                          top.rank === 1
                            ? "bg-amber-100 text-amber-800 ring-2 ring-amber-300"
                            : top.rank === 2
                            ? "bg-slate-200 text-slate-700"
                            : top.rank === 3
                            ? "bg-amber-700/10 text-amber-900"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        #{top.rank}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{top.name}</p>
                      <p className="text-[11px] text-slate-400">Adm: {top.admissionNumber || "-"}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{top.className}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {top.totalMarksObtained} / {top.totalMaxMarks}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700 text-sm">{top.percentage}%</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono font-bold text-slate-800">
                        {top.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Academics;
