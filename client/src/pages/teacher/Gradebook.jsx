import { useState, useEffect, useRef } from "react";
import {
  Award,
  Plus,
  Download,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Save,
  Users,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { getTeacherClassesAndSubjectsApi } from "../../api/teacherDashboardApi";
import {
  getGradebookComponentsApi,
  createGradebookComponentApi,
  updateGradebookComponentApi,
  deleteGradebookComponentApi,
  saveComponentScoresApi,
  getClassGradebookApi,
  getGradebookAnalyticsApi,
  exportGradebookExcelApi,
} from "../../api/gradebookApi";

const Gradebook = () => {
  // ── State: Selection ───────────────────────────────────────────────────────
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [academicYear, setAcademicYear] = useState("2024-2025");
  const [activeTab, setActiveTab] = useState("grid"); // "grid" | "components" | "analytics"

  // ── State: Data ────────────────────────────────────────────────────────────
  const [components, setComponents] = useState([]);
  const [students, setStudents] = useState([]);
  const [totalWeightage, setTotalWeightage] = useState(0);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ── State: Grid Cell Edits ─────────────────────────────────────────────────
  // Map of `${componentId}_${studentId}` -> { marks, absent, remark, dirty }
  const [scoreEdits, setScoreEdits] = useState({});
  const [savingComponentId, setSavingComponentId] = useState(null);

  // ── State: Component Modal ─────────────────────────────────────────────────
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [compForm, setCompForm] = useState({
    name: "",
    maxMarks: 50,
    weightage: 20,
    date: new Date().toISOString().slice(0, 10),
  });

  // ── Load Teacher Assigned Classes & Subjects ──────────────────────────────
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

  // ── Fetch Gradebook Data ───────────────────────────────────────────────────
  const fetchGradebookData = async () => {
    if (!selectedClassId || !selectedSubject) return;
    setLoading(true);
    try {
      const [compRes, gradeRes] = await Promise.all([
        getGradebookComponentsApi({ classId: selectedClassId, subject: selectedSubject, academicYear }),
        getClassGradebookApi({ classId: selectedClassId, subject: selectedSubject, academicYear }),
      ]);

      const compData = compRes.data?.data || compRes.data || {};
      const gradeData = gradeRes.data?.data || gradeRes.data || {};

      const comps = compData.components || [];
      setComponents(comps);
      setTotalWeightage(compData.totalWeightage || 0);

      const stuList = gradeData.students || [];
      setStudents(stuList);

      // Initialize score edits map from fetched student components
      const initialEdits = {};
      stuList.forEach((stu) => {
        stu.components.forEach((c) => {
          initialEdits[`${c.componentId}_${stu.studentId}`] = {
            marks: c.marks ?? "",
            absent: Boolean(c.absent),
            remark: c.remark || "",
            dirty: false,
          };
        });
      });
      setScoreEdits(initialEdits);
    } catch (err) {
      console.warn("Failed to fetch gradebook data:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch Analytics ────────────────────────────────────────────────────────
  const fetchAnalyticsData = async () => {
    if (!selectedClassId || !selectedSubject) return;
    try {
      const res = await getGradebookAnalyticsApi({
        classId: selectedClassId,
        subject: selectedSubject,
        academicYear,
      });
      setAnalytics(res.data?.data || res.data || null);
    } catch (err) {
      console.warn("Failed to fetch analytics:", err);
    }
  };

  useEffect(() => {
    fetchGradebookData();
    if (activeTab === "analytics") {
      fetchAnalyticsData();
    }
  }, [selectedClassId, selectedSubject, academicYear, activeTab]);

  // ── Cell Value Change ──────────────────────────────────────────────────────
  const handleScoreChange = (componentId, studentId, value) => {
    const key = `${componentId}_${studentId}`;
    setScoreEdits((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        marks: value,
        absent: false,
        dirty: true,
      },
    }));
  };

  const handleAbsentToggle = (componentId, studentId) => {
    const key = `${componentId}_${studentId}`;
    const current = scoreEdits[key] || { absent: false, marks: "" };
    const nextAbsent = !current.absent;

    setScoreEdits((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        absent: nextAbsent,
        marks: nextAbsent ? "" : prev[key]?.marks || "",
        dirty: true,
      },
    }));
  };

  // ── Keyboard Navigation (Enter, Arrows) in Spreadsheet Grid ───────────────
  const handleKeyDown = (e, sIdx, cIdx) => {
    if (e.key === "Enter" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextInput = document.getElementById(`cell-${sIdx + 1}-${cIdx}`);
      if (nextInput) nextInput.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevInput = document.getElementById(`cell-${sIdx - 1}-${cIdx}`);
      if (prevInput) prevInput.focus();
    } else if (e.key === "ArrowRight") {
      const rightInput = document.getElementById(`cell-${sIdx}-${cIdx + 1}`);
      if (rightInput) rightInput.focus();
    } else if (e.key === "ArrowLeft") {
      const leftInput = document.getElementById(`cell-${sIdx}-${cIdx - 1}`);
      if (leftInput) leftInput.focus();
    }
  };

  // ── Save Scores for a Specific Component ───────────────────────────────────
  const handleSaveComponentScores = async (component) => {
    setSavingComponentId(component._id);
    try {
      const payloadScores = students.map((stu) => {
        const key = `${component._id}_${stu.studentId}`;
        const edit = scoreEdits[key] || { marks: null, absent: false };
        return {
          studentId: stu.studentId,
          marks: edit.absent ? null : edit.marks === "" ? null : Number(edit.marks),
          absent: edit.absent,
          remark: edit.remark || "",
        };
      });

      await saveComponentScoresApi(component._id, { scores: payloadScores });
      toast.success(`Scores saved for ${component.name}.`);
      fetchGradebookData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save scores.");
    } finally {
      setSavingComponentId(null);
    }
  };

  // ── Save All Components Scores ─────────────────────────────────────────────
  const handleSaveAllScores = async () => {
    if (components.length === 0) return;
    setLoading(true);
    try {
      for (const comp of components) {
        const payloadScores = students.map((stu) => {
          const key = `${comp._id}_${stu.studentId}`;
          const edit = scoreEdits[key] || { marks: null, absent: false };
          return {
            studentId: stu.studentId,
            marks: edit.absent ? null : edit.marks === "" ? null : Number(edit.marks),
            absent: edit.absent,
            remark: edit.remark || "",
          };
        });
        await saveComponentScoresApi(comp._id, { scores: payloadScores });
      }
      toast.success("All component scores updated successfully.");
      fetchGradebookData();
    } catch (err) {
      toast.error("Failed to save some component scores.");
    } finally {
      setLoading(false);
    }
  };

  // ── Publish / Unpublish Component Toggle ───────────────────────────────────
  const handleTogglePublish = async (component) => {
    try {
      await updateGradebookComponentApi(component._id, {
        isPublished: !component.isPublished,
      });
      toast.success(
        component.isPublished
          ? `${component.name} unpublished (hidden from students/parents).`
          : `${component.name} published (visible to students/parents).`
      );
      fetchGradebookData();
    } catch (err) {
      toast.error("Failed to update publish status.");
    }
  };

  // ── Component Modal Handlers ───────────────────────────────────────────────
  const handleOpenAddComponent = () => {
    setEditingComponent(null);
    const remaining = Math.max(0, 100 - totalWeightage);
    setCompForm({
      name: "",
      maxMarks: 50,
      weightage: remaining > 0 ? Math.min(25, remaining) : 10,
      date: new Date().toISOString().slice(0, 10),
    });
    setIsComponentModalOpen(true);
  };

  const handleOpenEditComponent = (comp) => {
    setEditingComponent(comp);
    setCompForm({
      name: comp.name,
      maxMarks: comp.maxMarks,
      weightage: comp.weightage,
      date: comp.date ? comp.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
    setIsComponentModalOpen(true);
  };

  const handleSaveComponent = async (e) => {
    e.preventDefault();
    if (!compForm.name.trim()) return toast.error("Please enter component name.");

    try {
      const payload = {
        classId: selectedClassId,
        subject: selectedSubject,
        academicYear,
        name: compForm.name.trim(),
        maxMarks: Number(compForm.maxMarks),
        weightage: Number(compForm.weightage),
        date: compForm.date,
      };

      if (editingComponent) {
        await updateGradebookComponentApi(editingComponent._id, payload);
        toast.success("Component updated.");
      } else {
        await createGradebookComponentApi(payload);
        toast.success("Component created.");
      }

      setIsComponentModalOpen(false);
      fetchGradebookData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save assessment component.");
    }
  };

  const handleDeleteComponent = async (comp) => {
    if (!window.confirm(`Delete "${comp.name}" and all recorded student marks for it?`)) return;
    try {
      await deleteGradebookComponentApi(comp._id);
      toast.success("Component deleted.");
      fetchGradebookData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete component.");
    }
  };

  // ── Excel Export ───────────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    try {
      toast.loading("Generating Excel spreadsheet...");
      const res = await exportGradebookExcelApi({
        classId: selectedClassId,
        subject: selectedSubject,
        academicYear,
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Gradebook_${selectedSubject}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.dismiss();
      toast.success("Gradebook downloaded.");
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to export gradebook Excel.");
    }
  };

  // Filter students by search
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.admissionNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ── Top Header & Filters ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Award className="w-5 h-5" />
              </span>
              Continuous Assessment Gradebook
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Weightage-capped internal marks, keyboard-navigable spreadsheet grid, and performance trend insights.
            </p>
          </div>

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

            <div className="flex items-end gap-2 pt-5">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                title="Download formatted Excel spreadsheet"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* ── Weightage Total Meter Strip ────────────────────────────────────── */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-slate-700">Total Internal Weightage</span>
                <span className={`font-black ${totalWeightage === 100 ? "text-emerald-600" : "text-indigo-600"}`}>
                  {totalWeightage}% / 100%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    totalWeightage === 100
                      ? "bg-emerald-500"
                      : totalWeightage > 80
                      ? "bg-indigo-600"
                      : "bg-sky-500"
                  }`}
                  style={{ width: `${Math.min(100, totalWeightage)}%` }}
                />
              </div>
            </div>
            {totalWeightage < 100 ? (
              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg flex-shrink-0">
                {100 - totalWeightage}% unallocated
              </span>
            ) : (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg flex-shrink-0 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Balanced
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddComponent}
              disabled={totalWeightage >= 100}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Component
            </button>
            <button
              onClick={handleSaveAllScores}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <Save className="w-3.5 h-3.5" /> Save All Scores
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 border-b border-slate-100">
          <button
            onClick={() => setActiveTab("grid")}
            className={`pb-3 px-4 text-xs font-bold transition-all relative ${
              activeTab === "grid"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Spreadsheet Grid
          </button>
          <button
            onClick={() => setActiveTab("components")}
            className={`pb-3 px-4 text-xs font-bold transition-all relative ${
              activeTab === "components"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Components & Weightages ({components.length})
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`pb-3 px-4 text-xs font-bold transition-all relative ${
              activeTab === "analytics"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Gradebook Analytics
          </button>
        </div>
      </div>

      {/* ── TAB 1: SPREADSHEET GRID ──────────────────────────────────────────── */}
      {activeTab === "grid" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Search bar & quick instructions */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search student by name or roll..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span>Tip: Use <strong>Enter</strong> or <strong>â†“/â†‘ arrows</strong> to quickly enter scores column-by-column</span>
            </div>
          </div>

          {components.length === 0 ? (
            <div className="p-12 text-center">
              <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No Assessment Components Configured</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Add assessment components (e.g. Unit Test 1, Oral, Lab Project) to activate the continuous grading grid.
              </p>
              <button
                onClick={handleOpenAddComponent}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
              >
                Add First Component
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold select-none">
                    <th className="p-3 w-12 text-center">#</th>
                    <th className="p-3 min-w-[160px] sticky left-0 bg-slate-50 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                      Student
                    </th>

                    {/* Component Column Headers */}
                    {components.map((comp, cIdx) => (
                      <th key={comp._id} className="p-3 min-w-[140px] text-center border-l border-slate-200">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-slate-800 truncate max-w-[130px]">{comp.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            Max {comp.maxMarks} â€¢ {comp.weightage}% wt
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                comp.isPublished ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                              title={comp.isPublished ? "Published" : "Draft"}
                            />
                            <button
                              onClick={() => handleSaveComponentScores(comp)}
                              disabled={savingComponentId === comp._id}
                              className="text-[10px] text-indigo-600 hover:underline font-bold"
                            >
                              {savingComponentId === comp._id ? "Saving..." : "Save Col"}
                            </button>
                          </div>
                        </div>
                      </th>
                    ))}

                    <th className="p-3 text-center border-l border-slate-200 min-w-[90px]">
                      HW Avg
                    </th>
                    <th className="p-3 text-center border-l border-slate-200 min-w-[110px] bg-indigo-50/50">
                      Weighted Total
                    </th>
                    <th className="p-3 text-center border-l border-slate-200 min-w-[80px]">
                      Trend
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredStudents.map((stu, sIdx) => (
                    <tr key={stu.studentId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center text-slate-400 font-mono text-[11px]">
                        {stu.rollNumber || sIdx + 1}
                      </td>
                      <td className="p-3 sticky left-0 bg-white hover:bg-slate-50/80 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                        <p className="font-bold text-slate-800 truncate max-w-[150px]">{stu.name}</p>
                        <p className="text-[10px] text-slate-400">{stu.admissionNumber}</p>
                      </td>

                      {/* Component Score Inputs */}
                      {components.map((comp, cIdx) => {
                        const cellKey = `${comp._id}_${stu.studentId}`;
                        const cellData = scoreEdits[cellKey] || { marks: "", absent: false };

                        return (
                          <td key={comp._id} className="p-2 border-l border-slate-100 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {cellData.absent ? (
                                <span className="w-16 py-1 text-center font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg text-xs">
                                  ABS
                                </span>
                              ) : (
                                <input
                                  id={`cell-${sIdx}-${cIdx}`}
                                  type="number"
                                  min="0"
                                  max={comp.maxMarks}
                                  placeholder="-"
                                  value={cellData.marks}
                                  onChange={(e) => handleScoreChange(comp._id, stu.studentId, e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, sIdx, cIdx)}
                                  className={`w-16 text-center py-1 rounded-lg border text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                                    cellData.dirty
                                      ? "bg-amber-50 border-amber-300 text-amber-900"
                                      : "bg-slate-50/60 border-slate-200 text-slate-800 hover:border-slate-300"
                                  }`}
                                />
                              )}

                              <button
                                type="button"
                                onClick={() => handleAbsentToggle(comp._id, stu.studentId)}
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-colors ${
                                  cellData.absent
                                    ? "bg-rose-100 text-rose-700"
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                }`}
                                title="Mark Absent"
                              >
                                Abs
                              </button>
                            </div>
                          </td>
                        );
                      })}

                      {/* Reviewed Homework Average */}
                      <td className="p-3 text-center border-l border-slate-100 font-bold text-slate-600">
                        {stu.homeworkAveragePercentage !== null ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {stu.homeworkAveragePercentage}%
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Weighted Internal Total */}
                      <td className="p-3 text-center border-l border-slate-100 bg-indigo-50/30">
                        {stu.overallPercentage !== null ? (
                          <div className="flex flex-col items-center">
                            <span
                              className={`font-black text-xs ${
                                stu.overallPercentage >= 75
                                  ? "text-emerald-700"
                                  : stu.overallPercentage < 40
                                  ? "text-rose-700"
                                  : "text-indigo-700"
                              }`}
                            >
                              {stu.overallPercentage}%
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {stu.weightedInternalTotal} / {stu.assessedWeightage}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Trend */}
                      <td className="p-3 text-center border-l border-slate-100">
                        {stu.trend === "up" ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold text-[11px]">
                            <TrendingUp className="w-3.5 h-3.5" /> +{stu.trendDelta}%
                          </span>
                        ) : stu.trend === "down" ? (
                          <span className="inline-flex items-center gap-0.5 text-rose-600 font-bold text-[11px]">
                            <TrendingDown className="w-3.5 h-3.5" /> {stu.trendDelta}%
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            <Minus className="w-3.5 h-3.5 mx-auto" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: COMPONENTS & WEIGHTAGES SETUP ─────────────────────────────── */}
      {activeTab === "components" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              Assessment Components for {selectedSubject} ({components.length})
            </h2>
            <button
              onClick={handleOpenAddComponent}
              disabled={totalWeightage >= 100}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Add Component
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {components.map((comp) => (
              <div
                key={comp._id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">{comp.name}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Date: {new Date(comp.date).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        comp.isPublished ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {comp.isPublished ? "Published" : "Draft / Hidden"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
                    <div className="p-2.5 rounded-xl bg-slate-50">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">Max Marks</p>
                      <p className="text-base font-bold text-slate-800 mt-0.5">{comp.maxMarks}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-indigo-50/50">
                      <p className="text-[10px] font-semibold text-indigo-400 uppercase">Weightage</p>
                      <p className="text-base font-black text-indigo-700 mt-0.5">{comp.weightage}%</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleTogglePublish(comp)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600"
                  >
                    {comp.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {comp.isPublished ? "Unpublish" : "Publish to Portal"}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditComponent(comp)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteComponent(comp)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 3: GRADEBOOK ANALYTICS ───────────────────────────────────────── */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-400">Class Average</p>
              <p className="text-3xl font-black text-slate-800 mt-1">
                {analytics?.classAverage !== undefined ? `${analytics.classAverage}%` : "0%"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Evaluated across {analytics?.evaluatedStudents || 0} students
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-400">Needs Support</p>
              <p className="text-3xl font-black text-rose-600 mt-1">
                {analytics?.needsSupport?.length || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">Below 40% or dropped 15+ points</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-400">Most Improved</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">
                {analytics?.mostImproved?.length || 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">Top positive trajectory jumps</p>
            </div>
          </div>

          {/* Distribution Chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Score Distribution Breakdown
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.distribution || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Two-column lists: Needs Support & Most Improved */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Needs Support */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Intervention Recommended ({analytics?.needsSupport?.length || 0})
              </h3>
              {analytics?.needsSupport?.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No students currently flagged.</p>
              ) : (
                <div className="space-y-2.5">
                  {analytics?.needsSupport?.map((s) => (
                    <div
                      key={s.studentId}
                      className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{s.name}</p>
                        <p className="text-[11px] text-rose-700 mt-0.5">{s.reason}</p>
                      </div>
                      <span className="text-xs font-black text-rose-700 bg-rose-100 px-2 py-1 rounded-lg">
                        {s.overallPercentage}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Most Improved */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Top Trajectory Achievers ({analytics?.mostImproved?.length || 0})
              </h3>
              {analytics?.mostImproved?.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No upward trends recorded yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {analytics?.mostImproved?.map((s) => (
                    <div
                      key={s.studentId}
                      className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{s.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Overall: {s.overallPercentage}%</p>
                      </div>
                      <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                        +{s.trendDelta}% Jump
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Create / Edit Assessment Component ─────────────────────────── */}
      {isComponentModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                {editingComponent ? "Edit Assessment Component" : "Add Assessment Component"}
              </h3>
              <button
                onClick={() => setIsComponentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveComponent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Component Name</label>
                <input
                  type="text"
                  placeholder="e.g. Unit Test 1, Term Project, Oral Assessment"
                  value={compForm.name}
                  onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Max Marks</label>
                  <input
                    type="number"
                    min="1"
                    value={compForm.maxMarks}
                    onChange={(e) => setCompForm({ ...compForm, maxMarks: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Weightage (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={100}
                    value={compForm.weightage}
                    onChange={(e) => setCompForm({ ...compForm, weightage: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-indigo-700 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assessment Date</label>
                <input
                  type="date"
                  value={compForm.date}
                  onChange={(e) => setCompForm({ ...compForm, date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsComponentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  {editingComponent ? "Update Component" : "Create Component"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gradebook;
