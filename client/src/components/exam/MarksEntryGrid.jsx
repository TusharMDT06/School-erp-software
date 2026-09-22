import { useState, useEffect, useMemo } from "react";
import { Save, Loader2, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import GradeBadge from "./GradeBadge";

const calculateGradeClient = (pct) => {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 35) return "D";
  return "F";
};

const MarksEntryGrid = ({
  exam,
  students = [],
  initialResults = [],
  onSave,
  saving = false,
}) => {
  const subjects = exam?.subjects || [];

  // Calculate total max marks across subjects
  const totalMaxMarks = useMemo(() => {
    return subjects.reduce((sum, s) => sum + (Number(s.maxMarks) || 0), 0);
  }, [subjects]);

  // State: { [studentId]: { [subjectName]: marksNumber } }
  const [marksState, setMarksState] = useState({});

  // Populate initial results into marksState
  useEffect(() => {
    const state = {};

    students.forEach((st) => {
      state[st._id] = {};
      subjects.forEach((sub) => {
        state[st._id][sub.subjectName] = "";
      });
    });

    initialResults.forEach((res) => {
      const sId = res.studentId?._id || res.studentId;
      if (sId && state[sId]) {
        (res.marksObtained || []).forEach((m) => {
          state[sId][m.subjectName] = m.marks;
        });
      }
    });

    setMarksState(state);
  }, [students, subjects, initialResults]);

  // Handle cell change
  const handleCellChange = (studentId, subjectName, maxMarks, value) => {
    let numVal = value === "" ? "" : Number(value);

    if (numVal !== "" && numVal > maxMarks) {
      numVal = maxMarks;
    }
    if (numVal !== "" && numVal < 0) {
      numVal = 0;
    }

    setMarksState((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectName]: numVal,
      },
    }));
  };

  // Submit bulk save
  const handleSaveDraft = (e) => {
    e.preventDefault();

    const entries = students.map((st) => {
      const studentMarks = marksState[st._id] || {};
      const marksObtained = subjects.map((sub) => ({
        subjectName: sub.subjectName,
        marks: Number(studentMarks[sub.subjectName]) || 0,
      }));

      return {
        studentId: st._id,
        marksObtained,
      };
    });

    if (onSave) {
      onSave(entries);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
        <div>
          <h4 className="text-sm font-bold text-slate-800">
            {exam.examName} — Marks Entry Sheet
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Class {exam.classId?.className}-{exam.classId?.section} | Total Max Marks:{" "}
            <strong>{totalMaxMarks}</strong> | Use Tab key to navigate rapidly across cells.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={saving || students.length === 0}
          className="px-5 py-2.5 bg-[#1F4E79] hover:bg-[#183e60] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs shadow-[#1F4E79]/30 transition flex items-center gap-2 self-start sm:self-auto"
        >
          {saving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving Sheet...
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Save Marks Draft
            </>
          )}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-3 w-14 text-center">Roll</th>
                <th className="py-3.5 px-4 min-w-[180px]">Student Name</th>
                {subjects.map((sub, idx) => (
                  <th key={idx} className="py-3.5 px-3 text-center min-w-[110px]">
                    <div className="leading-tight">
                      <p className="truncate">{sub.subjectName}</p>
                      <span className="text-[10px] font-normal text-slate-400">
                        Max {sub.maxMarks} (Pass {sub.passingMarks})
                      </span>
                    </div>
                  </th>
                ))}
                <th className="py-3.5 px-3 text-center w-24">Total</th>
                <th className="py-3.5 px-3 text-center w-20">%</th>
                <th className="py-3.5 px-3 text-center w-16">Grade</th>
                <th className="py-3.5 px-3 text-center w-20">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((st, sIndex) => {
                const studentMarks = marksState[st._id] || {};

                // Calculate total obtained live
                let studentTotal = 0;
                let hasAnyFailingSubject = false;
                let hasEnteredAny = false;

                subjects.forEach((sub) => {
                  const val = studentMarks[sub.subjectName];
                  if (val !== "" && val !== undefined) {
                    hasEnteredAny = true;
                    const num = Number(val) || 0;
                    studentTotal += num;
                    if (num < sub.passingMarks) {
                      hasAnyFailingSubject = true;
                    }
                  }
                });

                const percentage =
                  totalMaxMarks > 0 ? Number(((studentTotal / totalMaxMarks) * 100).toFixed(1)) : 0;
                const grade = calculateGradeClient(percentage);
                const isPassed = !hasAnyFailingSubject && percentage >= 35;

                return (
                  <tr key={st._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                      {st.rollNumber || "-"}
                    </td>
                    <td className="py-2.5 px-4">
                      <p className="font-semibold text-slate-800 text-xs truncate">
                        {st.userId?.name || "Student"}
                      </p>
                      <p className="text-[10px] text-slate-400">Adm: {st.admissionNumber}</p>
                    </td>

                    {/* Subject Marks Input Cells */}
                    {subjects.map((sub, subIdx) => {
                      const val = studentMarks[sub.subjectName] ?? "";
                      const isCellFailed = val !== "" && Number(val) < sub.passingMarks;

                      return (
                        <td key={subIdx} className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max={sub.maxMarks}
                            value={val}
                            tabIndex={sIndex * subjects.length + subIdx + 1}
                            placeholder="0"
                            onChange={(e) =>
                              handleCellChange(st._id, sub.subjectName, sub.maxMarks, e.target.value)
                            }
                            className={`w-20 text-center py-1 px-1.5 text-xs font-bold rounded-xl border transition focus:outline-none focus:ring-2 ${
                              isCellFailed
                                ? "border-rose-300 bg-rose-50/70 text-rose-700 focus:ring-rose-400"
                                : "border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:ring-[#1F4E79]/30"
                            }`}
                          />
                        </td>
                      );
                    })}

                    {/* Live Total */}
                    <td className="py-2.5 px-3 text-center font-bold text-slate-800 text-xs">
                      {hasEnteredAny ? `${studentTotal} / ${totalMaxMarks}` : "-"}
                    </td>

                    {/* Live % */}
                    <td className="py-2.5 px-3 text-center font-extrabold text-[#1F4E79] text-xs">
                      {hasEnteredAny ? `${percentage}%` : "-"}
                    </td>

                    {/* Live Grade */}
                    <td className="py-2.5 px-3 text-center">
                      {hasEnteredAny ? <GradeBadge grade={grade} size="sm" /> : "-"}
                    </td>

                    {/* Live Status */}
                    <td className="py-2.5 px-3 text-center">
                      {hasEnteredAny ? (
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                            isPassed ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {isPassed ? "PASS" : "FAIL"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Empty</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MarksEntryGrid;
