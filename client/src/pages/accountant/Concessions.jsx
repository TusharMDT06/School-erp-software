import { useState, useEffect, useCallback } from "react";
import {
  BadgePercent, Plus, CheckCircle2, XCircle, Clock, ChevronDown,
} from "lucide-react";
import {
  getConcessionListApi,
  createConcessionApi,
  decideConcessionApi,
  searchStudentsApi,
} from "../../api/accountantApi";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  pending:  "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

const TYPES = ["sibling", "merit", "staff_ward", "need_based", "custom"];

export default function ConcessionsPage() {
  const { user } = useSelector((s) => s.auth);
  const isDecider = ["admin", "superadmin", "principal"].includes(user?.role);
  const canCreate = ["admin", "superadmin", "accountant"].includes(user?.role);

  const [list, setList]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [form, setForm] = useState({
    studentId: "",
    studentName: "",
    academicYear: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
    type: "merit",
    valueType: "percent",
    value: "",
    reason: "",
  });
  const [studentResults, setStudentResults] = useState([]);
  const [saving, setSaving] = useState(false);

  // Decide modal
  const [decideModal, setDecideModal] = useState(null);
  const [decideRemarks, setDecideRemarks]= useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== "all" ? { status: statusFilter } : {};
      const res = await getConcessionListApi(params);
      setList(res.data?.concessions || []);
      setTotal(res.data?.total || 0);
    } catch {
      toast.error("Failed to load concessions.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleStudentSearch = async (q) => {
    setForm((f) => ({ ...f, studentId: "", studentName: q }));
    if (!q.trim()) { setStudentResults([]); return; }
    try {
      const res = await searchStudentsApi(q);
      setStudentResults(res.data || []);
    } catch { /* silent */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.studentId) { toast.error("Please select a student."); return; }
    setSaving(true);
    try {
      await createConcessionApi({
        studentId: form.studentId,
        academicYear: form.academicYear,
        type: form.type,
        valueType: form.valueType,
        value: Number(form.value),
        reason: form.reason,
      });
      toast.success("Concession request submitted.");
      setShowForm(false);
      setForm((f) => ({ ...f, studentId: "", studentName: "", value: "", reason: "" }));
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed to submit.");
    } finally {
      setSaving(false);
    }
  };

  const handleDecide = async (status) => {
    try {
      await decideConcessionApi(decideModal._id, { status, decisionRemarks: decideRemarks });
      toast.success(`Concession ${status}.`);
      setDecideModal(null);
      setDecideRemarks("");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Action failed.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fee Concessions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage scholarships and fee waivers</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Concession
          </button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-5">
          <h2 className="font-semibold text-slate-700 mb-4">New Concession Request</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Student search */}
            <div className="sm:col-span-2 relative">
              <label className="text-xs font-medium text-slate-600 block mb-1">Student</label>
              <input
                type="text"
                value={form.studentName}
                onChange={(e) => handleStudentSearch(e.target.value)}
                placeholder="Type name or admission no…"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
              />
              {studentResults.length > 0 && (
                <ul className="absolute z-20 top-full left-0 right-0 bg-white border border-slate-200 rounded-xl mt-1 shadow-lg max-h-40 overflow-y-auto">
                  {studentResults.map((s) => (
                    <li
                      key={s._id}
                      onClick={() => {
                        setForm((f) => ({ ...f, studentId: s._id, studentName: s.userId?.name || s.admissionNumber }));
                        setStudentResults([]);
                      }}
                      className="px-4 py-2.5 hover:bg-rose-50 cursor-pointer text-sm border-b last:border-0"
                    >
                      {s.userId?.name} — {s.admissionNumber} · {s.classId?.className}-{s.classId?.section}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Academic Year</label>
              <input
                type="text"
                value={form.academicYear}
                onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
              >
                {TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Value Type</label>
              <select
                value={form.valueType}
                onChange={(e) => setForm((f) => ({ ...f, valueType: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
              >
                <option value="percent">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Value {form.valueType === "percent" ? "(%)" : "(₹)"}
              </label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                min={0}
                max={form.valueType === "percent" ? 100 : undefined}
                required
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 block mb-1">Reason</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={2}
                required
                minLength={5}
                placeholder="State the reason for this concession…"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none resize-none"
              />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-50">
                {saving ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold capitalize transition-colors ${statusFilter === s ? "bg-rose-600 text-white" : "bg-white text-slate-500 border border-slate-200 hover:border-rose-300"}`}
          >
            {s}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400 self-center">{total} total</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading…
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <BadgePercent className="w-12 h-12 mx-auto mb-3 opacity-30" />
          No concessions found.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <div key={c._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <BadgePercent className="w-8 h-8 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{c.studentId?.userId?.name || c.studentId?.admissionNumber}</p>
                  <p className="text-xs text-slate-400">{c.type} · {c.valueType === "percent" ? `${c.value}%` : `₹${c.value}`} · {c.academicYear}</p>
                  <p className="text-xs text-slate-400 mt-0.5 italic">{c.reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_BADGE[c.status]}`}>
                  {c.status}
                </span>
                {isDecider && c.status === "pending" && (
                  <button
                    onClick={() => { setDecideModal(c); setDecideRemarks(""); }}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
                  >
                    Decide
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decide Modal */}
      {decideModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm space-y-4">
            <h3 className="font-bold text-slate-800">Decide Concession</h3>
            <p className="text-sm text-slate-500">{decideModal.studentId?.userId?.name} — {decideModal.type} — {decideModal.value}{decideModal.valueType === "percent" ? "%" : "₹"}</p>
            <p className="text-xs text-slate-400 italic">"{decideModal.reason}"</p>
            <textarea
              value={decideRemarks}
              onChange={(e) => setDecideRemarks(e.target.value)}
              rows={2}
              placeholder="Decision remarks (optional)…"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setDecideModal(null)} className="flex-1 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200">Cancel</button>
              <button onClick={() => handleDecide("rejected")} className="flex-1 py-2 bg-red-100 text-red-700 text-sm font-semibold rounded-xl hover:bg-red-200 flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> Reject
              </button>
              <button onClick={() => handleDecide("approved")} className="flex-1 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
