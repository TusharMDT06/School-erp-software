import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from "lucide-react";
import AttendanceStatusBadge from "./AttendanceStatusBadge";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_COLOR_MAP = {
  present: "bg-emerald-500 text-white border-emerald-600 shadow-xs hover:bg-emerald-600",
  absent: "bg-rose-500 text-white border-rose-600 shadow-xs hover:bg-rose-600",
  late: "bg-amber-400 text-slate-900 border-amber-500 shadow-xs hover:bg-amber-500",
  leave: "bg-sky-500 text-white border-sky-600 shadow-xs hover:bg-sky-600",
};

const AttendanceCalendar = ({ dailyRecords = [], studentName = "", initialDate = new Date() }) => {
  const [currentDate, setCurrentDate] = useState(new Date(initialDate));
  const [selectedDayRecord, setSelectedDayRecord] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  // Navigate months
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Map daily records by normalized YYYY-MM-DD string
  const recordsMap = useMemo(() => {
    const map = new Map();
    dailyRecords.forEach((record) => {
      if (!record.date) return;
      const d = new Date(record.date);
      // Format as YYYY-MM-DD in UTC
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
        d.getUTCDate()
      ).padStart(2, "0")}`;
      map.set(key, record);
    });
    return map;
  }, [dailyRecords]);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        isWeekend: false,
        dateKey: null,
        record: null,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const isWeekend = dayDate.getDay() === 0; // Sunday
      const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const record = recordsMap.get(dateKey) || null;

      days.push({
        dayNumber: day,
        isCurrentMonth: true,
        isWeekend,
        dateKey,
        record,
      });
    }

    // Next month padding to fill a complete 7-column grid
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push({
          dayNumber: i,
          isCurrentMonth: false,
          isWeekend: false,
          dateKey: null,
          record: null,
        });
      }
    }

    return days;
  }, [year, month, recordsMap]);

  // Calculate current month's count
  const monthStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let leave = 0;

    calendarDays.forEach((d) => {
      if (d.isCurrentMonth && d.record) {
        if (d.record.status === "present") present++;
        else if (d.record.status === "absent") absent++;
        else if (d.record.status === "late") late++;
        else if (d.record.status === "leave") leave++;
      }
    });

    const totalMarked = present + absent + late + leave;
    const percentage =
      totalMarked > 0 ? Math.round(((present + late) / totalMarked) * 100) : 0;

    return { present, absent, late, leave, totalMarked, percentage };
  }, [calendarDays]);

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      {/* Calendar Header & Month Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1F4E79]/10 flex items-center justify-center text-[#1F4E79]">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">{monthName}</h3>
            {studentName && <p className="text-xs text-slate-500">Student: {studentName}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Today
          </button>
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={prevMonth}
              className="p-2 text-slate-600 hover:bg-slate-50 transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-2 text-slate-600 hover:bg-slate-50 transition border-l border-slate-200"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Stats Quick Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 my-4 p-3 bg-slate-50 rounded-xl">
        <div className="text-center p-2 rounded-lg bg-white border border-slate-100 shadow-2xs">
          <p className="text-[11px] font-medium text-slate-400">Marked Days</p>
          <p className="text-lg font-bold text-slate-800">{monthStats.totalMarked}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
          <p className="text-[11px] font-medium text-emerald-600">Present</p>
          <p className="text-lg font-bold text-emerald-700">{monthStats.present}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-rose-50/60 border border-rose-100">
          <p className="text-[11px] font-medium text-rose-600">Absent</p>
          <p className="text-lg font-bold text-rose-700">{monthStats.absent}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-amber-50/60 border border-amber-100">
          <p className="text-[11px] font-medium text-amber-600">Late</p>
          <p className="text-lg font-bold text-amber-700">{monthStats.late}</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-sky-50/60 border border-sky-100 col-span-2 sm:col-span-1">
          <p className="text-[11px] font-medium text-sky-600">Leave</p>
          <p className="text-lg font-bold text-sky-700">{monthStats.leave}</p>
        </div>
      </div>

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
        {DAYS_OF_WEEK.map((d, index) => (
          <div
            key={d}
            className={`text-center py-2 text-xs font-bold uppercase tracking-wider ${
              index === 0 ? "text-rose-500" : "text-slate-500"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {calendarDays.map((dayItem, idx) => {
          if (!dayItem.isCurrentMonth) {
            return (
              <div
                key={`empty-${idx}`}
                className="min-h-[56px] sm:min-h-[72px] p-2 rounded-xl bg-slate-50/40 text-slate-300 text-xs flex flex-col justify-between select-none"
              >
                <span>{dayItem.dayNumber}</span>
              </div>
            );
          }

          const record = dayItem.record;
          const status = record?.status;
          const colorClass = status ? STATUS_COLOR_MAP[status] : "";

          return (
            <button
              type="button"
              key={`day-${dayItem.dayNumber}`}
              onClick={() => setSelectedDayRecord(dayItem)}
              className={`min-h-[56px] sm:min-h-[72px] p-2 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 relative group
                ${
                  record
                    ? `${colorClass} border-transparent`
                    : dayItem.isWeekend
                    ? "bg-slate-100/70 border-slate-200 text-slate-400 hover:bg-slate-200/60"
                    : "bg-white border-slate-200 text-slate-700 hover:border-[#1F4E79]/40 hover:bg-slate-50"
                }
              `}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-xs font-semibold ${record ? "text-white" : ""}`}>
                  {dayItem.dayNumber}
                </span>
                {dayItem.isWeekend && !record && (
                  <span className="text-[10px] text-slate-400 font-normal">Off</span>
                )}
              </div>

              {record ? (
                <div className="mt-1">
                  <span
                    className={`text-[10px] sm:text-xs font-semibold capitalize px-1.5 py-0.5 rounded-md ${
                      status === "late" ? "bg-black/10 text-slate-900" : "bg-white/20 text-white"
                    }`}
                  >
                    {status}
                  </span>
                  {record.remarks && (
                    <span className="block text-[10px] truncate opacity-90 mt-0.5" title={record.remarks}>
                      {record.remarks}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition">
                  No record
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-emerald-500" />
          <span>Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-rose-500" />
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-amber-400" />
          <span>Late</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-sky-500" />
          <span>Leave</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-slate-200" />
          <span>Holiday / Weekend</span>
        </div>
      </div>

      {/* Day Details Modal */}
      {selectedDayRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-800">
                Attendance Details — {selectedDayRecord.dateKey}
              </h4>
              <button
                type="button"
                onClick={() => setSelectedDayRecord(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="py-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status:</span>
                {selectedDayRecord.record ? (
                  <AttendanceStatusBadge status={selectedDayRecord.record.status} size="md" />
                ) : (
                  <span className="text-slate-400 italic">Not marked / Holiday</span>
                )}
              </div>

              {selectedDayRecord.record?.remarks && (
                <div>
                  <span className="text-slate-500 text-xs block mb-1">Remarks:</span>
                  <p className="p-2.5 bg-slate-50 rounded-xl text-slate-700 text-xs border border-slate-100">
                    {selectedDayRecord.record.remarks}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDayRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
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

export default AttendanceCalendar;
