import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  BarChart3,
  TrendingUp,
  Award,
  AlertCircle,
  Users,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getClassesApi } from "../../../api/classApi";
import { fetchExamsByClass, fetchExamAnalytics } from "../../../features/exam/examSlice";

const GRADE_COLORS = {
  "A+": "#10B981",
  A: "#059669",
  "B+": "#0284C7",
  B: "#0369A1",
  C: "#F59E0B",
  D: "#F97316",
  F: "#EF4444",
};

const PerformanceAnalytics = () => {
  const dispatch = useDispatch();
  const { exams, analytics, loading } = useSelector((state) => state.exam);

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");

  // Load classes
  useEffect(() => {
    const loadInit = async () => {
      try {
        const res = await getClassesApi({ limit: 100 });
        const list = res.data?.data || res.data || [];
        setClasses(list);
        if (list.length > 0) {
          setSelectedClassId(list[0]._id);
        }
      } catch (err) {
        toast.error("Failed to load classes.");
      }
    };
    loadInit();
  }, []);

  // Fetch exams when class changes
  useEffect(() => {
    if (selectedClassId) {
      dispatch(fetchExamsByClass(selectedClassId));
      setSelectedExamId("");
    }
  }, [selectedClassId, dispatch]);

  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0]._id);
    }
  }, [exams, selectedExamId]);

  // Fetch analytics when exam selected
  useEffect(() => {
    if (selectedClassId && selectedExamId) {
      dispatch(fetchExamAnalytics({ classId: selectedClassId, examId: selectedExamId }));
    }
  }, [selectedClassId, selectedExamId, dispatch]);

  const summary = analytics?.summary || {
    totalStudents: 0,
    passedCount: 0,
    failedCount: 0,
    avgPercentage: 0,
    passPercentage: 0,
  };

  const subjectData = (analytics?.subjectAverages || []).map((s) => ({
    subject: s.subjectName,
    average: s.avgMarks,
    highest: s.highestMarks,
  }));

  const gradeData = (analytics?.gradeDistribution || []).map((g) => ({
    name: g.grade,
    value: g.count,
    color: GRADE_COLORS[g.grade] || "#64748B",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Exam Performance & Analytics</h2>
        <p className="text-xs text-slate-500 mt-1">
          In-depth class performance telemetry, subject score distributions, pass/fail ratios, and grade analytics.
        </p>
      </div>

      {/* Selectors */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Class Section</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
            >
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  Class {c.className} - {c.section} ({c.academicYear})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Examination</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
            >
              {exams.map((ex) => (
                <option key={ex._id} value={ex._id}>
                  {ex.examName} ({ex.academicYear})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#1F4E79]" />
          <p className="text-sm">Calculating performance analytics telemetry...</p>
        </div>
      ) : !analytics ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center text-slate-400 text-xs">
          No analytics data available for this examination. Ensure marks have been recorded.
        </div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Class Pass Rate</p>
                <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                  {summary.passPercentage}%
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {summary.passedCount} passed / {summary.totalStudents} total
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Class Average</p>
                <p className="text-2xl font-extrabold text-[#1F4E79] mt-1">
                  {summary.avgPercentage}%
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Overall aggregate</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#1F4E79]/10 text-[#1F4E79] flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Class Topper</p>
                <p className="text-sm font-bold text-slate-800 mt-1 truncate max-w-[140px]">
                  {analytics.topper?.name || "N/A"}
                </p>
                <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
                  {analytics.topper ? `${analytics.topper.percentage}% (${analytics.topper.grade})` : "-"}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Students Needing Support</p>
                <p className="text-2xl font-extrabold text-rose-600 mt-1">{summary.failedCount}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Failed in 1+ subjects</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Subject Averages Bar Chart */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">Subject-wise Class Average</h3>
                <span className="text-[11px] text-slate-400">Average marks score</span>
              </div>

              <div className="h-72 w-full">
                {subjectData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No subject data recorded.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectData} margin={{ top: 10, right: 20, left: -15, bottom: 20 }}>
                      <XAxis dataKey="subject" tick={{ fontSize: 11 }} interval={0} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="average" name="Class Average" fill="#1F4E79" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Grade Distribution Pie Chart */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">Grade Distribution</h3>
                <span className="text-[11px] text-slate-400">Student count by grade</span>
              </div>

              <div className="h-72 w-full flex items-center justify-center">
                {gradeData.length === 0 ? (
                  <div className="text-xs text-slate-400">No grades recorded.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gradeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {gradeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PerformanceAnalytics;
