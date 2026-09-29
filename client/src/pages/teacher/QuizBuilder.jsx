import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  HelpCircle,
  Plus,
  Sparkles,
  Trash2,
  Edit2,
  Send,
  Eye,
  BarChart2,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  Shuffle,
  RefreshCw,
  Copy,
  ChevronLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import { getTeacherClassesAndSubjectsApi } from "../../api/teacherDashboardApi";
import {
  getQuizzesApi,
  createQuizApi,
  updateQuizApi,
  deleteQuizApi,
  publishQuizApi,
  generateAiQuestionsApi,
} from "../../api/quizApi";

const QuizBuilder = () => {
  const navigate = useNavigate();

  // ── State: Teacher Classes & Subjects ──────────────────────────────────────
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  // ── State: View Mode ───────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState("list"); // "list" | "create" | "edit"
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── State: Active Quiz Form ────────────────────────────────────────────────
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [activeQuizStatus, setActiveQuizStatus] = useState("draft");
  const [quizForm, setQuizForm] = useState({
    title: "",
    durationMinutes: 15,
    shuffleQuestions: false,
    shuffleOptions: false,
    availableFrom: new Date().toISOString().slice(0, 16),
    availableUntil: "",
    showResults: "immediately",
    questions: [
      {
        text: "",
        options: ["", "", "", ""],
        correctIndex: 0,
        explanation: "",
        marks: 1,
      },
    ],
  });

  // ── State: AI Question Generator Drawer ────────────────────────────────────
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiParams, setAiParams] = useState({
    topic: "",
    count: 5,
    difficulty: "medium",
    level: "Secondary",
  });
  const [aiCandidates, setAiCandidates] = useState([]);
  const [remainingAiQuota, setRemainingAiQuota] = useState(null);

  // ── Fetch Classes & Subjects ───────────────────────────────────────────────
  useEffect(() => {
    getTeacherClassesAndSubjectsApi()
      .then((res) => {
        const data = res.data || res;
        const clsList = data.classes || [];
        const subjList = data.subjects || [];
        setClasses(clsList);
        setSubjects(subjList);
        if (clsList.length > 0) setSelectedClassId(clsList[0]._id);
        if (subjList.length > 0) setSelectedSubject(subjList[0]);
      })
      .catch(() => toast.error("Failed to load assigned classes/subjects."));
  }, []);

  // ── Fetch Quizzes List ─────────────────────────────────────────────────────
  const fetchQuizzes = async () => {
    if (!selectedClassId || !selectedSubject) return;
    setLoading(true);
    try {
      const res = await getQuizzesApi({
        classId: selectedClassId,
        subject: selectedSubject,
      });
      setQuizzes(res.data?.data || res.data || []);
    } catch (err) {
      console.warn("Failed to fetch quizzes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "list") {
      fetchQuizzes();
    }
  }, [selectedClassId, selectedSubject, viewMode]);

  // ── Quiz Creation / Edit Handlers ──────────────────────────────────────────
  const handleOpenCreateQuiz = () => {
    setActiveQuizId(null);
    setActiveQuizStatus("draft");
    setQuizForm({
      title: "",
      durationMinutes: 15,
      shuffleQuestions: false,
      shuffleOptions: false,
      availableFrom: new Date().toISOString().slice(0, 16),
      availableUntil: "",
      showResults: "immediately",
      questions: [
        {
          text: "",
          options: ["", "", "", ""],
          correctIndex: 0,
          explanation: "",
          marks: 1,
        },
      ],
    });
    setViewMode("create");
  };

  const handleOpenEditQuiz = (quiz) => {
    setActiveQuizId(quiz._id);
    setActiveQuizStatus(quiz.status);
    setQuizForm({
      title: quiz.title,
      durationMinutes: quiz.durationMinutes,
      shuffleQuestions: quiz.shuffleQuestions || false,
      shuffleOptions: quiz.shuffleOptions || false,
      availableFrom: quiz.availableFrom ? quiz.availableFrom.slice(0, 16) : "",
      availableUntil: quiz.availableUntil ? quiz.availableUntil.slice(0, 16) : "",
      showResults: quiz.showResults || "immediately",
      questions:
        quiz.questions.length > 0
          ? quiz.questions.map((q) => ({
              text: q.text,
              options: [...q.options],
              correctIndex: q.correctIndex,
              explanation: q.explanation || "",
              marks: q.marks || 1,
            }))
          : [
              {
                text: "",
                options: ["", "", "", ""],
                correctIndex: 0,
                explanation: "",
                marks: 1,
              },
            ],
    });
    setViewMode("edit");
  };

  // ── Question Manipulation in Quiz Form ─────────────────────────────────────
  const handleAddBlankQuestion = () => {
    setQuizForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          text: "",
          options: ["", "", "", ""],
          correctIndex: 0,
          explanation: "",
          marks: 1,
        },
      ],
    }));
  };

  const handleRemoveQuestion = (idx) => {
    setQuizForm((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx),
    }));
  };

  const handleUpdateQuestion = (idx, field, value) => {
    setQuizForm((prev) => {
      const updated = [...prev.questions];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, questions: updated };
    });
  };

  const handleUpdateOption = (qIdx, optIdx, value) => {
    setQuizForm((prev) => {
      const updated = [...prev.questions];
      const newOpts = [...updated[qIdx].options];
      newOpts[optIdx] = value;
      updated[qIdx] = { ...updated[qIdx], options: newOpts };
      return { ...prev, questions: updated };
    });
  };

  // ── Save Quiz (Draft or Update) ────────────────────────────────────────────
  const handleSaveQuiz = async (publishImmediately = false) => {
    if (!quizForm.title.trim()) return toast.error("Please enter a quiz title.");

    // Validate questions
    for (let i = 0; i < quizForm.questions.length; i++) {
      const q = quizForm.questions[i];
      if (!q.text.trim()) {
        return toast.error(`Question ${i + 1} has empty question text.`);
      }
      for (let o = 0; o < 4; o++) {
        if (!q.options[o]?.trim()) {
          return toast.error(`Question ${i + 1} Option ${String.fromCharCode(65 + o)} is empty.`);
        }
      }
    }

    try {
      const payload = {
        classId: selectedClassId,
        subject: selectedSubject,
        title: quizForm.title.trim(),
        durationMinutes: Number(quizForm.durationMinutes) || 15,
        shuffleQuestions: quizForm.shuffleQuestions,
        shuffleOptions: quizForm.shuffleOptions,
        availableFrom: quizForm.availableFrom ? new Date(quizForm.availableFrom) : new Date(),
        availableUntil: quizForm.availableUntil ? new Date(quizForm.availableUntil) : null,
        showResults: quizForm.showResults,
        questions: quizForm.questions,
      };

      let savedQuiz;
      if (activeQuizId) {
        const res = await updateQuizApi(activeQuizId, payload);
        savedQuiz = res.data?.data || res.data;
        toast.success("Quiz updated.");
      } else {
        const res = await createQuizApi(payload);
        savedQuiz = res.data?.data || res.data;
        toast.success("Quiz saved as draft.");
      }

      if (publishImmediately && savedQuiz?._id) {
        await publishQuizApi(savedQuiz._id);
        toast.success("Quiz published! Students have been notified in-app.");
      }

      setViewMode("list");
      fetchQuizzes();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save quiz.");
    }
  };

  // ── Publish Quiz from List ─────────────────────────────────────────────────
  const handlePublishFromList = async (quiz) => {
    if (!window.confirm(`Publish "${quiz.title}"? Students in this class will be notified immediately.`)) return;
    try {
      await publishQuizApi(quiz._id);
      toast.success("Quiz published and students notified.");
      fetchQuizzes();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to publish quiz.");
    }
  };

  // ── Delete Quiz ────────────────────────────────────────────────────────────
  const handleDeleteQuiz = async (quiz) => {
    if (!window.confirm(`Delete "${quiz.title}"?`)) return;
    try {
      await deleteQuizApi(quiz._id);
      toast.success("Quiz deleted.");
      fetchQuizzes();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete quiz.");
    }
  };

  // ── AI Question Generator Handlers ─────────────────────────────────────────
  const handleGenerateAiQuestions = async (e) => {
    e.preventDefault();
    if (!aiParams.topic.trim()) {
      return toast.error("Please enter a topic for AI question generation.");
    }

    setAiGenerating(true);
    try {
      const res = await generateAiQuestionsApi({
        classId: selectedClassId,
        subject: selectedSubject,
        topic: aiParams.topic.trim(),
        count: aiParams.count,
        difficulty: aiParams.difficulty,
        level: aiParams.level,
      });

      const candidates = res.data?.data?.questions || res.data?.questions || [];
      const remaining = res.data?.data?.remainingQuotaToday;
      if (remaining !== undefined) setRemainingAiQuota(remaining);

      setAiCandidates(candidates);
      toast.success(`${candidates.length} questions generated. Review each below before accepting.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate AI questions.");
    } finally {
      setAiGenerating(false);
    }
  };

  // Accept a single AI question into the quiz
  const handleAcceptAiQuestion = (candIdx) => {
    const cand = aiCandidates[candIdx];
    setQuizForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions.filter((q) => q.text.trim() !== ""), // remove blank placeholder if empty
        {
          text: cand.text,
          options: [...cand.options],
          correctIndex: cand.correctIndex,
          explanation: cand.explanation || "",
          marks: cand.marks || 1,
        },
      ],
    }));

    // Remove from candidate drawer list
    setAiCandidates((prev) => prev.filter((_, i) => i !== candIdx));
    toast.success("Question added to quiz.");
  };

  // Accept all remaining AI questions
  const handleAcceptAllAiQuestions = () => {
    setQuizForm((prev) => ({
      ...prev,
      questions: [
        ...prev.questions.filter((q) => q.text.trim() !== ""),
        ...aiCandidates.map((c) => ({
          text: c.text,
          options: [...c.options],
          correctIndex: c.correctIndex,
          explanation: c.explanation || "",
          marks: c.marks || 1,
        })),
      ],
    }));
    setAiCandidates([]);
    setIsAiDrawerOpen(false);
    toast.success("All AI questions added to quiz.");
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Navigation Bar ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <HelpCircle className="w-5 h-5" />
              </span>
              Online Quizzes & Question Studio
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Create timed MCQs, generate draft questions with Gemini AI, randomize options, and review attempts.
            </p>
          </div>

          {viewMode === "list" ? (
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Class
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.className} {c.section ? `(${c.section})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  {subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-5">
                <button
                  onClick={handleOpenCreateQuiz}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" /> Create New Quiz
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("list")}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Quizzes
              </button>
              <button
                onClick={() => setIsAiDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                <Sparkles className="w-4 h-4" /> AI Questions Studio
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── VIEW 1: QUIZZES LIST ─────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              Quizzes for {selectedSubject} ({quizzes.length})
            </h2>
          </div>

          {quizzes.length === 0 && !loading && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No quizzes created yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Draft a quiz manually or use Gemini AI to generate multiple choice questions in seconds.
              </p>
              <button
                onClick={handleOpenCreateQuiz}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
              >
                Create First Quiz
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizzes.map((quiz) => {
              const isDraft = quiz.status === "draft";
              const isPublished = quiz.status === "published";
              const isClosed = quiz.status === "closed";

              return (
                <div
                  key={quiz._id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{quiz.title}</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {quiz.questionCount} Questions â€¢ {quiz.totalMarks} Marks
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          isPublished
                            ? "bg-emerald-100 text-emerald-700"
                            : isClosed
                            ? "bg-slate-100 text-slate-600"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {quiz.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{quiz.durationMinutes} Minutes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>From: {new Date(quiz.availableFrom).toLocaleDateString("en-IN")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-indigo-600 font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{quiz.submittedCount || 0} Submissions</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      {isDraft && (
                        <button
                          onClick={() => handlePublishFromList(quiz)}
                          className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                        >
                          <Send className="w-3.5 h-3.5" /> Publish
                        </button>
                      )}

                      {!isDraft && (
                        <Link
                          to={`/teacher/quizzes/${quiz._id}/results`}
                          className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                        >
                          <BarChart2 className="w-3.5 h-3.5" /> Results ({quiz.submittedCount || 0})
                        </Link>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditQuiz(quiz)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                        title="Edit Quiz"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuiz(quiz)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Delete Quiz"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VIEW 2: QUIZ BUILDER & QUESTION STUDIO ───────────────────────────── */}
      {(viewMode === "create" || viewMode === "edit") && (
        <div className="space-y-6">
          {/* Quiz Settings Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              Quiz Setup & Rules
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quiz Title</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly Chapter 4 Check: Newton's Laws"
                  value={quizForm.title}
                  onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Duration (Mins)</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={quizForm.durationMinutes}
                  onChange={(e) => setQuizForm({ ...quizForm, durationMinutes: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Available From</label>
                <input
                  type="datetime-local"
                  value={quizForm.availableFrom}
                  onChange={(e) => setQuizForm({ ...quizForm, availableFrom: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Available Until (Optional)</label>
                <input
                  type="datetime-local"
                  value={quizForm.availableUntil}
                  onChange={(e) => setQuizForm({ ...quizForm, availableUntil: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Show Results to Students</label>
                <select
                  value={quizForm.showResults}
                  onChange={(e) => setQuizForm({ ...quizForm, showResults: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="immediately">Immediately after submission</option>
                  <option value="after_close">Only after quiz deadline closes</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={quizForm.shuffleQuestions}
                  onChange={(e) => setQuizForm({ ...quizForm, shuffleQuestions: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-700">Shuffle question order for each student</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={quizForm.shuffleOptions}
                  onChange={(e) => setQuizForm({ ...quizForm, shuffleOptions: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-semibold text-slate-700">Randomize option order (A, B, C, D)</span>
              </label>
            </div>
          </div>

          {/* Questions Editor Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800">
                Questions ({quizForm.questions.length})
              </h2>
              <span className="text-xs text-slate-400">
                Total Marks: {quizForm.questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAiDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:from-purple-700 hover:to-indigo-700"
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Draft
              </button>
              <button
                type="button"
                onClick={handleAddBlankQuestion}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>
          </div>

          {/* Questions Cards List */}
          <div className="space-y-4">
            {quizForm.questions.map((q, qIdx) => (
              <div
                key={qIdx}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3 relative group hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-black flex items-center justify-center">
                      {qIdx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700">Question {qIdx + 1}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] font-semibold text-slate-500">Marks:</label>
                      <input
                        type="number"
                        min="1"
                        value={q.marks}
                        onChange={(e) => handleUpdateQuestion(qIdx, "marks", Number(e.target.value))}
                        className="w-14 text-center py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none"
                      />
                    </div>

                    {quizForm.questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Delete question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Text */}
                <textarea
                  rows="2"
                  placeholder="Type your question prompt here..."
                  value={q.text}
                  onChange={(e) => handleUpdateQuestion(qIdx, "text", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium resize-none"
                  required
                />

                {/* 4 Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = q.correctIndex === optIdx;
                    const letter = String.fromCharCode(65 + optIdx);

                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                          isCorrect
                            ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-500/20"
                            : "bg-slate-50/60 border-slate-200"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleUpdateQuestion(qIdx, "correctIndex", optIdx)}
                          className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-black transition-all flex-shrink-0 ${
                            isCorrect
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "border-slate-300 text-slate-500 hover:border-emerald-400 bg-white"
                          }`}
                          title="Click to mark this option as correct"
                        >
                          {letter}
                        </button>

                        <input
                          type="text"
                          placeholder={`Option ${letter}`}
                          value={opt}
                          onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                          className="flex-1 bg-transparent text-xs text-slate-800 focus:outline-none font-medium"
                          required
                        />

                        {isCorrect && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                <input
                  type="text"
                  placeholder="Optional answer explanation shown after submission..."
                  value={q.explanation}
                  onChange={(e) => handleUpdateQuestion(qIdx, "explanation", e.target.value)}
                  className="w-full bg-slate-50/40 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 focus:outline-none"
                />
              </div>
            ))}
          </div>

          {/* Bottom Action Footer */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSaveQuiz(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSaveQuiz(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                <Send className="w-3.5 h-3.5" /> Save & Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI QUESTION GENERATION DRAWER ────────────────────────────────────── */}
      {isAiDrawerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Gemini MCQ Generator</h3>
                  <p className="text-[11px] text-slate-400">Strict 4-option questions with explanations</p>
                </div>
              </div>
              <button
                onClick={() => setIsAiDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {/* AI Generator Form */}
            <form onSubmit={handleGenerateAiQuestions} className="p-5 border-b border-slate-100 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Topic / Chapter</label>
                <input
                  type="text"
                  placeholder="e.g. Periodic Table Trends, World War II Causes, Quadratic Equations"
                  value={aiParams.topic}
                  onChange={(e) => setAiParams({ ...aiParams, topic: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Count (Max 10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={aiParams.count}
                    onChange={(e) => setAiParams({ ...aiParams, count: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Difficulty</label>
                  <select
                    value={aiParams.difficulty}
                    onChange={(e) => setAiParams({ ...aiParams, difficulty: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-700"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Level</label>
                  <select
                    value={aiParams.level}
                    onChange={(e) => setAiParams({ ...aiParams, level: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-slate-700"
                  >
                    <option value="Middle School">Middle</option>
                    <option value="Secondary">Secondary</option>
                    <option value="Senior Secondary">Senior Sec</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  {remainingAiQuota !== null ? `Daily quota: ${remainingAiQuota} left` : "Limit: 20 calls/day"}
                </span>
                <button
                  type="submit"
                  disabled={aiGenerating}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {aiGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> Draft Questions
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Generated Candidates Review List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {aiCandidates.length > 0 && (
                <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-xl p-3">
                  <div>
                    <p className="text-xs font-bold text-purple-900">AI-generated: review before publishing</p>
                    <p className="text-[10px] text-purple-700">Accept questions individually or take all.</p>
                  </div>
                  <button
                    onClick={handleAcceptAllAiQuestions}
                    className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 shadow-xs"
                  >
                    Accept All ({aiCandidates.length})
                  </button>
                </div>
              )}

              {aiCandidates.map((cand, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 hover:border-slate-300 transition-colors"
                >
                  <p className="text-xs font-bold text-slate-800 leading-snug">
                    {idx + 1}. {cand.text}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {cand.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`p-2 rounded-lg border font-medium ${
                          cand.correctIndex === oIdx
                            ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                            : "bg-white border-slate-200 text-slate-700"
                        }`}
                      >
                        <span className="mr-1.5 font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                        {opt}
                      </div>
                    ))}
                  </div>

                  {cand.explanation && (
                    <p className="text-[10px] text-slate-500 italic">
                      <strong>Exp:</strong> {cand.explanation}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setAiCandidates((prev) => prev.filter((_, i) => i !== idx))}
                      className="px-2.5 py-1 text-slate-400 hover:text-rose-600 text-[11px] font-semibold"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAcceptAiQuestion(idx)}
                      className="px-3 py-1 bg-indigo-600 text-white text-[11px] font-bold rounded-lg hover:bg-indigo-700"
                    >
                      Accept Question
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizBuilder;
