import React, { useState, useEffect } from "react";
import {
  Users,
  CalendarCheck,
  Clock,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Info,
  RefreshCw,
  Plus,
  X,
  UserCheck,
  BookOpen,
  Filter,
  Check,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getStaffOverviewApi,
  getPeriodsNeedingCoverApi,
  getSubstitutionSuggestionsApi,
  createSubstitutionApi,
  getSubstitutionsApi,
  cancelSubstitutionApi,
} from "../../api/staffApi";

const StaffOverview = () => {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "substitutions"
  const [loading, setLoading] = useState(true);

  // Staff Overview Data
  const [staffList, setStaffList] = useState([]);

  // Substitutions State
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [substitutions, setSubstitutions] = useState([]);
  const [periodsNeedingCover, setPeriodsNeedingCover] = useState([]);
  const [subLoading, setSubLoading] = useState(false);

  // Suggestion & Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPeriodToCover, setSelectedPeriodToCover] = useState(null);
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [assigningTeacherId, setAssigningTeacherId] = useState(null);
  const [assignmentNote, setAssignmentNote] = useState("");

  const loadStaffOverview = async () => {
    try {
      setLoading(true);
      const res = await getStaffOverviewApi();
      setStaffList(res.data?.data?.staff || []);
    } catch (err) {
      toast.error("Failed to load staff performance overview");
    } finally {
      setLoading(false);
    }
  };

  const loadSubstitutionsData = async () => {
    try {
      setSubLoading(true);
      const [needingRes, subsRes] = await Promise.all([
        getPeriodsNeedingCoverApi({ date: selectedDate }),
        getSubstitutionsApi({ date: selectedDate }),
      ]);
      setPeriodsNeedingCover(needingRes.data?.data?.periods || []);
      setSubstitutions(subsRes.data?.data || []);
    } catch (err) {
      toast.error("Failed to load substitution operations");
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "overview") {
      loadStaffOverview();
    } else {
      loadSubstitutionsData();
    }
  }, [activeTab, selectedDate]);

  // Open Assign Modal for a specific period needing cover
  const handleOpenAssignModal = async (periodSlot) => {
    setSelectedPeriodToCover(periodSlot);
    setShowAssignModal(true);
    setAssignmentNote("");

    try {
      setLoadingSuggestions(true);
      const res = await getSubstitutionSuggestionsApi({
        date: periodSlot.date,
        periodRef: periodSlot.periodRef,
        periodIndex: periodSlot.periodIndex,
      });
      setAvailableTeachers(res.data?.data?.availableTeachers || []);
    } catch (err) {
      toast.error("Failed to load available teachers for this period");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Submit substitution assignment
  const handleConfirmAssignment = async (subTeacherId) => {
    if (!selectedPeriodToCover) return;

    try {
      setAssigningTeacherId(subTeacherId);
      await createSubstitutionApi({
        date: selectedPeriodToCover.date,
        periodRef: selectedPeriodToCover.periodRef,
        classId: selectedPeriodToCover.classId,
        subject: selectedPeriodToCover.subject,
        absentTeacherId: selectedPeriodToCover.absentTeacherId,
        substituteTeacherId: subTeacherId,
        notes: assignmentNote,
      });

      toast.success("Period substitute assigned and teacher notified!");
      setShowAssignModal(false);
      loadSubstitutionsData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign substitute");
    } finally {
      setAssigningTeacherId(null);
    }
  };

  // Cancel an active substitution
  const handleCancelSub = async (subId) => {
    try {
      await cancelSubstitutionApi(subId);
      toast.success("Substitution cancelled");
      loadSubstitutionsData();
    } catch (err) {
      toast.error("Failed to cancel substitution");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-[#1F4E79]" />
            Staff Overview & Substitutions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Instructor workload, attendance-marking compliance, and daily period cover management.
          </p>
        </div>

        {/* Top Tab Switcher */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "overview"
                ? "bg-[#1F4E79] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Staff Performance & Compliance
          </button>
          <button
            onClick={() => setActiveTab("substitutions")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === "substitutions"
                ? "bg-[#1F4E79] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Period Substitutions
          </button>
        </div>
      </div>

      {/* TAB 1: Staff Performance & Compliance Overview */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* MANDATORY REVIEW BANNER */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Info className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs font-semibold">
                <strong>Administrative Notice:</strong> Metrics displayed are strictly for review, not ranking.
                Default sort is alphabetical by instructor name.
              </p>
            </div>
            <button
              onClick={loadStaffOverview}
              className="p-1.5 bg-white/80 hover:bg-white text-slate-700 rounded-lg shadow-2xs transition"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1F4E79] mb-2" />
                <p className="text-xs">Loading staff compliance metrics...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Instructor</th>
                      <th className="py-3 px-4">Weekly Load</th>
                      <th className="py-3 px-4">Leave Days</th>
                      <th className="py-3 px-4">Attendance Timeliness</th>
                      <th className="py-3 px-4">Marks Entry Timeliness</th>
                      <th className="py-3 px-4">Assigned Classes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList.map((st) => (
                      <tr key={st.teacherId} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-800 text-sm">{st.name}</p>
                          <p className="text-[11px] text-slate-400">ID: {st.employeeId || "-"}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#1F4E79] bg-blue-50 px-2.5 py-1 rounded-lg">
                            {st.periodsPerWeek} periods/wk
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800">{st.leaveDaysThisMonth}d this month</p>
                          <p className="text-[11px] text-slate-400">{st.leaveDaysThisYear}d this year</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1 max-w-[140px]">
                            <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                              <span>Before 10:00 AM</span>
                              <span>{st.compliance.attendanceCompliancePct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  st.compliance.attendanceCompliancePct >= 80
                                    ? "bg-emerald-500"
                                    : st.compliance.attendanceCompliancePct >= 50
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                                }`}
                                style={{ width: `${st.compliance.attendanceCompliancePct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-800">
                            {st.compliance.avgDaysToEnterMarks > 0
                              ? `${st.compliance.avgDaysToEnterMarks} days avg`
                              : "On Schedule"}
                          </p>
                          <p className="text-[11px] text-slate-400">From exam completion</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {st.assignedClasses?.length > 0 ? (
                              st.assignedClasses.map((c, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                                  {c}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 text-[11px]">No class assigned</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Period Substitutions Management */}
      {activeTab === "substitutions" && (
        <div className="space-y-6">
          {/* Date Selector Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700">Coverage Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
              />
            </div>

            <button
              onClick={loadSubstitutionsData}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition"
              title="Refresh cover list"
            >
              <RefreshCw className={`w-4 h-4 ${subLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Periods Needing Cover Section */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Periods Needing Cover (Approved Teacher Leaves)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Uncovered classroom slots due to teacher leave on {selectedDate}.
                </p>
              </div>
            </div>

            {periodsNeedingCover.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-700">All periods are covered</p>
                <p className="text-[11px] text-slate-400 mt-0.5">No uncovered leave slots for this date.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {periodsNeedingCover.map((slot, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition ${
                      slot.isAssigned
                        ? "bg-emerald-50/40 border-emerald-200"
                        : "bg-white border-amber-200 shadow-2xs"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">{slot.periodRef}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          slot.isAssigned ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {slot.isAssigned ? "Covered" : "Needs Cover"}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 font-medium">
                      Class: <strong>{slot.className}</strong> ({slot.subject})
                    </p>
                    <p className="text-xs text-slate-500">
                      Absent Teacher: <strong>{slot.absentTeacherName}</strong>
                    </p>

                    {slot.isAssigned ? (
                      <p className="text-[11px] text-emerald-700 mt-2 font-semibold">
                        Sub: {slot.currentAssignment?.substituteName}
                      </p>
                    ) : (
                      <button
                        onClick={() => handleOpenAssignModal(slot)}
                        className="mt-3 w-full py-1.5 bg-[#1F4E79] hover:bg-[#183e60] text-white text-xs font-bold rounded-lg shadow-2xs flex items-center justify-center gap-1.5 transition"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Find & Assign Substitute
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Substitutions Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Scheduled Substitutions Roster</h3>
            </div>

            {substitutions.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-400">No substitutions scheduled for {selectedDate}.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Absent Teacher</th>
                      <th className="py-3 px-4">Substitute Teacher</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {substitutions.map((sub) => (
                      <tr key={sub._id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-800">{sub.periodRef}</td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {sub.classId ? `${sub.classId.className} - ${sub.classId.section}` : "-"}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{sub.subject}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {sub.absentTeacherId?.userId?.name || "Teacher"}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#1F4E79]">
                          {sub.substituteTeacherId?.userId?.name || "Teacher"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold capitalize text-[10px] ${
                              sub.status === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : sub.status === "cancelled"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {sub.status !== "cancelled" && (
                            <button
                              onClick={() => handleCancelSub(sub._id)}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ASSIGN SUBSTITUTE MODAL */}
      {showAssignModal && selectedPeriodToCover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Select Available Substitute</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedPeriodToCover.className} • {selectedPeriodToCover.periodRef} ({selectedPeriodToCover.subject})
                </p>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Optional Instruction or Coverage Note
              </label>
              <input
                type="text"
                placeholder="e.g. Chapter 4 exercise on page 58..."
                value={assignmentNote}
                onChange={(e) => setAssignmentNote(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
              />
            </div>

            {loadingSuggestions ? (
              <div className="p-8 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#1F4E79] mb-2" />
                <p className="text-xs">Finding teachers free from timetable clashes...</p>
              </div>
            ) : availableTeachers.length === 0 ? (
              <div className="p-6 text-center bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                No free instructors found for this slot (all have timetable slots, approved leaves, or active cover).
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                  Suggested Instructors (Sorted by lightest weekly load)
                </p>
                {availableTeachers.map((t) => (
                  <div
                    key={t.teacherId}
                    className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 bg-white flex items-center justify-between transition"
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-xs">{t.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {t.weeklyWorkloadPeriods} weekly periods • {t.substitutionsToday} cover today
                      </p>
                      <p className="text-[10px] text-slate-400">{t.subjects?.join(", ")}</p>
                    </div>

                    <button
                      onClick={() => handleConfirmAssignment(t.teacherId)}
                      disabled={assigningTeacherId === t.teacherId}
                      className="px-3.5 py-1.5 bg-[#1F4E79] hover:bg-[#183e60] text-white text-xs font-bold rounded-lg shadow-2xs transition disabled:opacity-50"
                    >
                      {assigningTeacherId === t.teacherId ? "Assigning..." : "Assign & Notify"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
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

export default StaffOverview;
