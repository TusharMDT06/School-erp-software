import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Download,
  Filter,
  BarChart3,
  Calendar,
  Eye,
  Loader2,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { getClassesApi } from "../../api/classApi";
import {
  fetchClassAttendanceSummary,
  fetchStudentAttendanceReport,
} from "../../features/attendance/attendanceSlice";
import AttendanceCalendar from "../../components/attendance/AttendanceCalendar";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

const AttendanceReports = () => {
  const dispatch = useDispatch();
  const { classSummary, studentReport, loading } = useSelector((state) => state.attendance);

  const currentDate = new Date();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Modal for individual student's calendar view
  const [selectedStudentForCalendar, setSelectedStudentForCalendar] = useState(null);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Load classes list
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await getClassesApi({ limit: 100 });
        const list = res.data?.data || res.data || [];
        setClasses(list);
        if (list.length > 0) {
          setSelectedClassId(list[0]._id);
        }
      } catch (err) {
        toast.error("Failed to load class list.");
      }
    };
    loadClasses();
  }, []);

  // Fetch class summary when class, month, or year changes
  useEffect(() => {
    if (selectedClassId) {
      dispatch(
        fetchClassAttendanceSummary({
          classId: selectedClassId,
          params: { month: selectedMonth, year: selectedYear },
        })
      );
    }
  }, [selectedClassId, selectedMonth, selectedYear, dispatch]);

  // Open calendar modal for a student
  const handleOpenStudentCalendar = async (student) => {
    setSelectedStudentForCalendar(student);
    setLoadingCalendar(true);
    try {
      // Calculate date range for the selected month/year
      const fromDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const toDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      await dispatch(
        fetchStudentAttendanceReport({
          studentId: student.studentId,
          params: { fromDate, toDate },
        })
      ).unwrap();
    } catch (err) {
      toast.error("Failed to load student calendar data.");
    } finally {
      setLoadingCalendar(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!classSummary || !classSummary.students || classSummary.students.length === 0) {
      toast.error("No report data available to export.");
      return;
    }

    const headers = [
      "Roll No",
      "Admission No",
      "Student Name",
      "Email",
      "Total Marked Days",
      "Present",
      "Absent",
      "Late",
      "Leave",
      "Attendance Percentage",
    ];

    const rows = classSummary.students.map((st) => [
      st.rollNumber,
      st.admissionNumber,
      `"${st.name}"`,
      st.email,
      st.totalDays,
      st.present,
      st.absent,
      st.late,
      st.leave,
      `${st.percentage}%`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const monthName = MONTHS.find((m) => m.value === Number(selectedMonth))?.label || selectedMonth;
    const className = classSummary.class
      ? `${classSummary.class.className}-${classSummary.class.section}`
      : "Class";
    link.setAttribute("download", `Attendance_${className}_${monthName}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export downloaded.");
  };

  const students = classSummary?.students || [];

  // Helper for percentage badge
  const getPercentageColor = (pct) => {
    if (pct >= 90) return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/20";
    if (pct >= 75) return "bg-amber-50 text-amber-700 border-amber-200 ring-amber-600/20";
    return "bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/20";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Attendance Reports & Analytics</h2>
          <p className="text-xs text-slate-500 mt-1">
            View aggregated monthly attendance metrics, identify absenteeism trends, and export records.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          disabled={students.length === 0}
          className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-50 text-xs font-semibold rounded-xl transition shadow-2xs flex items-center gap-2 self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          Export to CSV
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Class Section</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] transition"
            >
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  Class {cls.className} - {cls.section} ({cls.academicYear})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] transition"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] transition"
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-[#1F4E79]" />
            <p className="text-sm">Calculating aggregated attendance metrics...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No student records found for this class.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 w-16">Roll</th>
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4 text-center">Marked Days</th>
                  <th className="py-3.5 px-4 text-center text-emerald-700">Present</th>
                  <th className="py-3.5 px-4 text-center text-rose-700">Absent</th>
                  <th className="py-3.5 px-4 text-center text-amber-700">Late</th>
                  <th className="py-3.5 px-4 text-center text-sky-700">Leave</th>
                  <th className="py-3.5 px-4 text-center">Attendance %</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((st) => {
                  const pct = st.percentage || 0;
                  return (
                    <tr
                      key={st.studentId}
                      className="hover:bg-slate-50/70 transition cursor-pointer"
                      onClick={() => handleOpenStudentCalendar(st)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{st.rollNumber}</td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{st.name}</p>
                        <p className="text-xs text-slate-400">Adm: {st.admissionNumber}</p>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">{st.totalDays}</td>
                      <td className="py-3 px-4 text-center text-emerald-600 font-semibold">{st.present}</td>
                      <td className="py-3 px-4 text-center text-rose-600 font-semibold">{st.absent}</td>
                      <td className="py-3 px-4 text-center text-amber-600 font-semibold">{st.late}</td>
                      <td className="py-3 px-4 text-center text-sky-600 font-semibold">{st.leave}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getPercentageColor(
                            pct
                          )}`}
                        >
                          {pct}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenStudentCalendar(st)}
                          className="p-1.5 text-slate-400 hover:text-[#1F4E79] hover:bg-[#1F4E79]/5 rounded-lg transition"
                          title="View Attendance Calendar"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Attendance Calendar Modal */}
      {selectedStudentForCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {selectedStudentForCalendar.name} — Attendance Calendar
                </h3>
                <p className="text-xs text-slate-500">
                  Roll: {selectedStudentForCalendar.rollNumber} | Adm: {selectedStudentForCalendar.admissionNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForCalendar(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4">
              {loadingCalendar ? (
                <div className="p-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1F4E79]" />
                  <p className="text-xs">Loading calendar records...</p>
                </div>
              ) : (
                <AttendanceCalendar
                  dailyRecords={studentReport?.dailyRecords || []}
                  studentName={selectedStudentForCalendar.name}
                  initialDate={new Date(selectedYear, selectedMonth - 1, 1)}
                />
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudentForCalendar(null)}
                className="px-5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceReports;
