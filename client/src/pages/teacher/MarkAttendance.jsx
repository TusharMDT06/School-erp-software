import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Calendar,
  CheckCircle2,
  Users,
  Save,
  Loader2,
  CheckCheck,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { getClassesApi } from "../../api/classApi";
import { getStudentsApi } from "../../api/studentApi";
import {
  markAttendance,
  fetchClassAttendanceByDate,
} from "../../features/attendance/attendanceSlice";

const STATUS_OPTIONS = [
  {
    value: "present",
    label: "Present",
    activeClass: "bg-emerald-600 text-white shadow-sm ring-emerald-600",
    hoverClass: "hover:bg-emerald-50 text-emerald-700",
  },
  {
    value: "absent",
    label: "Absent",
    activeClass: "bg-rose-600 text-white shadow-sm ring-rose-600",
    hoverClass: "hover:bg-rose-50 text-rose-700",
  },
  {
    value: "late",
    label: "Late",
    activeClass: "bg-amber-500 text-slate-900 shadow-sm ring-amber-500",
    hoverClass: "hover:bg-amber-50 text-amber-700",
  },
  {
    value: "leave",
    label: "Leave",
    activeClass: "bg-sky-600 text-white shadow-sm ring-sky-600",
    hoverClass: "hover:bg-sky-50 text-sky-700",
  },
];

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const MarkAttendance = () => {
  const dispatch = useDispatch();
  const { marking } = useSelector((state) => state.attendance);

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState({}); // { [studentId]: { status: 'present', remarks: '' } }
  const [isExistingMarked, setIsExistingMarked] = useState(false);

  // Load teacher's classes on mount
  useEffect(() => {
    const loadClasses = async () => {
      try {
        setLoadingClasses(true);
        const res = await getClassesApi({ limit: 100 });
        const list = res.data?.data || res.data || [];
        setClasses(list);
        if (list.length > 0) {
          setSelectedClassId(list[0]._id);
        }
      } catch (err) {
        toast.error("Failed to load class list.");
      } finally {
        setLoadingClasses(false);
      }
    };
    loadClasses();
  }, []);

  // Fetch students of selected class & pre-fill attendance if already marked on that date
  const loadClassAndAttendance = useCallback(async () => {
    if (!selectedClassId || !selectedDate) return;

    try {
      setLoadingStudents(true);

      // 1. Fetch active students of this class
      const studentRes = await getStudentsApi({
        classId: selectedClassId,
        status: "active",
        limit: 100,
      });
      const studentList = studentRes.data?.data || studentRes.data || [];
      setStudents(studentList);

      // 2. Fetch existing attendance for this class & date
      const existingRes = await dispatch(
        fetchClassAttendanceByDate({ classId: selectedClassId, date: selectedDate })
      ).unwrap();

      const existingMap = new Map();
      (existingRes || []).forEach((item) => {
        const sId = item.studentId?._id || item.studentId;
        if (sId) {
          existingMap.set(sId.toString(), {
            status: item.status,
            remarks: item.remarks || "",
          });
        }
      });

      const initialMap = {};
      const hadExisting = existingMap.size > 0;
      setIsExistingMarked(hadExisting);

      studentList.forEach((st) => {
        if (existingMap.has(st._id.toString())) {
          initialMap[st._id] = existingMap.get(st._id.toString());
        } else {
          // Default all to "present" for fast marking
          initialMap[st._id] = { status: "present", remarks: "" };
        }
      });

      setAttendanceRecords(initialMap);
    } catch (err) {
      toast.error("Error loading student roster or existing records.");
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedClassId, selectedDate, dispatch]);

  useEffect(() => {
    loadClassAndAttendance();
  }, [loadClassAndAttendance]);

  // Status toggle handler
  const handleStatusChange = (studentId, status) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { remarks: "" }),
        status,
      },
    }));
  };

  // Remarks change handler
  const handleRemarksChange = (studentId, remarks) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: "present" }),
        remarks,
      },
    }));
  };

  // Bulk actions
  const setAllStatus = (status) => {
    setAttendanceRecords((prev) => {
      const updated = { ...prev };
      students.forEach((st) => {
        updated[st._id] = {
          ...(updated[st._id] || { remarks: "" }),
          status,
        };
      });
      return updated;
    });
    toast.success(`Marked all as ${status.toUpperCase()}`);
  };

  // Submit attendance
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedClassId) {
      toast.error("Please select a class.");
      return;
    }

    if (students.length === 0) {
      toast.error("No active students found in this class.");
      return;
    }

    const records = students.map((st) => ({
      studentId: st._id,
      status: attendanceRecords[st._id]?.status || "present",
      remarks: attendanceRecords[st._id]?.remarks || null,
    }));

    try {
      await dispatch(
        markAttendance({
          classId: selectedClassId,
          date: selectedDate,
          records,
        })
      ).unwrap();

      toast.success(
        isExistingMarked
          ? "Attendance updated successfully!"
          : "Attendance saved & parents notified for absentees!"
      );
      setIsExistingMarked(true);
    } catch (err) {
      toast.error(err || "Failed to mark attendance.");
    }
  };

  // Statistics counters
  const counts = students.reduce(
    (acc, st) => {
      const s = attendanceRecords[st._id]?.status || "present";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    },
    { present: 0, absent: 0, late: 0, leave: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Mark Class Attendance</h2>
          <p className="text-xs text-slate-500 mt-1">
            Quickly mark and update daily student presence. Absentee alerts are sent automatically.
          </p>
        </div>

        {isExistingMarked && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium self-start sm:self-auto">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            Attendance already marked for this date (Editing mode)
          </div>
        )}
      </div>

      {/* Control Filters: Class & Date */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Class & Section
            </label>
            <div className="relative">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                disabled={loadingClasses}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] transition"
              >
                {loadingClasses ? (
                  <option>Loading classes...</option>
                ) : classes.length === 0 ? (
                  <option value="">No classes available</option>
                ) : (
                  classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      Class {cls.className} - Section {cls.section} ({cls.academicYear})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Attendance Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                max={getTodayDateString()}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] transition"
              />
              <Calendar className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary & Quick Bulk Buttons */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50 border border-slate-200/70 p-4 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 shadow-2xs">
            <Users className="w-4 h-4 text-slate-500" />
            Total: <strong className="text-slate-900">{students.length}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800">
            Present: <strong>{counts.present}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">
            Absent: <strong>{counts.absent}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-800">
            Late: <strong>{counts.late}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-xl text-xs font-medium text-sky-800">
            Leave: <strong>{counts.leave}</strong>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            type="button"
            onClick={() => setAllStatus("present")}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition shadow-2xs flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            Mark All Present
          </button>
          <button
            type="button"
            onClick={() => setAllStatus("absent")}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition shadow-2xs text-rose-700"
          >
            Mark All Absent
          </button>
        </div>
      </div>

      {/* Student Roster Table */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loadingStudents ? (
            <div className="p-12 text-center text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-[#1F4E79]" />
              <p className="text-sm">Loading student list & attendance...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No active students in this class.</p>
              <p className="text-xs mt-1">Enroll students to this class in the Students menu.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 w-16">Roll</th>
                    <th className="py-3.5 px-4">Student Details</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4">Remarks (Optional)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((st) => {
                    const record = attendanceRecords[st._id] || { status: "present", remarks: "" };
                    const currentStatus = record.status;

                    return (
                      <tr key={st._id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">
                          {st.rollNumber || "-"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1F4E79] to-[#2563a8] text-white flex items-center justify-center font-bold text-xs">
                              {st.userId?.name?.charAt(0)?.toUpperCase() || "S"}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 leading-tight">
                                {st.userId?.name || "Student"}
                              </p>
                              <p className="text-xs text-slate-400">Adm: {st.admissionNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                            {STATUS_OPTIONS.map((opt) => {
                              const isSelected = currentStatus === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => handleStatusChange(st._id, opt.value)}
                                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 ${
                                    isSelected
                                      ? `${opt.activeClass} border-transparent`
                                      : `bg-slate-100/70 border-slate-200 text-slate-600 ${opt.hoverClass}`
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="e.g. Sick leave, Late by 15m..."
                            value={record.remarks || ""}
                            onChange={(e) => handleRemarksChange(st._id, e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1F4E79] focus:bg-white transition"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Submit Button Bar */}
        {students.length > 0 && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={marking || loadingStudents}
              className="px-6 py-3 bg-[#1F4E79] hover:bg-[#183e60] disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-sm shadow-[#1F4E79]/30 transition flex items-center gap-2"
            >
              {marking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Attendance...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isExistingMarked ? "Update Attendance" : "Submit Attendance"}
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default MarkAttendance;
