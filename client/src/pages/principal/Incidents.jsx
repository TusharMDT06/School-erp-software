import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Lock,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Send,
  CheckCircle,
  X,
  Calendar,
  User,
  Clock,
  ChevronRight,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getIncidentsApi,
  createIncidentApi,
  updateIncidentApi,
  notifyIncidentParentApi,
} from "../../api/incidentApi";
import { getStudentsApi } from "../../api/studentApi";

const SEVERITY_COLORS = {
  high: "bg-rose-100 text-rose-800 border-rose-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const STATUS_COLORS = {
  open: "bg-rose-50 text-rose-700 border-rose-200",
  under_review: "bg-blue-50 text-blue-700 border-blue-200",
  closed: "bg-slate-100 text-slate-700 border-slate-200",
};

const Incidents = () => {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Incident Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submittingIncident, setSubmittingIncident] = useState(false);
  const [studentOptions, setStudentOptions] = useState([]);
  const [createForm, setCreateForm] = useState({
    studentIds: [],
    category: "misconduct",
    severity: "low",
    description: "",
    actionTaken: "",
    confidential: false,
    date: new Date().toISOString().split("T")[0],
  });

  // Incident Detail Drawer State
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionTakenEdit, setActionTakenEdit] = useState("");

  // Notify Parent Dialog State
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [confirmFlag, setConfirmFlag] = useState(false);
  const [notifyingParent, setNotifyingParent] = useState(false);
  const [customParentNote, setCustomParentNote] = useState("");

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const res = await getIncidentsApi({
        category: categoryFilter || undefined,
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
      });
      setIncidents(res.data?.data?.incidents || []);
    } catch (err) {
      toast.error("Failed to load discipline register");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [categoryFilter, severityFilter, statusFilter]);

  // Load student list for modal selector
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const res = await getStudentsApi({ limit: 100 });
        const list = res.data?.data || res.data || [];
        setStudentOptions(list);
      } catch (err) {
        // silent
      }
    };
    loadStudents();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (createForm.studentIds.length === 0) {
      toast.error("Please select at least one student");
      return;
    }

    try {
      setSubmittingIncident(true);
      await createIncidentApi(createForm);
      toast.success("Incident registered successfully");
      setShowCreateModal(false);
      setCreateForm({
        studentIds: [],
        category: "misconduct",
        severity: "low",
        description: "",
        actionTaken: "",
        confidential: false,
        date: new Date().toISOString().split("T")[0],
      });
      loadIncidents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to log incident");
    } finally {
      setSubmittingIncident(false);
    }
  };

  const openDrawer = (inc) => {
    setSelectedIncident(inc);
    setActionTakenEdit(inc.actionTaken || "");
  };

  const closeDrawer = () => {
    setSelectedIncident(null);
  };

  const handleUpdateIncidentStatus = async (newStatus) => {
    if (!selectedIncident) return;
    try {
      setUpdatingStatus(true);
      const res = await updateIncidentApi(selectedIncident._id, {
        status: newStatus,
        actionTaken: actionTakenEdit,
      });
      toast.success(`Status updated to ${newStatus}`);
      setSelectedIncident(res.data?.data);
      loadIncidents();
    } catch (err) {
      toast.error("Failed to update incident");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleNotifyParentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIncident) return;

    if (["medium", "high"].includes(selectedIncident.severity) && !confirmFlag) {
      toast.error("Confirmation checkbox is required for medium and high severity reports");
      return;
    }

    try {
      setNotifyingParent(true);
      await notifyIncidentParentApi(selectedIncident._id, {
        confirm: confirmFlag,
        customNote: customParentNote.trim() || undefined,
      });

      toast.success("Parent notified with official neutral template!");
      setShowNotifyDialog(false);
      setConfirmFlag(false);
      setCustomParentNote("");
      setSelectedIncident({ ...selectedIncident, parentNotified: true });
      loadIncidents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to notify parent");
    } finally {
      setNotifyingParent(false);
    }
  };

  const filtered = incidents.filter((inc) => {
    if (!searchQuery) return true;
    const descMatch = inc.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const studentMatch = (inc.studentIds || []).some((s) =>
      s.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return descMatch || studentMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-[#1F4E79]" />
            Discipline & Pastoral Incident Register
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official record of student conduct, action tracking, and neutral parent communication.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-[#1F4E79] hover:bg-[#183e60] text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-2 self-start sm:self-auto transition"
        >
          <Plus className="w-4 h-4" />
          Log Incident
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs text-slate-800 bg-transparent focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="closed">Closed</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="bullying">Bullying</option>
            <option value="misconduct">Misconduct</option>
            <option value="damage">Damage</option>
            <option value="absenteeism">Absenteeism</option>
            <option value="safety">Safety</option>
            <option value="health">Health</option>
            <option value="other">Other</option>
          </select>

          <button
            onClick={loadIncidents}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Incident Register Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1F4E79] mb-2" />
            <p className="text-xs">Loading incident register...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No disciplinary incidents found</p>
            <p className="text-xs text-slate-400 mt-1">Good standing recorded across classes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Student(s)</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Parent Notified</th>
                  <th className="py-3 px-4">Reported By</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inc) => (
                  <tr
                    key={inc._id}
                    onClick={() => openDrawer(inc)}
                    className="hover:bg-slate-50/60 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(inc.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(inc.studentIds || []).map((s) => (
                          <span key={s._id} className="font-bold text-slate-800">
                            {s.name}
                          </span>
                        ))}
                        {inc.confidential && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                            <Lock className="w-3 h-3" />
                            Confidential
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 capitalize font-medium text-slate-700">{inc.category}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${
                          SEVERITY_COLORS[inc.severity] || "bg-slate-100"
                        }`}
                      >
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold capitalize ${
                          STATUS_COLORS[inc.status] || "bg-slate-100"
                        }`}
                      >
                        {inc.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {inc.parentNotified ? (
                        <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Notified
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Pending</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{inc.reportedBy?.name || "Staff"}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#1F4E79] hover:underline flex items-center gap-1 ml-auto"
                      >
                        Details <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL DRAWER */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={closeDrawer} />

          <div className="relative w-full max-w-lg bg-white shadow-2xl h-full flex flex-col z-10 overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <span>Incident Report</span>
                  {selectedIncident.confidential && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] rounded-full font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Confidential
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Logged on {new Date(selectedIncident.date).toLocaleDateString()}
                </p>
              </div>

              <button onClick={closeDrawer} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {/* Students Involved */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Students Involved</h4>
                <div className="flex flex-wrap gap-2">
                  {(selectedIncident.studentIds || []).map((s) => (
                    <div key={s._id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <p className="font-bold text-xs text-slate-800">{s.name}</p>
                      <p className="text-[10px] text-slate-400">Adm: {s.admissionNumber}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Severity & Category Chips */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-bold uppercase border ${
                    SEVERITY_COLORS[selectedIncident.severity]
                  }`}
                >
                  {selectedIncident.severity} Severity
                </span>
                <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
                  {selectedIncident.category}
                </span>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</h4>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 leading-relaxed">
                  {selectedIncident.description}
                </div>
              </div>

              {/* Action Taken & Status Mutation */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Action Taken & Status Update
                </h4>

                <textarea
                  rows={3}
                  value={actionTakenEdit}
                  onChange={(e) => setActionTakenEdit(e.target.value)}
                  placeholder="Record corrective or counseling action taken..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateIncidentStatus("under_review")}
                    disabled={updatingStatus}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg transition"
                  >
                    Mark Under Review
                  </button>
                  <button
                    onClick={() => handleUpdateIncidentStatus("closed")}
                    disabled={updatingStatus}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition"
                  >
                    Close Incident
                  </button>
                </div>
              </div>

              {/* Parent Notification Banner & Action */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">Parent Communication</h4>
                  {selectedIncident.parentNotified && (
                    <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Dispatched
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Dispatches an official neutral communication to the student's registered parents.
                </p>

                {!selectedIncident.parentNotified && (
                  <button
                    onClick={() => setShowNotifyDialog(true)}
                    className="px-4 py-2 bg-[#1F4E79] hover:bg-[#183e60] text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Notify Parents
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFY PARENT CONFIRMATION MODAL */}
      {showNotifyDialog && selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-base">Notify Parents / Guardians</h3>
              <button onClick={() => setShowNotifyDialog(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Preview */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-2">
              <p className="font-semibold text-slate-800">Neutral Email & SMS Preview:</p>
              <p className="italic text-slate-600">
                "An incident related to school conduct ({selectedIncident.category}) was recorded on{" "}
                {new Date(selectedIncident.date).toLocaleDateString()}. The matter is being handled constructively with care. Please reach out to the school office if you would like to schedule a conference."
              </p>
            </div>

            {/* Confirmation Checkbox for Medium & High Severity */}
            {["medium", "high"].includes(selectedIncident.severity) && (
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmFlag}
                  onChange={(e) => setConfirmFlag(e.target.checked)}
                  className="mt-0.5 rounded text-[#1F4E79] focus:ring-[#1F4E79]"
                />
                <span className="text-xs text-amber-900 font-semibold leading-relaxed">
                  I explicitly confirm dispatching this notification to parents for a {selectedIncident.severity.toUpperCase()} severity pastoral incident.
                </span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNotifyDialog(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNotifyParentSubmit}
                disabled={notifyingParent || (["medium", "high"].includes(selectedIncident.severity) && !confirmFlag)}
                className="px-5 py-2 bg-[#1F4E79] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
              >
                {notifyingParent ? "Dispatching..." : "Send Official Notice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOG INCIDENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-base">Record Pastoral Incident</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Student</label>
                <select
                  required
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id && !createForm.studentIds.includes(id)) {
                      setCreateForm({ ...createForm, studentIds: [...createForm.studentIds, id] });
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                >
                  <option value="">Select student to add...</option>
                  {studentOptions.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.admissionNumber})
                    </option>
                  ))}
                </select>

                {/* Selected students tags */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {createForm.studentIds.map((sId) => {
                    const found = studentOptions.find((st) => st._id === sId);
                    return (
                      <span
                        key={sId}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-xs font-semibold"
                      >
                        {found?.name || "Student"}
                        <button
                          type="button"
                          onClick={() =>
                            setCreateForm({
                              ...createForm,
                              studentIds: createForm.studentIds.filter((id) => id !== sId),
                            })
                          }
                          className="hover:text-blue-900"
                        >
                          &times;
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  >
                    <option value="bullying">Bullying</option>
                    <option value="misconduct">Misconduct</option>
                    <option value="damage">Damage</option>
                    <option value="absenteeism">Absenteeism</option>
                    <option value="safety">Safety</option>
                    <option value="health">Health</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Severity</label>
                  <select
                    value={createForm.severity}
                    onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail the factual observations..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Immediate Action Taken</label>
                <input
                  type="text"
                  placeholder="e.g. Verbal warning, separated students..."
                  value={createForm.actionTaken}
                  onChange={(e) => setCreateForm({ ...createForm, actionTaken: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.confidential}
                  onChange={(e) => setCreateForm({ ...createForm, confidential: e.target.checked })}
                  className="rounded text-[#1F4E79] focus:ring-[#1F4E79]"
                />
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-purple-600" />
                  Mark as Confidential (Restricted to Principal and Admin)
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIncident}
                  className="px-5 py-2 bg-[#1F4E79] text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  {submittingIncident ? "Recording..." : "Save Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Incidents;
