import { useEffect, useState, useCallback } from "react";
import {
  getMyHomeworkApi,
  createHomeworkApi,
  updateHomeworkApi,
  closeHomeworkApi,
  deleteHomeworkApi,
  getHomeworkSubmissionsApi,
  reviewSubmissionApi,
  nudgeHomeworkApi,
} from "../../api/homeworkApi";
import { getTeacherClassesAndSubjectsApi } from "../../api/teacherDashboardApi";
import toast from "react-hot-toast";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  FileCheck,
  Send,
  Users,
  Eye,
  Edit2,
  XCircle,
  Trash2,
  UploadCloud,
  ChevronRight,
  ExternalLink,
  Award,
  Sparkles,
  Paperclip,
  Check,
  X,
  BellRing,
} from "lucide-react";

const TeacherHomework = () => {
  const [homeworkList, setHomeworkList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Teacher classes and subjects for dropdowns
  const [teacherMeta, setTeacherMeta] = useState({ classes: [], subjects: [] });

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState(null);
  const [formData, setFormData] = useState({
    classId: "",
    subject: "",
    title: "",
    description: "",
    dueDate: "",
    allowLateSubmission: false,
    maxMarks: "",
    submissionType: "file",
  });
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Submissions Drawer state
  const [activeSubmissionsHw, setActiveSubmissionsHw] = useState(null);
  const [submissionsData, setSubmissionsData] = useState(null);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsTab, setSubmissionsTab] = useState("submitted"); // "submitted" | "reviewed" | "notSubmitted"

  // Grading form modal state
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [gradeMarks, setGradeMarks] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");
  const [requestResubmit, setRequestResubmit] = useState(false);
  const [gradingLoading, setGradingLoading] = useState(false);

  // Nudge confirm modal
  const [nudgeModalHw, setNudgeModalHw] = useState(null);
  const [nudging, setNudging] = useState(false);

  // Fetch homework list
  const fetchHomework = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getMyHomeworkApi({
        classId: filterClass || undefined,
        status: filterStatus || undefined,
      });
      if (res.success && res.data) {
        setHomeworkList(res.data);
      }
    } catch (err) {
      console.error("Failed to load homework:", err);
      toast.error("Failed to load homework assignments.");
    } finally {
      setLoading(false);
    }
  }, [filterClass, filterStatus]);

  // Fetch teacher metadata (classes & subjects)
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const res = await getTeacherClassesAndSubjectsApi();
        if (res.success && res.data) {
          setTeacherMeta({
            classes: res.data.classes || [],
            subjects: res.data.subjects || [],
          });
        }
      } catch (err) {
        console.error("Failed to load teacher metadata:", err);
      }
    };
    loadMeta();
  }, []);

  useEffect(() => {
    fetchHomework();
  }, [fetchHomework]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingHomework(null);
    setFormData({
      classId: teacherMeta.classes[0]?._id || "",
      subject: teacherMeta.subjects[0] || "",
      title: "",
      description: "",
      dueDate: "",
      allowLateSubmission: false,
      maxMarks: "",
      submissionType: "file",
    });
    setAttachments([]);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (hw) => {
    setEditingHomework(hw);
    setFormData({
      classId: hw.classId?._id || hw.classId,
      subject: hw.subject,
      title: hw.title,
      description: hw.description || "",
      dueDate: hw.dueDate ? new Date(hw.dueDate).toISOString().slice(0, 16) : "",
      allowLateSubmission: Boolean(hw.allowLateSubmission),
      maxMarks: hw.maxMarks ? String(hw.maxMarks) : "",
      submissionType: hw.submissionType || "file",
    });
    setAttachments([]);
    setIsModalOpen(true);
  };

  // Submit Homework Form (Create or Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formData.classId || !formData.subject || !formData.title || !formData.dueDate) {
      return toast.error("Please fill in all required fields.");
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append("classId", formData.classId);
      data.append("subject", formData.subject);
      data.append("title", formData.title);
      data.append("description", formData.description);
      data.append("dueDate", new Date(formData.dueDate).toISOString());
      data.append("allowLateSubmission", formData.allowLateSubmission);
      if (formData.maxMarks) data.append("maxMarks", formData.maxMarks);
      data.append("submissionType", formData.submissionType);

      attachments.forEach((file) => {
        data.append("attachments", file);
      });

      if (editingHomework) {
        await updateHomeworkApi(editingHomework._id, data);
        toast.success("Homework updated successfully!");
      } else {
        await createHomeworkApi(data);
        toast.success("Homework published to class!");
      }

      setIsModalOpen(false);
      fetchHomework();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save homework.");
    } finally {
      setSubmitting(false);
    }
  };

  // Close Homework for submissions
  const handleCloseHomework = async (id) => {
    if (!window.confirm("Close this homework assignment? No further submissions will be accepted.")) return;
    try {
      await closeHomeworkApi(id);
      toast.success("Homework closed.");
      fetchHomework();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to close homework.");
    }
  };

  // Delete Homework
  const handleDeleteHomework = async (id) => {
    if (!window.confirm("Are you sure you want to delete this homework?")) return;
    try {
      await deleteHomeworkApi(id);
      toast.success("Homework deleted.");
      fetchHomework();
    } catch (err) {
      toast.error(err.response?.data?.message || "Cannot delete homework with submissions.");
    }
  };

  // Open Submissions View
  const handleOpenSubmissions = async (hw) => {
    setActiveSubmissionsHw(hw);
    setSubmissionsLoading(true);
    setSubmissionsTab("submitted");
    try {
      const res = await getHomeworkSubmissionsApi(hw._id);
      if (res.success && res.data) {
        setSubmissionsData(res.data);
      }
    } catch (err) {
      toast.error("Failed to load submissions.");
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // Open Grading Modal
  const handleOpenGrading = (submission) => {
    setGradingSubmission(submission);
    setGradeMarks(submission.marks !== null && submission.marks !== undefined ? String(submission.marks) : "");
    setGradeFeedback(submission.feedback || "");
    setRequestResubmit(submission.status === "resubmit_requested");
  };

  // Submit Grade / Review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!gradingSubmission) return;

    try {
      setGradingLoading(true);
      await reviewSubmissionApi(gradingSubmission._id, {
        marks: gradeMarks !== "" ? Number(gradeMarks) : null,
        feedback: gradeFeedback,
        requestResubmit,
      });

      toast.success("Review submitted to student.");
      setGradingSubmission(null);

      // Refresh submissions list
      if (activeSubmissionsHw) {
        const res = await getHomeworkSubmissionsApi(activeSubmissionsHw._id);
        if (res.success && res.data) {
          setSubmissionsData(res.data);
        }
      }
      fetchHomework();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to review submission.");
    } finally {
      setGradingLoading(false);
    }
  };

  // Execute Nudge
  const handleConfirmNudge = async () => {
    if (!nudgeModalHw) return;
    try {
      setNudging(true);
      const res = await nudgeHomeworkApi(nudgeModalHw._id);
      toast.success(res.message || "Reminder sent to pending students and parents!");
      setNudgeModalHw(null);
      fetchHomework();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send reminder.");
    } finally {
      setNudging(false);
    }
  };

  // Filtered homework list by search term
  const filteredHomework = homeworkList.filter((hw) => {
    const term = searchTerm.toLowerCase();
    return (
      hw.title.toLowerCase().includes(term) ||
      hw.subject.toLowerCase().includes(term) ||
      (hw.classId?.className && hw.classId.className.toLowerCase().includes(term))
    );
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600" />
            Homework Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Publish assignments, review student submissions, and send nudges.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold rounded-xl shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Assign New Homework</span>
        </button>
      </div>

      {/* ── Filter & Search Toolbar ────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by title, subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Class Filter */}
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
          >
            <option value="">All My Classes</option>
            {teacherMeta.classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                Class {cls.className} - {cls.section}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* ── Homework Cards Grid ────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          ))}
        </div>
      ) : filteredHomework.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No Homework Assignments Found
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            You haven't assigned any homework yet or no assignments match your filter.
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assignment</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHomework.map((hw) => {
            const isDuePassed = new Date(hw.dueDate).getTime() < Date.now();
            const stats = hw.stats || {};
            const completionRate = stats.completionRate || 0;

            return (
              <div
                key={hw._id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Status & Subject Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {hw.subject}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${
                        hw.status === "closed"
                          ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                          : isDuePassed
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {hw.status === "closed" ? "Closed" : isDuePassed ? "Past Due" : "Active"}
                    </span>
                  </div>

                  {/* Title & Class */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {hw.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Class: <strong>{hw.classId?.className || ""}-{hw.classId?.section || ""}</strong> • Due: {new Date(hw.dueDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Description Snippet */}
                  {hw.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {hw.description}
                    </p>
                  )}

                  {/* Completion Progress Bar */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-500">Submission Progress</span>
                      <span className="text-emerald-600">{completionRate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                      <span>Submitted: {stats.submittedCount || 0}</span>
                      <span>Reviewed: {stats.reviewedCount || 0}</span>
                      <span>Pending: {stats.pendingCount || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenSubmissions(hw)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Submissions</span>
                  </button>

                  <button
                    onClick={() => setNudgeModalHw(hw)}
                    className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-lg transition"
                    title="Send Reminder Nudge"
                  >
                    <BellRing className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(hw)}
                    className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-lg transition"
                    title="Edit Assignment"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {hw.status !== "closed" ? (
                    <button
                      onClick={() => handleCloseHomework(hw._id)}
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition"
                      title="Close Submissions"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDeleteHomework(hw._id)}
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition"
                      title="Delete Homework"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── CREATE / EDIT HOMEWORK MODAL ───────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingHomework ? "Edit Homework Assignment" : "Assign New Homework"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Class & Subject Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Class & Section *
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">Select Class</option>
                    {teacherMeta.classes.map((cls) => (
                      <option key={cls._id} value={cls._id}>
                        Class {cls.className} - {cls.section}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Subject *
                  </label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">Select Subject</option>
                    {teacherMeta.subjects.map((s, idx) => (
                      <option key={idx} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Assignment Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 4 Practice Exercises"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Instructions / Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Instructions for students..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Due Date & Max Marks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Due Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Max Marks (Optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 25"
                    value={formData.maxMarks}
                    onChange={(e) => setFormData({ ...formData, maxMarks: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              {/* Submission Type & Allow Late Submission */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Submission Format
                  </label>
                  <select
                    value={formData.submissionType}
                    onChange={(e) => setFormData({ ...formData, submissionType: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="file">File Upload (PDF/Image/Doc)</option>
                    <option value="text">Text Entry</option>
                    <option value="none">No Online Submission (Offline/Notebook)</option>
                  </select>
                </div>

                <div className="pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowLateSubmission}
                      onChange={(e) =>
                        setFormData({ ...formData, allowLateSubmission: e.target.checked })
                      }
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Allow Late Submissions
                    </span>
                  </label>
                </div>
              </div>

              {/* Attachments Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Attach Documents / Worksheets (Max 5 files, 10MB each)
                </label>
                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={(e) => setAttachments(Array.from(e.target.files || []))}
                    className="hidden"
                    id="hw-attachments"
                  />
                  <label htmlFor="hw-attachments" className="cursor-pointer block">
                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                    <span className="text-xs text-emerald-600 font-semibold">Click to upload files</span>
                    <span className="text-xs text-slate-400 block mt-0.5">PDF, Word, or Images</span>
                  </label>
                </div>
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {attachments.map((f, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-md"
                      >
                        <span className="truncate">{f.name}</span>
                        <span className="text-slate-400">({(f.size / 1024).toFixed(0)} KB)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow transition"
                >
                  {submitting ? "Saving..." : editingHomework ? "Update Assignment" : "Publish to Class"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── SUBMISSIONS DRAWER / MODAL ─────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeSubmissionsHw && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl h-full shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  {activeSubmissionsHw.subject} Submissions
                </span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {activeSubmissionsHw.title}
                </h2>
                <p className="text-xs text-slate-500">
                  Due: {new Date(activeSubmissionsHw.dueDate).toLocaleDateString("en-IN")} • Max Marks: {activeSubmissionsHw.maxMarks || "N/A"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNudgeModalHw(activeSubmissionsHw)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  title="Send Reminder to Unsubmitted Students"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Nudge Non-Submitted</span>
                </button>

                <button
                  onClick={() => setActiveSubmissionsHw(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Submissions Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 text-sm font-semibold">
              <button
                onClick={() => setSubmissionsTab("submitted")}
                className={`py-3 px-4 border-b-2 transition ${
                  submissionsTab === "submitted"
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Submitted ({submissionsData?.counts?.submitted || 0})
              </button>
              <button
                onClick={() => setSubmissionsTab("reviewed")}
                className={`py-3 px-4 border-b-2 transition ${
                  submissionsTab === "reviewed"
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Reviewed ({submissionsData?.counts?.reviewed || 0})
              </button>
              <button
                onClick={() => setSubmissionsTab("notSubmitted")}
                className={`py-3 px-4 border-b-2 transition ${
                  submissionsTab === "notSubmitted"
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Not Submitted ({submissionsData?.counts?.notSubmitted || 0})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {submissionsLoading ? (
                <div className="space-y-3 animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                  ))}
                </div>
              ) : submissionsTab === "submitted" ? (
                // 1. SUBMITTED TAB
                submissionsData?.submitted?.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No submissions awaiting review.
                  </div>
                ) : (
                  submissionsData?.submitted?.map((sub) => (
                    <div
                      key={sub._id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {sub.studentId?.name || "Student"}
                          </h4>
                          <span className="text-xs text-slate-400">
                            Roll #{sub.studentId?.rollNumber || "N/A"}
                          </span>
                          {sub.isLate && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700">
                              LATE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          Submitted: {new Date(sub.submittedAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {/* Files preview links */}
                        {sub.files?.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {sub.files.map((f, i) => (
                              <a
                                key={i}
                                href={f.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-emerald-600 hover:underline"
                              >
                                <Paperclip className="w-3 h-3" />
                                <span className="max-w-[120px] truncate">{f.name}</span>
                              </a>
                            ))}
                          </div>
                        )}
                        {/* Text submission */}
                        {sub.text && (
                          <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 mt-1">
                            "{sub.text}"
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenGrading(sub)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow-sm transition"
                      >
                        Grade & Feedback
                      </button>
                    </div>
                  ))
                )
              ) : submissionsTab === "reviewed" ? (
                // 2. REVIEWED TAB
                submissionsData?.reviewed?.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    No reviewed submissions yet.
                  </div>
                ) : (
                  submissionsData?.reviewed?.map((sub) => (
                    <div
                      key={sub._id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {sub.studentId?.name || "Student"}
                          </h4>
                          <span className="text-xs text-slate-400">
                            Roll #{sub.studentId?.rollNumber || "N/A"}
                          </span>
                          {sub.status === "resubmit_requested" ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                              Resubmit Requested
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                              Reviewed
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-3">
                          <span>
                            Marks: <strong>{sub.marks !== null ? sub.marks : "Ungraded"}</strong> / {activeSubmissionsHw.maxMarks || "N/A"}
                          </span>
                          {sub.feedback && (
                            <span className="italic">"{sub.feedback}"</span>
                          )}
                        </div>

                        {/* Files */}
                        {sub.files?.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {sub.files.map((f, i) => (
                              <a
                                key={i}
                                href={f.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-emerald-600 hover:underline"
                              >
                                <Paperclip className="w-3 h-3" />
                                <span className="max-w-[120px] truncate">{f.name}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenGrading(sub)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg text-xs transition"
                      >
                        Edit Grade
                      </button>
                    </div>
                  ))
                )
              ) : (
                // 3. NOT SUBMITTED TAB
                submissionsData?.notSubmitted?.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    All students in this class have submitted! 🎉
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
                      <span>{submissionsData?.notSubmitted?.length} student(s) haven't submitted.</span>
                      <button
                        onClick={() => setNudgeModalHw(activeSubmissionsHw)}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition"
                      >
                        Send Nudge Now
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                      {submissionsData?.notSubmitted?.map((student) => (
                        <div
                          key={student._id}
                          className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between text-sm"
                        >
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {student.name}
                            </span>
                            <span className="text-xs text-slate-400 ml-2">
                              Roll #{student.rollNumber || "N/A"} • Adm #{student.admissionNumber || "N/A"}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-rose-500">Pending</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── GRADING MODAL ──────────────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {gradingSubmission && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Grade Submission: {gradingSubmission.studentId?.name}
              </h3>
              <button
                onClick={() => setGradingSubmission(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Marks Obtained {activeSubmissionsHw?.maxMarks ? `(Max: ${activeSubmissionsHw.maxMarks})` : ""}
                </label>
                <input
                  type="number"
                  min="0"
                  max={activeSubmissionsHw?.maxMarks || undefined}
                  value={gradeMarks}
                  onChange={(e) => setGradeMarks(e.target.value)}
                  placeholder="e.g. 18"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Teacher Feedback / Remarks
                </label>
                <textarea
                  rows={3}
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  placeholder="Well structured work, please review question 4..."
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requestResubmit}
                    onChange={(e) => setRequestResubmit(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Request Resubmission (student must revise and re-upload)
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={gradingLoading}
                  className="px-5 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow transition"
                >
                  {gradingLoading ? "Saving..." : "Save Evaluation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── NUDGE CONFIRMATION MODAL ───────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {nudgeModalHw && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
                <BellRing className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Send Homework Reminder Nudge
                </h3>
                <p className="text-xs text-slate-500">
                  Assignment: {nudgeModalHw.title} ({nudgeModalHw.subject})
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              This will send an instant in-app notification and email reminder to all enrolled students (and their parents) who have not yet submitted this assignment.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-500">
              ⚠️ Note: To prevent spam, reminders can only be sent once every 24 hours per assignment.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setNudgeModalHw(null)}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNudge}
                disabled={nudging}
                className="px-5 py-2 text-sm font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow transition"
              >
                {nudging ? "Sending Reminders..." : "Confirm & Send Nudge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherHomework;
