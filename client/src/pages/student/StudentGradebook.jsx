import { useState, useEffect } from "react";
import { Award, CheckCircle2, TrendingUp, Layers } from "lucide-react";
import toast from "react-hot-toast";
import { getStudentGradebookApi } from "../../api/gradebookApi";

const StudentGradebook = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getStudentGradebookApi()
      .then((res) => {
        setData(res.data?.data || res.data || null);
      })
      .catch((err) => toast.error("Failed to load your gradebook."))
      .finally(() => setLoading(false));
  }, []);

  const components = data?.components || [];
  const overall = data?.overallPercentage;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
            <Award className="w-5 h-5" />
          </span>
          My Gradebook (Continuous Assessment)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          View your published unit tests, projects, and internal weighted scores.
        </p>

        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[10px] uppercase font-semibold text-slate-400">Weighted Score</p>
              <p className="text-xl font-black text-slate-800 mt-0.5">
                {data.weightedInternalTotal} / {data.assessedWeightage}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl">
              <p className="text-[10px] uppercase font-semibold text-indigo-400">Cumulative Percentage</p>
              <p className="text-xl font-black text-indigo-700 mt-0.5">{overall !== null ? `${overall}%` : "-"}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl col-span-2 sm:col-span-1">
              <p className="text-[10px] uppercase font-semibold text-slate-400">Components Assessed</p>
              <p className="text-xl font-black text-slate-800 mt-0.5">{components.length}</p>
            </div>
          </div>
        )}
      </div>

      {components.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
          <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No Assessment Components Published Yet</p>
          <p className="text-xs mt-1">Your teacher will publish test and project marks here.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {components.map((comp) => (
          <div
            key={comp.componentId}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                  {comp.subject}
                </span>
                <h3 className="text-sm font-bold text-slate-800 mt-1">{comp.name}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Weightage: {comp.weightage}% â€¢ Max: {comp.maxMarks}
                </p>
              </div>

              {comp.absent ? (
                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">
                  ABS
                </span>
              ) : comp.percentage !== null ? (
                <span
                  className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                    comp.percentage >= 75
                      ? "bg-emerald-100 text-emerald-800"
                      : comp.percentage < 40
                      ? "bg-rose-100 text-rose-800"
                      : "bg-indigo-100 text-indigo-800"
                  }`}
                >
                  {comp.percentage}%
                </span>
              ) : (
                <span className="text-xs text-slate-400 font-semibold">Pending</span>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Marks Obtained:</span>
              <span className="font-black text-slate-800">
                {comp.marks !== null ? `${comp.marks} / ${comp.maxMarks}` : "-"}
              </span>
            </div>

            {comp.remark && (
              <p className="text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                Teacher Remark: {comp.remark}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentGradebook;
