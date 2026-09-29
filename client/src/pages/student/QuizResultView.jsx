import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Award,
} from "lucide-react";
import toast from "react-hot-toast";
import { getQuizResultApi } from "../../api/quizApi";

const QuizResultView = () => {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getQuizResultApi(id)
      .then((res) => {
        setResult(res.data?.data || res.data);
      })
      .catch((err) => toast.error(err.response?.data?.message || "Failed to load result."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <p className="text-sm font-bold text-slate-700">Quiz Result Not Available</p>
        <Link to="/student/quizzes" className="mt-4 inline-block text-xs font-bold text-sky-600 hover:underline">
          &larr; Back to Quizzes
        </Link>
      </div>
    );
  }

  const pct = result.percentage || 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Link
            to="/student/quizzes"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-800">{result.title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{result.subject} â€¢ Quiz Solution & Scorecard</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50">
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Score</p>
            <p className="text-xl font-black text-slate-800 mt-0.5">
              {result.score} / {result.maxScore}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-sky-50">
            <p className="text-[10px] font-semibold text-sky-500 uppercase">Percentage</p>
            <p className="text-xl font-black text-sky-700 mt-0.5">{pct}%</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 col-span-2 sm:col-span-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase">Submitted On</p>
            <p className="text-xs font-bold text-slate-700 mt-1">
              {result.submittedAt ? new Date(result.submittedAt).toLocaleDateString("en-IN") : "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Answer Key & Explanations */}
      {result.canRevealAnswers && result.questions?.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-800 px-1">Questions & Explanations</h2>

          {result.questions.map((q, idx) => (
            <div
              key={q._id || idx}
              className={`bg-white rounded-2xl border p-5 shadow-sm space-y-3 ${
                q.isCorrect ? "border-emerald-200" : "border-rose-200"
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

              <p className="text-xs font-bold text-slate-800">{q.text}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {q.options?.map((opt, oIdx) => {
                  const isSelected = q.studentSelectedIndex === oIdx;
                  const isRight = q.correctDisplayedIndex === oIdx;

                  let style = "bg-slate-50 border-slate-200 text-slate-700";
                  if (isRight) style = "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold";
                  else if (isSelected && !isRight)
                    style = "bg-rose-50 border-rose-300 text-rose-900 font-bold line-through";

                  return (
                    <div key={oIdx} className={`p-2.5 rounded-xl border flex items-center justify-between ${style}`}>
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
          <p className="font-bold text-slate-700">Solutions Pending Quiz Close</p>
          <p className="mt-1 text-slate-400">
            Correct options and explanations will unlock once the quiz deadline expires.
          </p>
        </div>
      )}
    </div>
  );
};

export default QuizResultView;
