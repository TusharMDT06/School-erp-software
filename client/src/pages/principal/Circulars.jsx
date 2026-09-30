import { useState, useEffect, useCallback } from "react";
import {
  FileText, Plus, Send, Clock, Users, CheckCircle2,
  AlertCircle, RefreshCw, BarChart2, Eye, Bell, X,
  ExternalLink, Check, Paperclip, ChevronRight,
} from "lucide-react";
import {
  getCircularsApi,
  createCircularApi,
  updateCircularApi,
  publishCircularApi,
  getCircularStatsApi,
  remindNonRespondersApi,
} from "../../api/circularApi";
import { getClassesApi } from "../../api/classApi";
import toast from "react-hot-toast";

const ROLE_OPTIONS = [
  { value: "teacher", label: "Teachers" },
  { value: "student", label: "Students" },
  { value: "parent", label: "Parents / Guardians" },
  { value: "accountant", label: "Accountants & Finance Staff" },
];

export default function Circulars() {
  const [circulars, setCirculars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [classesList, setClassesList] = useState([]);

  // Composer Modal State
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    body: "",
    attachments: [],
    audienceRoles: ["teacher", "student", "parent"],
    classIds: [],
    requiresAcknowledgement: false,
    ackDeadline: "",
  });
  const [newAttachment, setNewAttachment] = useState({ name: "", url: "" });
  const [isSaving, setIsSaving] = useState(false);

  // Stats Drawer State
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [reminding, setReminding] = useState(false);

  const loadCirculars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCircularsApi({ status: statusFilter });
      setCirculars(res.data?.circulars || []);
    } catch {
      toast.error("Failed to load circulars.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadCirculars();
    getClassesApi({ limit: 100 })
      .then((res) => {
        const raw =
          res?.data?.data ||
          res?.data?.classes ||
          (Array.isArray(res?.data) ? res.data : []);
        setClassesList(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setClassesList([]));
  }, [loadCirculars]);

  const openComposer = () => {
    setForm({
      title: "",
      body: "",
      attachments: [],
      audienceRoles: ["teacher", "student", "parent"],
      classIds: [],
      requiresAcknowledgement: false,
      ackDeadline: "",
    });
    setEditingId(null);
    setIsComposerOpen(true);
  };

  const handleAddAttachment = () => {
    if (!newAttachment.name || !newAttachment.url) return;
    setForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments, { ...newAttachment }],
    }));
    setNewAttachment({ name: "", url: "" });
  };

  const handleRemoveAttachment = (idx) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== idx),
    }));
  };

  const handleSaveComposer = async (publishNow = false) => {
    if (!form.title.trim() || !form.body.trim()) {
      return toast.error("Title and body content are required.");
    }
    setIsSaving(true);
    try {
      let saved;
      if (editingId) {
        const res = await updateCircularApi(editingId, form);
        saved = res.data;
        toast.success("Circular updated.");
      } else {
        const res = await createCircularApi(form);
        saved = res.data;
        toast.success("Circular created as draft.");
      }

      if (publishNow && saved?._id) {
        await publishCircularApi(saved._id);
        toast.success("Circular published to recipients.");
      }

      setIsComposerOpen(false);
      loadCirculars();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save circular.");
    } finally {
      setIsSaving(false);
    }
  };

  const openStats = async (circularId) => {
    setStatsLoading(true);
    setStatsData(null);
    try {
      const res = await getCircularStatsApi(circularId);
      setStatsData(res.data);
    } catch {
      toast.error("Failed to load statistics.");
    } finally {
      setStatsLoading(false);
    }
  };

  const handleRemindNonResponders = async (circularId) => {
    setReminding(true);
    try {
      const res = await remindNonRespondersApi(circularId);
      toast.success(res.message || "Reminder sent to non-responders.");
      openStats(circularId);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to send reminder.");
    } finally {
      setReminding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 lg:p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-100 text-blue-700">
              Communication & Compliance
            </span>
            <span className="text-xs text-slate-400">Phase 8A</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">Official Circulars</h1>
          <p className="text-sm text-slate-500">Publish notices with recipient delivery and formal acknowledgement tracking</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openComposer}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Compose Circular
          </button>
        </div>
      </div>

      {/* ── Status Filter ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-2xs">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mr-2">Filter:</span>
        {["all", "draft", "published"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              statusFilter === st ? "bg-slate-800 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* ── Circulars List ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-3" />
            <p className="text-sm font-semibold text-slate-600">Loading circulars...</p>
          </div>
        ) : circulars.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-base font-bold text-slate-700">No circulars recorded</p>
            <p className="text-xs text-slate-400">Compose and publish official school notices with acknowledgement tracking.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {circulars.map((c) => {
              const stats = c.stats || {};
              const isPublished = c.status === "published";

              return (
                <div key={c._id} className="p-4 md:p-5 flex items-start justify-between gap-4 hover:bg-slate-50/50">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                          isPublished ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.status}
                      </span>
                      {c.requiresAcknowledgement && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[11px] font-bold">
                          Ack Required
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        {new Date(c.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-800">{c.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{c.body.replace(/<[^>]*>?/gm, "")}</p>

                    {/* Delivery & Ack Progress Bar (if published) */}
                    {isPublished && stats.totalReceipts > 0 && (
                      <div className="pt-2 max-w-md space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                          <span>
                            Read: <strong>{stats.readPercent}%</strong> ({stats.readCount}/{stats.totalReceipts})
                          </span>
                          {c.requiresAcknowledgement && (
                            <span>
                              Ack: <strong>{stats.ackPercent}%</strong> ({stats.ackCount}/{stats.totalReceipts})
                            </span>
                          )}
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${stats.readPercent}%` }}
                            className="bg-blue-500 h-full transition-all"
                          />
                          {c.requiresAcknowledgement && (
                            <div
                              style={{ width: `${stats.ackPercent}%` }}
                              className="bg-emerald-500 h-full transition-all"
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isPublished ? (
                      <button
                        onClick={() => openStats(c._id)}
                        className="px-3.5 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                      >
                        <BarChart2 className="w-3.5 h-3.5 text-indigo-600" />
                        Stats & Remind
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          try {
                            await publishCircularApi(c._id);
                            toast.success("Circular published!");
                            loadCirculars();
                          } catch {
                            toast.error("Failed to publish.");
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Publish
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Compose Circular Modal ───────────────────────────────────────── */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">
                {editingId ? "Edit Circular Draft" : "Compose Official Circular"}
              </h3>
              <button onClick={() => setIsComposerOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Circular Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Schedule of Term-1 Parent Teacher Meeting"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Body Text / Notice *</label>
                <textarea
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                  placeholder="Write official circular content here..."
                  rows={5}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:border-indigo-600 resize-none leading-relaxed"
                />
              </div>

              {/* Target Audience Roles */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Recipient Roles</label>
                <div className="flex items-center gap-4 flex-wrap">
                  {ROLE_OPTIONS.map((r) => (
                    <label key={r.value} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.audienceRoles.includes(r.value)}
                        onChange={(e) => {
                          if (e.target.checked) setForm({ ...form, audienceRoles: [...form.audienceRoles, r.value] });
                          else setForm({ ...form, audienceRoles: form.audienceRoles.filter((v) => v !== r.value) });
                        }}
                      />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Specific Classes Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Classes (Optional — Leave blank for all classes)</label>
                <div className="max-h-24 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                  {(Array.isArray(classesList) ? classesList : []).map((c) => (
                    <label key={c._id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(Array.isArray(form?.classIds) ? form.classIds : []).includes(c._id)}
                        onChange={(e) => {
                          const current = Array.isArray(form?.classIds) ? form.classIds : [];
                          if (e.target.checked) setForm({ ...form, classIds: [...current, c._id] });
                          else setForm({ ...form, classIds: current.filter((id) => id !== c._id) });
                        }}
                      />
                      <span>{c.className} - {c.section}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Acknowledgement Toggle & Deadline */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.requiresAcknowledgement}
                    onChange={(e) => setForm({ ...form, requiresAcknowledgement: e.target.checked })}
                  />
                  <span className="font-bold text-slate-800">Require Formal Acknowledgement from Recipients</span>
                </label>

                {form.requiresAcknowledgement && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Acknowledgement Deadline
                    </label>
                    <input
                      type="date"
                      value={form.ackDeadline}
                      onChange={(e) => setForm({ ...form, ackDeadline: e.target.value })}
                      className="p-2 rounded-lg border border-slate-200 text-xs focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Attachments</label>
                {(Array.isArray(form?.attachments) ? form.attachments : []).map((att, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="font-medium text-slate-700">{att.name} ({att.url})</span>
                    <button type="button" onClick={() => handleRemoveAttachment(i)} className="text-rose-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Document Name (e.g. Schedule PDF)"
                    value={newAttachment.name}
                    onChange={(e) => setNewAttachment({ ...newAttachment, name: e.target.value })}
                    className="flex-1 p-2 rounded-lg border border-slate-200"
                  />
                  <input
                    type="text"
                    placeholder="URL (e.g. https://...)"
                    value={newAttachment.url}
                    onChange={(e) => setNewAttachment({ ...newAttachment, url: e.target.value })}
                    className="flex-1 p-2 rounded-lg border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="px-3 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsComposerOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveComposer(false)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveComposer(true)}
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

      {/* ── Stats & Non-Responders Modal ─────────────────────────────────── */}
      {statsData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">
                  Acknowledgement Analytics
                </span>
                <h3 className="text-base font-bold text-slate-800">{statsData.title}</h3>
              </div>
              <button onClick={() => setStatsData(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl text-center">
                <p className="text-xs text-slate-500 font-medium">Total Recipients</p>
                <p className="text-xl font-bold text-slate-800">{statsData.total}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-center">
                <p className="text-xs text-blue-600 font-medium">Read Rate</p>
                <p className="text-xl font-bold text-blue-700">{statsData.readPercent}%</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl text-center">
                <p className="text-xs text-emerald-600 font-medium">Acknowledged</p>
                <p className="text-xl font-bold text-emerald-700">{statsData.ackPercent}%</p>
              </div>
            </div>

            {/* Class Breakdown */}
            {statsData.classBreakdown && Object.keys(statsData.classBreakdown).length > 0 && (
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-700">Class-wise Breakdown</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(statsData.classBreakdown).map(([cls, val]) => (
                    <div key={cls} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                      <p className="font-bold text-slate-800">{cls}</p>
                      <p className="text-[11px] text-slate-500">
                        {val.read}/{val.total} Read · {val.acknowledged} Ack
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Non-Responders Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700">
                  Non-Responders ({statsData.nonResponders?.length || 0})
                </h4>
                {statsData.nonResponders?.length > 0 && (
                  <button
                    onClick={() => handleRemindNonResponders(statsData.circularId)}
                    disabled={reminding}
                    className="px-3 py-1.5 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    {reminding ? "Reminding..." : "Remind Non-Responders"}
                  </button>
                )}
              </div>

              <div className="max-h-52 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100 text-xs">
                {statsData.nonResponders?.map((nr, i) => (
                  <div key={i} className="p-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">{nr.name} ({nr.role})</p>
                      <p className="text-[11px] text-slate-400">{nr.email} · Class: {nr.className}</p>
                    </div>
                    <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
