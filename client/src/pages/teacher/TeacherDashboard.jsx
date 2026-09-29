import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { getTeacherDashboardApi } from "../../api/teacherDashboardApi";
import toast from "react-hot-toast";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ClipboardList,
  Award,
  Cake,
  FileCheck,
  Send,
  Users,
  ChevronRight,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Sun,
  ShieldCheck,
  Info,
} from "lucide-react";

const TeacherDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const res = await getTeacherDashboardApi();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("Failed to load teacher dashboard:", err);
      toast.error(err.response?.data?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Current date formatting
  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-pulse">
        {/* Skeleton Header */}
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  const {
    todaysPeriods = [],
    holidayReason = null,
    attendancePending = [],
    marksEntryPending = [],
    homeworkToReview = 0,
    upcomingExams = [],
    leaveStatus = null,
    circularsPendingAck = 0,
    classSnapshot = null,
    birthdaysToday = [],
  } = data || {};

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header Banner ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white p-6 md:p-8 shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-2">
              <Sun className="w-3.5 h-3.5 text-amber-300" />
              Teacher Workspace
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Good day, {user?.name || "Teacher"}!
            </h1>
            <p className="text-emerald-100 text-sm md:text-base mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 opacity-80" />
              {todayFormatted}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-xl backdrop-blur-sm text-sm font-medium border border-white/20"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Updating..." : "Refresh"}</span>
            </button>

            <Link
              to="/teacher/attendance"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 transition-all rounded-xl font-semibold text-sm shadow-md"
            >
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              <span>Mark Attendance</span>
            </Link>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* ── Circulars Pending Acknowledgement Banner ──────────────────────── */}
      {circularsPendingAck > 0 && (
        <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-sm">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg text-amber-700 dark:text-amber-300">
              <Send className="w-4 h-4" />
            </span>
            <div>
              <p className="font-semibold">
                You have {circularsPendingAck} circular(s) awaiting acknowledgement!
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Please review and sign off on institutional notices.
              </p>
            </div>
          </div>
          <Link
            to="/circulars"
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Review Now
          </Link>
        </div>
      )}

      {/* ── Quick Action Summary Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Pending */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Today's Attendance
            </span>
            <span
              className={`p-2 rounded-lg ${
                attendancePending.length > 0
                  ? "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                  : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
              }`}
            >
              <ClipboardList className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {attendancePending.length === 0 ? "Complete" : `${attendancePending.length} Pending`}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {attendancePending.length === 0
                ? "All assigned classes marked"
                : `${attendancePending.map((c) => `${c.className}-${c.section}`).join(", ")}`}
            </p>
          </div>
          {attendancePending.length > 0 && (
            <Link
              to="/teacher/attendance"
              className="mt-3 inline-flex items-center text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline gap-1"
            >
              Mark today's attendance <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Homework to Review */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Homework Reviews
            </span>
            <span className="p-2 rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
              <FileCheck className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {homeworkToReview}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {homeworkToReview === 1 ? "Submission awaiting review" : "Submissions awaiting review"}
            </p>
          </div>
          <Link
            to="/teacher/homework"
            className="mt-3 inline-flex items-center text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline gap-1"
          >
            Go to Homework <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Marks Entry Pending */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Marks Entry
            </span>
            <span className="p-2 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Award className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {marksEntryPending.length === 0 ? "Up to date" : `${marksEntryPending.length} Exams`}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {marksEntryPending.length === 0
                ? "All exam marks recorded"
                : `${marksEntryPending[0]?.subject || "Exams"} pending`}
            </p>
          </div>
          {marksEntryPending.length > 0 ? (
            <Link
              to="/teacher/marks"
              className="mt-3 inline-flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline gap-1"
            >
              Enter marks <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link
              to="/teacher/marks"
              className="mt-3 inline-flex items-center text-xs font-semibold text-slate-400 hover:underline gap-1"
            >
              View marks registry <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Latest Leave Status */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              My Leave Status
            </span>
            <span className="p-2 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <Clock className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100 capitalize">
              {leaveStatus ? leaveStatus.status : "No Active Leaves"}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {leaveStatus
                ? `${new Date(leaveStatus.fromDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })} - ${new Date(leaveStatus.toDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}`
                : "Apply for leaves in portal"}
            </p>
          </div>
          <Link
            to="/teacher/dashboard"
            onClick={() => toast("Leave management is available under your user profile.", { icon: "ℹ️" })}
            className="mt-3 inline-flex items-center text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline gap-1"
          >
            Check leaves <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Main Content Columns: Schedule Timeline vs Right Sidebar ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Period Timeline & Checklist */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  Today's Teaching Schedule
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Periods scheduled for today ({todaysPeriods.length} session{todaysPeriods.length === 1 ? "" : "s"})
                </p>
              </div>

              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-lg">
                {todaysPeriods.length} Periods
              </span>
            </div>

            {holidayReason ? (
              <div className="p-8 text-center bg-amber-50 dark:bg-amber-950/20 border border-dashed border-amber-300 dark:border-amber-800 rounded-xl">
                <Sun className="w-12 h-12 text-amber-500 mx-auto mb-3 animate-pulse" />
                <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
                  School Holiday Declared
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1 max-w-md mx-auto">
                  {holidayReason}. Regular teaching periods and attendance are suspended today. Enjoy your day!
                </p>
              </div>
            ) : todaysPeriods.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No Teaching Periods Today
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  You have no regular classes scheduled for today. Check with the administrator for substitutions.
                </p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {todaysPeriods.map((slot, index) => (
                  <div
                    key={index}
                    className={`relative p-4 rounded-xl border transition-all ${
                      slot.isSubstitution
                        ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                        : "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700"
                    }`}
                  >
                    {/* Timeline bullet dot */}
                    <div
                      className={`absolute -left-[27px] top-5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                        slot.isSubstitution ? "bg-amber-500" : "bg-emerald-600"
                      }`}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                            {slot.period}
                          </span>
                          {slot.isSubstitution && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 uppercase">
                              Substitution Class
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                          {slot.subject}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Class: <strong className="text-slate-700 dark:text-slate-300">{slot.className} - Section {slot.section}</strong>
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {slot.startTime} {slot.endTime ? `- ${slot.endTime}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Checklist Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Teacher Action Checklist
            </h2>

            <div className="space-y-3">
              {/* Item: Attendance */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span
                    className={`p-2 rounded-lg ${
                      attendancePending.length > 0
                        ? "bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400"
                        : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                    }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Class Attendance Marking
                    </p>
                    <p className="text-xs text-slate-500">
                      {attendancePending.length === 0
                        ? "All assigned attendance submitted for today"
                        : `${attendancePending.length} class(es) pending today`}
                    </p>
                  </div>
                </div>

                {attendancePending.length > 0 ? (
                  <Link
                    to={`/teacher/attendance?classId=${attendancePending[0].classId}`}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    Mark Now
                  </Link>
                ) : (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Done
                  </span>
                )}
              </div>

              {/* Item: Homework Reviews */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span
                    className={`p-2 rounded-lg ${
                      homeworkToReview > 0
                        ? "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400"
                        : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                    }`}
                  >
                    <FileCheck className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Homework Submissions Grading
                    </p>
                    <p className="text-xs text-slate-500">
                      {homeworkToReview === 0
                        ? "No pending submissions to grade"
                        : `${homeworkToReview} student submission(s) awaiting your feedback`}
                    </p>
                  </div>
                </div>

                {homeworkToReview > 0 ? (
                  <Link
                    to="/teacher/homework"
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    Review Now
                  </Link>
                ) : (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Up to date
                  </span>
                )}
              </div>

              {/* Item: Marks Entry */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span
                    className={`p-2 rounded-lg ${
                      marksEntryPending.length > 0
                        ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                        : "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                    }`}
                  >
                    <Award className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Examination Marks Entry
                    </p>
                    <p className="text-xs text-slate-500">
                      {marksEntryPending.length === 0
                        ? "All exam marks submitted"
                        : `${marksEntryPending.length} subject exam entry pending`}
                    </p>
                  </div>
                </div>

                {marksEntryPending.length > 0 ? (
                  <Link
                    to="/teacher/marks"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    Enter Marks
                  </Link>
                ) : (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Completed
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Class Snapshot, Upcoming Exams, Birthdays */}
        <div className="space-y-6">
          {/* Class Teacher Snapshot (if applicable) */}
          {classSnapshot && (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
                  Class Teacher
                </span>
                <span className="text-xs text-slate-400">
                  {classSnapshot.className} - {classSnapshot.section}
                </span>
              </div>

              <h3 className="text-lg font-bold">Class {classSnapshot.className}-{classSnapshot.section} Snapshot</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Total Enrolled: {classSnapshot.totalStudents} Students
              </p>

              <div className="grid grid-cols-2 gap-4 mt-5">
                {/* Attendance today % */}
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Attendance Today</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-400 mt-2">
                    {classSnapshot.attendanceTodayPercent}%
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all"
                      style={{ width: `${classSnapshot.attendanceTodayPercent}%` }}
                    />
                  </div>
                </div>

                {/* Homework Completion % */}
                <div className="bg-white/5 rounded-xl p-3.5 border border-white/10">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>HW Submitted</span>
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <div className="text-2xl font-bold text-sky-400 mt-2">
                    {classSnapshot.homeworkCompletionPercent}%
                  </div>
                  <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-sky-400 h-full rounded-full transition-all"
                      style={{ width: `${classSnapshot.homeworkCompletionPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Exams (Next 14 Days) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Upcoming Exams (14 Days)
            </h3>

            {upcomingExams.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                No exams scheduled in the next 14 days for your classes.
              </p>
            ) : (
              <div className="space-y-2.5">
                {upcomingExams.map((exam, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {exam.subjectName}
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        Class {exam.className}-{exam.section} • {exam.examName}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded-md">
                      {new Date(exam.examDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Birthdays Today */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-3">
              <Cake className="w-4 h-4 text-rose-500" />
              Student Birthdays Today 🎂
            </h3>

            {birthdaysToday.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                No student birthdays today in your assigned classes.
              </p>
            ) : (
              <div className="space-y-2">
                {birthdaysToday.map((st) => (
                  <div
                    key={st.id}
                    className="p-3 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-rose-900 dark:text-rose-200">{st.name}</p>
                      <p className="text-xs text-rose-700 dark:text-rose-400">
                        Class {st.className}-{st.section} • Roll #{st.rollNumber || "N/A"}
                      </p>
                    </div>
                    <span className="text-lg">🎉</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
