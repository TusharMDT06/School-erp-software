import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  FileSpreadsheet,
  BookOpen,
  Users,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { getClassesApi } from "../../api/classApi";
import { getStudentsApi } from "../../api/studentApi";
import {
  fetchExamsByClass,
  fetchResultsByExam,
  saveBulkMarks,
} from "../../features/exam/examSlice";
import MarksEntryGrid from "../../components/exam/MarksEntryGrid";

const MarksEntry = () => {
  const dispatch = useDispatch();
  const { exams, examResults, submitting } = useSelector((state) => state.exam);

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [students, setStudents] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Load Classes on mount
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

  // Set default exam when exams list arrives
  useEffect(() => {
    if (exams.length > 0 && !selectedExamId) {
      setSelectedExamId(exams[0]._id);
    }
  }, [exams, selectedExamId]);

  // Fetch students & results when exam or class changes
  const loadStudentsAndMarks = useCallback(async () => {
    if (!selectedClassId || !selectedExamId) return;

    try {
      setLoadingData(true);
      // 1. Fetch active students in class
      const stRes = await getStudentsApi({
        classId: selectedClassId,
        status: "active",
        limit: 100,
      });
      const stList = stRes.data?.data || stRes.data || [];
      setStudents(stList);

      // 2. Fetch recorded marks
      await dispatch(fetchResultsByExam(selectedExamId)).unwrap();
    } catch (err) {
      toast.error("Error loading student roster or previous marks.");
    } finally {
      setLoadingData(false);
    }
  }, [selectedClassId, selectedExamId, dispatch]);

  useEffect(() => {
    loadStudentsAndMarks();
  }, [loadStudentsAndMarks]);

  const selectedExam = exams.find((e) => e._id === selectedExamId);

  // Handle Save Draft from MarksEntryGrid
  const handleSaveMarks = async (entries) => {
    try {
      await dispatch(
        saveBulkMarks({
          examId: selectedExamId,
          entries,
        })
      ).unwrap();

      toast.success("Marks draft saved successfully! You can continue editing or re-saving anytime.");
      dispatch(fetchResultsByExam(selectedExamId));
    } catch (err) {
      toast.error(err || "Failed to save student marks.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Teacher Marks Entry Portal</h2>
          <p className="text-xs text-slate-500 mt-1">
            Enter and review subject marks for students. Results remain in draft until published by administration.
          </p>
        </div>

        {selectedExam?.resultPublished && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold self-start sm:self-auto">
            <AlertCircle className="w-4 h-4 text-emerald-600" />
            Results Published (Editing Locked)
          </div>
        )}
      </div>

      {/* Selectors Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Class & Section
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] transition"
            >
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  Class {cls.className} - {cls.section} ({cls.academicYear})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Examination
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              disabled={exams.length === 0}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 focus:border-[#1F4E79] transition"
            >
              {exams.length === 0 ? (
                <option value="">No exams scheduled for this class</option>
              ) : (
                exams.map((ex) => (
                  <option key={ex._id} value={ex._id}>
                    {ex.examName} ({ex.academicYear}) {ex.resultPublished ? "— [Published]" : "— [Draft]"}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Spreadsheet Marks Entry */}
      {loadingData ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#1F4E79]" />
          <p className="text-sm font-medium">Loading marks spreadsheet and class roster...</p>
        </div>
      ) : !selectedExam ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center text-slate-400 text-xs">
          Please select an examination above to record marks.
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center text-slate-400 text-xs">
          No active students found in this class section.
        </div>
      ) : (
        <MarksEntryGrid
          exam={selectedExam}
          students={students}
          initialResults={examResults}
          onSave={handleSaveMarks}
          saving={submitting}
        />
      )}
    </div>
  );
};

export default MarksEntry;
