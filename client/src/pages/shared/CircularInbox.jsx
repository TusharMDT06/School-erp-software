import { useState, useEffect, useCallback } from "react";
import {
  FileText, CheckCircle2, Clock, AlertCircle,
  Paperclip, ExternalLink, Check, RefreshCw, X,
} from "lucide-react";
import {
  getMyCircularsApi,
  markCircularReadApi,
  acknowledgeCircularApi,
} from "../../api/circularApi";
import toast from "react-hot-toast";

export default function CircularInbox() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all" | "unread" | "pending_ack"
  const [activeItem, setActiveItem] = useState(null);
  const [ackingId, setAckingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyCircularsApi({ status: filter });
      setItems(res.data || []);
    } catch {
      toast.error("Failed to load your circulars.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpenCircular = async (item) => {
    setActiveItem(item);
    if (!item.isRead) {
      try {
        await markCircularReadApi(item.circular._id);
        item.isRead = true;
        item.readAt = new Date().toISOString();
        setItems([...items]);
      } catch {}
    }
  };

  const handleAcknowledge = async (circularId) => {
    setAckingId(circularId);
    try {
      await acknowledgeCircularApi(circularId);
      toast.success("Receipt acknowledged successfully.");
      setItems((prev) =>
        prev.map((it) =>
          it.circular._id === circularId
            ? { ...it, isAcknowledged: true, acknowledgedAt: new Date().toISOString() }
            : it
        )
      );
      if (activeItem?.circular?._id === circularId) {
        setActiveItem((prev) => ({
          ...prev,
          isAcknowledged: true,
          acknowledgedAt: new Date().toISOString(),
        }));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to acknowledge circular.");
    } finally {
      setAckingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 lg:p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-100 text-indigo-700">
              Official Notices
            </span>
            <span className="text-xs text-slate-400">Institutional Announcements</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">My Circulars</h1>
          <p className="text-sm text-slate-500">Official circulars, academic notices and required acknowledgements</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
          {["all", "unread", "pending_ack"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filter === f ? "bg-slate-800 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* ── Circulars Inbox Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
            <p className="text-sm font-semibold text-slate-600">Loading your notices...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="col-span-full p-16 text-center text-slate-400 space-y-2 bg-white rounded-2xl border border-slate-100">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-base font-bold text-slate-700">No circulars under this filter</p>
            <p className="text-xs text-slate-400">All announcements will appear here when published.</p>
          </div>
        ) : (
          items.map((item) => {
            const c = item.circular;
            const requiresAck = c.requiresAcknowledgement;
            const isAcked = item.isAcknowledged;

            return (
              <div
                key={item.receiptId}
                className="bg-white rounded-2xl border border-slate-100 shadow-2xs p-5 flex flex-col justify-between gap-4 hover:shadow-xs hover:border-indigo-100 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.isRead ? "bg-slate-100 text-slate-600" : "bg-blue-100 text-blue-700 font-bold"
                      }`}
                    >
                      {item.isRead ? "Read" : "New / Unread"}
                    </span>

                    {requiresAck && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isAcked
                            ? "bg-emerald-100 text-emerald-700 flex items-center gap-1"
                            : "bg-amber-100 text-amber-700 flex items-center gap-1"
                        }`}
                      >
                        {isAcked ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {isAcked ? "Acknowledged" : "Ack Required"}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-800 line-clamp-2">{c.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                    {c.body.replace(/<[^>]*>?/gm, "")}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Published: {new Date(c.publishedAt || c.createdAt).toLocaleDateString("en-IN")}</span>
                    {c.attachments?.length > 0 && (
                      <span className="flex items-center gap-1 text-indigo-600 font-medium">
                        <Paperclip className="w-3 h-3" />
                        {c.attachments.length} file(s)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenCircular(item)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors flex-1"
                    >
                      Read Notice
                    </button>

                    {requiresAck && !isAcked && (
                      <button
                        onClick={() => handleAcknowledge(c._id)}
                        disabled={ackingId === c._id}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 flex-1 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {ackingId === c._id ? "Confirming..." : "Acknowledge"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Circular Full Reader Modal ────────────────────────────────────── */}
      {activeItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Official School Notice
              </span>
              <button onClick={() => setActiveItem(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-800">{activeItem.circular.title}</h2>
              <p className="text-xs text-slate-400 mt-1">
                Published on {new Date(activeItem.circular.publishedAt || activeItem.circular.createdAt).toLocaleDateString("en-IN", { dateStyle: "full" })}
              </p>
            </div>

            {/* Formatted body */}
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {activeItem.circular.body}
            </div>

            {/* Attachments */}
            {activeItem.circular.attachments?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700">Attached Documents</h4>
                <div className="space-y-1.5">
                  {activeItem.circular.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 hover:bg-indigo-50/50 hover:border-indigo-100 transition-colors text-xs"
                    >
                      <span className="font-semibold text-slate-700">{att.name}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Acknowledgement Status / Action */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {activeItem.circular.requiresAcknowledgement ? (
                activeItem.isAcknowledged ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Acknowledged by you on {new Date(activeItem.acknowledgedAt).toLocaleDateString("en-IN")}
                  </span>
                ) : (
                  <button
                    onClick={() => handleAcknowledge(activeItem.circular._id)}
                    disabled={ackingId === activeItem.circular._id}
                    className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    {ackingId === activeItem.circular._id ? "Saving..." : "Confirm & Acknowledge Receipt"}
                  </button>
                )
              ) : (
                <span className="text-xs text-slate-400">No formal acknowledgement required</span>
              )}

              <button
                onClick={() => setActiveItem(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
