import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Flag,
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  startQuizApi,
  autosaveQuizApi,
  submitQuizApi,
  getQuizResultApi,
} from "../../api/quizApi";

const TakeQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // ── State: Quiz Session ────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [quizMeta, setQuizMeta] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Map of questionId -> selectedIndex (0, 1, 2, 3)
  const [answers, setAnswers] = useState({});
  // Set of flagged question indices
  const [flaggedIndices, setFlaggedIndices] = useState(new Set());

  // ── State: Timing & Sync ───────────────────────────────────────────────────
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState("synced"); // "synced" | "saving"
  const [hiddenTabCount, setHiddenTabCount] = useState(0);

  // ── State: Submission & Result ─────────────────────────────────────────────
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState(false);
  const [quizFinishedResult, setQuizFinishedResult] = useState(null);

  // Ref to hold answers for periodic autosave & tab change
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const hiddenTabCountRef = useRef(hiddenTabCount);
  hiddenTabCountRef.current = hiddenTabCount;

  // ── 1. Start / Resume Quiz Session ─────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    startQuizApi(id)
      .then((res) => {
        const data = res.data?.data || res.data;
        setQuizMeta(data);
        setQuestions(data.questions || []);
        setRemainingSeconds(data.remainingSeconds || data.durationMinutes * 60);

        // Preload any previously saved answers
        const preloaded = {};
        (data.savedAnswers || []).forEach((a) => {
          if (a.questionId && a.selectedIndex !== null && a.selectedIndex !== undefined) {
            preloaded[a.questionId] = a.selectedIndex;
          }
        });
        setAnswers(preloaded);
        if (data.hiddenTabCount) setHiddenTabCount(data.hiddenTabCount);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || "Failed to start quiz.");
        navigate("/student/quizzes");
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  // ── 2. Real-time Countdown Timer (Server Synchronized) ────────────────────
  useEffect(() => {
    if (loading || quizFinishedResult) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmitOnTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, quizFinishedResult]);

  // ── 3. Periodic Autosave every 15 Seconds ──────────────────────────────────
  useEffect(() => {
    if (loading || quizFinishedResult) return;

    const autosaveInterval = setInterval(() => {
      triggerAutosave();
    }, 15000);

    return () => clearInterval(autosaveInterval);
  }, [loading, quizFinishedResult]);

  const triggerAutosave = async () => {
    if (!id || quizFinishedResult) return;
    setAutoSaveStatus("saving");
    try {
      const answersPayload = Object.entries(answersRef.current).map(([qId, sIdx]) => ({
        questionId: qId,
        selectedIndex: sIdx,
      }));

      await autosaveQuizApi(id, {
        answers: answersPayload,
        hiddenTabCount: hiddenTabCountRef.current,
      });
      setAutoSaveStatus("synced");
    } catch (err) {
      console.warn("Autosave error:", err.message);
      setAutoSaveStatus("synced");
    }
  };

  // ── 4. Hidden Tab Shift / Window Blur Listener ────────────────────────────
  useEffect(() => {
    if (loading || quizFinishedResult) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        const next = hiddenTabCountRef.current + 1;
        setHiddenTabCount(next);
        hiddenTabCountRef.current = next;
        toast(
          "⚠️ Integrity Warning: Switching tabs or unfocusing the window is recorded for the teacher.",
          { icon: "🛡️", duration: 5000 }
        );
        // Immediate autosave to persist integrity counter
        triggerAutosave();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [loading, quizFinishedResult]);

  // ── Timeout Auto-submit ────────────────────────────────────────────────────
  const handleAutoSubmitOnTimeout = async () => {
    if (quizFinishedResult || isSubmitting) return;
    setIsSubmitting(true);
    toast.loading("Time expired! Submitting your answers...", { id: "submitting-quiz" });

    try {
      const answersPayload = Object.entries(answersRef.current).map(([qId, sIdx]) => ({
        questionId: qId,
        selectedIndex: sIdx,
      }));

      const res = await submitQuizApi(id, {
        answers: answersPayload,
        hiddenTabCount: hiddenTabCountRef.current,
      });

      toast.dismiss("submitting-quiz");
      toast.success("Quiz auto-submitted.");

      // Fetch final detailed result if available
      loadFinalResult();
    } catch (err) {
      toast.dismiss("submitting-quiz");
      toast.error(err.response?.data?.message || "Failed to submit quiz.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Student Explicit Submit ────────────────────────────────────────────────
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    setIsConfirmSubmitOpen(false);
    toast.loading("Submitting quiz answers...", { id: "submitting-quiz" });

    try {
      const answersPayload = Object.entries(answers).map(([qId, sIdx]) => ({
        questionId: qId,
        selectedIndex: sIdx,
      }));

      await submitQuizApi(id, {
        answers: answersPayload,
        hiddenTabCount,
      });

      toast.dismiss("submitting-quiz");
      toast.success("Quiz submitted successfully!");

      loadFinalResult();
    } catch (err) {
      toast.dismiss("submitting-quiz");
      toast.error(err.response?.data?.message || "Failed to submit quiz.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadFinalResult = async () => {
    try {
      const res = await getQuizResultApi(id);
      setQuizFinishedResult(res.data?.data || res.data);
    } catch (err) {
      console.warn("Could not load immediate results:", err);
      navigate("/student/quizzes");
    }
  };

  // ── Navigation & Option Selection ─────────────────────────────────────────
  const currentQ = questions[currentIdx];

  const handleSelectOption = (optIdx) => {
    if (!currentQ) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQ._id]: optIdx,
    }));
  };

  const handleClearSelection = () => {
    if (!currentQ) return;
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQ._id];
      return next;
    });
  };

  const toggleFlagCurrent = () => {
    setFlaggedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(currentIdx)) next.delete(currentIdx);
      else next.add(currentIdx);
      return next;
    });
  };

  // Format MM:SS for countdown timer
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const totalAnswered = Object.keys(answers).length;
  const isTimeCritical = remainingSeconds <= 120; // Last 2 minutes

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">Starting secure quiz session...</p>
        </div>
      </div>
    );
  }

  // ── RESULT SCREEN (Once Submitted) ────────────────────────────────────────
  if (quizFinishedResult) {
    const pct = quizFinishedResult.percentage || 0;

    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border-4 border-emerald-100">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl font-black text-slate-800">Quiz Completed!</h1>
            <p className="text-xs text-slate-500 mt-1">{quizFinishedResult.title}</p>
          </div>

          <div className="inline-flex items-center gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Score</p>
              <p className="text-2xl font-black text-slate-800">
                {quizFinishedResult.score} / {quizFinishedResult.maxScore}
              </p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Percentage</p>
              <p className="text-2xl font-black text-sky-600">{pct}%</p>
            </div>
            {quizFinishedResult.autoSubmitted && (
              <>
                <div className="w-px h-8 bg-slate-200" />
                <div>
                  <p className="text-[10px] uppercase font-bold text-amber-600">Note</p>
                  <p className="text-xs font-bold text-amber-800">Auto-Submitted on Timer</p>
                </div>
              </>
            )}
          </div>

          <div>
            <Link
              to="/student/quizzes"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Back to My Quizzes
            </Link>
          </div>
        </div>

        {/* Detailed Solutions (if revealed) */}
        {quizFinishedResult.canRevealAnswers && quizFinishedResult.questions?.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 px-1">Detailed Answer Key & Review</h2>
            {quizFinishedResult.questions.map((q, idx) => (
              <div
                key={q._id || idx}
                className={`bg-white rounded-2xl border p-5 shadow-sm space-y-3 ${
                  q.isCorrect ? "border-emerald-200 ring-1 ring-emerald-500/10" : "border-rose-200 ring-1 ring-rose-500/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Question {idx + 1}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      q.isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {q.isCorrect ? `+${q.marks} Marks` : `0 / ${q.marks} Marks`}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-800">{q.text}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options?.map((opt, oIdx) => {
                    const isSelected = q.studentSelectedIndex === oIdx;
                    const isRight = q.correctDisplayedIndex === oIdx;

                    let cardStyle = "bg-slate-50 border-slate-200 text-slate-700";
                    if (isRight) cardStyle = "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold";
                    else if (isSelected && !isRight)
                      cardStyle = "bg-rose-50 border-rose-300 text-rose-900 font-bold line-through";

                    return (
                      <div key={oIdx} className={`p-2.5 rounded-xl border flex items-center justify-between ${cardStyle}`}>
                        <span>
                          <strong className="mr-1.5">{String.fromCharCode(65 + oIdx)}.</strong>
                          {opt}
                        </span>
                        {isRight && <span className="text-[10px] text-emerald-700 font-black">Correct</span>}
                        {isSelected && !isRight && <span className="text-[10px] text-rose-700 font-black">Your Pick</span>}
                      </div>
                    );
                  })}
                </div>

                {q.explanation && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600">
                    <strong className="text-slate-700">Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700">Answer Key Protected</p>
            <p className="mt-1 text-slate-400">
              Detailed explanations and correct answers will become visible once the quiz closes for all students.
            </p>
          </div>
        )}
      </div>
    );
  }

  // ── ACTIVE QUIZ INTERFACE ──────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* ── Top Bar: Title, Autosave Status, and Large Countdown Timer ────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-sky-700 uppercase bg-sky-50 px-2 py-0.5 rounded-md">
              {quizMeta?.subject}
            </span>
            <h1 className="text-sm font-bold text-slate-800">{quizMeta?.title}</h1>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
            <span>
              {totalAnswered} of {questions.length} Answered
            </span>
            <span>â€¢</span>
            <span className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  autoSaveStatus === "saving" ? "bg-amber-500 animate-ping" : "bg-emerald-500"
                }`}
              />
              {autoSaveStatus === "saving" ? "Saving progress..." : "Autosaved"}
            </span>
          </div>
        </div>

        {/* Large Prominent Timer */}
        <div
          className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border font-mono transition-all ${
            isTimeCritical
              ? "bg-rose-50 border-rose-300 text-rose-700 animate-pulse ring-2 ring-rose-500/20"
              : "bg-slate-50 border-slate-200 text-slate-800"
          }`}
        >
          <Clock className={`w-5 h-5 ${isTimeCritical ? "text-rose-600" : "text-sky-600"}`} />
          <span className="text-xl font-black tracking-wider">{formatTime(remainingSeconds)}</span>
        </div>
      </div>

      {/* ── Main Quiz Layout: Question Card (Left) + Palette (Right) ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left 3 cols: Question Card */}
        <div className="lg:col-span-3 space-y-4">
          {currentQ && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Question {currentIdx + 1} of {questions.length}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                    {currentQ.marks || 1} Mark{currentQ.marks > 1 ? "s" : ""}
                  </span>

                  <button
                    type="button"
                    onClick={toggleFlagCurrent}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      flaggedIndices.has(currentIdx)
                        ? "bg-amber-100 text-amber-800"
                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    {flaggedIndices.has(currentIdx) ? "Flagged" : "Flag"}
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                {currentQ.text}
              </p>

              {/* 4 Option Choice Cards */}
              <div className="space-y-2.5 pt-2">
                {currentQ.options?.map((optText, oIdx) => {
                  const isSelected = answers[currentQ._id] === oIdx;
                  const letter = String.fromCharCode(65 + oIdx);

                  return (
                    <div
                      key={oIdx}
                      onClick={() => handleSelectOption(oIdx)}
                      className={`p-3.5 rounded-xl border flex items-center gap-3.5 cursor-pointer transition-all ${
                        isSelected
                          ? "bg-sky-50 border-sky-400 ring-2 ring-sky-500/10 shadow-xs"
                          : "bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold transition-all flex-shrink-0 ${
                          isSelected
                            ? "bg-sky-600 border-sky-600 text-white"
                            : "border-slate-300 bg-white text-slate-500"
                        }`}
                      >
                        {letter}
                      </div>
                      <span className={`text-xs font-medium ${isSelected ? "text-sky-950 font-bold" : "text-slate-700"}`}>
                        {optText}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Question Card Bottom Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClearSelection}
                  disabled={answers[currentQ._id] === undefined}
                  className="text-xs font-semibold text-slate-400 hover:text-rose-600 disabled:opacity-0 transition-opacity"
                >
                  Clear Choice
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
                    disabled={currentIdx === 0}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>

                  {currentIdx < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                      className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsConfirmSubmitOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" /> Submit Quiz
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 col: Question Palette & Submit Button */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Question Palette
            </h3>

            {/* Grid of question buttons */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = answers[q._id] !== undefined;
                const isFlagged = flaggedIndices.has(idx);
                const isCurrent = currentIdx === idx;

                let btnStyle = "bg-slate-100 text-slate-600 border-slate-200";
                if (isCurrent) btnStyle = "ring-2 ring-sky-500 font-black";

                if (isFlagged) {
                  btnStyle += " bg-amber-100 text-amber-900 border-amber-300";
                } else if (isAnswered) {
                  btnStyle += " bg-emerald-500 text-white border-emerald-500";
                }

                return (
                  <button
                    key={q._id || idx}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-8 rounded-lg border text-xs font-bold transition-all relative flex items-center justify-center ${btnStyle}`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500 flex-shrink-0" />
                <span>Answered ({totalAnswered})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300 flex-shrink-0" />
                <span>Flagged for Review ({flaggedIndices.size})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200 flex-shrink-0" />
                <span>Unanswered ({questions.length - totalAnswered})</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsConfirmSubmitOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5" /> Submit Quiz
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL: Confirm Submission ────────────────────────────────────────── */}
      {isConfirmSubmitOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Ready to Submit?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You have answered <strong>{totalAnswered}</strong> out of{" "}
                <strong>{questions.length}</strong> questions.
                {questions.length - totalAnswered > 0 && (
                  <span className="block text-rose-600 font-semibold mt-1">
                    {questions.length - totalAnswered} question(s) remain unanswered!
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsConfirmSubmitOpen(false)}
                className="py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Keep Reviewing
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeQuiz;
