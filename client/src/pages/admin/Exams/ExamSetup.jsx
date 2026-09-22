import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  Calendar,
  BookOpen,
  Layers,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Pencil,
  FileSpreadsheet,
} from "lucide-react";
import { getClassesApi } from "../../../api/classApi";
import {
  fetchExamsByClass,
  createExam,
  updateExam,
  deleteExam,
} from "../../../features/exam/examSlice";

const DEFAULT_SUBJECTS = [
  { subjectName: "Mathematics", maxMarks: 100, passingMarks: 35, examDate: "" },
  { subjectName: "Science", maxMarks: 100, passingMarks: 35, examDate: "" },
  { subjectName: "English", maxMarks: 100, passingMarks: 35, examDate: "" },
];

const ExamSetup = () => {
  const dispatch = useDispatch();
  const { exams, loading, submitting } = useSelector((state) => state.exam);

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [examName, setExamName] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-27");
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [editingExamId, setEditingExamId] = useState(null);

  // Load Classes
  useEffect(() => {
    const loadClasses = async () => {
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
    loadClasses();
  }, []);

  // Fetch Exams when class changes
  useEffect(() => {
    if (selectedClassId) {
      dispatch(fetchExamsByClass(selectedClassId));
    }
  }, [selectedClassId, dispatch]);

  // Subject manipulation
  const handleSubjectChange = (index, field, value) => {
    setSubjects((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === "maxMarks" || field === "passingMarks" ? Number(value) || 0 : value,
      };
      return updated;
    });
  };

  const addSubjectRow = () => {
    setSubjects((prev) => [
      ...prev,
      { subjectName: "", maxMarks: 100, passingMarks: 35, examDate: "" },
    ]);
  };

  const removeSubjectRow = (index) => {
    if (subjects.length <= 1) {
      toast.error("At least one subject is required.");
      return;
    }
    setSubjects((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedClassId) {
      toast.error("Please select a class.");
      return;
    }

    if (!examName.trim()) {
      toast.error("Please enter an exam title.");
      return;
    }

    const invalid = subjects.find(
      (s) => !s.subjectName.trim() || s.maxMarks <= 0 || s.passingMarks > s.maxMarks
    );
    if (invalid) {
      toast.error("Please check subject fields: Name, Max Marks (>0), and Passing Marks (<= Max).");
      return;
    }

    try {
      if (editingExamId) {
        await dispatch(
          updateExam({
            id: editingExamId,
            data: { examName, academicYear, subjects },
          })
        ).unwrap();
        toast.success("Exam schedule updated.");
        setEditingExamId(null);
      } else {
        await dispatch(
          createExam({
            classId: selectedClassId,
            examName,
            academicYear,
            subjects,
          })
        ).unwrap();
        toast.success("Exam schedule created successfully!");
      }

      setExamName("");
      setSubjects(DEFAULT_SUBJECTS);
      dispatch(fetchExamsByClass(selectedClassId));
    } catch (err) {
      toast.error(err || "Failed to save exam schedule.");
    }
  };

  const handleEditClick = (exam) => {
    if (exam.resultPublished) {
      toast.error("Cannot edit an exam whose results have already been published.");
      return;
    }
    setEditingExamId(exam._id);
    setExamName(exam.examName);
    setAcademicYear(exam.academicYear);
    setSubjects(
      exam.subjects.map((s) => ({
        subjectName: s.subjectName,
        maxMarks: s.maxMarks,
        passingMarks: s.passingMarks,
        examDate: s.examDate ? s.examDate.slice(0, 10) : "",
      }))
    );
  };

  const handleDeleteClick = async (exam) => {
    if (!window.confirm(`Are you sure you want to delete "${exam.examName}"?`)) return;

    try {
      await dispatch(deleteExam(exam._id)).unwrap();
      toast.success("Exam deleted successfully.");
      dispatch(fetchExamsByClass(selectedClassId));
    } catch (err) {
      toast.error(err || "Cannot delete exam with existing marks.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Examination Schedule Setup</h2>
        <p className="text-xs text-slate-500 mt-1">
          Define examination schemes, subjects, passing marks, and exam timetables per class.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Creation Form */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1F4E79]/10 text-[#1F4E79] flex items-center justify-center">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {editingExamId ? "Edit Examination" : "Schedule New Examination"}
              </h3>
            </div>
            {editingExamId && (
              <button
                type="button"
                onClick={() => {
                  setEditingExamId(null);
                  setExamName("");
                  setSubjects(DEFAULT_SUBJECTS);
                }}
                className="text-xs font-semibold text-rose-600 hover:underline"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  disabled={editingExamId != null}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                >
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      Class {cls.className} - {cls.section} ({cls.academicYear})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2026-27"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Title</label>
              <input
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. Mid-Term Examination 2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
              />
            </div>

            {/* Dynamic Subjects */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700">Subjects & Mark Schemes</label>
                <button
                  type="button"
                  onClick={addSubjectRow}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#1F4E79] hover:text-[#183e60]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Subject
                </button>
              </div>

              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {subjects.map((sub, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Subject Name"
                        value={sub.subjectName}
                        onChange={(e) => handleSubjectChange(idx, "subjectName", e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 font-semibold focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeSubjectRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Max Marks</span>
                        <input
                          type="number"
                          value={sub.maxMarks}
                          onChange={(e) => handleSubjectChange(idx, "maxMarks", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Pass Marks</span>
                        <input
                          type="number"
                          value={sub.passingMarks}
                          onChange={(e) => handleSubjectChange(idx, "passingMarks", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">Exam Date</span>
                        <input
                          type="date"
                          value={sub.examDate}
                          onChange={(e) => handleSubjectChange(idx, "examDate", e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#1F4E79] hover:bg-[#183e60] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 mt-4"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Examination...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {editingExamId ? "Update Examination" : "Create Examination Schedule"}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Existing Exams Table */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Class Examinations</h3>
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#1F4E79]" />
              <p className="text-xs">Loading examinations...</p>
            </div>
          ) : exams.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <p className="text-xs">No examinations scheduled for this class yet.</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
              {exams.map((ex) => (
                <div key={ex._id} className="p-4 bg-slate-50 border border-slate-200/70 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{ex.examName}</h4>
                      <p className="text-[11px] text-slate-400">Academic Year: {ex.academicYear}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        ex.resultPublished
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {ex.resultPublished ? "PUBLISHED" : "DRAFT"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ex.subjects?.map((s, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-medium text-slate-600"
                      >
                        {s.subjectName} ({s.maxMarks}m)
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => handleEditClick(ex)}
                      disabled={ex.resultPublished}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-[#1F4E79] bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-40"
                    >
                      <Pencil className="w-3 h-3 inline mr-1" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(ex)}
                      disabled={ex.resultPublished}
                      className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition disabled:opacity-40"
                    >
                      <Trash2 className="w-3 h-3 inline mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamSetup;
