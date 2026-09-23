import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Loader2,
  Users,
  Calendar,
  Lock,
} from "lucide-react";
import { getClassesApi } from "../../../api/classApi";
import { getStudentsApi } from "../../../api/studentApi";
import {
  fetchExamsByClass,
  fetchResultsByExam,
  generateAiRemarks,
  publishExamResults,
} from "../../../features/exam/examSlice";

const ResultsPublish = () => {
  const dispatch = useDispatch();
  const { exams, examResults, loading, generatingRemarks, publishing } = useSelector(
    (state) => state.exam
  );

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [students, setStudents] = useState([]);
  const [showConfirmPublishModal, setShowConfirmPublishModal] = useState(false);

  // Load Classes
  useEffect(() => {
    const loadInit = async () => {
      try {
        const res = await getClassesApi({ limit: 100 });
        const list = res.data?.data || res.data || [];
        setClasses(list);
        if (list.length > 0) {
          setSelectedClassId(list[0]._id);
        }
      } catch (err) {
        toast.error("Failed to load class list.");
      }
    };
    loadInit();
  }, []);

  // Fetch exams when class changes
  useEffect(() => {
    if (selectedClassId) {
      dispatch(fetchExamsByClass(selectedClassId));
      setSelectedExamId("");
    }
  }, [selectedClassId, dispatch]);

  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0]._id);
    }
  }, [exams, selectedExamId]);

  // Load class student count and marks recorded
  const loadExamStatus = useCallback(async () => {
    if (!selectedClassId || !selectedExamId) return;

    try {
      const stRes = await getStudentsApi({
        classId: selectedClassId,
        status: "active",
        limit: 100,
      });
      const stList = stRes.data?.data || stRes.data || [];
      setStudents(stList);

      await dispatch(fetchResultsByExam(selectedExamId)).unwrap();
    } catch (err) {
      toast.error("Error loading student or exam status.");
    }
  }, [selectedClassId, selectedExamId, dispatch]);

  useEffect(() => {
    loadExamStatus();
  }, [loadExamStatus]);

  const selectedExam = exams.find((e) => e._id === selectedExamId);

  // Remarks count
  const enteredCount = examResults.length;
  const totalStudents = students.length;
  const remarksCount = examResults.filter((r) => r.remarks && r.remarks.trim().length > 0).length;

  // Generate AI remarks handler
  const handleGenerateRemarks = async () => {
    if (!selectedExamId) return;
    try {
      const res = await dispatch(generateAiRemarks(selectedExamId)).unwrap();
      toast.success(res.message || "AI remarks generated successfully!");
      dispatch(fetchResultsByExam(selectedExamId));
    } catch (err) {
      toast.error(err || "Failed to generate AI remarks.");
    }
  };

  // Publish results handler
  const handlePublishConfirm = async () => {
    if (!selectedExamId) return;
    try {
      const res = await dispatch(publishExamResults(selectedExamId)).unwrap();
      toast.success(
        res.message || "Results published! Official PDF report cards generated and parents notified."
      );
      setShowConfirmPublishModal(false);
      dispatch(fetchExamsByClass(selectedClassId));
    } catch (err) {
      toast.error(err || "Failed to publish results.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Publish Examination Results</h2>
        <p className="text-xs text-slate-500 mt-1">
          Review mark submission progress, synthesize AI teacher remarks, and officially publish results to parents and students.
        </p>
      </div>

      {/* Class & Exam Selectors */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Class Section</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
            >
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  Class {cls.className} - {cls.section} ({cls.academicYear})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Examination</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
            >
              {exams.map((ex) => (
                <option key={ex._id} value={ex._id}>
                  {ex.examName} ({ex.academicYear}) {ex.resultPublished ? "— [Published]" : "— [Draft]"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedExam ? (
        <div className="space-y-5">
          {/* Status KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Marks Entry Progress</p>
                <p className="text-2xl font-extrabold text-slate-800 mt-1">
                  {enteredCount} / {totalStudents}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {totalStudents > 0 ? Math.round((enteredCount / totalStudents) * 100) : 0}% entered
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Teacher / AI Remarks</p>
                <p className="text-2xl font-extrabold text-purple-700 mt-1">
                  {remarksCount} / {enteredCount}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Ready for report card</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Publication Status</p>
                <p
                  className={`text-xl font-extrabold mt-1 ${
                    selectedExam.resultPublished ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {selectedExam.resultPublished ? "PUBLISHED" : "IN DRAFT"}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {selectedExam.resultPublished ? "Visible to parents" : "Hidden from students"}
                </p>
              </div>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedExam.resultPublished
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-amber-50 text-amber-600"
                }`}
              >
                {selectedExam.resultPublished ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
              </div>
            </div>
          </div>

          {/* Action Control Strip */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Publishing Actions</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate personalized remarks via Gemini AI and generate sealed PDF report cards for all students.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Generate AI Remarks Button */}
              <button
                type="button"
                onClick={handleGenerateRemarks}
                disabled={generatingRemarks || enteredCount === 0 || selectedExam.resultPublished}
                className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-xl transition shadow-2xs flex items-center gap-2 disabled:opacity-50"
              >
                {generatingRemarks ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating AI Remarks...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    Generate AI Remarks
                  </>
                )}
              </button>

              {/* Publish Results Button */}
              {selectedExam.resultPublished ? (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Results Published & Notified
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmPublishModal(true)}
                  disabled={enteredCount === 0 || publishing}
                  className="px-5 py-2.5 bg-[#1F4E79] hover:bg-[#183e60] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs shadow-[#1F4E79]/30 transition flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  Publish Results
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center text-slate-400 text-xs">
          No examination selected.
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Publish Examination Results?</h3>
                <p className="text-xs text-slate-500">This action will trigger official reporting.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-600 space-y-1.5">
              <p>• Official PDF Report Cards will be generated with seal for all {enteredCount} students.</p>
              <p>• An automated email notification will be sent via Resend to all registered parents.</p>
              <p>• Real-time Socket.io alerts will be broadcast to parents and students.</p>
              <p className="font-semibold text-rose-600">• Marks will be permanently locked from teacher edits.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmPublishModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishConfirm}
                disabled={publishing}
                className="px-5 py-2 bg-[#1F4E79] hover:bg-[#183e60] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Publishing & Generating Cards...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Yes, Publish Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsPublish;
