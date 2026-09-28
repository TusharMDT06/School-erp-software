import { useState, useCallback, useRef, useEffect } from "react";
import {
  Search, User, ChevronDown, ChevronRight, IndianRupee,
  QrCode, Printer, RotateCcw, CheckCircle2, X, Plus,
  Banknote, CreditCard, Smartphone, Building2, AlertCircle,
  Link2, Send, Copy, Check, MessageSquare, Mail, Phone,
} from "lucide-react";
import {
  searchStudentsApi,
  getStudentDuesApi,
  collectFeeApi,
  getUpiQrApi,
  reverseReceiptApi,
  createPaymentLinkApi,
  getPaymentLinksApi,
} from "../../api/accountantApi";
import toast from "react-hot-toast";

const fmt = (paise) => "₹" + ((paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });
const fmtNum = (n) => ((n || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const MODE_OPTIONS = [
  { value: "cash",       label: "Cash",       icon: Banknote },
  { value: "upi",        label: "UPI",        icon: Smartphone },
  { value: "cheque",     label: "Cheque",     icon: Building2 },
  { value: "card",       label: "Card",       icon: CreditCard },
  { value: "netbanking", label: "Net Banking", icon: Building2 },
];

const DueRow = ({ tx, checked, onChange, payNow, onPayNowChange }) => {
  const balance = tx.balance || 0;
  const isOverdue = tx.status === "overdue";

  return (
    <div className={`border rounded-xl p-4 ${checked ? "border-rose-400 bg-rose-50/40" : "border-slate-200 bg-white"} transition-colors`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(tx._id, e.target.checked)}
          className="mt-1 accent-rose-600 w-4 h-4"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-semibold text-slate-800 text-sm">
                {tx.feeStructureId?.academicYear || "—"} · {(tx.feeStructureId?.term || "").toUpperCase()}
              </span>
              {isOverdue && (
                <span className="ml-2 text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">Overdue</span>
              )}
              {tx.lateFeeAmount > 0 && (
                <span className="ml-2 text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">
                  Late fee: {fmt(tx.lateFeeAmount)}
                </span>
              )}
              {tx.concessionAmount > 0 && (
                <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                  Concession: {fmt(tx.concessionAmount)}
                </span>
              )}
            </div>
            <span className="font-bold text-slate-800">{fmt(balance)}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Billed: {fmt(tx.amountDue)} · Paid: {fmt(tx.amountPaid)} · Balance: {fmt(balance)}
          </div>
          {checked && (
            <div className="mt-3">
              <label className="text-xs text-slate-600 font-medium block mb-1">Pay Now (₹ paise)</label>
              <input
                type="number"
                value={payNow}
                onChange={(e) => onPayNowChange(tx._id, Number(e.target.value))}
                max={balance}
                min={1}
                step={1}
                placeholder={`Max ${balance} paise`}
                className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
              />
              <p className="text-xs text-slate-400 mt-0.5">= {fmt(payNow)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PaymentSplitRow = ({ idx, split, onChange, onRemove, canRemove }) => {
  return (
    <div className="flex items-end gap-2 flex-wrap">
      <div className="flex-1 min-w-[130px]">
        <label className="text-xs text-slate-500 block mb-1">Mode</label>
        <select
          value={split.mode}
          onChange={(e) => onChange(idx, "mode", e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
        >
          {MODE_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>
      <div className="flex-1 min-w-[120px]">
        <label className="text-xs text-slate-500 block mb-1">Amount (paise)</label>
        <input
          type="number"
          value={split.amount}
          onChange={(e) => onChange(idx, "amount", Number(e.target.value))}
          min={0}
          className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-rose-400 outline-none"
        />
      </div>
      {split.mode === "cheque" && (
        <>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Cheque No.</label>
            <input
              type="text"
              value={split.chequeNo || ""}
              onChange={(e) => onChange(idx, "chequeNo", e.target.value)}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-28 focus:ring-2 focus:ring-rose-400 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Bank</label>
            <input
              type="text"
              value={split.chequeBank || ""}
              onChange={(e) => onChange(idx, "chequeBank", e.target.value)}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-28 focus:ring-2 focus:ring-rose-400 outline-none"
            />
          </div>
        </>
      )}
      {["upi", "card", "netbanking", "online"].includes(split.mode) && (
        <div>
          <label className="text-xs text-slate-500 block mb-1">Reference</label>
          <input
            type="text"
            value={split.reference || ""}
            onChange={(e) => onChange(idx, "reference", e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm w-32 focus:ring-2 focus:ring-rose-400 outline-none"
          />
        </div>
      )}
      {canRemove && (
        <button onClick={() => onRemove(idx)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default function FeeCounter() {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [student, setStudent] = useState(null);
  const [dues, setDues]       = useState([]);
  const [duesLoading, setDuesLoading] = useState(false);

  // Selection & amounts
  const [selected, setSelected] = useState({}); // { txId: boolean }
  const [payNow, setPayNow]     = useState({}); // { txId: paise }

  // Payment splits
  const [splits, setSplits] = useState([{ mode: "cash", amount: 0, reference: "", chequeNo: "", chequeBank: "" }]);

  // UPI QR modal
  const [qrModal, setQrModal] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Reversal modal
  const [reverseModal, setReverseModal] = useState(null);
  const [reverseReason, setReverseReason] = useState("");
  const [reversing, setReversing] = useState(false);

  // Success state
  const [successData, setSuccessData] = useState(null);
  const [collecting, setCollecting] = useState(false);

  // Payment Link state
  const [paymentLinks, setPaymentLinks] = useState([]);
  const [paymentLinkModal, setPaymentLinkModal] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState(null);

  const loadPaymentLinks = useCallback(async () => {
    try {
      const res = await getPaymentLinksApi();
      setPaymentLinks(res.data || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadPaymentLinks();
  }, [loadPaymentLinks]);

  const searchTimeout = useRef(null);

  const handleSearch = (q) => {
    setQuery(q);
    clearTimeout(searchTimeout.current);
    if (!q.trim()) { setResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchStudentsApi(q);
        setResults(res.data || []);
      } catch { /* silent */ }
      finally { setSearching(false); }
    }, 350);
  };

  const selectStudent = async (s) => {
    setStudent(s);
    setResults([]);
    setQuery(s.userId?.name || "");
    setSelected({});
    setPayNow({});
    setSplits([{ mode: "cash", amount: 0 }]);
    setSuccessData(null);
    setDuesLoading(true);
    try {
      const res = await getStudentDuesApi(s._id);
      setDues(res.data?.dues || []);
    } catch (e) {
      toast.error("Failed to load dues.");
    } finally {
      setDuesLoading(false);
    }
  };

  const toggleDue = (txId, checked) => {
    setSelected((prev) => ({ ...prev, [txId]: checked }));
    const due = dues.find((d) => d._id === txId);
    if (checked) {
      setPayNow((prev) => ({ ...prev, [txId]: due?.balance || 0 }));
    }
  };

  const totalSelected = Object.entries(selected)
    .filter(([, v]) => v)
    .reduce((s, [id]) => s + (payNow[id] || 0), 0);

  const syncSplitsTotal = (newTotal) => {
    setSplits((prev) => {
      if (prev.length === 1) return [{ ...prev[0], amount: newTotal }];
      return prev;
    });
  };

  // When total changes, auto-update single split
  const handlePayNowChange = (txId, val) => {
    const newPayNow = { ...payNow, [txId]: val };
    setPayNow(newPayNow);
    const newTotal = Object.entries(selected)
      .filter(([, v]) => v)
      .reduce((s, [id]) => s + (newPayNow[id] || 0), 0);
    syncSplitsTotal(newTotal);
  };

  const handleSplitChange = (idx, key, val) => {
    setSplits((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  };

  const addSplit = () => setSplits((prev) => [...prev, { mode: "cash", amount: 0 }]);
  const removeSplit = (idx) => setSplits((prev) => prev.filter((_, i) => i !== idx));

  const splitsTotal = splits.reduce((s, p) => s + (p.amount || 0), 0);

  const handleCollect = async () => {
    const items = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([txId]) => ({ transactionId: txId, payNowAmount: payNow[txId] || 0 }))
      .filter((i) => i.payNowAmount > 0);

    if (!items.length) { toast.error("No dues selected."); return; }
    if (splitsTotal !== totalSelected) {
      toast.error(`Payment total mismatch: ₹${fmtNum(splitsTotal)} ≠ ₹${fmtNum(totalSelected)}`);
      return;
    }

    setCollecting(true);
    try {
      const res = await collectFeeApi({
        studentId: student._id,
        items,
        payments: splits,
        remarks: "",
        idempotencyKey: `${student._id}-${Date.now()}`,
      });
      setSuccessData(res.data);
      toast.success("Fee collected successfully!");
      // Reload dues
      const duesRes = await getStudentDuesApi(student._id);
      setDues(duesRes.data?.dues || []);
      setSelected({});
      setPayNow({});
      setSplits([{ mode: "cash", amount: 0 }]);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Collection failed.");
    } finally {
      setCollecting(false);
    }
  };

  const handleUpiQr = async () => {
    setQrLoading(true);
    try {
      const res = await getUpiQrApi(totalSelected / 100, `Fee for ${student?.userId?.name || "student"}`);
      setQrModal(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || "QR not available. Configure UPI ID in Finance Settings.");
    } finally {
      setQrLoading(false);
    }
  };

  const handleReverse = async () => {
    if (!reverseReason || reverseReason.length < 10) { toast.error("Provide a reason (min 10 chars)."); return; }
    setReversing(true);
    try {
      await reverseReceiptApi(reverseModal._id, reverseReason);
      toast.success("Transaction reversed.");
      setReverseModal(null);
      setReverseReason("");
      const duesRes = await getStudentDuesApi(student._id);
      setDues(duesRes.data?.dues || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Reversal failed.");
    } finally {
      setReversing(false);
    }
  };

  const handleSendPaymentLink = async () => {
    const transactionIds = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([id]) => id);

    if (!transactionIds.length) {
      toast.error("Please select at least one fee due.");
      return;
    }

    setSendingLink(true);
    try {
      await createPaymentLinkApi({
        studentId: student._id,
        transactionIds,
      });
      toast.success("Payment link generated and sent to parent via WhatsApp, SMS, and Email!");
      setPaymentLinkModal(false);
      loadPaymentLinks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create payment link");
    } finally {
      setSendingLink(false);
    }
  };

  const handleCopyLink = (linkId, url) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkId(linkId);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Fee Counter</h1>
        <p className="text-sm text-slate-500 mt-0.5">Search student → Select dues → Collect</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name, admission no., roll no…"
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-400 outline-none"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {results.length > 0 && (
          <ul className="mt-2 border border-slate-200 rounded-xl overflow-hidden shadow-md">
            {results.map((s) => (
              <li
                key={s._id}
                onClick={() => selectStudent(s)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-rose-50 cursor-pointer transition-colors border-b last:border-0 border-slate-100"
              >
                <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-bold text-sm">
                  {(s.userId?.name || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{s.userId?.name}</p>
                  <p className="text-xs text-slate-400">{s.admissionNumber} · {s.classId?.className}-{s.classId?.section}</p>
                </div>
                <ChevronRight className="ml-auto w-4 h-4 text-slate-400" />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Student Profile + Dues */}
      {student && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Student Info */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700 font-bold text-xl">
                {(student.userId?.name || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-slate-800">{student.userId?.name}</p>
                <p className="text-xs text-slate-500">{student.classId?.className}-{student.classId?.section}</p>
              </div>
            </div>
            <div className="text-xs text-slate-500 space-y-1 border-t pt-3">
              <p><span className="font-medium">Admission:</span> {student.admissionNumber || "—"}</p>
              <p><span className="font-medium">Roll No:</span> {student.rollNumber || "—"}</p>
              <p><span className="font-medium">Email:</span> {student.userId?.email || "—"}</p>
              <p><span className="font-medium">Phone:</span> {student.userId?.phone || "—"}</p>
            </div>
          </div>

          {/* Dues + Collection */}
          <div className="lg:col-span-2 space-y-4">
            {duesLoading ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400">
                <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Loading dues…
              </div>
            ) : dues.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
                No pending dues found for this student.
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {dues.map((tx) => (
                    <DueRow
                      key={tx._id}
                      tx={tx}
                      checked={!!selected[tx._id]}
                      onChange={toggleDue}
                      payNow={payNow[tx._id] || 0}
                      onPayNowChange={handlePayNowChange}
                    />
                  ))}
                </div>

                {/* Collection panel */}
                {Object.values(selected).some(Boolean) && (
                  <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-700">Collection Panel</h3>
                      <span className="text-rose-600 font-bold text-lg">{fmt(totalSelected)}</span>
                    </div>

                    {/* Payment splits */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-600">Payment Modes</p>
                        <button onClick={addSplit} className="text-xs text-rose-600 font-semibold flex items-center gap-1 hover:text-rose-700">
                          <Plus className="w-3 h-3" /> Add Split
                        </button>
                      </div>
                      {splits.map((s, i) => (
                        <PaymentSplitRow
                          key={i}
                          idx={i}
                          split={s}
                          onChange={handleSplitChange}
                          onRemove={removeSplit}
                          canRemove={splits.length > 1}
                        />
                      ))}
                      {splitsTotal !== totalSelected && (
                        <div className="flex items-center gap-2 text-xs text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
                          <AlertCircle className="w-4 h-4" />
                          Split total ({fmt(splitsTotal)}) ≠ selected total ({fmt(totalSelected)})
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 flex-wrap pt-2">
                      <button
                        onClick={handleCollect}
                        disabled={collecting || splitsTotal !== totalSelected}
                        className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50"
                      >
                        {collecting ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <IndianRupee className="w-4 h-4" />
                        )}
                        Collect {fmt(totalSelected)}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentLinkModal(true)}
                        disabled={collecting || sendingLink || !totalSelected}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 shadow-sm"
                      >
                        <Link2 className="w-4 h-4" />
                        Send Payment Link
                      </button>
                      <button
                        onClick={handleUpiQr}
                        disabled={qrLoading || !totalSelected}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                      >
                        <QrCode className="w-4 h-4" />
                        UPI QR
                      </button>
                    </div>
                  </div>
                )}

                {/* Success Banner */}
                {successData && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-emerald-800">Payment Collected!</p>
                        <p className="text-sm text-emerald-600">Receipt: {successData.receiptNumber}</p>
                      </div>
                    </div>
                    {successData.receiptUrl && (
                      <a
                        href={`/api/accountant/receipts/${successData.transactionIds?.[0]}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                        Print Receipt
                      </a>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* UPI QR Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setQrModal(null)}>
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-72 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-3">Scan & Pay</h3>
            <img src={qrModal.qr} alt="UPI QR" className="w-48 h-48 mx-auto rounded-xl border border-slate-200" />
            <p className="text-xs text-slate-400 mt-3 break-all">{qrModal.upiUrl}</p>
            <button onClick={() => setQrModal(null)} className="mt-4 px-5 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200">Close</button>
          </div>
        </div>
      )}

      {/* Reverse Modal */}
      {reverseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm space-y-4">
            <h3 className="font-bold text-slate-800">Reverse Transaction</h3>
            <p className="text-sm text-slate-500">Receipt: {reverseModal.counterReceiptNumber || reverseModal.receiptNumber}</p>
            <textarea
              rows={3}
              value={reverseReason}
              onChange={(e) => setReverseReason(e.target.value)}
              placeholder="Reason for reversal (min 10 characters)…"
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none resize-none"
            />
            <div className="flex gap-3">
              <button onClick={() => setReverseModal(null)} className="flex-1 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200">Cancel</button>
              <button
                onClick={handleReverse}
                disabled={reversing}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {reversing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Reverse
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Payment Links Section ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-600" />
              Recent Payment Links
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Remote fee payment links dispatched to parents via WhatsApp, SMS, and Email.
            </p>
          </div>
          <button
            onClick={loadPaymentLinks}
            className="text-xs text-slate-600 hover:text-slate-900 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Refresh
          </button>
        </div>

        {paymentLinks.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No remote payment links generated yet.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b">
                <tr>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Class</th>
                  <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-4">Payment Link</th>
                  <th className="py-2.5 px-4">Sent Via</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paymentLinks.slice(0, 15).map((pl) => (
                  <tr key={pl._id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {pl.studentId?.userId?.name || "Student"}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {pl.studentId?.classId
                        ? `${pl.studentId.classId.className}-${pl.studentId.classId.section}`
                        : "—"}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                      {fmt(pl.amount)}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[180px]">{pl.shortUrl}</span>
                        <button
                          onClick={() => handleCopyLink(pl._id, pl.shortUrl)}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                          title="Copy Link"
                        >
                          {copiedLinkId === pl._id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium">
                          WA
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium">
                          SMS
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-medium">
                          Email
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          pl.status === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : pl.status === "expired"
                            ? "bg-slate-200 text-slate-600"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {pl.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400">
                      {new Date(pl.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Send Payment Link Confirmation Modal ─────────────────── */}
      {paymentLinkModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-md space-y-4">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-blue-600" />
                Dispatch Remote Payment Link
              </h3>
              <button
                onClick={() => setPaymentLinkModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-2 text-xs text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Student:</span>{" "}
                {student?.userId?.name} ({student?.admissionNumber})
              </p>
              <p>
                <span className="font-semibold text-slate-900">Total Payable:</span>{" "}
                <span className="font-bold text-blue-700 text-sm">{fmt(totalSelected)}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-900">Dues Selected:</span>{" "}
                {Object.values(selected).filter(Boolean).length} transaction(s)
              </p>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Dispatch Channels:</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
                  <MessageSquare className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                  <span className="font-medium text-[11px]">WhatsApp</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
                  <Phone className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                  <span className="font-medium text-[11px]">SMS Alert</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-center">
                  <Mail className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                  <span className="font-medium text-[11px]">Email & In-App</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                * Payable amount is strictly recomputed on the server from active fee records.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentLinkModal(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendPaymentLink}
                disabled={sendingLink}
                className="flex-1 py-2.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/20"
              >
                {sendingLink ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Generate & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
