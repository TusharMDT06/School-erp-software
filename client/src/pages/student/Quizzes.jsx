import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  HelpCircle,
  Clock,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Award,
  AlertCircle,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { getStudentQuizzesApi } from "../../api/quizApi";

const Quizzes = () => {
  const [activeTab, setActiveTab] = useState("available"); // "available" | "upcoming" | "completed"
  const [quizzes, setQuizzes] = useState({ available: [], upcoming: [], completed: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getStudentQuizzesApi()
      .then((res) => {
        const data = res.data?.data || res.data || { available: [], upcoming: [], completed: [] };
        setQuizzes(data);
      })
      .catch((err) => toast.error("Failed to load your online quizzes."))
      .finally(() => setLoading(false));
  }, []);

  const currentList = quizzes[activeTab] || [];

  return (
    <div className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-sky-50 text-sky-600">
                <HelpCircle className="w-5 h-5" />
              </span>
              My Online Quizzes
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Attempt scheduled class assessments, timed multiple-choice quizzes, and review your scores.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-100">
          <button
            onClick={() => setActiveTab("available")}
            className={`pb-3 px-4 text-xs font-bold transition-all relative ${
              activeTab === "available"
                ? "text-sky-600 border-b-2 border-sky-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Available Now ({quizzes.available?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`pb-3 px-4 text-xs font-bold transition-all relative ${
              activeTab === "upcoming"
                ? "text-sky-600 border-b-2 border-sky-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Upcoming ({quizzes.upcoming?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`pb-3 px-4 text-xs font-bold transition-all relative ${
              activeTab === "completed"
                ? "text-sky-600 border-b-2 border-sky-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Completed & Scores ({quizzes.completed?.length || 0})
          </button>
        </div>
      </div>

      {/* ── Content Grid ────────────────────────────────────────────────────── */}
      {currentList.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">No quizzes in this section</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            {activeTab === "available"
              ? "You're all caught up! No active quizzes available right now."
              : activeTab === "upcoming"
              ? "No scheduled quizzes announced yet."
              : "Completed quizzes and test scores will appear here."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentList.map((quiz) => {
          const isCompleted = activeTab === "completed";
          const hasAttempt = quiz.attempt;
          const scorePct = hasAttempt && hasAttempt.maxScore > 0 ? Math.round((hasAttempt.score / hasAttempt.maxScore) * 100) : 0;

          return (
            <div
              key={quiz._id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-sky-700 uppercase bg-sky-50 px-2 py-0.5 rounded-md">
                      {quiz.subject}
                    </span>
                    <h3 className="text-sm font-bold text-slate-800 mt-1.5 line-clamp-1">{quiz.title}</h3>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {quiz.totalMarks} Marks
                  </span>
                </div>

                <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Duration: {quiz.durationMinutes} minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {isCompleted
                        ? `Submitted: ${new Date(hasAttempt?.submittedAt || quiz.updatedAt).toLocaleDateString("en-IN")}`
                        : `Available: ${new Date(quiz.availableFrom).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`}
                    </span>
                  </div>
                  {quiz.availableUntil && !isCompleted && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Closes: {new Date(quiz.availableUntil).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  )}
                </div>

                {/* Score badge for completed tab */}
                {isCompleted && hasAttempt && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Your Score</p>
                      <p className="text-base font-black text-slate-800">
                        {hasAttempt.score} / {hasAttempt.maxScore}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                        scorePct >= 75
                          ? "bg-emerald-100 text-emerald-800"
                          : scorePct < 40
                          ? "bg-rose-100 text-rose-800"
                          : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {scorePct}%
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-100">
                {activeTab === "available" && (
                  <Link
                    to={`/student/quizzes/${quiz._id}/take`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    {quiz.inProgress ? "Resume Quiz" : "Start Quiz"} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}

                {activeTab === "upcoming" && (
                  <button
                    disabled
                    className="w-full py-2 bg-slate-100 text-slate-400 text-xs font-bold rounded-xl cursor-not-allowed"
                  >
                    Opens Soon
                  </button>
                )}

                {activeTab === "completed" && (
                  <div>
                    {hasAttempt?.canViewAnswers ? (
                      <Link
                        to={`/student/quizzes/${quiz._id}/result`}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> Review Solutions
                      </Link>
                    ) : (
                      <p className="text-[11px] text-slate-400 text-center italic">
                        Solutions revealed after quiz closes
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Quizzes;
