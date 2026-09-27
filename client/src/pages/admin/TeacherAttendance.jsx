import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { getTeachersApi } from "../../api/teacherApi";
import {
  markTeacherAttendanceApi,
  getTeacherAttendanceByDateApi,
} from "../../api/teacherAttendanceApi";
import {
  ClipboardList,
  Check,
  X,
  Clock,
  Calendar,
  Save,
  Mail,
  Users,
  RefreshCw,
} from "lucide-react";

const STATUS_CONFIG = {
  present: { label: "Present", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: Check },
  absent:  { label: "Absent",  color: "bg-red-100 text-red-700 border-red-200",             icon: X },
  late:    { label: "Late",    color: "bg-amber-100 text-amber-700 border-amber-200",        icon: Clock },
  leave:   { label: "Leave",   color: "bg-blue-100 text-blue-700 border-blue-200",           icon: Calendar },
  holiday: { label: "Holiday", color: "bg-purple-100 text-purple-700 border-purple-200",     icon: Calendar },
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const TeacherAttendancePage = () => {
  const [teachers, setTeachers] = useState([]);
  const [records, setRecords] = useState({});
  const [date, setDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, leave: 0, holiday: 0 });

  const loadTeachers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getTeachersApi({ limit: 500 });
      const list = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.teachers)
        ? res.data.teachers
        : [];
      setTeachers(list);
    } catch (err) {
      console.error("Error loading teachers:", err);
      toast.error("Failed to load teachers.");
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadExisting = useCallback(async (d, teacherList) => {
    const listToUse = teacherList || teachers;
    if (!Array.isArray(listToUse) || listToUse.length === 0) return;
    try {
      const res = await getTeacherAttendanceByDateApi(d);
      const existing = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : [];

      const updated = {};
      listToUse.forEach((t) => {
        if (t && t._id) {
          updated[t._id] = { status: "present", remarks: "" };
        }
      });

      existing.forEach((rec) => {
        const tid = String(rec.teacherId?._id || rec.teacherId || "");
        if (tid && updated[tid]) {
          updated[tid] = {
            status: rec.status || "present",
            remarks: rec.remarks || "",
          };
        }
      });

      setRecords(updated);
    } catch (err) {
      console.error("Error loading attendance for date:", err);
    }
  }, [teachers]);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  useEffect(() => {
    if (Array.isArray(teachers) && teachers.length > 0) {
      loadExisting(date, teachers);
    }
  }, [date, teachers, loadExisting]);

  useEffect(() => {
    const s = { present: 0, absent: 0, late: 0, leave: 0, holiday: 0 };
    Object.values(records).forEach((r) => {
      if (r && s[r.status] !== undefined) s[r.status]++;
    });
    setStats(s);
  }, [records]);

  const setStatus = (tid, status) =>
    setRecords((p) => ({
      ...p,
      [tid]: { ...(p[tid] || { remarks: "" }), status },
    }));

  const setRemarks = (tid, remarks) =>
    setRecords((p) => ({
      ...p,
      [tid]: { ...(p[tid] || { status: "present" }), remarks },
    }));

  const markAll = (status) => {
    if (!Array.isArray(teachers)) return;
    const u = {};
    teachers.forEach((t) => {
      if (t && t._id) {
        u[t._id] = { ...(records[t._id] || { remarks: "" }), status };
      }
    });
    setRecords(u);
  };

  const handleSubmit = async () => {
    if (!Array.isArray(teachers) || teachers.length === 0) {
      toast.error("No teachers found.");
      return;
    }
    const payload = teachers.map((t) => ({
      teacherId: t._id,
      status: records[t._id]?.status || "present",
      remarks: records[t._id]?.remarks || "",
    }));
    try {
      setSubmitting(true);
      await markTeacherAttendanceApi({ date, records: payload });
      toast.success("Attendance saved! Absent teachers notified via email.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-[#1F4E79] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#1F4E79]" />
            Teacher Attendance
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Mark daily attendance. Absent teachers get email notification automatically.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
          />
          <button onClick={() => markAll("present")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-sm font-medium transition">
            <Check className="w-4 h-4" /> All Present
          </button>
          <button onClick={() => loadExisting(date)} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Banner + Stats */}
      <div className="bg-gradient-to-r from-[#1F4E79] to-[#2563a8] rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Attendance for</p>
          <p className="text-white font-bold text-lg">{displayDate}</p>
        </div>
        <div className="flex gap-5 flex-wrap">
          {Object.entries(stats).map(([key, val]) => (
            <div key={key} className="text-center">
              <p className="text-white font-bold text-2xl">{val}</p>
              <p className="text-white/70 text-xs capitalize">{key}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Email alert notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <Mail className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700">
          <strong>Auto Email Alert:</strong> Teachers marked <strong>Absent</strong> receive an automatic email
          notification, and their monthly salary will have a per-day deduction applied.
        </p>
      </div>

      {/* Table */}
      {!Array.isArray(teachers) || teachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Users className="w-12 h-12 mb-3 opacity-40" />
          <p className="text-sm">No teachers found. Add teachers first.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["#", "Teacher", "Emp. ID", "Status", "Remarks"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {teachers.map((teacher, idx) => {
                  const tid = teacher._id;
                  const current = records[tid]?.status || "present";
                  return (
                    <tr key={tid} className={`hover:bg-slate-50/50 transition-colors ${current === "absent" ? "bg-red-50/30" : ""}`}>
                      <td className="px-5 py-3.5 text-xs text-slate-400 font-medium">{idx + 1}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1F4E79] to-[#2563a8] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {teacher.userId?.name?.charAt(0)?.toUpperCase() || "T"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{teacher.userId?.name || "—"}</p>
                            <p className="text-xs text-slate-400">{teacher.userId?.email || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">{teacher.employeeId || "—"}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1.5 flex-wrap">
                          {Object.entries(STATUS_CONFIG).map(([st, conf]) => {
                            const Icon = conf.icon;
                            const selected = current === st;
                            return (
                              <button
                                key={st}
                                onClick={() => setStatus(tid, st)}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                  selected ? conf.color + " shadow-sm scale-105" : "bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600"
                                }`}
                              >
                                <Icon className="w-3 h-3" />
                                {conf.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <input
                          type="text"
                          value={records[tid]?.remarks || ""}
                          onChange={(e) => setRemarks(tid, e.target.value)}
                          placeholder="Optional note..."
                          className="w-32 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 bg-slate-50"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <p className="text-xs text-slate-500">{teachers.length} teacher(s) · {stats.absent} absent today</p>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 bg-[#1F4E79] hover:bg-[#1a4269] text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-60 shadow-sm shadow-[#1F4E79]/30"
            >
              {submitting
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Save className="w-4 h-4" />}
              {submitting ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAttendancePage;
