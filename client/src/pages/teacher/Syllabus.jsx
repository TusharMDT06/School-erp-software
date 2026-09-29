import { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit3,
  ListOrdered,
  FileText,
  Lightbulb,
  Check,
  RefreshCw,
  Layers,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { getTeacherClassesAndSubjectsApi } from "../../api/teacherDashboardApi";
import {
  getSyllabusUnitsApi,
  createSyllabusUnitApi,
  updateSyllabusUnitApi,
  deleteSyllabusUnitApi,
  updateTopicStatusApi,
  getSyllabusProgressApi,
} from "../../api/syllabusApi";
import {
  getLessonPlansApi,
  createLessonPlanApi,
  updateLessonPlanApi,
  deleteLessonPlanApi,
  draftLessonPlanAiApi,
} from "../../api/lessonPlanApi";

const Syllabus = () => {
  // ── State: Selection ───────────────────────────────────────────────────────
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [academicYear, setAcademicYear] = useState("2024-2025");
  const [activeTab, setActiveTab] = useState("units"); // "units" | "lesson_plans"

  // ── State: Data ────────────────────────────────────────────────────────────
  const [units, setUnits] = useState([]);
  const [progress, setProgress] = useState(null);
  const [lessonPlans, setLessonPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedUnitId, setExpandedUnitId] = useState(null);

  // ── State: Modals & Drawers ────────────────────────────────────────────────
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitForm, setUnitForm] = useState({
    unitNo: 1,
    title: "",
    plannedStart: "",
    plannedEnd: "",
    topics: [{ title: "", plannedHours: 1, status: "not_started", note: "" }],
  });

  const [isLessonPlanModalOpen, setIsLessonPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    unitId: "",
    topicTitle: "",
    durationMinutes: 45,
    objectives: [""],
    activities: [{ name: "Direct Instruction", minutes: 20 }, { name: "Guided Practice", minutes: 25 }],
    resources: [""],
    assessmentIdea: "",
    homeworkIdea: "",
    status: "planned",
    reflection: "",
  });

  // AI Draft Modal State
  const [isAiDraftModalOpen, setIsAiDraftModalOpen] = useState(false);
  const [aiDraftPrompt, setAiDraftPrompt] = useState({
    topic: "",
    durationMinutes: 45,
    level: "Secondary",
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [remainingAiQuota, setRemainingAiQuota] = useState(null);

  // Week selection for Lesson Planner
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // ── Load Teacher Classes & Subjects ────────────────────────────────────────
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
      .catch((err) => toast.error("Failed to load assigned classes/subjects."));
  }, []);

  // ── Fetch Units & Progress ─────────────────────────────────────────────────
  const fetchSyllabusData = async () => {
    if (!selectedClassId || !selectedSubject) return;
    setLoading(true);
    try {
      const [unitsRes, progRes] = await Promise.all([
        getSyllabusUnitsApi({ classId: selectedClassId, subject: selectedSubject, academicYear }),
        getSyllabusProgressApi({ classId: selectedClassId, subject: selectedSubject }),
      ]);

      const unitList = unitsRes.data?.data || unitsRes.data || [];
      const progData = progRes.data?.data || progRes.data || null;

      setUnits(unitList);
      setProgress(progData);
      if (unitList.length > 0 && !expandedUnitId) {
        setExpandedUnitId(unitList[0]._id);
      }
    } catch (err) {
      console.warn("Failed to fetch syllabus data:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Week calculation for Lesson Planner ───────────────────────────────────
  const weekDays = useMemo(() => {
    const today = new Date();
    today.setDate(today.getDate() + currentWeekOffset * 7);
    const dayOfWeek = today.getDay(); // 0 is Sunday
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    const days = [];
    for (let i = 0; i < 6; i++) {
      // Monday to Saturday
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }, [currentWeekOffset]);

  // ── Fetch Lesson Plans ─────────────────────────────────────────────────────
  const fetchLessonPlansData = async () => {
    if (!selectedClassId || !selectedSubject) return;
    try {
      const from = weekDays[0];
      const to = weekDays[weekDays.length - 1];
      const res = await getLessonPlansApi({
        classId: selectedClassId,
        subject: selectedSubject,
        from,
        to,
      });
      setLessonPlans(res.data?.data || res.data || []);
    } catch (err) {
      console.warn("Failed to fetch lesson plans:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "units") {
      fetchSyllabusData();
    } else {
      fetchLessonPlansData();
      if (units.length === 0) fetchSyllabusData();
    }
  }, [selectedClassId, selectedSubject, academicYear, activeTab, currentWeekOffset]);

  // ── Topic Status Toggle ────────────────────────────────────────────────────
  const handleToggleTopicStatus = async (unitId, topic) => {
    const nextStatus =
      topic.status === "completed"
        ? "not_started"
        : topic.status === "in_progress"
        ? "completed"
        : "in_progress";

    try {
      await updateTopicStatusApi(unitId, topic._id, {
        status: nextStatus,
        completedOn: nextStatus === "completed" ? new Date().toISOString() : null,
      });
      toast.success(`Topic marked as ${nextStatus.replace("_", " ")}.`);
      fetchSyllabusData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update topic status.");
    }
  };

  // ── Unit CRUD Handlers ─────────────────────────────────────────────────────
  const handleOpenAddUnit = () => {
    setEditingUnit(null);
    setUnitForm({
      unitNo: units.length + 1,
      title: "",
      plannedStart: "",
      plannedEnd: "",
      topics: [{ title: "", plannedHours: 1, status: "not_started", note: "" }],
    });
    setIsUnitModalOpen(true);
  };

  const handleOpenEditUnit = (unit) => {
    setEditingUnit(unit);
    setUnitForm({
      unitNo: unit.unitNo,
      title: unit.title,
      plannedStart: unit.plannedStart ? unit.plannedStart.slice(0, 10) : "",
      plannedEnd: unit.plannedEnd ? unit.plannedEnd.slice(0, 10) : "",
      topics:
        unit.topics.length > 0
          ? unit.topics.map((t) => ({
              _id: t._id,
              title: t.title,
              plannedHours: t.plannedHours || 1,
              status: t.status,
              note: t.note || "",
            }))
          : [{ title: "", plannedHours: 1, status: "not_started", note: "" }],
    });
    setIsUnitModalOpen(true);
  };

  const handleSaveUnit = async (e) => {
    e.preventDefault();
    if (!unitForm.title.trim()) {
      return toast.error("Please enter a unit title.");
    }

    try {
      const validTopics = unitForm.topics
        .filter((t) => t.title.trim())
        .map((t) => ({
          title: t.title.trim(),
          plannedHours: Number(t.plannedHours) || 1,
          status: t.status || "not_started",
          note: t.note || "",
        }));

      if (validTopics.length === 0) {
        return toast.error("Please add at least one topic with a title.");
      }

      const payload = {
        classId: selectedClassId,
        subject: selectedSubject,
        academicYear,
        unitNo: unitForm.unitNo,
        title: unitForm.title,
        plannedStart: unitForm.plannedStart || null,
        plannedEnd: unitForm.plannedEnd || null,
        topics: validTopics,
      };

      if (editingUnit) {
        await updateSyllabusUnitApi(editingUnit._id, payload);
        toast.success("Unit updated successfully.");
      } else {
        await createSyllabusUnitApi(payload);
        toast.success("Unit created successfully.");
      }

      setIsUnitModalOpen(false);
      fetchSyllabusData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save syllabus unit.");
    }
  };

  const handleDeleteUnit = async (unitId) => {
    if (!window.confirm("Are you sure you want to delete this syllabus unit?")) return;
    try {
      await deleteSyllabusUnitApi(unitId);
      toast.success("Syllabus unit deleted.");
      fetchSyllabusData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete syllabus unit.");
    }
  };

  // ── AI Lesson Plan Draft Generator ─────────────────────────────────────────
  const handleOpenAiDraftModal = () => {
    setAiDraftPrompt({
      topic: "",
      durationMinutes: 45,
      level: "Secondary",
    });
    setIsAiDraftModalOpen(true);
  };

  const handleGenerateAiDraft = async (e) => {
    e.preventDefault();
    if (!aiDraftPrompt.topic.trim()) {
      return toast.error("Please specify a topic name for the AI draft.");
    }

    setAiGenerating(true);
    try {
      const res = await draftLessonPlanAiApi({
        classId: selectedClassId,
        subject: selectedSubject,
        topic: aiDraftPrompt.topic.trim(),
        durationMinutes: aiDraftPrompt.durationMinutes,
        level: aiDraftPrompt.level,
      });

      const draft = res.data?.data?.draft || res.data?.draft;
      const remaining = res.data?.data?.remainingQuotaToday;
      if (remaining !== undefined) setRemainingAiQuota(remaining);

      // Populate lesson plan form with AI draft for teacher editing!
      setEditingPlan(null);
      setPlanForm({
        date: new Date().toISOString().slice(0, 10),
        unitId: units[0]?._id || "",
        topicTitle: draft.topicTitle || aiDraftPrompt.topic,
        durationMinutes: draft.durationMinutes || 45,
        objectives: draft.objectives || [""],
        activities: draft.activities || [{ name: "Discussion", minutes: 20 }],
        resources: draft.resources || [""],
        assessmentIdea: draft.assessmentIdea || "",
        homeworkIdea: draft.homeworkIdea || "",
        status: "planned",
        reflection: "",
      });

      setIsAiDraftModalOpen(false);
      setIsLessonPlanModalOpen(true);
      toast.success("AI draft generated! Review and customize your lesson plan before saving.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate AI draft. Please try again.");
    } finally {
      setAiGenerating(false);
    }
  };

  // ── Save Lesson Plan Handler ───────────────────────────────────────────────
  const handleSaveLessonPlan = async (e) => {
    e.preventDefault();
    if (!planForm.topicTitle.trim()) {
      return toast.error("Please enter a topic title.");
    }

    try {
      const payload = {
        classId: selectedClassId,
        subject: selectedSubject,
        date: planForm.date,
        unitId: planForm.unitId || null,
        topicTitle: planForm.topicTitle.trim(),
        objectives: planForm.objectives.filter(Boolean),
        activities: planForm.activities.filter((a) => a.name.trim()),
        resources: planForm.resources.filter(Boolean),
        assessmentIdea: planForm.assessmentIdea,
        homeworkIdea: planForm.homeworkIdea,
        status: planForm.status,
        reflection: planForm.reflection,
      };

      if (editingPlan) {
        await updateLessonPlanApi(editingPlan._id, payload);
        toast.success("Lesson plan updated.");
      } else {
        await createLessonPlanApi(payload);
        toast.success("Lesson plan saved.");
      }

      setIsLessonPlanModalOpen(false);
      fetchLessonPlansData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save lesson plan.");
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm("Delete this lesson plan?")) return;
    try {
      await deleteLessonPlanApi(planId);
      toast.success("Lesson plan deleted.");
      fetchLessonPlansData();
    } catch (err) {
      toast.error("Failed to delete lesson plan.");
    }
  };

  // ── Quick Status Toggle for Lesson Plan ───────────────────────────────────
  const handleQuickStatusToggle = async (plan, nextStatus) => {
    try {
      await updateLessonPlanApi(plan._id, { status: nextStatus });
      toast.success(`Lesson marked as ${nextStatus}.`);
      fetchLessonPlansData();
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Selector Bar ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <BookOpen className="w-5 h-5" />
              </span>
              Syllabus & Lesson Plans
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Track curriculum coverage, topic progress hours, and structure daily lesson plans with Gemini AI assistance.
            </p>
          </div>

          {/* Class & Subject Dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Class
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
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
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Academic Year
              </label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
              </select>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 border-b border-slate-100">
          <button
            onClick={() => setActiveTab("units")}
            className={`pb-3 px-4 text-xs font-bold transition-all relative ${
              activeTab === "units"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Syllabus Units & Topics
          </button>
          <button
            onClick={() => setActiveTab("lesson_plans")}
            className={`pb-3 px-4 text-xs font-bold transition-all relative ${
              activeTab === "lesson_plans"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Lesson Planner (Week View)
          </button>
        </div>
      </div>

      {/* ── Behind Schedule Alert Banner ─────────────────────────────────────── */}
      {progress?.isBehindSchedule && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700 flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Behind Schedule Warning
              </p>
              <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold">
                {progress.behindUnitsCount} {progress.behindUnitsCount === 1 ? "Unit" : "Units"} Overdue
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Planned end dates have lapsed for{" "}
              {progress.behindUnits?.map((u) => `Unit ${u.unitNo}: "${u.title}"`).join(", ")} without all topic hours completed. Consider adjusting remaining hours or allocating catch-up periods.
            </p>
          </div>
        </div>
      )}

      {/* ── Progress Cards Metric Strip ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Progress % */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Syllabus Completion</p>
            <p className="text-2xl font-black text-slate-800 mt-1">
              {progress ? `${progress.completionPercentage}%` : "0%"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Completed vs Planned</p>
          </div>
          {/* Progress Ring visual */}
          <div className="w-14 h-14 rounded-full bg-indigo-50 border-4 border-indigo-500/20 flex items-center justify-center font-bold text-indigo-600 text-xs">
            {progress?.completionPercentage || 0}%
          </div>
        </div>

        {/* Hours Completed */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Teaching Hours</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">
              {progress?.completedHours || 0} / {progress?.totalPlannedHours || 0} hrs
            </p>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
              {progress?.totalPlannedHours ? `${Math.round(((progress.completedHours || 0) / progress.totalPlannedHours) * 100)}% covered` : "No hours set"}
            </p>
          </div>
        </div>

        {/* Topics Count */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-sky-50 text-sky-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Topics Done</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">
              {progress?.completedTopics || 0} / {progress?.totalTopics || 0} topics
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Across {progress?.totalUnits || 0} units</p>
          </div>
        </div>

        {/* Schedule Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <div className={`p-3 rounded-xl ${progress?.isBehindSchedule ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
            {progress?.isBehindSchedule ? <AlertTriangle className="w-5 h-5" /> : <Check className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Pacing Status</p>
            <p className={`text-sm font-bold mt-0.5 ${progress?.isBehindSchedule ? "text-amber-700" : "text-emerald-700"}`}>
              {progress?.isBehindSchedule ? "Behind Schedule" : "On Track"}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {progress?.isBehindSchedule ? `${progress.behindUnitsCount} unit overdue` : "Timelines healthy"}
            </p>
          </div>
        </div>
      </div>

      {/* ── TAB 1: SYLLABUS UNITS & ACCORDION ────────────────────────────────── */}
      {activeTab === "units" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              Units for {selectedSubject} ({units.length})
            </h2>
            <button
              onClick={handleOpenAddUnit}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Unit
            </button>
          </div>

          {units.length === 0 && !loading && (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No syllabus units yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Define units, topics, and planned hours to begin tracking your curriculum coverage.
              </p>
              <button
                onClick={handleOpenAddUnit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
              >
                Create First Unit
              </button>
            </div>
          )}

          {/* Accordion Units List */}
          <div className="space-y-3">
            {units.map((unit) => {
              const isExpanded = expandedUnitId === unit._id;
              const unitTotalHours = unit.topics?.reduce((s, t) => s + (t.plannedHours || 1), 0) || 0;
              const unitDoneHours = unit.topics?.filter((t) => t.status === "completed").reduce((s, t) => s + (t.plannedHours || 1), 0) || 0;
              const unitPct = unitTotalHours > 0 ? Math.round((unitDoneHours / unitTotalHours) * 100) : 0;
              const isPastEnd = unit.plannedEnd && new Date(unit.plannedEnd) < new Date();
              const isUnitBehind = isPastEnd && unitPct < 100;

              return (
                <div
                  key={unit._id}
                  className={`bg-white rounded-2xl border transition-all ${
                    isExpanded ? "border-indigo-300 shadow-md ring-1 ring-indigo-500/10" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Accordion Header */}
                  <div
                    onClick={() => setExpandedUnitId(isExpanded ? null : unit._id)}
                    className="p-4 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <button className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-black flex items-center justify-center flex-shrink-0">
                        {unit.unitNo}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-800 truncate">{unit.title}</p>
                          {isUnitBehind && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                              Behind
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                          <span>{unit.topics?.length || 0} topics</span>
                          <span>â€¢</span>
                          <span>{unitTotalHours} planned hrs</span>
                          {unit.plannedEnd && (
                            <>
                              <span>â€¢</span>
                              <span>Due {new Date(unit.plannedEnd).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Mini Progress Bar */}
                      <div className="hidden sm:flex items-center gap-2.5">
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              unitPct === 100 ? "bg-emerald-500" : "bg-indigo-600"
                            }`}
                            style={{ width: `${unitPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-8 text-right">{unitPct}%</span>
                      </div>

                      {/* Edit / Delete actions */}
                      <button
                        onClick={() => handleOpenEditUnit(unit)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Unit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUnit(unit._id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Unit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Accordion Body: Topics List */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 bg-slate-50/50 rounded-b-2xl space-y-2">
                      {unit.topics?.map((topic, tIdx) => {
                        const isDone = topic.status === "completed";
                        const inProg = topic.status === "in_progress";

                        return (
                          <div
                            key={topic._id || tIdx}
                            className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleToggleTopicStatus(unit._id, topic)}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                                  isDone
                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                    : inProg
                                    ? "bg-amber-100 border-amber-400 text-amber-700"
                                    : "border-slate-300 bg-white hover:border-indigo-400"
                                }`}
                              >
                                {isDone && <Check className="w-3.5 h-3.5" />}
                                {inProg && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                              </button>

                              <div className="min-w-0">
                                <p className={`text-xs font-semibold ${isDone ? "line-through text-slate-400" : "text-slate-800"}`}>
                                  {topic.title}
                                </p>
                                {topic.note && (
                                  <p className="text-[11px] text-slate-400 truncate mt-0.5">{topic.note}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-[11px] font-bold text-slate-500 px-2 py-0.5 rounded-lg bg-slate-100">
                                {topic.plannedHours} hr{topic.plannedHours > 1 ? "s" : ""}
                              </span>

                              <select
                                value={topic.status}
                                onChange={(e) => {
                                  updateTopicStatusApi(unit._id, topic._id, {
                                    status: e.target.value,
                                    completedOn: e.target.value === "completed" ? new Date().toISOString() : null,
                                  }).then(() => {
                                    toast.success("Status updated.");
                                    fetchSyllabusData();
                                  });
                                }}
                                className={`text-[11px] font-bold rounded-lg px-2 py-1 border focus:outline-none ${
                                  isDone
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : inProg
                                    ? "bg-amber-50 border-amber-200 text-amber-700"
                                    : "bg-slate-50 border-slate-200 text-slate-600"
                                }`}
                              >
                                <option value="not_started">Not Started</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: LESSON PLANNER (WEEK VIEW) ─────────────────────────────────── */}
      {activeTab === "lesson_plans" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Week navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                &larr; Prev Week
              </button>
              <button
                onClick={() => setCurrentWeekOffset(0)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                This Week
              </button>
              <button
                onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Next Week &rarr;
              </button>
              <span className="text-xs font-semibold text-slate-500 ml-2">
                {weekDays[0]} to {weekDays[weekDays.length - 1]}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAiDraftModal}
                className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                <Sparkles className="w-4 h-4" />
                AI Lesson Draft
              </button>
              <button
                onClick={() => {
                  setEditingPlan(null);
                  setPlanForm({
                    date: new Date().toISOString().slice(0, 10),
                    unitId: units[0]?._id || "",
                    topicTitle: "",
                    durationMinutes: 45,
                    objectives: [""],
                    activities: [{ name: "Discussion", minutes: 20 }],
                    resources: [""],
                    assessmentIdea: "",
                    homeworkIdea: "",
                    status: "planned",
                    reflection: "",
                  });
                  setIsLessonPlanModalOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Plan Lesson
              </button>
            </div>
          </div>

          {/* 6-Day Week Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {weekDays.map((dayStr) => {
              const dayDate = new Date(dayStr);
              const dayName = dayDate.toLocaleDateString("en-IN", { weekday: "short" });
              const dayFormatted = dayDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
              const dayPlans = lessonPlans.filter((p) => p.date === dayStr);
              const isToday = dayStr === new Date().toISOString().slice(0, 10);

              return (
                <div
                  key={dayStr}
                  className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col ${
                    isToday ? "border-indigo-400 ring-2 ring-indigo-500/10" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{dayName}</span>
                      <span className="text-xs text-slate-400">{dayFormatted}</span>
                    </div>
                    {isToday && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                        Today
                      </span>
                    )}
                  </div>

                  {dayPlans.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-6 text-slate-300">
                      <Calendar className="w-6 h-6 mb-1 opacity-50" />
                      <p className="text-[11px] text-slate-400">No lessons planned</p>
                    </div>
                  ) : (
                    <div className="space-y-3 flex-1">
                      {dayPlans.map((plan) => (
                        <div
                          key={plan._id}
                          className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-2 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{plan.topicTitle}</p>
                              {plan.unitId?.title && (
                                <p className="text-[10px] font-semibold text-indigo-600 mt-0.5">
                                  Unit {plan.unitId?.unitNo}: {plan.unitId?.title}
                                </p>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                plan.status === "taught"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : plan.status === "skipped"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-indigo-100 text-indigo-700"
                              }`}
                            >
                              {plan.status}
                            </span>
                          </div>

                          {/* Objectives snippet */}
                          {plan.objectives?.length > 0 && (
                            <div className="text-[11px] text-slate-600 line-clamp-2">
                              <strong>Obj:</strong> {plan.objectives.join(", ")}
                            </div>
                          )}

                          {/* Activities count & minutes */}
                          {plan.activities?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {plan.activities.map((act, aIdx) => (
                                <span
                                  key={aIdx}
                                  className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded"
                                >
                                  {act.name} ({act.minutes}m)
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Quick status actions & buttons */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              {plan.status !== "taught" && (
                                <button
                                  onClick={() => handleQuickStatusToggle(plan, "taught")}
                                  className="text-emerald-600 font-bold hover:underline"
                                >
                                  Mark Taught
                                </button>
                              )}
                              {plan.status !== "skipped" && (
                                <button
                                  onClick={() => handleQuickStatusToggle(plan, "skipped")}
                                  className="text-slate-400 hover:text-slate-600 ml-2"
                                >
                                  Skip
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingPlan(plan);
                                  setPlanForm({
                                    date: plan.date,
                                    unitId: plan.unitId?._id || "",
                                    topicTitle: plan.topicTitle,
                                    durationMinutes: 45,
                                    objectives: plan.objectives?.length ? plan.objectives : [""],
                                    activities: plan.activities?.length ? plan.activities : [{ name: "Discussion", minutes: 20 }],
                                    resources: plan.resources?.length ? plan.resources : [""],
                                    assessmentIdea: plan.assessmentIdea || "",
                                    homeworkIdea: plan.homeworkIdea || "",
                                    status: plan.status || "planned",
                                    reflection: plan.reflection || "",
                                  });
                                  setIsLessonPlanModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-indigo-600"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePlan(plan._id)}
                                className="p-1 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODAL: Create / Edit Syllabus Unit ─────────────────────────────────── */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {editingUnit ? "Edit Syllabus Unit" : "Add Syllabus Unit"}
              </h3>
              <button
                onClick={() => setIsUnitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit No</label>
                  <input
                    type="number"
                    min="1"
                    value={unitForm.unitNo}
                    onChange={(e) => setUnitForm({ ...unitForm, unitNo: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Thermodynamics & Heat Transfer"
                    value={unitForm.title}
                    onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Planned Start</label>
                  <input
                    type="date"
                    value={unitForm.plannedStart}
                    onChange={(e) => setUnitForm({ ...unitForm, plannedStart: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Planned End</label>
                  <input
                    type="date"
                    value={unitForm.plannedEnd}
                    onChange={(e) => setUnitForm({ ...unitForm, plannedEnd: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Topics builder */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Topics & Planned Hours</label>
                  <button
                    type="button"
                    onClick={() =>
                      setUnitForm({
                        ...unitForm,
                        topics: [...unitForm.topics, { title: "", plannedHours: 1, status: "not_started", note: "" }],
                      })
                    }
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Topic
                  </button>
                </div>

                {unitForm.topics.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Topic ${idx + 1} title`}
                      value={t.title}
                      onChange={(e) => {
                        const newTopics = [...unitForm.topics];
                        newTopics[idx].title = e.target.value;
                        setUnitForm({ ...unitForm, topics: newTopics });
                      }}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                      required
                    />
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      placeholder="Hours"
                      value={t.plannedHours}
                      onChange={(e) => {
                        const newTopics = [...unitForm.topics];
                        newTopics[idx].plannedHours = e.target.value;
                        setUnitForm({ ...unitForm, topics: newTopics });
                      }}
                      className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs text-center font-bold text-slate-800 focus:outline-none"
                    />
                    {unitForm.topics.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const newTopics = unitForm.topics.filter((_, i) => i !== idx);
                          setUnitForm({ ...unitForm, topics: newTopics });
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  {editingUnit ? "Update Unit" : "Save Unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: AI Lesson Plan Draft Drawer / Dialog ────────────────────────── */}
      {isAiDraftModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-800">Generate AI Lesson Draft</h3>
              </div>
              <button
                onClick={() => setIsAiDraftModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Gemini creates structured learning objectives, activity timings, assessment ideas, and homework. Returned as an editable draft for your review.
            </p>

            {remainingAiQuota !== null && (
              <p className="text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-lg">
                Remaining daily quota: {remainingAiQuota} drafts
              </p>
            )}

            <form onSubmit={handleGenerateAiDraft} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Topic / Lesson Focus</label>
                <input
                  type="text"
                  placeholder="e.g. Law of Conservation of Energy, Photosynthesis Light Reactions"
                  value={aiDraftPrompt.topic}
                  onChange={(e) => setAiDraftPrompt({ ...aiDraftPrompt, topic: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    min="15"
                    max="120"
                    value={aiDraftPrompt.durationMinutes}
                    onChange={(e) => setAiDraftPrompt({ ...aiDraftPrompt, durationMinutes: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Level</label>
                  <select
                    value={aiDraftPrompt.level}
                    onChange={(e) => setAiDraftPrompt({ ...aiDraftPrompt, level: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                  >
                    <option value="Primary">Primary</option>
                    <option value="Middle School">Middle School</option>
                    <option value="Secondary">Secondary (Class 9-10)</option>
                    <option value="Senior Secondary">Senior Secondary (Class 11-12)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAiDraftModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={aiGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {aiGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Drafting with AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate Draft
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Create / Edit / Review Lesson Plan ──────────────────────────── */}
      {isLessonPlanModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {editingPlan ? "Edit Lesson Plan" : "Create Lesson Plan"}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Review and customize objectives, activities, and homework. Nothing is final until saved.
                </p>
              </div>
              <button
                onClick={() => setIsLessonPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveLessonPlan} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={planForm.date}
                    onChange={(e) => setPlanForm({ ...planForm, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Unit</label>
                  <select
                    value={planForm.unitId}
                    onChange={(e) => setPlanForm({ ...planForm, unitId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    <option value="">-- Standalone Lesson --</option>
                    {units.map((u) => (
                      <option key={u._id} value={u._id}>
                        Unit {u.unitNo}: {u.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                  <select
                    value={planForm.status}
                    onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    <option value="planned">Planned</option>
                    <option value="taught">Taught</option>
                    <option value="skipped">Skipped</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Topic Title</label>
                <input
                  type="text"
                  placeholder="e.g. Kinetic Energy vs Potential Energy"
                  value={planForm.topicTitle}
                  onChange={(e) => setPlanForm({ ...planForm, topicTitle: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                  required
                />
              </div>

              {/* Objectives */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Learning Objectives</label>
                  <button
                    type="button"
                    onClick={() => setPlanForm({ ...planForm, objectives: [...planForm.objectives, ""] })}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                {planForm.objectives.map((obj, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Objective ${idx + 1}`}
                      value={obj}
                      onChange={(e) => {
                        const newObjs = [...planForm.objectives];
                        newObjs[idx] = e.target.value;
                        setPlanForm({ ...planForm, objectives: newObjs });
                      }}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                    />
                    {planForm.objectives.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPlanForm({ ...planForm, objectives: planForm.objectives.filter((_, i) => i !== idx) })}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Activities breakdown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Activities Breakdown</label>
                  <button
                    type="button"
                    onClick={() =>
                      setPlanForm({
                        ...planForm,
                        activities: [...planForm.activities, { name: "", minutes: 10 }],
                      })
                    }
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                {planForm.activities.map((act, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Activity description"
                      value={act.name}
                      onChange={(e) => {
                        const newActs = [...planForm.activities];
                        newActs[idx].name = e.target.value;
                        setPlanForm({ ...planForm, activities: newActs });
                      }}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Mins"
                      value={act.minutes}
                      onChange={(e) => {
                        const newActs = [...planForm.activities];
                        newActs[idx].minutes = Number(e.target.value);
                        setPlanForm({ ...planForm, activities: newActs });
                      }}
                      className="w-16 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs text-center font-bold text-slate-800 focus:outline-none"
                    />
                    <span className="text-xs text-slate-400">m</span>
                    {planForm.activities.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPlanForm({ ...planForm, activities: planForm.activities.filter((_, i) => i !== idx) })}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Ideas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Assessment Idea</label>
                  <textarea
                    rows="2"
                    placeholder="Formative check / quiz question..."
                    value={planForm.assessmentIdea}
                    onChange={(e) => setPlanForm({ ...planForm, assessmentIdea: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Homework Idea</label>
                  <textarea
                    rows="2"
                    placeholder="Homework task..."
                    value={planForm.homeworkIdea}
                    onChange={(e) => setPlanForm({ ...planForm, homeworkIdea: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Teacher Reflection (Post-Lesson)</label>
                <textarea
                  rows="2"
                  placeholder="Notes on what went well, student confusion points, pacing adjustments..."
                  value={planForm.reflection}
                  onChange={(e) => setPlanForm({ ...planForm, reflection: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLessonPlanModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  Save Lesson Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Syllabus;
