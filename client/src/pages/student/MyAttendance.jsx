import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Loader2,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { getMyStudentProfileApi, getStudentsApi } from "../../api/studentApi";
import { fetchStudentAttendanceReport } from "../../features/attendance/attendanceSlice";
import AttendanceCalendar from "../../components/attendance/AttendanceCalendar";

const MyAttendance = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { studentReport, loading } = useSelector((state) => state.attendance);

  const [student, setStudent] = useState(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoadingStudent(true);
        setProfileError(null);
        let studentData = null;

        try {
          const res = await getMyStudentProfileApi();
          studentData = res.data;
        } catch (err) {
          // Fallback to student query if /me has any issue
          const fallbackRes = await getStudentsApi({ search: user?.name, limit: 10 });
          const list = fallbackRes.data?.data || fallbackRes.data || [];
          studentData = list[0] || null;
        }

        if (studentData) {
          setStudent(studentData);
          dispatch(fetchStudentAttendanceReport({ studentId: studentData._id }));
        } else {
          setProfileError("No student profile linked to your account.");
        }
      } catch (err) {
        const msg =
          err.response?.data?.message || "Failed to load your student profile.";
        setProfileError(msg);
        toast.error(msg);
      } finally {
        setLoadingStudent(false);
      }
    };

    loadProfile();
  }, [dispatch, user?.name]);

  const stats = studentReport || {
    totalDays: 0,
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    percentage: 0,
    dailyRecords: [],
  };

  const pct = stats.percentage || 0;
  const isHealthy = pct >= 75;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">My Attendance</h2>
        <p className="text-xs text-slate-500 mt-1">
          Track your daily attendance record, overall percentage, and leave history.
        </p>
      </div>

      {loadingStudent || loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-[#1F4E79]" />
          <p className="text-sm text-slate-500">Loading attendance data...</p>
        </div>
      ) : profileError ? (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-12 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
          <p className="text-sm text-rose-600 font-medium">{profileError}</p>
          <p className="text-xs text-slate-400 mt-1">
            Contact your school administrator to link your student profile.
          </p>
        </div>
      ) : (
        <>
          {/* Main Stat Card Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Percentage Stat Box */}
            <div className="bg-gradient-to-br from-[#1F4E79] to-[#2563a8] text-white p-6 rounded-3xl shadow-md shadow-[#1F4E79]/20 flex flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Overall Attendance
                </span>
                <div className="mt-4 flex items-baseline gap-2">
                  <h3 className="text-4xl font-extrabold tracking-tight">{pct}%</h3>
                  <span
                    className={`text-sm font-semibold px-2 py-0.5 rounded-full ${
                      isHealthy ? "bg-emerald-400/20 text-emerald-200" : "bg-rose-400/20 text-rose-200"
                    }`}
                  >
                    {isHealthy ? "On Track ✓" : "Low Attendance ⚠"}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/20 text-xs text-white/80">
                <p>
                  Class: <strong>{student?.classId?.className || "N/A"}-{student?.classId?.section || ""}</strong> | Roll: <strong>{student?.rollNumber || "-"}</strong>
                </p>
              </div>
            </div>

            {/* Breakdown Cards */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Present</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-emerald-700">{stats.present}</p>
                  <p className="text-[11px] text-slate-400">Days attended</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Absent</span>
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-rose-700">{stats.absent}</p>
                  <p className="text-[11px] text-slate-400">Days absent</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Late</span>
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-amber-700">{stats.late}</p>
                  <p className="text-[11px] text-slate-400">Late arrivals</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Leave</span>
                  <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-2xl font-bold text-sky-700">{stats.leave}</p>
                  <p className="text-[11px] text-slate-400">Approved leaves</p>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Attendance Calendar */}
          <AttendanceCalendar
            dailyRecords={stats.dailyRecords}
            studentName={student?.userId?.name || user?.name}
          />
        </>
      )}
    </div>
  );
};

export default MyAttendance;
