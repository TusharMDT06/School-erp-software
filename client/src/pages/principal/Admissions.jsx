import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  Building,
  HelpCircle,
  X,
  MessageSquare,
  FileText,
  UserPlus,
  RefreshCw,
  PieChart as PieIcon,
  Layers,
  ChevronRight,
} from "lucide-react";
import {
  getInquiriesApi,
  createInquiryApi,
  addFollowUpApi,
  updateInquiryStatusApi,
  convertInquiryApi,
  getInquiryFunnelApi,
} from "../../api/inquiryApi";
import toast from "react-hot-toast";

const STAGES = [
  { id: "new", label: "New Leads", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "contacted", label: "Contacted", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { id: "visit_scheduled", label: "Visit Scheduled", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "visited", label: "Visited", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { id: "application_submitted", label: "App Submitted", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "documents_pending", label: "Docs Pending", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { id: "admitted", label: "Admitted", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { id: "lost", label: "Lost", color: "bg-rose-50 text-rose-700 border-rose-200" },
];

const STAGE_MAP = STAGES.reduce((acc, s) => {
  acc[s.id] = s;
  return acc;
}, {});

// ── Draggable Kanban Card ───────────────────────────────────────────────────
function KanbanCard({ item, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item._id,
    data: { item },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`p-3.5 bg-white rounded-xl border ${
        item.isOverdue ? "border-rose-300 ring-1 ring-rose-200" : "border-slate-200/90"
      } shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-2 select-none ${
        isDragging ? "opacity-40 shadow-xl" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-800 truncate">{item.childName}</p>
          <p className="text-[11px] font-semibold text-indigo-600 truncate">{item.applyingForClass}</p>
        </div>
        {item.isOverdue && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 border border-rose-200 flex-shrink-0">
            Overdue
          </span>
        )}
      </div>

      <div className="text-[11px] text-slate-500 space-y-0.5">
        <p className="truncate flex items-center gap-1">
          <span className="text-slate-400">Parent:</span> {item.parentName}
        </p>
        <p className="truncate flex items-center gap-1 font-mono text-slate-600">
          <Phone className="w-3 h-3 text-slate-400" /> {item.phone}
        </p>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
        <span className="capitalize">{item.source?.replace("_", " ")}</span>
        {item.nextFollowUpAt ? (
          <span className={item.isOverdue ? "text-rose-600 font-bold" : ""}>
            {new Date(item.nextFollowUpAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
          </span>
        ) : (
          <span>No follow-up set</span>
        )}
      </div>
    </div>
  );
}

// ── Droppable Kanban Column ─────────────────────────────────────────────────
function KanbanColumn({ stage, items, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-72 flex-shrink-0 flex flex-col rounded-2xl border transition-colors ${
        isOver ? "bg-indigo-50/60 border-indigo-300" : "bg-slate-50/70 border-slate-200/80"
      }`}
    >
      {/* Column Header */}
      <div className="p-3 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
          <h4 className="text-xs font-bold text-slate-800">{stage.label}</h4>
        </div>
        <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-white border border-slate-200 text-slate-600">
          {items.length}
        </span>
      </div>

      {/* Cards list */}
      <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[calc(100vh-270px)] min-h-[140px]">
        {items.length === 0 ? (
          <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-medium">
            Drop leads here
          </div>
        ) : (
          items.map((item) => <KanbanCard key={item._id} item={item} onClick={() => onCardClick(item)} />)
        )}
      </div>
    </div>
  );
}

export default function Admissions() {
  const [activeTab, setActiveTab] = useState("crm"); // "crm" | "funnel"
  const [viewMode, setViewMode] = useState("kanban"); // "kanban" | "list"

  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Drawer & Modals
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [pendingDropInquiry, setPendingDropInquiry] = useState(null);
  const [lostReasonInput, setLostReasonInput] = useState("");
  const [showConvertModal, setShowConvertModal] = useState(false);

  // Follow-up form state
  const [followUpMode, setFollowUpMode] = useState("call");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [submittingFollowUp, setSubmittingFollowUp] = useState(false);

  // Funnel Data
  const [funnelData, setFunnelData] = useState(null);
  const [loadingFunnel, setLoadingFunnel] = useState(false);

  // New Lead Form State
  const [newLead, setNewLead] = useState({
    childName: "",
    parentName: "",
    phone: "",
    email: "",
    applyingForClass: "Class 1",
    source: "walk_in",
    referredBy: "",
    notes: "",
  });

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const loadInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInquiriesApi({
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        applyingForClass: classFilter !== "all" ? classFilter : undefined,
        overdueOnly: overdueOnly ? "true" : undefined,
        limit: 100,
      });
      setInquiries(res.data?.data?.items || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load inquiries.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, classFilter, overdueOnly]);

  const loadFunnel = useCallback(async () => {
    setLoadingFunnel(true);
    try {
      const res = await getInquiryFunnelApi();
      setFunnelData(res.data?.data || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load funnel analytics.");
    } finally {
      setLoadingFunnel(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "crm") {
      loadInquiries();
    } else {
      loadFunnel();
    }
  }, [activeTab, loadInquiries, loadFunnel]);

  // Handle Drag & Drop between stages
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const inquiryId = active.id;
    const targetStage = over.id;
    const item = inquiries.find((i) => i._id === inquiryId);

    if (!item || item.status === targetStage) return;

    // Moving to "lost" requires a reason modal
    if (targetStage === "lost") {
      setPendingDropInquiry(item);
      setLostReasonInput("");
      setShowLostModal(true);
      return;
    }

    // Direct status update
    try {
      await updateInquiryStatusApi(inquiryId, { status: targetStage });
      toast.success(`Lead moved to ${STAGE_MAP[targetStage]?.label || targetStage}`);
      setInquiries((prev) =>
        prev.map((i) => (i._id === inquiryId ? { ...i, status: targetStage } : i))
      );
      if (selectedInquiry?._id === inquiryId) {
        setSelectedInquiry((prev) => ({ ...prev, status: targetStage }));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update status.");
    }
  };

  const handleConfirmLost = async () => {
    if (!lostReasonInput.trim()) {
      toast.error("Please enter a reason for marking this lead as lost.");
      return;
    }
    if (!pendingDropInquiry) return;

    try {
      await updateInquiryStatusApi(pendingDropInquiry._id, {
        status: "lost",
        lostReason: lostReasonInput.trim(),
      });
      toast.success("Lead marked as lost.");
      setInquiries((prev) =>
        prev.map((i) =>
          i._id === pendingDropInquiry._id
            ? { ...i, status: "lost", lostReason: lostReasonInput.trim() }
            : i
        )
      );
      setShowLostModal(false);
      setPendingDropInquiry(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to mark as lost.");
    }
  };

  const handleAddFollowUp = async (e) => {
    e.preventDefault();
    if (!selectedInquiry) return;
    if (!followUpNotes.trim()) {
      toast.error("Please enter a follow-up note.");
      return;
    }

    setSubmittingFollowUp(true);
    try {
      const res = await addFollowUpApi(selectedInquiry._id, {
        mode: followUpMode,
        notes: followUpNotes,
        nextFollowUpAt: nextDate || undefined,
        status: newStatus || undefined,
      });
      toast.success("Follow-up recorded.");
      setSelectedInquiry(res.data?.data);
      setFollowUpNotes("");
      setNextDate("");
      setNewStatus("");
      loadInquiries();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to record follow-up.");
    } finally {
      setSubmittingFollowUp(false);
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      const res = await createInquiryApi(newLead);
      toast.success("Inquiry created successfully!");
      if (res.data?.warnDuplicate) {
        toast("Note: An existing lead was previously registered with this phone number.", {
          icon: "⚠️",
        });
      }
      setShowNewModal(false);
      setNewLead({
        childName: "",
        parentName: "",
        phone: "",
        email: "",
        applyingForClass: "Class 1",
        source: "walk_in",
        referredBy: "",
        notes: "",
      });
      loadInquiries();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to create inquiry.");
    }
  };

  const handleConvertStudent = async () => {
    if (!selectedInquiry) return;
    try {
      await convertInquiryApi(selectedInquiry._id, {});
      toast.success("Inquiry marked as admitted & ready for enrollment!");
      setShowConvertModal(false);
      loadInquiries();
      setSelectedInquiry((prev) => ({ ...prev, status: "admitted" }));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to convert inquiry.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 lg:p-6 space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-100 text-blue-700">
              Pipeline & Leads
            </span>
            <span className="text-xs text-slate-400">Admissions CRM</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">Admissions Management</h1>
          <p className="text-sm text-slate-500">Track prospective student inquiries, follow-ups, and enrollment funnel</p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-slate-200/80 p-0.5 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setActiveTab("crm")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "crm" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Pipeline CRM
            </button>
            <button
              onClick={() => setActiveTab("funnel")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === "funnel" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Funnel Analytics
            </button>
          </div>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Inquiry
          </button>
        </div>
      </div>

      {activeTab === "crm" && (
        <>
          {/* ── Filters Bar ──────────────────────────────────────────────── */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search child, parent, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white"
              >
                <option value="all">All Stages</option>
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={overdueOnly}
                  onChange={(e) => setOverdueOnly(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span className={overdueOnly ? "text-rose-700 font-bold" : ""}>Overdue Only</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadInquiries}
                className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
              </button>

              <div className="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs font-semibold">
                <button
                  onClick={() => setViewMode("kanban")}
                  className={`px-2.5 py-1 rounded-lg ${
                    viewMode === "kanban" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  Kanban
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-2.5 py-1 rounded-lg ${
                    viewMode === "list" ? "bg-white text-slate-800 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          {/* ── Kanban View ──────────────────────────────────────────────── */}
          {viewMode === "kanban" ? (
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="flex gap-3 overflow-x-auto pb-4 pt-1">
                {STAGES.map((stage) => {
                  const stageItems = inquiries.filter((i) => i.status === stage.id);
                  return (
                    <KanbanColumn
                      key={stage.id}
                      stage={stage}
                      items={stageItems}
                      onCardClick={(item) => setSelectedInquiry(item)}
                    />
                  );
                })}
              </div>
            </DndContext>
          ) : (
            /* ── List View ────────────────────────────────────────────────── */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Child Name</th>
                      <th className="py-3 px-4">Applying Class</th>
                      <th className="py-3 px-4">Parent Name</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Source</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Next Follow-Up</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inquiries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          No inquiries found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      inquiries.map((item) => (
                        <tr
                          key={item._id}
                          className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                          onClick={() => setSelectedInquiry(item)}
                        >
                          <td className="py-3 px-4 font-bold text-slate-800">{item.childName}</td>
                          <td className="py-3 px-4 text-indigo-600 font-semibold">{item.applyingForClass}</td>
                          <td className="py-3 px-4 text-slate-600">{item.parentName}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{item.phone}</td>
                          <td className="py-3 px-4 capitalize text-slate-500">{item.source?.replace("_", " ")}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                STAGE_MAP[item.status]?.color || "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {STAGE_MAP[item.status]?.label || item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {item.nextFollowUpAt ? (
                              <span
                                className={`text-[11px] ${
                                  item.isOverdue ? "text-rose-600 font-bold" : "text-slate-600"
                                }`}
                              >
                                {new Date(item.nextFollowUpAt).toLocaleDateString("en-IN", {
                                  month: "short",
                                  day: "numeric",
                                })}
                                {item.isOverdue && " (Overdue)"}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Not scheduled</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-indigo-600 font-semibold text-xs hover:underline">
                              View →
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Funnel Analytics Tab ─────────────────────────────────────────── */}
      {activeTab === "funnel" && (
        <div className="space-y-6">
          {loadingFunnel && !funnelData ? (
            <div className="flex items-center justify-center p-12 text-slate-400 text-sm">
              Loading funnel analytics...
            </div>
          ) : funnelData ? (
            <>
              {/* Funnel KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                  <span className="text-xs font-bold text-slate-400">Total Leads</span>
                  <p className="text-2xl font-bold text-slate-800">{funnelData.totalInquiries}</p>
                  <p className="text-[11px] text-slate-500">All registered inquiries</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                  <span className="text-xs font-bold text-slate-400">Overall Conversion</span>
                  <p className="text-2xl font-bold text-emerald-600">{funnelData.overallConversionRate}%</p>
                  <p className="text-[11px] text-slate-500">Inquiry to enrolled</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                  <span className="text-xs font-bold text-slate-400">Avg. Days to Convert</span>
                  <p className="text-2xl font-bold text-indigo-600">{funnelData.avgDaysToConvert} Days</p>
                  <p className="text-[11px] text-slate-500">From inquiry to admitted</p>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
                  <span className="text-xs font-bold text-slate-400">Total Seats Remaining</span>
                  <p className="text-2xl font-bold text-amber-600">
                    {funnelData.seatsPerClass?.reduce((a, b) => a + (b.seatsLeft || 0), 0) || 0} Seats
                  </p>
                  <p className="text-[11px] text-slate-500">Across all classes</p>
                </div>
              </div>

              {/* Sequential Funnel Steps */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800">Stage-by-Stage Conversion Funnel</h3>
                <div className="space-y-3">
                  {funnelData.funnelSteps?.map((step, idx) => (
                    <div key={step.stage} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-700">
                          {idx + 1}. {step.label}
                        </span>
                        <span className="font-bold text-slate-800">
                          {step.count} leads ({step.percentOfTotal}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, step.percentOfTotal)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seats Left per Class Table */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800">Seat Capacity & Availability per Class</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Class</th>
                        <th className="py-2.5 px-3">Capacity</th>
                        <th className="py-2.5 px-3">Enrolled</th>
                        <th className="py-2.5 px-3">Seats Left</th>
                        <th className="py-2.5 px-3">Occupancy</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {funnelData.seatsPerClass?.map((cls) => (
                        <tr key={cls.classId}>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{cls.name}</td>
                          <td className="py-2.5 px-3 text-slate-600">{cls.capacity}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">{cls.enrolled}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                cls.seatsLeft === 0
                                  ? "bg-rose-100 text-rose-700"
                                  : cls.seatsLeft <= 5
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {cls.seatsLeft} seats left
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full ${
                                  cls.fillPercent >= 100
                                    ? "bg-rose-500"
                                    : cls.fillPercent >= 80
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(100, cls.fillPercent)}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── Detail Drawer ────────────────────────────────────────────────── */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-2xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Lead #{selectedInquiry._id.slice(-6).toUpperCase()}
                </span>
                <h3 className="text-lg font-bold text-slate-800">{selectedInquiry.childName}</h3>
                <p className="text-xs text-indigo-600 font-semibold">{selectedInquiry.applyingForClass}</p>
              </div>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 space-y-5 flex-1">
              {/* Contact Info */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Parent / Guardian:</span>
                  <span className="font-semibold text-slate-800">{selectedInquiry.parentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone:</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedInquiry.phone}</span>
                </div>
                {selectedInquiry.email && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-semibold text-slate-800">{selectedInquiry.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Source:</span>
                  <span className="capitalize font-semibold text-slate-700">
                    {selectedInquiry.source?.replace("_", " ")}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                  <span className="text-slate-400">Current Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      STAGE_MAP[selectedInquiry.status]?.color || "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {STAGE_MAP[selectedInquiry.status]?.label || selectedInquiry.status}
                  </span>
                </div>
              </div>

              {/* Convert to Student Action */}
              {selectedInquiry.status !== "admitted" && selectedInquiry.status !== "lost" && (
                <button
                  onClick={() => setShowConvertModal(true)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Convert to Enrolled Student
                </button>
              )}

              {/* Follow-up Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Follow-Up History</h4>
                {selectedInquiry.followUps?.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No follow-ups recorded yet.</p>
                ) : (
                  <div className="space-y-2.5 border-l-2 border-slate-100 ml-2 pl-3">
                    {selectedInquiry.followUps?.map((f, idx) => (
                      <div key={idx} className="relative text-xs space-y-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 absolute -left-[17px] top-1" />
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="capitalize font-semibold text-indigo-700">{f.mode}</span>
                          <span>{new Date(f.date).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
                        </div>
                        <p className="text-slate-700 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                          {f.notes}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Log New Follow-Up */}
              <form onSubmit={handleAddFollowUp} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Log Next Follow-Up</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Mode</label>
                    <select
                      value={followUpMode}
                      onChange={(e) => setFollowUpMode(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="call">Phone Call</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="visit">Campus Visit</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-1">Next Follow-Up</label>
                    <input
                      type="date"
                      value={nextDate}
                      onChange={(e) => setNextDate(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 font-medium mb-1 text-xs">Conversation Notes</label>
                  <textarea
                    rows={2}
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="Enter discussion notes or parent response..."
                    required
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingFollowUp}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all"
                >
                  {submittingFollowUp ? "Saving..." : "Log Follow-Up"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Lost Reason Modal ────────────────────────────────────────────── */}
      {showLostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-800">Reason for Lost Lead</h3>
            </div>
            <p className="text-xs text-slate-500">
              Please specify why {pendingDropInquiry?.childName} is being marked as lost (e.g. fees high, distance,
              opted for another school).
            </p>
            <textarea
              rows={3}
              value={lostReasonInput}
              onChange={(e) => setLostReasonInput(e.target.value)}
              placeholder="e.g. Chose another school closer to residence"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowLostModal(false);
                  setPendingDropInquiry(null);
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLost}
                className="px-3.5 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700"
              >
                Confirm Lost
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Convert to Student Modal ─────────────────────────────────────── */}
      {showConvertModal && selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-100">
            <div className="flex items-center gap-2 text-emerald-600">
              <UserCheck className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-800">Confirm Admission Conversion</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Converting <strong>{selectedInquiry.childName}</strong> will mark the inquiry as <strong>Admitted</strong>{" "}
              and prepare prefilled admission records.
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
              <p><strong>Applying Class:</strong> {selectedInquiry.applyingForClass}</p>
              <p><strong>Parent:</strong> {selectedInquiry.parentName}</p>
              <p><strong>Phone:</strong> {selectedInquiry.phone}</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConvertModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConvertStudent}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700"
              >
                Confirm Admitted
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Lead Modal ───────────────────────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">Add New Admission Lead</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Child Name *</label>
                  <input
                    type="text"
                    required
                    value={newLead.childName}
                    onChange={(e) => setNewLead({ ...newLead, childName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Applying Class *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Class 1"
                    value={newLead.applyingForClass}
                    onChange={(e) => setNewLead({ ...newLead, applyingForClass: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Parent / Guardian Name *</label>
                  <input
                    type="text"
                    required
                    value={newLead.parentName}
                    onChange={(e) => setNewLead({ ...newLead, parentName: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit number"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Source</label>
                  <select
                    value={newLead.source}
                    onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="walk_in">Walk-In</option>
                    <option value="phone">Phone</option>
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="social_media">Social Media</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Initial Note / Discussion</label>
                <textarea
                  rows={2}
                  value={newLead.notes}
                  onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                  placeholder="Notes from initial conversation..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                >
                  Save Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
