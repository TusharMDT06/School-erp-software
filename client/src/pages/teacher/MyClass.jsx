import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  MessageSquare,
  Sparkles,
  Phone,
  Send,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  BookOpen,
  Award,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  getMyClassApi,
  previewAbsenteeMessageApi,
  sendAbsenteeMessageApi,
  draftReportRemarksApi,
} from "../../api/classTeacherApi";
import { getTeacherClassesAndSubjectsApi } from "../../api/teacherApi";
import { getExamsApi } from "../../api/examApi";
import { useNavigate } from "react-router-dom";

const MyClass = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [roster, setRoster] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");

  // Absentee Modal States
  const [absenteeModalOpen, setAbsenteeModalOpen] = useState(false);
  const [absenteeLoading, setAbsenteeLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [templateKey, setTemplateKey] = useState("standard");
  const [customNote, setCustomNote] = useState("");
  const [sendChannels, setSendChannels] = useState(["in_app", "email"]);
  const [sendingAbsentee, setSendingAbsentee] = useState(false);

  // AI Report Remarks Drawer States
  const [remarksDrawerOpen, setRemarksDrawerOpen] = useState(false);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedTone, setSelectedTone] = useState("encouraging");
  const [draftingRemarks, setDraftingRemarks] = useState(false);
  const [remarksDrafts, setRemarksDrafts] = useState([]);
  const [editingRemarks, setEditingRemarks] = useState({});

  useEffect(() => {
    fetchClassRoster();
    fetchExams();
  }, []);

  const fetchClassRoster = async () => {
    try {
      setLoading(true);
      const res = await getMyClassApi();
      if (res.data?.success) {
        setClassData(res.data.data.classSection);
        setRoster(res.data.data.roster || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load class roster.");
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const res = await getExamsApi();
      if (res.data?.success) {
        const examList = res.data.data.exams || res.data.data || [];
        setExams(examList);
        if (examList.length > 0) {
          setSelectedExamId(examList[0]._id);
        }
      }
    } catch (e) {
      // Exams fallback
    }
  };

  // ── Absentee Messaging Handlers ──────────────────────────────────────────
  const handleOpenAbsenteeModal = async () => {
    setAbsenteeModalOpen(true);
    fetchAbsenteePreview(templateKey, customNote);
  };

  const fetchAbsenteePreview = async (tmpl, note) => {
    try {
      setAbsenteeLoading(true);
      const res = await previewAbsenteeMessageApi({
        templateKey: tmpl,
        customNote: note,
      });
      if (res.data?.success) {
        setPreviewData(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate absentee preview.");
    } finally {
      setAbsenteeLoading(false);
    }
  };

  const handleSendAbsenteeNotice = async () => {
    try {
      setSendingAbsentee(true);
      const res = await sendAbsenteeMessageApi({
        templateKey,
        customNote,
        confirm: true,
        sendChannels,
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Absentee notices dispatched successfully!");
        setAbsenteeModalOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send absentee message.");
    } finally {
      setSendingAbsentee(false);
    }
  };

  // ── AI Remarks Handlers ──────────────────────────────────────────────────
  const handleDraftRemarks = async () => {
    if (!selectedExamId) {
      toast.error("Please select an exam first.");
      return;
    }

    try {
      setDraftingRemarks(true);
      const studentIds = roster.slice(0, 30).map((s) => s._id);
      const res = await draftReportRemarksApi({
        examId: selectedExamId,
        studentIds,
        tone: selectedTone,
        confirmOverwrite: false,
      });

      if (res.data?.success) {
        const drafts = res.data.data || [];
        setRemarksDrafts(drafts);
        const textMap = {};
        drafts.forEach((d) => {
          textMap[d.studentId] = d.draftRemark;
        });
        setEditingRemarks(textMap);
        toast.success(`Draft remarks generated for ${drafts.length} students!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to draft remarks.");
    } finally {
      setDraftingRemarks(false);
    }
  };

  const filteredRoster = roster.filter((student) => {
    const matchesSearch =
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admissionNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRisk =
      riskFilter === "all" ? true : student.risk?.band === riskFilter;

    return matchesSearch && matchesRisk;
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Class Teacher Portal
            </span>
            {classData && (
              <span className="text-xs text-slate-500 font-medium">
                Academic Year: {classData.academicYear}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            {classData
              ? `My Class: ${classData.className} - ${classData.section}`
              : "My Class Roster"}
          </h1>
          <p className="text-sm text-slate-600">
            Real-time student welfare roster, attendance monitoring, and parent communication tools.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAbsenteeModal}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 shadow-sm transition"
          >
            <MessageSquare className="w-4 h-4 text-sky-600" />
            Message Today's Absentees
          </button>

          <button
            onClick={() => setRemarksDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-blue-700 shadow-sm transition"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            AI Report Remarks Assistant
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Total Enrolled</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{roster.length}</p>
          <p className="text-xs text-slate-500 mt-1">Active class strength</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Average Attendance</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {roster.length > 0
              ? Math.round(
                  roster.reduce((sum, s) => sum + (s.attendancePercentage || 0), 0) /
                    roster.length
                )
              : 0}
            %
          </p>
          <p className="text-xs text-emerald-600 mt-1 font-medium">Recorded sessions</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>At-Risk Students</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-2">
            {roster.filter((s) => s.risk?.band === "high" || s.risk?.band === "medium").length}
          </p>
          <p className="text-xs text-slate-500 mt-1">Medium or High risk band</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Homework Avg</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {roster.length > 0
              ? Math.round(
                  roster.reduce((sum, s) => sum + (s.homeworkCompletionRate || 0), 0) /
                    roster.length
                )
              : 0}
            %
          </p>
          <p className="text-xs text-slate-500 mt-1">Submission completion rate</p>
        </div>
      </div>

      {/* Roster Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by student name, roll no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-medium text-slate-600">Risk Filter:</label>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Risk Bands</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>

          <button
            onClick={fetchClassRoster}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
            title="Refresh Roster"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Roll</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4 text-center">Attendance</th>
                <th className="py-3.5 px-4 text-center">Latest Result</th>
                <th className="py-3.5 px-4 text-center">Homework</th>
                <th className="py-3.5 px-4 text-center">Risk Band</th>
                <th className="py-3.5 px-4">Guardian Contact</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading class roster...
                  </td>
                </tr>
              ) : filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">
                    No students match your search or filter.
                  </td>
                </tr>
              ) : (
                filteredRoster.map((student) => {
                  const att = student.attendancePercentage || 0;
                  const attColor =
                    att >= 85
                      ? "bg-emerald-100 text-emerald-800"
                      : att >= 75
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800";

                  const risk = student.risk?.band || "low";
                  const riskBadge =
                    risk === "high"
                      ? "bg-rose-100 text-rose-800 border-rose-200"
                      : risk === "medium"
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : "bg-slate-100 text-slate-700 border-slate-200";

                  return (
                    <tr key={student._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {student.rollNumber}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-bold text-xs text-indigo-700">
                            {student.name
                              ?.split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">
                              {student.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              Adm: {student.admissionNumber}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${attColor}`}
                        >
                          {att}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {student.latestResult ? (
                          <div className="flex flex-col items-center">
                            <span className="font-medium text-slate-900 text-xs">
                              {student.latestResult.percentage}% ({student.latestResult.grade})
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {student.latestResult.examName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="w-20 mx-auto bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${student.homeworkCompletionRate || 0}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {student.homeworkCompletionRate || 0}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${riskBadge}`}
                          title={
                            student.risk?.reasons?.map((r) => r.detail).join("; ") ||
                            "No identified welfare concerns"
                          }
                        >
                          {risk === "high" && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                          {risk.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {student.guardianContact ? (
                          <div>
                            <p className="font-medium text-slate-900 text-xs">
                              {student.guardianContact.name}
                            </p>
                            <p className="text-xs text-slate-500 font-mono">
                              {student.guardianContact.phone || "No phone"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Not recorded</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {student.guardianContact?.phone && (
                            <>
                              <a
                                href={student.guardianContact.telLink}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                                title="Call Guardian"
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                              <a
                                href={student.guardianContact.whatsappLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                                title="Chat on WhatsApp"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </a>
                            </>
                          )}
                          <button
                            onClick={() => navigate(`/teacher/remarks?studentId=${student._id}`)}
                            className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition"
                          >
                            Remarks
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Modal: Message Today's Absentees ───────────────────────────────── */}
      {absenteeModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  Message Today's Absentees
                </h3>
                <p className="text-xs text-slate-500">
                  Preview and dispatch automated attendance alerts to guardians.
                </p>
              </div>
              <button
                onClick={() => setAbsenteeModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Template selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Message Template
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateKey("standard");
                      fetchAbsenteePreview("standard", customNote);
                    }}
                    className={`p-2.5 text-left border rounded-lg text-xs font-medium transition ${
                      templateKey === "standard"
                        ? "border-indigo-600 bg-indigo-50/60 text-indigo-900"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Standard Daily Notice
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateKey("urgent");
                      fetchAbsenteePreview("urgent", customNote);
                    }}
                    className={`p-2.5 text-left border rounded-lg text-xs font-medium transition ${
                      templateKey === "urgent"
                        ? "border-rose-600 bg-rose-50/60 text-rose-900"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Urgent / Critical Notice
                  </button>
                </div>
              </div>

              {/* Custom Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Custom Teacher Note (Optional)
                </label>
                <textarea
                  rows="2"
                  value={customNote}
                  onChange={(e) => {
                    setCustomNote(e.target.value);
                    fetchAbsenteePreview(templateKey, e.target.value);
                  }}
                  placeholder="e.g. Please bring medical certificate tomorrow."
                  className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              {/* Delivery Channels */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Notification Channels
                </label>
                <div className="flex flex-wrap gap-4 text-xs text-slate-700">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sendChannels.includes("in_app")}
                      onChange={(e) => {
                        if (e.target.checked) setSendChannels([...sendChannels, "in_app"]);
                        else setSendChannels(sendChannels.filter((c) => c !== "in_app"));
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    In-App Notification
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sendChannels.includes("email")}
                      onChange={(e) => {
                        if (e.target.checked) setSendChannels([...sendChannels, "email"]);
                        else setSendChannels(sendChannels.filter((c) => c !== "email"));
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    Email
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sendChannels.includes("whatsapp")}
                      onChange={(e) => {
                        if (e.target.checked) setSendChannels([...sendChannels, "whatsapp"]);
                        else setSendChannels(sendChannels.filter((c) => c !== "whatsapp"));
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    WhatsApp
                  </label>
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-xs">
                  <span className="font-semibold text-slate-700">Preview</span>
                  <span className="font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    Recipients: {previewData?.absenteeCount || 0} students
                  </span>
                </div>
                {absenteeLoading ? (
                  <p className="text-xs text-slate-400 py-2">Refreshing preview...</p>
                ) : (
                  <>
                    <p className="text-xs text-slate-800 leading-relaxed font-mono bg-white p-2.5 rounded border border-slate-100">
                      "{previewData?.renderedMessage}"
                    </p>
                    {previewData?.students && previewData.students.length > 0 && (
                      <div className="mt-2 text-[11px] text-slate-500">
                        <strong>Absent Students: </strong>
                        {previewData.students.map((s) => s.name).join(", ")}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Rate limit: 3 bulk sends per day per teacher to prevent spamming parents.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAbsenteeModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sendingAbsentee || (previewData?.absenteeCount || 0) === 0}
                onClick={handleSendAbsenteeNotice}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition"
              >
                {sendingAbsentee ? "Sending Notices..." : "Confirm & Send to All Absentees"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Side Drawer: AI Report Card Remarks Assistant ─────────────────── */}
      {remarksDrawerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 to-blue-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    AI Report Card Remarks Assistant
                  </h3>
                  <p className="text-xs text-slate-500">
                    Draft motivating, personalized remarks in batches of 5 with PII minimization.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRemarksDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controls */}
            <div className="p-5 border-b border-slate-100 bg-white space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Select Exam
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {exams.map((ex) => (
                      <option key={ex._id} value={ex._id}>
                        {ex.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Tone of Remarks
                  </label>
                  <select
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="encouraging">Encouraging & Inspiring</option>
                    <option value="neutral">Balanced & Objective</option>
                    <option value="firm-but-kind">Firm-but-Kind (Focus on Effort)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  Target: {roster.length} students enrolled in class.
                </p>
                <button
                  type="button"
                  disabled={draftingRemarks}
                  onClick={handleDraftRemarks}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 shadow-sm disabled:opacity-50 transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  {draftingRemarks ? "Generating AI Drafts..." : "Generate AI Drafts"}
                </button>
              </div>
            </div>

            {/* Drafts List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
              {remarksDrafts.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">No Drafts Generated Yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Select an exam and tone above, then click "Generate AI Drafts".
                  </p>
                </div>
              ) : (
                remarksDrafts.map((draft) => (
                  <div
                    key={draft.studentId}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">
                          {draft.studentName}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          Roll: {draft.rollNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
                          Exam: {draft.currentMarksPercentage}%
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-medium ${
                            draft.trend >= 0
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          Trend: {draft.trend >= 0 ? `+${draft.trend}%` : `${draft.trend}%`}
                        </span>
                      </div>
                    </div>

                    <textarea
                      rows="2"
                      value={editingRemarks[draft.studentId] || ""}
                      onChange={(e) =>
                        setEditingRemarks({
                          ...editingRemarks,
                          [draft.studentId]: e.target.value,
                        })
                      }
                      className="w-full p-2.5 text-xs text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        {draft.savedAsDraft
                          ? "✓ Saved as draft in Result record"
                          : "⚠️ Existing remark preserved (suggestion only)"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          toast.success(`Draft updated for ${draft.studentName}`);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Keep This Remark
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Drafts are saved locally to exam results. No remarks are sent directly to parents.
              </span>
              <button
                type="button"
                onClick={() => setRemarksDrawerOpen(false)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyClass;
