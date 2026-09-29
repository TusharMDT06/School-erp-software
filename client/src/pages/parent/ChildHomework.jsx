import { useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { getStudentsApi } from "../../api/studentApi";
import { getChildHomeworkApi } from "../../api/homeworkApi";
import toast from "react-hot-toast";
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Paperclip,
  ExternalLink,
  Award,
  AlertTriangle,
  ChevronRight,
  FileCheck,
} from "lucide-react";

const ChildHomework = () => {
  const { user } = useSelector((state) => state.auth);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [loadingChildren, setLoadingChildren] = useState(true);

  const [homeworkData, setHomeworkData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load children for this parent
  useEffect(() => {
    const loadChildren = async () => {
      try {
        setLoadingChildren(true);
        const res = await getStudentsApi({ limit: 50 });
        const list = res.data?.data || res.data || [];
        const myChildren = list.filter(
          (st) =>
            st.guardianIds?.some((g) => (g._id || g) === user?.id) ||
            st.parentPhone === user?.phone ||
            st.parentEmail === user?.email
        );
        const targetList = myChildren.length > 0 ? myChildren : list.slice(0, 3);
        setChildren(targetList);
        if (targetList.length > 0) {
          setSelectedChildId(targetList[0]._id);
        }
      } catch (err) {
        console.error("Failed to load children:", err);
        toast.error("Failed to load children profiles.");
      } finally {
        setLoadingChildren(false);
      }
    };
    if (user) {
      loadChildren();
    }
  }, [user]);

  // Load selected child's homework
  const fetchChildHomework = useCallback(async () => {
    if (!selectedChildId) return;
    try {
      setLoading(true);
      const res = await getChildHomeworkApi(selectedChildId);
      if (res.success && res.data) {
        setHomeworkData(res.data);
      }
    } catch (err) {
      console.error("Failed to load child homework:", err);
      toast.error("Failed to load homework records for selected child.");
    } finally {
      setLoading(false);
    }
  }, [selectedChildId]);

  useEffect(() => {
    fetchChildHomework();
  }, [fetchChildHomework]);

  const homeworkList = homeworkData?.homework || [];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-600" />
            Child Homework & Assignments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track homework completion, teacher evaluations, and scores for your children.
          </p>
        </div>

        {/* Child Selector */}
        {children.length > 1 && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
            <Users className="w-4 h-4 text-slate-400 ml-2" />
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="text-xs font-semibold bg-transparent border-none text-slate-800 focus:outline-none pr-3"
            >
              {children.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.admissionNumber})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Child Summary Card */}
      {homeworkData?.student && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-sm">
              {homeworkData.student.name?.charAt(0) || "C"}
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {homeworkData.student.name}
              </h3>
              <p className="text-xs text-slate-500">
                Roll #{homeworkData.student.rollNumber || "N/A"} â€¢ Total Assignments: {homeworkList.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Homework Cards */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-slate-100 rounded-2xl" />
          ))}
        </div>
      ) : homeworkList.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center">
          <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            No Homework Assignments Found
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            No active homework assignments found for your child's class.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {homeworkList.map((hw) => {
            const submission = hw.submission;
            const isDuePassed = new Date(hw.dueDate).getTime() < Date.now();

            return (
              <div
                key={hw._id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {hw.subject}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {hw.title}
                    </h3>
                  </div>

                  {/* Status Chip */}
                  <div>
                    {submission?.status === "reviewed" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed & Graded
                      </span>
                    ) : submission ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-800">
                        <Clock className="w-3.5 h-3.5" /> Submitted (Awaiting Review)
                      </span>
                    ) : isDuePassed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">
                        <AlertCircle className="w-3.5 h-3.5" /> Overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                        <Clock className="w-3.5 h-3.5" /> Pending Submission
                      </span>
                    )}
                  </div>
                </div>

                {hw.description && (
                  <p className="text-xs text-slate-600">
                    {hw.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
                  <span>
                    Due: <strong>{new Date(hw.dueDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}</strong>
                  </span>

                  {hw.maxMarks && (
                    <span>Max Marks: {hw.maxMarks}</span>
                  )}
                </div>

                {/* Submission Details & Feedback */}
                {submission && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        Submitted: {new Date(submission.submittedAt).toLocaleDateString("en-IN")}
                      </span>
                      {submission.marks !== null && (
                        <span className="font-bold text-emerald-600 text-sm">
                          Score: {submission.marks} {hw.maxMarks ? `/ ${hw.maxMarks}` : ""}
                        </span>
                      )}
                    </div>

                    {submission.feedback && (
                      <p className="text-xs text-slate-700 italic pt-1">
                        Teacher Feedback: "{submission.feedback}"
                      </p>
                    )}

                    {submission.status === "resubmit_requested" && (
                      <p className="text-xs font-bold text-amber-700 flex items-center gap-1 pt-1">
                        <AlertTriangle className="w-3 h-3" /> Teacher has requested your child to resubmit this work.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChildHomework;

