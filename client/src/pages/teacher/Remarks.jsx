import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Award,
  CheckCircle,
  Clock,
  Lock,
  Edit2,
  Share2,
  ChevronDown,
  Filter,
  Search,
  Plus,
  History,
  X,
  Send,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  createRemarkApi,
  updateRemarkApi,
  getStudentRemarksApi,
  appreciateRemarkApi,
  escalateRemarkApi,
} from "../../api/remarksApi";
import { getMyClassApi } from "../../api/classTeacherApi";
import { getTeacherClassesAndSubjectsApi } from "../../api/teacherApi";
import { useSearchParams } from "react-router-dom";

const REMARK_TYPES = [
  { key: "positive", label: "Positive", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { key: "academic", label: "Academic", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { key: "behavior", label: "Behavior", color: "bg-amber-100 text-amber-800 border-amber-300" },
  { key: "concern", label: "Concern", color: "bg-rose-100 text-rose-800 border-rose-300" },
];

const Remarks = () => {
  const [searchParams] = useSearchParams();
  const preselectedStudentId = searchParams.get("studentId");

  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(preselectedStudentId || "");
  const [remarks, setRemarks] = useState([]);
  const [typeFilter, setTypeFilter] = useState("all");

  // Create Remark Form
  const [createType, setCreateType] = useState("positive");
  const [remarkText, setRemarkText] = useState("");
  const [visibleToParent, setVisibleToParent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRemark, setEditingRemark] = useState(null);
  const [editText, setEditText] = useState("");
  const [editVisible, setEditVisible] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchRemarks(selectedStudentId);
    }
  }, [selectedStudentId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await getMyClassApi();
      if (res.data?.success) {
        const roster = res.data.data.roster || [];
        setStudents(roster);
        if (!selectedStudentId && roster.length > 0) {
          setSelectedStudentId(roster[0]._id);
        }
      }
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const fetchRemarks = async (studentId) => {
    try {
      setLoading(true);
      const res = await getStudentRemarksApi(studentId);
      if (res.data?.success) {
        setRemarks(res.data.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load student remarks.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRemark = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.error("Please select a student.");
      return;
    }
    if (!remarkText.trim()) {
      toast.error("Please enter remark text.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await createRemarkApi({
        studentId: selectedStudentId,
        type: createType,
        text: remarkText.trim(),
        visibleToParent,
      });

      if (res.data?.success) {
        toast.success("Student remark posted successfully!");
        setRemarkText("");
        fetchRemarks(selectedStudentId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post remark.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppreciate = async (remarkId) => {
    try {
      const res = await appreciateRemarkApi(remarkId);
      if (res.data?.success) {
        toast.success("Appreciation notification sent to parents!");
        fetchRemarks(selectedStudentId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send appreciation.");
    }
  };

  const handleEscalate = async (remarkId) => {
    if (!window.confirm("Escalate this remark into an official school incident for principal review?")) {
      return;
    }

    try {
      const res = await escalateRemarkApi(remarkId, { severity: "medium", category: "behavior" });
      if (res.data?.success) {
        toast.success("Remark escalated to an Incident and principal notified!");
        fetchRemarks(selectedStudentId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to escalate remark.");
    }
  };

  const handleOpenEdit = (remark) => {
    const diffHours = (Date.now() - new Date(remark.createdAt).getTime()) / (1000 * 60 * 60);
    if (diffHours > 24) {
      toast.error("Remarks can only be edited within 24 hours of creation.");
      return;
    }

    setEditingRemark(remark);
    setEditText(remark.text);
    setEditVisible(remark.visibleToParent);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRemark) return;

    try {
      setSavingEdit(true);
      const res = await updateRemarkApi(editingRemark._id, {
        text: editText,
        visibleToParent: editVisible,
      });

      if (res.data?.success) {
        toast.success("Remark updated and edit recorded in history!");
        setEditModalOpen(false);
        fetchRemarks(selectedStudentId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update remark.");
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredRemarks = remarks.filter((r) =>
    typeFilter === "all" ? true : r.type === typeFilter
  );

  const selectedStudent = students.find((s) => s._id === selectedStudentId);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
          Student Remarks & Behavioral Journal
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Student Remarks</h1>
        <p className="text-sm text-slate-600">
          Maintain chronological academic, behavioral, and positive appreciation records.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
        {/* Left Column: Form & Student Selector */}
        <div className="space-y-6">
          {/* Student Selector */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Select Student
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
            >
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} (Roll: {s.rollNumber})
                </option>
              ))}
            </select>

            {selectedStudent && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-1 text-slate-600">
                <p>
                  <strong>Admission No:</strong> {selectedStudent.admissionNumber}
                </p>
                <p>
                  <strong>Attendance:</strong> {selectedStudent.attendancePercentage}%
                </p>
                <p>
                  <strong>Risk Band:</strong> {selectedStudent.risk?.band?.toUpperCase() || "LOW"}
                </p>
              </div>
            )}
          </div>

          {/* New Remark Form */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 text-base mb-1">Add Student Remark</h3>
            <p className="text-xs text-slate-500 mb-4">
              All edits within 24h are tracked in edit history. Immutable audit policy enforced.
            </p>

            <form onSubmit={handleCreateRemark} className="space-y-4">
              {/* Type Chips */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Remark Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {REMARK_TYPES.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setCreateType(t.key)}
                      className={`py-2 px-3 rounded-lg border text-xs font-semibold transition ${
                        createType === t.key
                          ? `${t.color} border-current ring-1 ring-current`
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Remark Text
                </label>
                <textarea
                  rows="3"
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  placeholder="Record observations, conduct feedback, or academic growth..."
                  className="w-full p-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                />
              </div>

              {/* Visible to parent toggle */}
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleToParent}
                  onChange={(e) => setVisibleToParent(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-medium">Share with Parent in Portal</span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Post Remark"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Timeline & Remarks List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Filter:
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTypeFilter("all")}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    typeFilter === "all"
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  All
                </button>
                {REMARK_TYPES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTypeFilter(t.key)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      typeFilter === t.key
                        ? `${t.color} font-semibold`
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-slate-400 font-medium">
              {filteredRemarks.length} records
            </span>
          </div>

          {/* Remarks Timeline List */}
          {loading ? (
            <div className="bg-white rounded-xl p-12 text-center text-slate-400 border border-slate-200">
              Loading remarks...
            </div>
          ) : filteredRemarks.length === 0 ? (
            <div className="bg-white rounded-xl p-16 text-center text-slate-400 border border-slate-200 shadow-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No Remarks Found</p>
              <p className="text-xs text-slate-400 mt-1">
                Post an academic, positive, or behavioral remark using the form on the left.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRemarks.map((remark) => {
                const diffHours =
                  (Date.now() - new Date(remark.createdAt).getTime()) / (1000 * 60 * 60);
                const isEditable = diffHours <= 24;
                const hoursLeft = Math.max(0, Math.round(24 - diffHours));

                const typeObj =
                  REMARK_TYPES.find((t) => t.key === remark.type) || REMARK_TYPES[0];

                return (
                  <div
                    key={remark._id}
                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${typeObj.color}`}
                        >
                          {typeObj.label}
                        </span>
                        {remark.visibleToParent && (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded-md border border-indigo-100">
                            Shared with Parent
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{new Date(remark.createdAt).toLocaleString()}</span>
                        <span>•</span>
                        <span>By {remark.teacherId?.userId?.name || "Teacher"}</span>
                      </div>
                    </div>

                    <p className="text-sm text-slate-800 leading-relaxed">{remark.text}</p>

                    {/* Edit history count indicator */}
                    {remark.editHistory && remark.editHistory.length > 0 && (
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <History className="w-3.5 h-3.5 text-slate-400" />
                        Edited {remark.editHistory.length} time(s) • Original preserved in audit trail
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                      {/* 24h Lock Indicator */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        {isEditable ? (
                          <>
                            <Clock className="w-3.5 h-3.5 text-indigo-600" />
                            <span>
                              Editable for <strong>{hoursLeft}h</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(remark)}
                              className="ml-2 px-2 py-0.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                            >
                              Edit
                            </button>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-slate-400">Locked (24h edit window expired)</span>
                          </>
                        )}
                      </div>

                      {/* Appreciate & Escalate Actions */}
                      <div className="flex items-center gap-2">
                        {remark.type === "positive" && (
                          <button
                            type="button"
                            onClick={() => handleAppreciate(remark._id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            Appreciate (Notify Parent)
                          </button>
                        )}

                        {(remark.type === "concern" || remark.type === "behavior") && (
                          <button
                            type="button"
                            onClick={() => handleEscalate(remark._id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold transition"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            Escalate to Incident
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Edit Modal (Within 24h) ────────────────────────────────────────── */}
      {editModalOpen && editingRemark && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Edit Student Remark</h3>
                <p className="text-xs text-slate-500">
                  Previous version will be archived in the remark's edit history.
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Remark Text
                </label>
                <textarea
                  rows="4"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editVisible}
                  onChange={(e) => setEditVisible(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-medium">Share with Parent in Portal</span>
              </label>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Remarks;
