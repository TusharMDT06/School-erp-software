import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  BookOpen,
  ClipboardList,
  Plus,
  Send,
  RefreshCw,
  FileText,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  getTeacherSubstitutionsApi,
  acknowledgeSubstitutionApi,
  createSubstituteSuggestionApi,
  getSubstituteSuggestionsApi,
} from "../../api/substitutionsApi";
import { getTeacherClassesAndSubjectsApi } from "../../api/teacherApi";
import { useNavigate } from "react-router-dom";

const Substitutions = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("my_substitutions");
  const [loading, setLoading] = useState(true);
  const [substitutions, setSubstitutions] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  // Suggestion Form
  const [classes, setClasses] = useState([]);
  const [suggestDate, setSuggestDate] = useState(new Date().toISOString().split("T")[0]);
  const [suggestPeriod, setSuggestPeriod] = useState("Period 1");
  const [suggestClassId, setSuggestClassId] = useState("");
  const [suggestSubject, setSuggestSubject] = useState("");
  const [suggestCoverNotes, setSuggestCoverNotes] = useState("");
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  useEffect(() => {
    fetchSubstitutions();
    fetchSuggestions();
    fetchClasses();
  }, []);

  const fetchSubstitutions = async () => {
    try {
      setLoading(true);
      const res = await getTeacherSubstitutionsApi();
      if (res.data?.success) {
        setSubstitutions(res.data.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load substitutions.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await getSubstituteSuggestionsApi();
      if (res.data?.success) {
        setSuggestions(res.data.data || []);
      }
    } catch (e) {}
  };

  const fetchClasses = async () => {
    try {
      const res = await getTeacherClassesAndSubjectsApi();
      if (res.data?.success) {
        const clsList = res.data.data.classes || [];
        setClasses(clsList);
        if (clsList.length > 0) {
          setSuggestClassId(clsList[0]._id);
        }
        const subjects = res.data.data.subjects || [];
        if (subjects.length > 0) {
          setSuggestSubject(subjects[0]);
        }
      }
    } catch (e) {}
  };

  const handleAcknowledge = async (id) => {
    try {
      const res = await acknowledgeSubstitutionApi(id);
      if (res.data?.success) {
        toast.success("Substitution assignment acknowledged!");
        fetchSubstitutions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to acknowledge.");
    }
  };

  const handleCreateSuggestion = async (e) => {
    e.preventDefault();
    if (!suggestDate || !suggestPeriod || !suggestClassId || !suggestSubject) {
      toast.error("Please fill in date, period, class, and subject.");
      return;
    }

    try {
      setSubmittingSuggestion(true);
      const res = await createSubstituteSuggestionApi({
        date: suggestDate,
        periodRef: suggestPeriod,
        classId: suggestClassId,
        subject: suggestSubject,
        coverNotes: suggestCoverNotes,
      });

      if (res.data?.success) {
        toast.success("Leave cover suggestion submitted for administration confirmation.");
        setSuggestCoverNotes("");
        fetchSuggestions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit suggestion.");
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
            Staff Allocation & Cover
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Teacher Substitutions & Leave Cover
          </h1>
          <p className="text-sm text-slate-600">
            View assigned substitution periods, access absent colleagues' lesson plans, and submit cover notes.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("my_substitutions")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "my_substitutions"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            My Substitution Classes ({substitutions.length})
          </button>
          <button
            onClick={() => setActiveTab("leave_cover")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "leave_cover"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Suggest Leave Cover
          </button>
        </div>
      </div>

      {/* ── Tab 1: My Substitutions ────────────────────────────────────────── */}
      {activeTab === "my_substitutions" && (
        <div className="my-6 space-y-4">
          {loading ? (
            <div className="bg-white rounded-xl p-12 text-center text-slate-400 border border-slate-200">
              Loading substitution schedule...
            </div>
          ) : substitutions.length === 0 ? (
            <div className="bg-white rounded-xl p-16 text-center text-slate-400 border border-slate-200 shadow-sm">
              <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <h3 className="font-semibold text-slate-700 text-base">
                No Active Substitutions
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                You have not been assigned to cover any classes at this time.
              </p>
            </div>
          ) : (
            substitutions.map((sub) => {
              const plan = sub.absentTeacherLessonPlan;
              const isAcknowledged =
                sub.status === "acknowledged" || sub.status === "completed";

              return (
                <div
                  key={sub._id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 hover:border-slate-300 transition"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-sm font-bold font-mono">
                        {sub.periodRef}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">
                          Class {sub.classId?.className}-{sub.classId?.section} • {sub.subject}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Date: <strong>{sub.date}</strong> • Covering for:{" "}
                          <strong>{sub.absentTeacherId?.userId?.name || "Absent Teacher"}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          sub.status === "acknowledged"
                            ? "bg-emerald-100 text-emerald-800"
                            : sub.status === "completed"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {sub.status?.toUpperCase()}
                      </span>

                      {!isAcknowledged && (
                        <button
                          type="button"
                          onClick={() => handleAcknowledge(sub._id)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                        >
                          Acknowledge
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/teacher/attendance?classId=${sub.classId?._id}`)
                        }
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                      >
                        Mark Attendance
                      </button>
                    </div>
                  </div>

                  {/* Absent Teacher's Lesson Plan & Cover Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Lesson Plan Box */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                        Colleague's Planned Lesson
                      </span>
                      {plan ? (
                        <div className="space-y-1.5 text-slate-700">
                          <p>
                            <strong>Topic:</strong> {plan.topicTitle}
                          </p>
                          {plan.objectives && (
                            <p>
                              <strong>Objectives:</strong> {plan.objectives}
                            </p>
                          )}
                          {plan.activities && (
                            <p>
                              <strong>Planned Activities:</strong> {plan.activities}
                            </p>
                          )}
                          {plan.homeworkIdea && (
                            <p>
                              <strong>Homework Assigned:</strong> {plan.homeworkIdea}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">
                          No specific digital lesson plan recorded by teacher for this date.
                        </p>
                      )}
                    </div>

                    {/* Cover Notes from Teacher */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        Cover Instructions & Notes
                      </span>
                      {sub.notes ? (
                        <p className="text-slate-700 leading-relaxed">{sub.notes}</p>
                      ) : (
                        <p className="text-slate-400 italic">
                          No special cover instructions provided. Follow standard textbook curriculum.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab 2: Suggest Leave Cover ────────────────────────────────────── */}
      {activeTab === "leave_cover" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
          {/* Submission Form */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Submit Leave Cover Note</h3>
              <p className="text-xs text-slate-500">
                Propose instructions and cover arrangements for classes during your planned leave.
              </p>
            </div>

            <form onSubmit={handleCreateSuggestion} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Leave Date
                </label>
                <input
                  type="date"
                  value={suggestDate}
                  onChange={(e) => setSuggestDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Period / Slot
                </label>
                <input
                  type="text"
                  value={suggestPeriod}
                  onChange={(e) => setSuggestPeriod(e.target.value)}
                  placeholder="e.g. Period 2 or 10:00 - 10:45"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Class
                  </label>
                  <select
                    value={suggestClassId}
                    onChange={(e) => setSuggestClassId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {classes.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.className}-{c.section}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={suggestSubject}
                    onChange={(e) => setSuggestSubject(e.target.value)}
                    placeholder="e.g. Mathematics"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Cover Instructions for Colleague
                </label>
                <textarea
                  rows="3"
                  value={suggestCoverNotes}
                  onChange={(e) => setSuggestCoverNotes(e.target.value)}
                  placeholder="Specify chapter, textbook exercises, worksheet links, or activities to cover..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              <button
                type="submit"
                disabled={submittingSuggestion}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {submittingSuggestion ? "Submitting..." : "Submit Cover Suggestion"}
              </button>
            </form>
          </div>

          {/* Past Suggestions */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-bold text-slate-900 text-base">Submitted Cover Arrangements</h3>
            {suggestions.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center text-slate-400 border border-slate-200">
                No leave cover suggestions recorded yet.
              </div>
            ) : (
              suggestions.map((sug) => (
                <div
                  key={sug._id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">
                      {sug.date} • {sug.periodRef} (Class {sug.classId?.className}-{sug.classId?.section})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        sug.status === "confirmed"
                          ? "bg-emerald-100 text-emerald-800"
                          : sug.status === "rejected"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {sug.status?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    <strong>Subject:</strong> {sug.subject}
                  </p>
                  {sug.coverNotes && (
                    <p className="text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-100">
                      <strong>Notes:</strong> {sug.coverNotes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Substitutions;
