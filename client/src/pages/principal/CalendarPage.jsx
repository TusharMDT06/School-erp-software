import { useState, useEffect, useCallback } from "react";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus,
  Filter, Bell, Clock, Users, AlertTriangle, Eye, Check, X,
  Trash2, Edit, List, Grid, Send, ShieldAlert,
} from "lucide-react";
import {
  getEventsApi,
  createEventApi,
  updateEventApi,
  publishEventApi,
  cancelEventApi,
  getAudiencePreviewApi,
} from "../../api/calendarApi";
import { getClassesApi } from "../../api/classApi";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

const EVENT_TYPES = [
  { key: "all", label: "All Types" },
  { key: "holiday", label: "Holiday", color: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
  { key: "vacation", label: "Vacation", color: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  { key: "half_day", label: "Half Day", color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  { key: "exam", label: "Exam", color: "bg-purple-500", text: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  { key: "ptm", label: "PTM", color: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  { key: "event", label: "Event", color: "bg-indigo-500", text: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
];

const AUDIENCE_OPTIONS = [
  { value: "all", label: "All School (Staff, Students & Parents)" },
  { value: "staff_only", label: "Staff Only (Teachers, Accountants, Admin)" },
  { value: "students_parents", label: "Students & Parents Only" },
  { value: "class_specific", label: "Specific Classes" },
];

export default function CalendarPage() {
  const { user } = useSelector((state) => state.auth);
  const isPrivileged = ["principal", "admin", "superadmin"].includes(user?.role);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("month"); // "month" | "list"
  const [selectedType, setSelectedType] = useState("all");
  const [currentDate, setCurrentDate] = useState(new Date());

  // Classes for dropdown
  const [classesList, setClassesList] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit" | "preview"
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "holiday",
    startDate: "",
    endDate: "",
    audience: "all",
    classIds: [],
    notifyChannels: ["email", "in_app"],
  });

  // Audience Preview State
  const [audiencePreview, setAudiencePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Detail Modal State
  const [viewingEvent, setViewingEvent] = useState(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      // Calculate month range for current calendar view
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const from = new Date(year, month - 1, 1).toISOString();
      const to = new Date(year, month + 2, 0).toISOString();

      const res = await getEventsApi({
        from,
        to,
        type: selectedType !== "all" ? selectedType : undefined,
      });
      setEvents(res.data || []);
    } catch (e) {
      toast.error("Failed to load academic events.");
    } finally {
      setLoading(false);
    }
  }, [currentDate, selectedType]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (isPrivileged) {
      getClassesApi({ limit: 100 })
        .then((res) => setClassesList(res.data?.classes || res.data || []))
        .catch(() => {});
    }
  }, [isPrivileged]);

  // Calendar Navigation
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  // Form open
  const openCreateModal = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    setForm({
      title: "",
      description: "",
      type: "holiday",
      startDate: todayStr,
      endDate: todayStr,
      audience: "all",
      classIds: [],
      notifyChannels: ["email", "in_app"],
    });
    setAudiencePreview(null);
    setModalMode("create");
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (ev) => {
    setForm({
      title: ev.title,
      description: ev.description || "",
      type: ev.type,
      startDate: ev.startDate ? new Date(ev.startDate).toISOString().split("T")[0] : "",
      endDate: ev.endDate ? new Date(ev.endDate).toISOString().split("T")[0] : "",
      audience: ev.audience || "all",
      classIds: ev.classIds?.map((c) => c._id || c) || [],
      notifyChannels: ev.notifyChannels || ["email", "in_app"],
    });
    setAudiencePreview(null);
    setModalMode("edit");
    setEditingId(ev._id);
    setIsModalOpen(true);
  };

  const handleAudiencePreview = async () => {
    setPreviewLoading(true);
    try {
      if (editingId) {
        const res = await getAudiencePreviewApi(editingId);
        setAudiencePreview(res.data);
      } else {
        // Temporary mock or draft preview
        toast("Save as draft first or view direct estimate before publishing.", { icon: "ℹ️" });
      }
    } catch {
      toast.error("Failed to calculate audience preview.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async (publishImmediately = false) => {
    if (!form.title || !form.startDate || !form.endDate) {
      return toast.error("Please fill in title and dates.");
    }
    setIsSaving(true);
    try {
      let savedEvent;
      if (modalMode === "create") {
        const res = await createEventApi(form);
        savedEvent = res.data;
        toast.success("Event created as draft.");
      } else {
        const res = await updateEventApi(editingId, form);
        savedEvent = res.data;
        toast.success("Event updated successfully.");
      }

      if (publishImmediately && savedEvent?._id) {
        await publishEventApi(savedEvent._id);
        toast.success("Event published and notifications queued!");
      }

      setIsModalOpen(false);
      loadEvents();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Operation failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEvent = async (ev) => {
    if (!window.confirm(`Are you sure you want to cancel the event "${ev.title}"?`)) return;
    try {
      await cancelEventApi(ev._id);
      toast.success("Event cancelled.");
      setViewingEvent(null);
      loadEvents();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to cancel event.");
    }
  };

  const handleDirectPublish = async (ev) => {
    try {
      await publishEventApi(ev._id);
      toast.success("Event published and notifications sent!");
      loadEvents();
      if (viewingEvent) setViewingEvent((prev) => ({ ...prev, status: "published" }));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to publish event.");
    }
  };

  // Helper for Calendar Grid Generation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 lg:p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-rose-100 text-rose-700">
              Academic Calendar
            </span>
            <span className="text-xs text-slate-400">Institutional Schedule</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">Calendar & Holidays</h1>
          <p className="text-sm text-slate-500">Official holidays, vacations, exams, and academic announcements</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View switcher */}
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex items-center shadow-2xs">
            <button
              onClick={() => setViewMode("month")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === "month" ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                viewMode === "list" ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          {isPrivileged && (
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Event / Holiday
            </button>
          )}
        </div>
      </div>

      {/* ── Controls & Filters Bar ───────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs">
        {/* Month Navigator */}
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-800 min-w-[160px]">
            {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToday}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Type Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {EVENT_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelectedType(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedType === t.key
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendar View: Month Grid Mode ───────────────────────────────── */}
      {viewMode === "month" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60 text-center text-xs font-bold text-slate-500 py-3">
            <div className="text-rose-600">Sun (Weekly Off)</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 min-h-[500px]">
            {/* Empty offset days */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="bg-slate-50/30 p-2 min-h-[90px]" />
            ))}

            {/* Actual Month Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dateObj = new Date(year, month, dayNum);
              const isSunday = dateObj.getDay() === 0;
              const isToday =
                new Date().toDateString() === dateObj.toDateString();

              // Find events on this day
              const dayEvents = events.filter((e) => {
                const s = new Date(e.startDate);
                const end = new Date(e.endDate);
                const sDate = new Date(s.getFullYear(), s.getMonth(), s.getDate());
                const eDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
                const target = new Date(year, month, dayNum);
                return target >= sDate && target <= eDate;
              });

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`p-2 min-h-[100px] flex flex-col justify-between transition-colors ${
                    isSunday ? "bg-rose-50/20" : "hover:bg-slate-50/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? "bg-indigo-600 text-white"
                          : isSunday
                          ? "text-rose-600"
                          : "text-slate-700"
                      }`}
                    >
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {dayEvents.length} ev
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-[80px]">
                    {dayEvents.map((ev) => {
                      const style = EVENT_TYPES.find((t) => t.key === ev.type) || EVENT_TYPES[1];
                      return (
                        <div
                          key={ev._id}
                          onClick={() => setViewingEvent(ev)}
                          className={`px-2 py-1 rounded text-[11px] font-semibold border truncate cursor-pointer hover:shadow-2xs transition-all ${
                            ev.status === "cancelled"
                              ? "bg-slate-100 text-slate-400 line-through border-slate-200"
                              : style.bg
                          }`}
                          title={`${ev.title} (${ev.type})`}
                        >
                          {ev.status === "draft" && <span className="opacity-70">[Draft] </span>}
                          {ev.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Calendar View: List Mode ─────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {events.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No events found in this date window.</div>
          ) : (
            events.map((ev) => {
              const style = EVENT_TYPES.find((t) => t.key === ev.type) || EVENT_TYPES[1];
              const sStr = new Date(ev.startDate).toLocaleDateString("en-IN", { dateStyle: "medium" });
              const eStr = new Date(ev.endDate).toLocaleDateString("en-IN", { dateStyle: "medium" });

              return (
                <div key={ev._id} className="p-4 md:p-5 flex items-start justify-between gap-4 hover:bg-slate-50/50">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex flex-col items-center justify-center font-bold text-slate-700 flex-shrink-0">
                      <span className="text-sm">{new Date(ev.startDate).getDate()}</span>
                      <span className="text-[10px] uppercase text-slate-500 font-semibold">
                        {new Date(ev.startDate).toLocaleString("default", { month: "short" })}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${style.bg}`}>
                          {ev.type}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ev.status === "published" ? "bg-emerald-100 text-emerald-700" :
                          ev.status === "cancelled" ? "bg-rose-100 text-rose-700 line-through" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {ev.status}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-800">{ev.title}</h4>
                      {ev.description && <p className="text-xs text-slate-500">{ev.description}</p>}
                      <p className="text-xs text-slate-400">
                        {sStr} {sStr !== eStr ? `to ${eStr}` : ""} · Audience: <strong>{ev.audience}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setViewingEvent(ev)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
                    >
                      View
                    </button>
                    {isPrivileged && ev.status === "draft" && (
                      <button
                        onClick={() => handleDirectPublish(ev)}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Publish
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── View Event Detail Modal ──────────────────────────────────────── */}
      {viewingEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                {viewingEvent.type}
              </span>
              <button onClick={() => setViewingEvent(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-800">{viewingEvent.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{viewingEvent.description || "No description provided."}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
              <p>
                <strong>Dates:</strong> {new Date(viewingEvent.startDate).toLocaleDateString("en-IN", { dateStyle: "full" })}
                {viewingEvent.startDate !== viewingEvent.endDate &&
                  ` to ${new Date(viewingEvent.endDate).toLocaleDateString("en-IN", { dateStyle: "full" })}`}
              </p>
              <p><strong>Audience:</strong> {viewingEvent.audience}</p>
              <p><strong>Status:</strong> <span className="uppercase font-bold">{viewingEvent.status}</span></p>
              <p><strong>Notify Channels:</strong> {viewingEvent.notifyChannels?.join(", ") || "None"}</p>
            </div>

            {isPrivileged && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {viewingEvent.status !== "cancelled" && (
                  <button
                    onClick={() => handleCancelEvent(viewingEvent)}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg hover:bg-rose-100 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Cancel Event
                  </button>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  {viewingEvent.status === "draft" && (
                    <button
                      onClick={() => handleDirectPublish(viewingEvent)}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700"
                    >
                      Publish & Notify
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(viewingEvent)}
                    className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900 flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create / Edit Event Modal ────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">
                {modalMode === "create" ? "Schedule Academic Event / Holiday" : "Edit Event Details"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Diwali Vacation, Annual Sports Meet, Unit Exam 1"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Event Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                  >
                    <option value="holiday">Holiday (School Closed)</option>
                    <option value="vacation">Vacation Period</option>
                    <option value="half_day">Half Day</option>
                    <option value="exam">Exam Schedule</option>
                    <option value="ptm">PTM Meeting</option>
                    <option value="event">School Event</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Audience *</label>
                  <select
                    value={form.audience}
                    onChange={(e) => setForm({ ...form, audience: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                  >
                    {AUDIENCE_OPTIONS.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Class Specific Dropdown */}
              {form.audience === "class_specific" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Applicable Classes</label>
                  <div className="max-h-28 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                    {classesList.map((c) => (
                      <label key={c._id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.classIds.includes(c._id)}
                          onChange={(e) => {
                            if (e.target.checked) setForm({ ...form, classIds: [...form.classIds, c._id] });
                            else setForm({ ...form, classIds: form.classIds.filter((id) => id !== c._id) });
                          }}
                        />
                        <span>{c.className} - {c.section}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Date pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Details regarding the event or closure..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 resize-none"
                />
              </div>

              {/* Notification Channels with Warning */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <label className="block font-bold text-slate-700">Notification Channels</label>
                <div className="flex items-center gap-4 flex-wrap">
                  {["email", "in_app", "sms", "whatsapp"].map((ch) => (
                    <label key={ch} className="flex items-center gap-1.5 cursor-pointer capitalize">
                      <input
                        type="checkbox"
                        checked={form.notifyChannels.includes(ch)}
                        onChange={(e) => {
                          if (e.target.checked) setForm({ ...form, notifyChannels: [...form.notifyChannels, ch] });
                          else setForm({ ...form, notifyChannels: form.notifyChannels.filter((c) => c !== ch) });
                        }}
                      />
                      <span>{ch.replace("_", " ")}</span>
                    </label>
                  ))}
                </div>
                {(form.notifyChannels.includes("sms") || form.notifyChannels.includes("whatsapp")) && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    SMS & WhatsApp invoke external telecom costs and respect Quiet Hours (8 PM - 8 AM).
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSaving ? "Publishing..." : "Publish & Notify"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
