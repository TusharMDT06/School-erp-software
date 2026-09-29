import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Save,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  CheckSquare,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { getTeacherPTMAgendaApi, completePTMSlotApi } from "../../api/ptmApi";

const PTMAgenda = () => {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);

  // Completion Form States
  const [privateNotes, setPrivateNotes] = useState("");
  const [sharedSummary, setSharedSummary] = useState("");
  const [actionItems, setActionItems] = useState([]);
  const [newActionItem, setNewActionItem] = useState("");
  const [noShow, setNoShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAgenda();
  }, []);

  const fetchAgenda = async () => {
    try {
      setLoading(true);
      const res = await getTeacherPTMAgendaApi();
      if (res.data?.success) {
        setSlots(res.data.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load PTM agenda.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDrawer = (slot) => {
    setSelectedSlot(slot);
    setPrivateNotes(slot.notes || "");
    setSharedSummary(slot.sharedSummary || "");
    setActionItems(slot.actionItems || []);
    setNoShow(slot.status === "no_show");
    setNotesDrawerOpen(true);
  };

  const handleAddActionItem = () => {
    if (!newActionItem.trim()) return;
    setActionItems([...actionItems, newActionItem.trim()]);
    setNewActionItem("");
  };

  const handleRemoveActionItem = (index) => {
    setActionItems(actionItems.filter((_, idx) => idx !== index));
  };

  const handleSaveCompletion = async () => {
    if (!selectedSlot) return;

    try {
      setSaving(true);
      const res = await completePTMSlotApi(selectedSlot._id, {
        notes: privateNotes,
        sharedSummary,
        actionItems,
        noShow,
      });

      if (res.data?.success) {
        toast.success("Meeting notes and summary saved successfully!");
        setNotesDrawerOpen(false);
        fetchAgenda();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save meeting notes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
            Teacher Schedule
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Parent-Teacher Meeting (PTM) Agenda
          </h1>
          <p className="text-sm text-slate-600">
            Time-ordered booked appointments, student academic performance insights, and meeting records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">
            Total Booked Appointments: <strong>{slots.length}</strong>
          </span>
        </div>
      </div>

      {/* Slots Agenda */}
      <div className="my-6">
        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-400 border border-slate-200">
            Loading PTM agenda...
          </div>
        ) : slots.length === 0 ? (
          <div className="bg-white rounded-xl p-16 text-center text-slate-400 border border-slate-200 shadow-sm">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <h3 className="font-semibold text-slate-700 text-base">No Scheduled Meetings</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You do not have any booked parent appointments for upcoming PTM sessions at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {slots.map((slot) => {
              const student = slot.studentId;
              const profile = slot.studentQuickProfile;
              const isCompleted = slot.status === "completed";
              const isNoShow = slot.status === "no_show";

              return (
                <div
                  key={slot._id}
                  className={`bg-white rounded-xl border p-5 shadow-sm transition hover:border-slate-300 ${
                    isCompleted
                      ? "border-emerald-200 bg-emerald-50/20"
                      : isNoShow
                      ? "border-rose-200 bg-rose-50/20"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    {/* Time & Title */}
                    <div className="flex items-center gap-3">
                      <div className="px-3.5 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold font-mono text-sm flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-indigo-600" />
                        {slot.startTime} - {slot.endTime}
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                          {student?.name || "Student Meeting"}
                          <span className="text-xs font-normal text-slate-500 font-mono">
                            (Roll: {student?.rollNumber || "-"}, Class:{" "}
                            {student?.classId?.className}-{student?.classId?.section})
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500">
                          Parent: <strong>{slot.parentUserId?.name || "Parent"}</strong> (
                          {slot.parentUserId?.phone || "No phone"}) • {slot.ptmId?.title}
                        </p>
                      </div>
                    </div>

                    {/* Status & Action */}
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          isCompleted
                            ? "bg-emerald-100 text-emerald-800"
                            : isNoShow
                            ? "bg-rose-100 text-rose-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {slot.status?.toUpperCase()}
                      </span>

                      <button
                        onClick={() => handleOpenDrawer(slot)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 shadow-sm transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {isCompleted ? "Edit Notes" : "Meeting Notes"}
                      </button>
                    </div>
                  </div>

                  {/* Student Quick Profile Strip (NO fee data) */}
                  {profile && (
                    <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      {/* Attendance */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block font-medium">Attendance Rate</span>
                        <span
                          className={`font-bold text-sm ${
                            profile.attendancePercentage >= 75
                              ? "text-emerald-700"
                              : "text-rose-700"
                          }`}
                        >
                          {profile.attendancePercentage}%
                        </span>
                      </div>

                      {/* Latest Result */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block font-medium">Latest Evaluation</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {profile.latestResult
                            ? `${profile.latestResult.percentage}% (${profile.latestResult.grade})`
                            : "No marks"}
                        </span>
                      </div>

                      {/* Homework Rate */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block font-medium">Homework Submissions</span>
                        <span className="font-bold text-blue-700 text-sm">
                          {profile.homeworkCompletionRate}%
                        </span>
                      </div>

                      {/* Risk Band */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-slate-400 block font-medium">Welfare Band</span>
                        <span
                          className={`font-bold text-sm ${
                            profile.riskProfile?.band === "high"
                              ? "text-rose-600"
                              : profile.riskProfile?.band === "medium"
                              ? "text-amber-600"
                              : "text-slate-700"
                          }`}
                        >
                          {profile.riskProfile?.band?.toUpperCase() || "LOW"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Shared Summary Preview */}
                  {slot.sharedSummary && (
                    <div className="mt-3 text-xs bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-emerald-900">
                      <strong>Shared with Parent: </strong>
                      <span>{slot.sharedSummary}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Meeting Notes Drawer / Modal ────────────────────────────────────── */}
      {notesDrawerOpen && selectedSlot && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  PTM Meeting Records: {selectedSlot.studentId?.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Time Slot: {selectedSlot.startTime} - {selectedSlot.endTime}
                </p>
              </div>
              <button
                onClick={() => setNotesDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* No Show Toggle */}
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noShow}
                  onChange={(e) => setNoShow(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800">
                    Mark as No-Show / Absent Parent
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Check this if the parent did not attend the scheduled slot.
                  </p>
                </div>
              </label>

              {/* Private Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Private Teacher Notes (CONFIDENTIAL - Teacher Only)
                </label>
                <textarea
                  rows="3"
                  value={privateNotes}
                  onChange={(e) => setPrivateNotes(e.target.value)}
                  placeholder="Record private impressions, parent feedback, or internal academic observations..."
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              {/* Shared Summary */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Shared Discussion Summary (Visible to Parent)
                </label>
                <textarea
                  rows="3"
                  value={sharedSummary}
                  onChange={(e) => setSharedSummary(e.target.value)}
                  placeholder="Summarize key talking points and mutual feedback agreed during the conference..."
                  className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-emerald-50/20"
                />
              </div>

              {/* Action Items */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Action Items & Follow-ups
                </label>
                <div className="space-y-2 mb-3">
                  {actionItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800"
                    >
                      <span>• {item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveActionItem(idx)}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newActionItem}
                    onChange={(e) => setNewActionItem(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddActionItem()}
                    placeholder="Add an actionable target (e.g. Practice Chapter 3 math daily)..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddActionItem}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setNotesDrawerOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveCompletion}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Save & Complete Meeting"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PTMAgenda;
