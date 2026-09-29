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
  ShieldAlert,
} from "lucide-react";
import { getClassesApi } from "../../api/classApi";
import { getStudentsApi } from "../../api/studentApi";
import { getEventsApi } from "../../api/calendarApi";
import {
  markAttendance,
  fetchClassAttendanceByDate,
} from "../../features/attendance/attendanceSlice";
import { createCorrectionRequestApi } from "../../api/attendanceCorrectionApi";

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
  const { user } = useSelector((state) => state.auth);

  const canOverride = ["principal", "admin", "superadmin"].includes(user?.role);

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState({}); // { [studentId]: { status: 'present', remarks: '' } }
  const [originalRecords, setOriginalRecords] = useState({});
  const [isExistingMarked, setIsExistingMarked] = useState(false);

  // Correction Mode state for past dates
  const [correctionReason, setCorrectionReason] = useState("");
  const [submittingCorrection, setSubmittingCorrection] = useState(false);

  // Holiday / Non-working day state
  const [nonWorkingInfo, setNonWorkingInfo] = useState({ isNonWorking: false, reason: "" });
  const [forceMark, setForceMark] = useState(false);
  const [forceReason, setForceReason] = useState("");

  // Check holiday on selected date
  useEffect(() => {
    const checkWorkingDay = async () => {
      try {
        const d = new Date(selectedDate + "T00:00:00");
        const isSunday = d.getDay() === 0;

        const res = await getEventsApi({ from: selectedDate, to: selectedDate });
        const events = res.data?.data || res.data || [];
        const holidayEvent = events.find(
          (e) => (e.type === "holiday" || e.type === "vacation") && e.status === "published"
        );

        if (holidayEvent) {
          setNonWorkingInfo({ isNonWorking: true, reason: `Holiday: ${holidayEvent.title}` });
        } else if (isSunday) {
          setNonWorkingInfo({ isNonWorking: true, reason: "Weekly Off (Sunday)" });
        } else {
          setNonWorkingInfo({ isNonWorking: false, reason: "" });
          setForceMark(false);
        }
      } catch (err) {
        // Fallback to Sunday check
        const isSunday = new Date(selectedDate + "T00:00:00").getDay() === 0;
        if (isSunday) {
          setNonWorkingInfo({ isNonWorking: true, reason: "Weekly Off (Sunday)" });
        } else {
          setNonWorkingInfo({ isNonWorking: false, reason: "" });
        }
      }
    };
    if (selectedDate) {
      checkWorkingDay();
    }
  }, [selectedDate]);

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
      setOriginalRecords(JSON.parse(JSON.stringify(initialMap)));
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
    if (nonWorkingInfo.isNonWorking && !forceMark) return;
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
    if (nonWorkingInfo.isNonWorking && !forceMark) return;
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
    if (nonWorkingInfo.isNonWorking && !forceMark) return;
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

    if (nonWorkingInfo.isNonWorking && !forceMark) {
      toast.error(`Cannot mark attendance on non-working day: ${nonWorkingInfo.reason}`);
      return;
    }

    if (nonWorkingInfo.isNonWorking && forceMark && !forceReason.trim()) {
      toast.error("Please provide an override reason to force mark on a non-working day.");
      return;
    }

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
          forceMark: forceMark || undefined,
          reason: forceMark ? forceReason : undefined,
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

  const todayStr = getTodayDateString();
  const isTeacher = user?.role === "teacher";
  const isPastDate = selectedDate < todayStr;
  const diffDays = Math.floor(
    (new Date(todayStr).getTime() - new Date(selectedDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isCorrectionMode = isTeacher && isPastDate && diffDays <= 3;
  const isLockedOverThreeDays = isTeacher && isPastDate && diffDays > 3;

  // Submit attendance correction request (up to 3 days back)
  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (!correctionReason.trim()) {
      toast.error("Please provide a mandatory reason for the attendance correction request.");
      return;
    }

    const changes = [];
    students.forEach((st) => {
      const current = attendanceRecords[st._id]?.status;
      const original = originalRecords[st._id]?.status;
      if (current && original && current !== original) {
        changes.push({
          studentId: st._id,
          studentName: st.name || st.userId?.name || "Student",
          from: original,
          to: current,
        });
      }
    });

    if (changes.length === 0) {
      toast.error("No attendance changes detected. Please modify at least one student status before submitting a correction request.");
      return;
    }

    try {
      setSubmittingCorrection(true);
      await createCorrectionRequestApi({
        classId: selectedClassId,
        date: selectedDate,
        changes,
        reason: correctionReason.trim(),
      });
      toast.success(`Correction request for ${changes.length} student(s) submitted to Principal for approval!`);
      setCorrectionReason("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit attendance correction request.");
    } finally {
      setSubmittingCorrection(false);
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

  const isAttendanceDisabled = (nonWorkingInfo.isNonWorking && !forceMark) || isLockedOverThreeDays;

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

      {/* Non-working Day Banner */}
      {nonWorkingInfo.isNonWorking && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-300 text-amber-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-900">
                Non-Working Day: {nonWorkingInfo.reason}
              </p>
              <p className="text-xs text-amber-800/80 mt-0.5">
                Attendance marking is greyed out. Only authorized administrators and principals may override.
              </p>
            </div>
          </div>

          {canOverride && (
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-amber-300">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="checkbox"
                  checked={forceMark}
                  onChange={(e) => setForceMark(e.target.checked)}
                  className="rounded text-[#1F4E79] focus:ring-[#1F4E79] w-4 h-4"
                />
                Force Mark Override
              </label>
              {forceMark && (
                <input
                  type="text"
                  placeholder="Reason for force-marking..."
                  value={forceReason}
                  onChange={(e) => setForceReason(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1F4E79]"
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Past Attendance Correction Banner */}
      {isCorrectionMode && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-950">
                Attendance Correction Mode (Past Date: {new Date(selectedDate).toLocaleDateString("en-IN")})
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Direct editing is permitted for TODAY only. For dates in the past (up to 3 days back), update the student statuses in the table below and submit an Attendance Correction request for Principal/Admin approval.
              </p>
            </div>
          </div>

          <div className="pt-1">
            <label className="block text-xs font-bold text-amber-900 mb-1">
              Reason for Attendance Correction * (Required for administrative audit)
            </label>
            <input
              type="text"
              placeholder="e.g. Student was attending inter-school competition; roll call discrepancy resolved..."
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
            />
          </div>
        </div>
      )}

      {/* Over 3 Days Locked Banner */}
      {isLockedOverThreeDays && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-rose-950">
              Attendance Locked (&gt; 3 Days Old)
            </p>
            <p className="text-xs text-rose-800 mt-0.5">
              Attendance records older than 3 days are locked and cannot be directly marked or requested by teachers. Please contact the school administrator for institutional adjustments.
            </p>
          </div>
        </div>
      )}

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
            disabled={isAttendanceDisabled}
            onClick={() => setAllStatus("present")}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition shadow-2xs flex items-center gap-1.5"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            Mark All Present
          </button>
          <button
            type="button"
            disabled={isAttendanceDisabled}
            onClick={() => setAllStatus("absent")}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition shadow-2xs text-rose-700"
          >
            Mark All Absent
          </button>
        </div>
      </div>

      {/* Student Roster Table */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div
          className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-200 ${
            isAttendanceDisabled ? "opacity-60 pointer-events-none select-none bg-slate-50/80" : ""
          }`}
        >
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
            {isCorrectionMode ? (
              <button
                type="button"
                onClick={handleCorrectionSubmit}
                disabled={submittingCorrection || loadingStudents}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-md transition flex items-center gap-2"
              >
                {submittingCorrection ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Request Attendance Correction
                  </>
                )}
              </button>
            ) : isLockedOverThreeDays ? (
              <button
                type="button"
                disabled
                className="px-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-400 text-sm font-semibold rounded-xl cursor-not-allowed flex items-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" />
                Attendance Locked (&gt; 3 Days Old)
              </button>
            ) : (
              <button
                type="submit"
                disabled={marking || loadingStudents || isAttendanceDisabled}
                className="px-6 py-3 bg-[#1F4E79] hover:bg-[#183e60] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm shadow-[#1F4E79]/30 transition flex items-center gap-2"
              >
                {marking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Attendance...
                  </>
                ) : isAttendanceDisabled ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Attendance Disabled (Holiday)
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {isExistingMarked ? "Update Attendance" : "Submit Attendance"}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default MarkAttendance;
