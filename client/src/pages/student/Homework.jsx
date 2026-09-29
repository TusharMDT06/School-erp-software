import { useEffect, useState, useCallback } from "react";
import {
  getStudentHomeworkApi,
  submitStudentHomeworkApi,
} from "../../api/homeworkApi";
import toast from "react-hot-toast";
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  UploadCloud,
  Paperclip,
  ExternalLink,
  Award,
  AlertTriangle,
  RotateCcw,
  X,
  Loader2,
  FileCheck,
} from "lucide-react";

const StudentHomework = () => {
  const [homeworkList, setHomeworkList] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, submitted: 0, overdue: 0 });
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "submitted" | "overdue"
  const [loading, setLoading] = useState(true);

  // Submit modal state
  const [submitModalHw, setSubmitModalHw] = useState(null);
  const [submitFiles, setSubmitFiles] = useState([]);
  const [submitText, setSubmitText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch student homework
  const fetchHomework = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getStudentHomeworkApi(activeTab);
      if (res.success && res.data) {
        setHomeworkList(res.data.homework || []);
        if (res.data.counts) {
          setCounts(res.data.counts);
        }
      }
    } catch (err) {
      console.error("Failed to load homework:", err);
      toast.error("Failed to load homework assignments.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchHomework();
  }, [fetchHomework]);

  // Open Submit Modal
  const handleOpenSubmit = (hw) => {
    setSubmitModalHw(hw);
    setSubmitFiles([]);
    setSubmitText(hw.submission?.text || "");
  };

  // Submit Homework Form
  const handleSubmitWork = async (e) => {
    e.preventDefault();
    if (!submitModalHw) return;

    if (submitModalHw.submissionType === "file" && submitFiles.length === 0) {
      return toast.error("Please attach at least one file for this assignment.");
    }
    if (submitModalHw.submissionType === "text" && !submitText.trim()) {
      return toast.error("Please enter your written response.");
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("text", submitText);

      submitFiles.forEach((file) => {
        formData.append("files", file);
      });

      await submitStudentHomeworkApi(submitModalHw._id, formData);
      toast.success("Homework submitted successfully! ðŸŽ‰");
      setSubmitModalHw(null);
      fetchHomework();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit homework.");
    } finally {
      setSubmitting(false);
    }
  };

  // Countdown Helper
  const getDueCountdown = (dueDateStr) => {
    const due = new Date(dueDateStr).getTime();
    const now = Date.now();
    const diffMs = due - now;

    if (diffMs < 0) {
      const pastDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
      return {
        text: pastDays === 0 ? "Due today (Passed)" : `Overdue by ${pastDays} day(s)`,
        isUrgent: true,
        isOverdue: true,
      };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days === 0) {
      return {
        text: hours === 0 ? "Due in less than 1 hour!" : `Due today (${hours} hr${hours === 1 ? "" : "s"} left)`,
        isUrgent: true,
        isOverdue: false,
      };
    }

    return {
      text: `Due in ${days} day${days === 1 ? "" : "s"}`,
      isUrgent: days <= 1,
      isOverdue: false,
    };
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* â”€â”€ Top Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-sky-600" />
            My Homework & Assignments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete your assignments on time, submit your work, and view teacher feedback.
          </p>
        </div>
      </div>

      {/* â”€â”€ Tabs Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex border-b border-slate-200 text-sm font-semibold">
        <button
          onClick={() => setActiveTab("pending")}
          className={`py-3 px-5 border-b-2 transition flex items-center gap-2 ${
            activeTab === "pending"
              ? "border-sky-600 text-sky-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-sky-100 text-sky-700">
            {counts.pending || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("submitted")}
          className={`py-3 px-5 border-b-2 transition flex items-center gap-2 ${
            activeTab === "submitted"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Submitted & Graded</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">
            {counts.submitted || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("overdue")}
          className={`py-3 px-5 border-b-2 transition flex items-center gap-2 ${
            activeTab === "overdue"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          <span>Overdue</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-rose-100 text-rose-700">
            {counts.overdue || 0}
          </span>
        </button>
      </div>

      {/* â”€â”€ Homework Cards Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      ) : homeworkList.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            {activeTab === "pending"
              ? "No Pending Assignments!"
              : activeTab === "submitted"
              ? "No Submissions Yet"
              : "Great job! No Overdue Homework"}
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {activeTab === "pending"
              ? "You're all caught up with your homework. Enjoy your study time!"
              : "Assignments will appear here as your teachers post them."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {homeworkList.map((hw) => {
            const countdown = getDueCountdown(hw.dueDate);
            const submission = hw.submission;

            return (
              <div
                key={hw._id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {hw.subject}
                    </span>

                    {/* Countdown Badge */}
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        countdown.isOverdue
                          ? "bg-rose-100 text-rose-700"
                          : countdown.isUrgent
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {countdown.text}
                    </span>

                    {hw.maxMarks && (
                      <span className="text-xs font-medium text-slate-400">
                        Max Marks: {hw.maxMarks}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {hw.title}
                  </h3>

                  {hw.description && (
                    <p className="text-xs text-slate-600 max-w-2xl">
                      {hw.description}
                    </p>
                  )}

                  {/* Teacher Attachments */}
                  {hw.attachments?.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Paperclip className="w-3 h-3" /> Worksheets:
                      </span>
                      {hw.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                        >
                          <span className="max-w-[140px] truncate">{att.name}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Feedback / Evaluation box if submitted */}
                  {submission && (
                    <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          Your Submission:{" "}
                          <strong className="text-emerald-600 capitalize">
                            {submission.status.replace("_", " ")}
                          </strong>
                        </span>
                        {submission.marks !== null && (
                          <span className="font-bold text-emerald-600 text-sm">
                            Score: {submission.marks} {hw.maxMarks ? `/ ${hw.maxMarks}` : ""}
                          </span>
                        )}
                      </div>

                      {submission.feedback && (
                        <p className="text-xs text-slate-600 italic">
                          Teacher feedback: "{submission.feedback}"
                        </p>
                      )}

                      {submission.status === "resubmit_requested" && (
                        <div className="text-xs font-bold text-amber-700 flex items-center gap-1.5 pt-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Teacher has requested revisions. Please re-upload your updated work.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Action Button */}
                <div className="shrink-0 flex items-center">
                  {!submission || submission.status === "resubmit_requested" ? (
                    <button
                      onClick={() => handleOpenSubmit(hw)}
                      className={`px-5 py-2.5 rounded-xl font-semibold text-xs shadow-md transition flex items-center gap-2 ${
                        submission?.status === "resubmit_requested"
                          ? "bg-amber-600 hover:bg-amber-700 text-white"
                          : "bg-sky-600 hover:bg-sky-700 text-white"
                      }`}
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>{submission?.status === "resubmit_requested" ? "Resubmit Work" : "Submit Homework"}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submitted ({new Date(submission.submittedAt).toLocaleDateString("en-IN")})</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* â”€â”€ SUBMIT HOMEWORK MODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {submitModalHw && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-sky-600 uppercase">
                  {submitModalHw.subject}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  Submit: {submitModalHw.title}
                </h3>
              </div>
              <button
                onClick={() => setSubmitModalHw(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitWork} className="space-y-4">
              {/* File upload dropzone */}
              {submitModalHw.submissionType !== "none" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Upload Your Work (PDF, JPG, PNG, DOCX up to 10MB)
                  </label>
                  <div className="border border-dashed border-slate-300 rounded-xl p-5 text-center hover:bg-slate-50 transition">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(e) => setSubmitFiles(Array.from(e.target.files || []))}
                      className="hidden"
                      id="student-submit-file"
                    />
                    <label htmlFor="student-submit-file" className="cursor-pointer block">
                      <UploadCloud className="w-8 h-8 text-sky-500 mx-auto mb-1" />
                      <span className="text-xs font-semibold text-sky-600">
                        Click to select assignment files
                      </span>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        Max 5 files, 10MB each
                      </span>
                    </label>
                  </div>

                  {submitFiles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {submitFiles.map((file, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-slate-700 flex items-center justify-between bg-slate-100 px-3 py-1.5 rounded-lg"
                        >
                          <span className="truncate">{file.name}</span>
                          <span className="text-slate-400">
                            {(file.size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Text answer input */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Written Response / Notes for Teacher
                </label>
                <textarea
                  rows={3}
                  placeholder="Type your answer, or leave a note about your submission..."
                  value={submitText}
                  onChange={(e) => setSubmitText(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubmitModalHw(null)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow transition flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{submitting ? "Uploading..." : "Confirm & Submit"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentHomework;

