import React, { useState, useEffect } from "react";
import { MessageSquare, Award, Clock, User, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { getParentChildrenApi } from "../../api/parentPortalApi";
import { getParentRemarksApi } from "../../api/remarksApi";

const REMARK_TYPES = {
  positive: { label: "Positive Appreciation", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  academic: { label: "Academic Progress", color: "bg-blue-100 text-blue-800 border-blue-300" },
  behavior: { label: "Conduct & Behavior", color: "bg-amber-100 text-amber-800 border-amber-300" },
  concern: { label: "Teacher Note / Concern", color: "bg-rose-100 text-rose-800 border-rose-300" },
};

const ChildRemarks = () => {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [remarks, setRemarks] = useState([]);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchRemarks(selectedChildId);
    }
  }, [selectedChildId]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const res = await getParentChildrenApi();
      const childList = res.data?.data?.children || res.data?.data || [];
      setChildren(childList);
      if (childList.length > 0) {
        setSelectedChildId(childList[0]._id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load children list.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRemarks = async (childId) => {
    try {
      setLoading(true);
      const res = await getParentRemarksApi(childId);
      if (res.data?.success) {
        setRemarks(res.data.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load child remarks.");
    } finally {
      setLoading(false);
    }
  };

  const selectedChild = children.find((c) => c._id === selectedChildId);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Parent Portal
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Teacher Remarks & Feedback</h1>
          <p className="text-sm text-slate-600">
            Observations, positive appreciation, and academic notes shared by your child's teachers.
          </p>
        </div>

        {/* Child Selector */}
        {children.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-700">Child:</label>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {children.map((ch) => (
                <option key={ch._id} value={ch._id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Remarks Content */}
      <div className="my-6 max-w-3xl">
        {loading ? (
          <div className="bg-white rounded-xl p-12 text-center text-slate-400 border border-slate-200">
            Loading teacher remarks...
          </div>
        ) : remarks.length === 0 ? (
          <div className="bg-white rounded-xl p-16 text-center text-slate-400 border border-slate-200 shadow-sm">
            <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <h3 className="font-semibold text-slate-700 text-base">No Shared Remarks Yet</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Any teacher feedback or positive appreciations shared with parents will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {remarks.map((r) => {
              const typeConfig = REMARK_TYPES[r.type] || REMARK_TYPES.positive;

              return (
                <div
                  key={r._id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${typeConfig.color}`}
                    >
                      {typeConfig.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </span>
                  </div>

                  <p className="text-sm text-slate-800 leading-relaxed font-sans">{r.text}</p>

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
                    <span>
                      Shared by <strong>{r.teacherId?.userId?.name || "Teacher"}</strong>
                      {r.teacherId?.subjects && r.teacherId.subjects.length > 0
                        ? ` (${r.teacherId.subjects.join(", ")})`
                        : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChildRemarks;
