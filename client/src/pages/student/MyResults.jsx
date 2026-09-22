import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Award,
  AlertTriangle,
} from "lucide-react";
import { getMyStudentProfileApi } from "../../api/studentApi";
import { fetchStudentResults } from "../../features/exam/examSlice";
import GradeBadge from "../../components/exam/GradeBadge";

const MyResults = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { studentResults, loading } = useSelector((state) => state.exam);

  const [student, setStudent] = useState(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [expandedExamId, setExpandedExamId] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoadingStudent(true);
        setProfileError(null);
        // Use /students/me — accessible by student role (no 403)
        const res = await getMyStudentProfileApi();
        const studentData = res.data;
        if (studentData) {
          setStudent(studentData);
          dispatch(fetchStudentResults(studentData._id));
        } else {
          setProfileError("No student profile linked to your account.");
        }
      } catch (err) {
        const msg =
          err.response?.data?.message || "Failed to load your student profile.";
        setProfileError(msg);
        toast.error(msg);
      } finally {
        setLoadingStudent(false);
      }
    };

    loadProfile();
  }, [dispatch]);

  const toggleExpand = (id) => {
    setExpandedExamId(expandedExamId === id ? null : id);
  };

  const resultsList = studentResults?.results || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">My Examination Results</h2>
        <p className="text-xs text-slate-500 mt-1">
          View official term examination results, subject performance marksheets, and download PDF report cards.
        </p>
      </div>

      {loadingStudent || loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#1F4E79]" />
          <p className="text-sm">Loading your examination results...</p>
        </div>
      ) : profileError ? (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-12 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
          <p className="text-sm text-rose-600 font-medium">{profileError}</p>
          <p className="text-xs text-slate-400 mt-1">
            Contact your school administrator to link your student profile.
          </p>
        </div>
      ) : resultsList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center text-slate-400 text-xs">
          <Award className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="font-semibold text-slate-500 text-sm">No published results yet</p>
          <p className="mt-1">No examination results have been published for your account.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {resultsList.map((resDoc) => {
            const exam = resDoc.examId || {};
            const isExpanded = expandedExamId === resDoc._id;
            const isPassed = resDoc.overallStatus === "pass";

            return (
              <div
                key={resDoc._id}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition"
              >
                {/* Main Card Strip */}
                <div
                  className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 cursor-pointer hover:bg-slate-50/50"
                  onClick={() => toggleExpand(resDoc._id)}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#1F4E79]/10 text-[#1F4E79] flex items-center justify-center font-bold text-sm flex-shrink-0">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">{exam.examName}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Academic Year: <strong>{exam.academicYear}</strong> | Class:{" "}
                        <strong>{studentResults?.student?.className}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-auto">
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Percentage Score</p>
                      <p className="text-xl font-black text-[#1F4E79]">{resDoc.percentage}%</p>
                    </div>

                    <GradeBadge grade={resDoc.grade} size="lg" />

                    <div className="hidden sm:block">
                      <span
                        className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${
                          isPassed
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {isPassed ? "PASSED" : "FAILED"}
                      </span>
                    </div>

                    <a
                      href={`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/results/reportcard/${student?._id}/${exam._id}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition shadow-2xs flex items-center gap-1.5"
                      title="Download Official PDF Report Card"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Report Card
                    </a>

                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4 animate-in fade-in duration-150">
                    {/* Teacher / AI Remark Box */}
                    {resDoc.remarks && (
                      <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100 flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                            Teacher Appraisal & AI Remark
                          </p>
                          <p className="text-xs text-purple-800 mt-1 italic leading-relaxed">
                            "{resDoc.remarks}"
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Subject-wise Marks Table */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase">
                          <tr>
                            <th className="py-2.5 px-4">Subject</th>
                            <th className="py-2.5 px-4 text-center">Marks Obtained</th>
                            <th className="py-2.5 px-4 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {resDoc.marksObtained?.map((m, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-4 font-semibold text-slate-800">{m.subjectName}</td>
                              <td className="py-2.5 px-4 text-center font-bold text-slate-800">{m.marks}</td>
                              <td className="py-2.5 px-4 text-center">
                                <span className="text-[10px] font-bold text-emerald-600">PASS</span>
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 font-bold">
                            <td className="py-2.5 px-4 text-slate-900">Total Aggregate</td>
                            <td className="py-2.5 px-4 text-center text-slate-900">
                              {resDoc.totalMarksObtained} / {resDoc.totalMaxMarks}
                            </td>
                            <td className="py-2.5 px-4 text-center text-[#1F4E79] font-black">
                              {resDoc.percentage}% ({resDoc.grade})
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
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

export default MyResults;
