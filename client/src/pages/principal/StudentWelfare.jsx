import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  HeartHandshake,
  AlertTriangle,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  UserCheck,
  ChevronRight,
  Plus,
  Copy,
  Check,
  X,
  FileText,
  Calendar,
  MessageSquare,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getAtRiskStudentsApi,
  getStudentWelfareDetailApi,
  createInterventionApi,
  updateInterventionApi,
  generateParentTalkingPointsApi,
} from "../../api/welfareApi";

const BAND_COLORS = {
  high: "bg-rose-100 text-rose-800 border-rose-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const FACTOR_ICONS = {
  attendance: "📅",
  academics: "📚",
  fees: "💳",
  leave: "🏖️",
  discipline: "⚖️",
  other: "📌",
};

const StudentWelfare = () => {
  const [loading, setLoading] = useState(true);
  const [selectedBand, setSelectedBand] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState([]);

  // Detail drawer state
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [studentDetail, setStudentDetail] = useState(null);

  // Intervention modal
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [submittingIntervention, setSubmittingIntervention] = useState(false);
  const [interventionForm, setInterventionForm] = useState({
    type: "counselling",
    assignedTo: "",
    dueDate: "",
    note: "",
  });

  // AI Talking Points modal
  const [showAiModal, setShowAiModal] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiTalkingPoints, setAiTalkingPoints] = useState("");
  const [copied, setCopied] = useState(false);

  const loadAtRiskStudents = async () => {
    try {
      setLoading(true);
      const res = await getAtRiskStudentsApi({ band: selectedBand });
      const data = res.data?.data?.students || res.data?.students || [];
      setStudents(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load at-risk students roster");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAtRiskStudents();
  }, [selectedBand]);

  // Load student detail drawer
  const openStudentDetail = async (studentId) => {
    setSelectedStudentId(studentId);
    try {
      setDrawerLoading(true);
      const res = await getStudentWelfareDetailApi(studentId);
      setStudentDetail(res.data?.data || null);
    } catch (err) {
      toast.error("Failed to load student welfare profile");
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setSelectedStudentId(null);
    setStudentDetail(null);
  };

  // Add Intervention submit
  const handleAddIntervention = async (e) => {
    e.preventDefault();
    if (!studentDetail?.student?._id) return;

    try {
      setSubmittingIntervention(true);
      await createInterventionApi({
        studentId: studentDetail.student._id,
        riskId: studentDetail.risk?._id,
        type: interventionForm.type,
        assignedTo: interventionForm.assignedTo,
        dueDate: interventionForm.dueDate || undefined,
        note: interventionForm.note,
      });

      toast.success("Intervention plan recorded successfully");
      setShowInterventionModal(false);
      setInterventionForm({ type: "counselling", assignedTo: "", dueDate: "", note: "" });

      // Refresh drawer
      openStudentDetail(studentDetail.student._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create intervention");
    } finally {
      setSubmittingIntervention(false);
    }
  };

  // Change intervention status
  const handleStatusChange = async (interventionId, newStatus) => {
    try {
      await updateInterventionApi(interventionId, { status: newStatus });
      toast.success("Intervention status updated");
      openStudentDetail(studentDetail.student._id);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  // Request AI Parent Talking Points
  const handleGenerateAiTalkingPoints = async () => {
    if (!studentDetail?.student?._id) return;
    try {
      setShowAiModal(true);
      setGeneratingAi(true);
      const res = await generateParentTalkingPointsApi(studentDetail.student._id);
      setAiTalkingPoints(res.data?.data?.talkingPoints || "");
    } catch (err) {
      toast.error("Failed to generate parent talking points");
    } finally {
      setGeneratingAi(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(aiTalkingPoints);
    setCopied(true);
    toast.success("Talking points copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredStudents = students.filter((s) => {
    const nameMatch = s.studentId?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const admMatch = s.studentId?.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || admMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <HeartHandshake className="w-7 h-7 text-[#1F4E79]" />
            Student Welfare & Early-Warning System
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Holistic pastoral indicators flagging attendance, performance drops, leaves, and discipline.
          </p>
        </div>

        {/* Band Filter Chips */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
          {[
            { label: "All Bands", value: "" },
            { label: "High Risk", value: "high" },
            { label: "Medium", value: "medium" },
            { label: "Low", value: "low" },
          ].map((b) => (
            <button
              key={b.value}
              onClick={() => setSelectedBand(b.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedBand === b.value
                  ? "bg-[#1F4E79] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by student name or admission number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs sm:text-sm text-slate-800 bg-transparent focus:outline-none"
        />
      </div>

      {/* At-Risk Students Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1F4E79] mb-2" />
            <p className="text-xs font-medium">Evaluating welfare risk indicators...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
            <p className="text-sm font-semibold text-slate-700">No students flagged in this risk band</p>
            <p className="text-xs text-slate-400 mt-1">Student welfare indicators are within safe thresholds.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Risk Score</th>
                  <th className="py-3 px-4">Band</th>
                  <th className="py-3 px-4">Flagged Drivers</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((r) => {
                  const student = r.studentId || {};
                  const classInfo = r.classId ? `${r.classId.className} - ${r.classId.section}` : "-";
                  const bandClass = BAND_COLORS[r.band] || "bg-slate-100 text-slate-700";

                  return (
                    <tr
                      key={r._id}
                      onClick={() => openStudentDetail(student._id)}
                      className="hover:bg-slate-50/70 cursor-pointer transition"
                    >
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-800 text-sm">{student.name}</p>
                        <p className="text-[11px] text-slate-400">Adm: {student.admissionNumber}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{classInfo}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold text-sm ${
                              r.score >= 60 ? "text-rose-600" : r.score >= 30 ? "text-amber-600" : "text-emerald-600"
                            }`}
                          >
                            {r.score}/100
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase ${bandClass}`}>
                          {r.band}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {(r.reasons || []).map((reason, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]"
                              title={reason.detail}
                            >
                              <span>{FACTOR_ICONS[reason.factor] || "📌"}</span>
                              <span className="capitalize">{reason.factor}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1F4E79] hover:underline"
                        >
                          View Plan <ChevronRight className="w-3.5 h-3.5" />
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

      {/* DETAIL DRAWER */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={closeDrawer} />

          <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col z-10 overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1F4E79] text-white flex items-center justify-center font-bold text-base">
                  {studentDetail?.student?.name?.charAt(0) || "S"}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{studentDetail?.student?.name}</h3>
                  <p className="text-xs text-slate-400">
                    {studentDetail?.student?.classInfo} • Adm: {studentDetail?.student?.admissionNumber}
                  </p>
                </div>
              </div>

              <button onClick={closeDrawer} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {drawerLoading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#1F4E79] mb-2" />
                <p className="text-xs">Loading welfare profile...</p>
              </div>
            ) : studentDetail ? (
              <div className="p-6 space-y-6 flex-1">
                {/* Risk Score Summary Banner */}
                <div
                  className={`p-4 rounded-2xl border flex items-center justify-between ${
                    BAND_COLORS[studentDetail.risk?.band] || "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-6 h-6 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider">
                        {studentDetail.risk?.band || "Low"} Risk Profile
                      </p>
                      <p className="text-lg font-bold">Composite Score: {studentDetail.risk?.score || 0} / 100</p>
                    </div>
                  </div>

                  {/* AI Talking Points Action */}
                  <button
                    onClick={handleGenerateAiTalkingPoints}
                    className="px-3 py-2 bg-white/90 hover:bg-white text-slate-800 font-bold text-xs rounded-xl shadow-xs border flex items-center gap-1.5 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    AI Talking Points
                  </button>
                </div>

                {/* Flagged Reasons Breakdown */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    Flagged Early-Warning Observations
                  </h4>
                  <div className="space-y-2">
                    {(studentDetail.risk?.reasons || []).map((r, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5"
                      >
                        <span className="text-base mt-0.5">{FACTOR_ICONS[r.factor] || "📌"}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-800 capitalize">{r.factor} Observation</p>
                          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{r.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interventions Section */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Active Interventions & Support Plans
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Mentoring, parent meetings, and remedial plans.</p>
                    </div>

                    <button
                      onClick={() => setShowInterventionModal(true)}
                      className="px-3 py-1.5 bg-[#1F4E79] hover:bg-[#183e60] text-white text-xs font-semibold rounded-xl shadow-2xs flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Plan
                    </button>
                  </div>

                  {studentDetail.interventions?.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-500 font-medium">No interventions recorded yet.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Schedule a meeting, counselling session, or remedial classes.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {studentDetail.interventions.map((inv) => (
                        <div key={inv._id} className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs capitalize text-slate-800 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              {inv.type.replace("_", " ")}
                            </span>
                            <select
                              value={inv.status}
                              onChange={(e) => handleStatusChange(inv._id, e.target.value)}
                              className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none ${
                                inv.status === "resolved"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : inv.status === "in_progress"
                                  ? "bg-blue-50 text-blue-800 border-blue-200"
                                  : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                            </select>
                          </div>

                          <p className="text-xs text-slate-600">
                            Assigned to: <strong>{inv.assignedTo?.name || "Counselor"}</strong>
                          </p>

                          {/* Notes list */}
                          {(inv.notes || []).map((n, idx) => (
                            <div key={idx} className="bg-slate-50 p-2.5 rounded-lg text-xs text-slate-700">
                              <p>{n.text}</p>
                              <p className="text-[10px] text-slate-400 mt-1">
                                By {n.by?.name || "Educator"} on {new Date(n.at).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ADD INTERVENTION MODAL */}
      {showInterventionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-base">Initiate Student Intervention</h3>
              <button onClick={() => setShowInterventionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddIntervention} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Intervention Type</label>
                <select
                  value={interventionForm.type}
                  onChange={(e) => setInterventionForm({ ...interventionForm, type: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                >
                  <option value="counselling">Counselling Session</option>
                  <option value="parent_meeting">Parent Conference</option>
                  <option value="remedial_classes">Remedial Classes</option>
                  <option value="mentoring">Peer / Teacher Mentoring</option>
                  <option value="other">Other Pastoral Care</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assignee User ID</label>
                <input
                  type="text"
                  required
                  placeholder="User ID of teacher or counselor"
                  value={interventionForm.assignedTo}
                  onChange={(e) => setInterventionForm({ ...interventionForm, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Due Date</label>
                <input
                  type="date"
                  value={interventionForm.dueDate}
                  onChange={(e) => setInterventionForm({ ...interventionForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Action Plan Note</label>
                <textarea
                  rows={3}
                  placeholder="Outline the steps agreed upon..."
                  value={interventionForm.note}
                  onChange={(e) => setInterventionForm({ ...interventionForm, note: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInterventionModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIntervention}
                  className="px-5 py-2 bg-[#1F4E79] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {submittingIntervention ? "Saving..." : "Save Intervention"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI TALKING POINTS MODAL */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">AI Parent Meeting Talking Points</h3>
              </div>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Privacy Notice Banner */}
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs leading-relaxed">
              <strong>Human Reference Only:</strong> Generated using only computed observations and student first name.
              Never automatically dispatched to parents.
            </div>

            {generatingAi ? (
              <div className="p-10 text-center text-slate-500">
                <Loader2 className="w-7 h-7 animate-spin mx-auto text-indigo-600 mb-2" />
                <p className="text-xs font-medium">Synthesizing supportive talking points with Gemini AI...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 max-h-72 overflow-y-auto">
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                    {aiTalkingPoints}
                  </pre>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[11px] text-slate-400">Drafted for in-person parent collaboration</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied" : "Copy Talking Points"}
                    </button>
                    <button
                      onClick={() => setShowAiModal(false)}
                      className="px-4 py-1.5 bg-[#1F4E79] text-white text-xs font-semibold rounded-xl"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentWelfare;
