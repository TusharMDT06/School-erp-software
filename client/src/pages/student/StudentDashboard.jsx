import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  GraduationCap,
  CalendarCheck2,
  Award,
  DollarSign,
  TrendingUp,
  Download,
  Clock,
  Sparkles,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getStudentDashboardStatsApi } from "../../api/dashboardApi";
import GradeBadge from "../../components/exam/GradeBadge";

const StudentDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await getStudentDashboardStatsApi();
      setData(res.data);
    } catch (err) {
      toast.error("Failed to load student dashboard stats.");
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-200 rounded-2xl" />
          <div className="h-72 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const student = data?.student || {};
  const attendance = data?.attendance || { percentage: 0, totalDays: 0, present: 0, absent: 0, late: 0 };
  const results = data?.results || [];
  const latestResult = results[0] || null;
  const fees = data?.fees || { totalDue: 0, totalPaid: 0, pendingAmount: 0, transactions: [] };

  const subjectMarksChartData =
    latestResult?.marksObtained?.map((m) => ({
      subject: m.subjectName,
      marks: m.marks,
    })) || [];

  return (
    <div className="space-y-6 pb-10">
      {/* ── Welcome Banner ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1F4E79] via-[#2563a8] to-[#1a3d5c] p-6 sm:p-8 text-white shadow-lg shadow-blue-900/10">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-white/20 border-2 border-white/30 shadow-md flex-shrink-0 flex items-center justify-center text-white text-2xl font-bold">
              {user?.profileImage || student?.userId?.profileImage ? (
                <img
                  src={user?.profileImage || student?.userId?.profileImage}
                  alt={student.name || user?.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                (student.name || user?.name)?.charAt(0)?.toUpperCase()
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-blue-100 backdrop-blur-sm flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Student Portal
                </span>
                <span className="text-xs text-blue-200/90 font-mono bg-black/20 px-2.5 py-0.5 rounded-full">
                  Admission: {student.admissionNumber || "ADM-2026-001"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {getGreeting()}, {student.name || user?.name}! 🎓
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm mt-1">
                Class <strong>{student.className}</strong> · Roll Number: <strong>{student.rollNumber || "01"}</strong> · Academic Year: <strong>{student.academicYear}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => navigate("/student/results")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#1F4E79] hover:bg-blue-50 text-xs font-bold shadow-md shadow-black/10 transition-all"
            >
              <Award className="w-4 h-4" /> View Marksheets
            </button>
          </div>
        </div>
      </div>

      {/* ── Key Metrics Cards ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Card */}
        <div
          onClick={() => navigate("/student/attendance")}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{attendance.percentage}%</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-700 border border-sky-100 flex items-center justify-center">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {attendance.present} Present · {attendance.absent} Absent
            </span>
            <span className="font-semibold text-emerald-600 flex items-center gap-0.5">
              {attendance.percentage >= 75 ? "On Track" : "Low"}
            </span>
          </div>
        </div>

        {/* Academic Score Card */}
        <div
          onClick={() => navigate("/student/results")}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Latest Exam</p>
              <h3 className="text-2xl font-bold text-[#1F4E79] mt-1">
                {latestResult ? `${latestResult.percentage}%` : "Pending"}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-500 truncate max-w-[140px]">
              {latestResult ? latestResult.examName : "No exam yet"}
            </span>
            {latestResult && <GradeBadge grade={latestResult.grade} size="sm" />}
          </div>
        </div>

        {/* Fee Status Card */}
        <div
          onClick={() => navigate("/student/fees")}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fee Balance</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">
                ₹{fees.pendingAmount?.toLocaleString("en-IN")}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Paid: ₹{fees.totalPaid?.toLocaleString("en-IN")}
            </span>
            <span
              className={`font-semibold ${
                fees.pendingAmount === 0 ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {fees.pendingAmount === 0 ? "All Clear" : "Pending"}
            </span>
          </div>
        </div>

        {/* Class Section Info Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrollment</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{student.className}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#1F4E79] border border-blue-100 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-500">
            <span>Blood Group: {student.bloodGroup || "O+"}</span>
            <span className="text-emerald-600 font-semibold capitalize">{student.status || "Active"}</span>
          </div>
        </div>
      </div>

      {/* ── Quick Links Bar ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions:</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate("/student/attendance")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition"
          >
            <CalendarCheck2 className="w-3.5 h-3.5 text-sky-600" /> Attendance Calendar
          </button>
          <button
            onClick={() => navigate("/student/results")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition"
          >
            <Award className="w-3.5 h-3.5 text-purple-600" /> Exam Marksheets
          </button>
          <button
            onClick={() => navigate("/student/fees")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition"
          >
            <FileText className="w-3.5 h-3.5 text-amber-600" /> Fee Receipts
          </button>
        </div>
      </div>

      {/* ── Charts & Breakdown Section ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject-Wise Score Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Subject Performance</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Marks obtained in {latestResult ? latestResult.examName : "latest exam"} (Max: 100)
              </p>
            </div>
            {latestResult && <GradeBadge grade={latestResult.grade} size="sm" />}
          </div>

          <div className="h-64 w-full">
            {subjectMarksChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectMarksChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="subject" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="marks" name="Marks" fill="#1F4E79" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <Award className="w-8 h-8 mb-2 text-slate-300" />
                No exam score data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Attendance Breakdown & Recent Logs */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Attendance Log</h3>
                <p className="text-xs text-slate-400 mt-0.5">Summary of attendance for current academic session</p>
              </div>
              <button
                onClick={() => navigate("/student/attendance")}
                className="text-xs font-semibold text-[#1F4E79] hover:underline"
              >
                View Full Log →
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-center">
                <p className="text-lg font-bold text-emerald-700">{attendance.present}</p>
                <p className="text-[11px] text-emerald-800 font-medium">Present</p>
              </div>
              <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-xl text-center">
                <p className="text-lg font-bold text-rose-700">{attendance.absent}</p>
                <p className="text-[11px] text-rose-800 font-medium">Absent</p>
              </div>
              <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-center">
                <p className="text-lg font-bold text-amber-700">{attendance.late}</p>
                <p className="text-[11px] text-amber-800 font-medium">Late</p>
              </div>
            </div>

            {/* Teacher Appraisal if available */}
            {latestResult?.remarks && (
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-purple-900">Teacher Appraisal</p>
                  <p className="text-xs text-purple-800 mt-0.5 italic">"{latestResult.remarks}"</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate("/student/attendance")}
            className="w-full mt-4 py-2 text-xs font-semibold text-[#1F4E79] bg-blue-50 hover:bg-blue-100/70 rounded-xl transition text-center"
          >
            Open Interactive Calendar
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
