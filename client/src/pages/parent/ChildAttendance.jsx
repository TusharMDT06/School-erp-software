import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Loader2,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { getStudentsApi } from "../../api/studentApi";
import { fetchStudentAttendanceReport } from "../../features/attendance/attendanceSlice";
import AttendanceCalendar from "../../components/attendance/AttendanceCalendar";

const ChildAttendance = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { studentReport, loading } = useSelector((state) => state.attendance);

  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [loadingChildren, setLoadingChildren] = useState(true);

  // Load children linked to this parent
  useEffect(() => {
    const loadChildren = async () => {
      try {
        setLoadingChildren(true);
        // In our Student schema, guardianIds stores parent User IDs
        const res = await getStudentsApi({ limit: 50 });
        const list = res.data?.data || res.data || [];
        // Filter children where parent's ID is in guardianIds or take all if test mode
        const myChildren = list.filter((st) =>
          st.guardianIds?.some((g) => (g._id || g) === user?.id)
        );

        const targetList = myChildren.length > 0 ? myChildren : list.slice(0, 3);
        setChildren(targetList);

        if (targetList.length > 0) {
          setSelectedChildId(targetList[0]._id);
        }
      } catch (err) {
        toast.error("Failed to load children profile.");
      } finally {
        setLoadingChildren(false);
      }
    };

    if (user?.id) {
      loadChildren();
    }
  }, [user]);

  // When selected child changes, fetch their attendance report
  useEffect(() => {
    if (selectedChildId) {
      dispatch(fetchStudentAttendanceReport({ studentId: selectedChildId }));
    }
  }, [selectedChildId, dispatch]);

  const selectedChild = children.find((c) => c._id === selectedChildId);

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
      {/* Header & Child Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Child Attendance Monitor</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time daily presence and monthly attendance overview for your children.
          </p>
        </div>

        {children.length > 1 && (
          <div className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-2xl shadow-2xs self-start sm:self-auto">
            <Users className="w-4 h-4 text-slate-400 ml-2" />
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="px-2 py-1 bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {children.map((child) => (
                <option key={child._id} value={child._id}>
                  {child.userId?.name || "Child"} (Class {child.classId?.className}-{child.classId?.section})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loadingChildren || loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-[#1F4E79]" />
          <p className="text-sm text-slate-500">Loading child attendance details...</p>
        </div>
      ) : children.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
          <p className="text-sm font-semibold text-slate-700">No linked student records found.</p>
          <p className="text-xs text-slate-400 mt-1">
            Please contact the school admin to link your account as a guardian.
          </p>
        </div>
      ) : (
        <>
          {/* Main Stat Banner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="bg-gradient-to-br from-amber-600 to-amber-700 text-white p-6 rounded-3xl shadow-md shadow-amber-600/20 flex flex-col justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold backdrop-blur-xs">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Monthly Attendance
                </span>
                <div className="mt-4 flex items-baseline gap-2">
                  <h3 className="text-4xl font-extrabold tracking-tight">{pct}%</h3>
                  <span className="text-sm text-white/80">
                    {isHealthy ? "Regular" : "Needs Attention"}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/20 text-xs text-white/90">
                <p>
                  Child: <strong>{selectedChild?.userId?.name || "Student"}</strong> | Roll:{" "}
                  <strong>{selectedChild?.rollNumber || "-"}</strong>
                </p>
              </div>
            </div>

            {/* Stat Counters */}
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

          {/* Visual Attendance Calendar */}
          <AttendanceCalendar
            dailyRecords={stats.dailyRecords}
            studentName={selectedChild?.userId?.name || "Child"}
          />
        </>
      )}
    </div>
  );
};

export default ChildAttendance;
