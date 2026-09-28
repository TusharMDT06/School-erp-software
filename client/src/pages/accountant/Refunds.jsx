import { useState, useEffect, useCallback } from "react";
import { RotateCcw, CheckCircle2, XCircle, DollarSign, Plus } from "lucide-react";
import {
  getRefundListApi,
  createRefundApi,
  decideRefundApi,
  payRefundApi,
  searchStudentsApi,
} from "../../api/accountantApi";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

const fmt = (paise) => "₹" + ((paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const STATUS_BADGE = {
  pending:  "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
  paid:     "bg-emerald-100 text-emerald-700",
};

export default function RefundsPage() {
  const { user } = useSelector((s) => s.auth);
  const isDecider = ["admin", "superadmin", "principal"].includes(user?.role);
  const canPay    = ["admin", "superadmin", "accountant"].includes(user?.role);
  const canCreate = ["admin", "superadmin", "accountant"].includes(user?.role);

  const [list, setList]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    transactionId: "",
    transactionLabel: "",
    amount: "",
    reason: "",
    mode: "cash",
  });

  // Decide
  const [decideModal, setDecideModal] = useState(null);
  const [decideStatus, setDecideStatus] = useState("approved");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter !== "all" ? { status: statusFilter } : {};
      const res = await getRefundListApi(params);
      setList(res.data?.refunds || []);
      setTotal(res.data?.total || 0);
    } catch {
      toast.error("Failed to load refunds.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.transactionId) { toast.error("Enter a transaction ID."); return; }
    try {
      await createRefundApi({
        transactionId: form.transactionId.trim(),
        amount: Math.round(Number(form.amount) * 100),
        reason: form.reason,
        mode: form.mode,
      });
      toast.success("Refund request created.");
      setShowForm(false);
      setForm({ transactionId: "", transactionLabel: "", amount: "", reason: "", mode: "cash" });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed.");
    }
  };

  const handleDecide = async (id, status) => {
    try {
      await decideRefundApi(id, { status });
      toast.success(`Refund ${status}.`);
      setDecideModal(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Action failed.");
    }
  };

  const handlePay = async (id) => {
    try {
      await payRefundApi(id);
      toast.success("Refund marked as paid.");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Failed.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Refunds</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage fee refund requests</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowForm((v) => !v)} className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 transition-all">
            <Plus className="w-4 h-4" /> New Refund
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-5">
          <h2 className="font-semibold text-slate-700 mb-4">New Refund Request</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 block mb-1">Transaction ID (ObjectId)</label>
              <input
                type="text"
                value={form.transactionId}
                onChange={(e) => setForm((f) => ({ ...f, transactionId: e.target.value }))}
                placeholder="Enter transaction _id…"
                required
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Refund Amount (₹)</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                min={1}
                step={0.01}
                required
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Mode</label>
              <select
                value={form.mode}
                onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
              >
                {["cash", "bank", "online"].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 block mb-1">Reason</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                rows={2}
                required
                minLength={5}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none resize-none"
              />
            </div>
            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200">Cancel</button>
              <button type="submit" className="px-5 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700">Submit</button>
            </div>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "approved", "rejected", "paid"].map((s) => (
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
          <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-30" />
          No refunds found.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <div key={r._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <RotateCcw className="w-8 h-8 text-blue-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{r.studentId?.userId?.name || "—"}</p>
                  <p className="text-xs text-slate-400">
                    {fmt(r.amount)} via {r.mode} · TxId: {r.transactionId?.receiptNumber || r.transactionId?._id || r.transactionId}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 italic">{r.reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_BADGE[r.status]}`}>
                  {r.status}
                </span>
                {isDecider && r.status === "pending" && (
                  <>
                    <button onClick={() => handleDecide(r._id, "rejected")} className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-xl hover:bg-red-100">Reject</button>
                    <button onClick={() => handleDecide(r._id, "approved")} className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100">Approve</button>
                  </>
                )}
                {canPay && r.status === "approved" && (
                  <button onClick={() => handlePay(r._id)} className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100">Mark Paid</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
