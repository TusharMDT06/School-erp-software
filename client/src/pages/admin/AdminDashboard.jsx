import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Users,
  GraduationCap,
  School,
  CalendarCheck2,
  DollarSign,
  Award,
  TrendingUp,
  ArrowRight,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ChevronRight,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { getAdminDashboardStatsApi } from "../../api/dashboardApi";

// ─── Stat Card Component ───────────────────────────────────────────────────
const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, onClick }) => {
  const colorMap = {
    blue: "bg-blue-50 text-[#1F4E79] border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    sky: "bg-sky-50 text-sky-700 border-sky-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
  };

  const iconColor = colorMap[color] || colorMap.blue;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
        onClick ? "cursor-pointer group" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1.5">{value}</h3>
        </div>
        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
        <span className="text-slate-500">{subtitle}</span>
        {trend && (
          <span className="font-semibold text-emerald-600 flex items-center gap-0.5">
            <TrendingUp className="w-3.5 h-3.5" /> {trend}
          </span>
        )}
        {onClick && (
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#1F4E79] transition-colors" />
        )}
      </div>
    </div>
  );
};

// ─── Skeleton Loader ────────────────────────────────────────────────────────
const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-16 bg-slate-200 rounded-2xl w-full" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-32 bg-slate-200 rounded-2xl" />
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-80 bg-slate-200 rounded-2xl" />
      <div className="h-80 bg-slate-200 rounded-2xl" />
    </div>
  </div>
);

// ─── Main Admin Dashboard Component ─────────────────────────────────────────
const AdminDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await getAdminDashboardStatsApi();
      setStats(res.data);
    } catch (err) {
      toast.error("Failed to load dashboard statistics.");
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  if (loading) return <DashboardSkeleton />;

  const counts = stats?.counts || {};
  const todayAttendance = stats?.todayAttendance || {};
  const finance = stats?.finance || {};
  const classDistribution = stats?.classDistribution || [];
  const attendanceTrend = stats?.attendanceTrend || [];
  const recentStudents = stats?.recentStudents || [];
  const recentTransactions = finance?.recentTransactions || [];
  const recentExams = stats?.recentExams || [];

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header / Welcome Banner ──────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1F4E79] via-[#2563a8] to-[#1a3d5c] p-6 sm:p-8 text-white shadow-lg shadow-blue-900/10">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-blue-100 backdrop-blur-sm flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                {user?.role === "superadmin" ? "Superadmin Portal" : "Admin Portal"}
              </span>
              <span className="text-xs text-blue-200/80">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {getGreeting()}, {user?.name || "Administrator"}! 👋
            </h1>
            <p className="text-blue-100 text-sm mt-1 max-w-xl">
              Here is what's happening in your school today across admissions, attendance, fees, and exams.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/20 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => navigate("/admin/students")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#1F4E79] hover:bg-blue-50 text-xs font-bold shadow-md shadow-black/10 transition-all"
            >
              <Plus className="w-4 h-4" /> Add Admission
            </button>
          </div>
        </div>
      </div>

      {/* ── Key Metric Summary Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Students"
          value={counts.totalStudents || 0}
          subtitle={`${counts.activeStudents || 0} Active · ${counts.pendingActivationStudents || 0} Pending`}
          icon={GraduationCap}
          color="blue"
          onClick={() => navigate("/admin/students")}
        />
        <StatCard
          title="Teachers"
          value={counts.totalTeachers || 0}
          subtitle="Assigned Faculty"
          icon={Users}
          color="emerald"
          onClick={() => navigate("/admin/teachers")}
        />
        <StatCard
          title="Classes"
          value={counts.totalClasses || 0}
          subtitle="Sections Active"
          icon={School}
          color="purple"
          onClick={() => navigate("/admin/classes")}
        />
        <StatCard
          title="Attendance"
          value={`${todayAttendance.percentage || 0}%`}
          subtitle={`Today: ${todayAttendance.present || 0} Present / ${todayAttendance.absent || 0} Absent`}
          icon={CalendarCheck2}
          color="sky"
          trend={todayAttendance.percentage >= 75 ? "Optimal" : "Attention"}
          onClick={() => navigate("/admin/attendance")}
        />
        <StatCard
          title="Fee Revenue"
          value={`₹${(finance.totalRevenue || 0).toLocaleString("en-IN")}`}
          subtitle={`₹${(finance.pendingRevenue || 0).toLocaleString("en-IN")} Pending`}
          icon={DollarSign}
          color="amber"
          onClick={() => navigate("/admin/fees")}
        />
        <StatCard
          title="Exams"
          value={counts.totalExams || 0}
          subtitle="Scheduled / Published"
          icon={Award}
          color="rose"
          onClick={() => navigate("/admin/exams")}
        />
      </div>

      {/* ── Quick Actions Bar ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate("/admin/students")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#1F4E79]" /> Add Student
          </button>
          <button
            onClick={() => navigate("/admin/teachers")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600" /> Add Teacher
          </button>
          <button
            onClick={() => navigate("/admin/attendance")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
          >
            <CalendarCheck2 className="w-3.5 h-3.5 text-sky-600" /> Attendance Reports
          </button>
          <button
            onClick={() => navigate("/admin/fees/defaulters")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Fee Defaulters
          </button>
          <button
            onClick={() => navigate("/admin/exams/publish")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors"
          >
            <Award className="w-3.5 h-3.5 text-purple-600" /> Publish Results
          </button>
        </div>
      </div>

      {/* ── Charts Section ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Trend Area Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Weekly Attendance Trend</h3>
              <p className="text-xs text-slate-400 mt-0.5">Daily present vs absent student count (Last 7 Days)</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700">
              Live Feed
            </span>
          </div>

          <div className="h-64 w-full">
            {attendanceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1F4E79" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#1F4E79" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Area
                    type="monotone"
                    dataKey="present"
                    name="Present"
                    stroke="#1F4E79"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorPresent)"
                  />
                  <Area
                    type="monotone"
                    dataKey="absent"
                    name="Absent"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAbsent)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <CalendarCheck2 className="w-8 h-8 mb-2 text-slate-300" />
                No attendance logs recorded for this week yet
              </div>
            )}
          </div>
        </div>

        {/* Class Distribution Bar Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Class-Wise Enrollment</h3>
              <p className="text-xs text-slate-400 mt-0.5">Distribution of students across active sections</p>
            </div>
            <button
              onClick={() => navigate("/admin/classes")}
              className="text-xs font-semibold text-[#1F4E79] hover:underline"
            >
              View Classes →
            </button>
          </div>

          <div className="h-64 w-full">
            {classDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="className" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="students" name="Students" fill="#1F4E79" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <School className="w-8 h-8 mb-2 text-slate-300" />
                No class enrollment data available yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Section: Recent Admissions, Recent Fee Activity, and Exams ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Admissions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Recent Admissions</h3>
                <p className="text-xs text-slate-400 mt-0.5">Newly enrolled students</p>
              </div>
              <button
                onClick={() => navigate("/admin/students")}
                className="text-xs font-semibold text-[#1F4E79] hover:underline"
              >
                All →
              </button>
            </div>

            <div className="divide-y divide-slate-50">
              {recentStudents.length > 0 ? (
                recentStudents.map((s) => (
                  <div
                    key={s._id}
                    onClick={() => navigate(`/admin/students/${s._id}`)}
                    className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 rounded-xl px-2 -mx-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-50 text-[#1F4E79] font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {s.userId?.profileImage ? (
                          <img
                            src={s.userId.profileImage}
                            alt={s.name || s.userId?.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          (s.name || s.userId?.name || "S").charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">
                          {s.name || s.userId?.name}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">{s.admissionNumber}</p>
                      </div>
                    </div>
                    <div>
                      {s.isAccountActivated ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-8">No students enrolled yet.</p>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate("/admin/students")}
            className="w-full mt-4 py-2 text-xs font-semibold text-[#1F4E79] bg-blue-50 hover:bg-blue-100/70 rounded-xl transition-colors text-center"
          >
            Manage All Students
          </button>
        </div>

        {/* Recent Fee Transactions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Recent Payments</h3>
                <p className="text-xs text-slate-400 mt-0.5">Latest fee collection records</p>
              </div>
              <button
                onClick={() => navigate("/admin/fees")}
                className="text-xs font-semibold text-[#1F4E79] hover:underline"
              >
                All →
              </button>
            </div>

            <div className="divide-y divide-slate-50">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => (
                  <div key={tx._id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {tx.studentId?.name || tx.studentId?.userId?.name || "Student"}
                      </p>
                      <p className="text-[11px] text-slate-400 capitalize">
                        {tx.paymentMode || "Online"} · {new Date(tx.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800">₹{(tx.amount || 0).toLocaleString("en-IN")}</p>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          tx.status === "paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : tx.status === "failed"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-8">No recent transactions recorded.</p>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate("/admin/fees/defaulters")}
            className="w-full mt-4 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100/70 rounded-xl transition-colors text-center"
          >
            Check Defaulters List
          </button>
        </div>

        {/* Exams & Academic Status */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Exams & Academic</h3>
                <p className="text-xs text-slate-400 mt-0.5">Upcoming & published evaluations</p>
              </div>
              <button
                onClick={() => navigate("/admin/exams")}
                className="text-xs font-semibold text-[#1F4E79] hover:underline"
              >
                All →
              </button>
            </div>

            <div className="divide-y divide-slate-50">
              {recentExams.length > 0 ? (
                recentExams.map((ex) => (
                  <div key={ex._id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{ex.examName}</p>
                      <p className="text-[11px] text-slate-400">
                        {ex.classId ? `Class ${ex.classId.className}-${ex.classId.section}` : "Class N/A"} ·{" "}
                        {ex.academicYear || "2026-2027"}
                      </p>
                    </div>
                    <div>
                      {ex.isPublished ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          Published
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                          Scheduled
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-8">No exams scheduled yet.</p>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate("/admin/exams/publish")}
            className="w-full mt-4 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100/70 rounded-xl transition-colors text-center"
          >
            Review & Publish Results
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
