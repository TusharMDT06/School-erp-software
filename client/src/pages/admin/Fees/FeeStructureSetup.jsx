import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  Layers,
  Loader2,
  CheckCircle2,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { getClassesApi } from "../../../api/classApi";
import {
  createFeeStructure,
  fetchFeeStructuresByClass,
} from "../../../features/fee/feeSlice";

const TERMS = [
  { value: "monthly", label: "Monthly Term" },
  { value: "quarterly", label: "Quarterly Term (3 Months)" },
  { value: "annual", label: "Annual Term (Full Year)" },
];

const DEFAULT_FEE_HEADS = [
  { name: "Tuition Fee", amount: 2500 },
  { name: "Development & Lab Fee", amount: 500 },
];

const FeeStructureSetup = () => {
  const dispatch = useDispatch();
  const { structures, loading, submitting } = useSelector((state) => state.fee);

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-27");
  const [term, setTerm] = useState("monthly");
  const [dueDate, setDueDate] = useState("");
  const [feeHeads, setFeeHeads] = useState(DEFAULT_FEE_HEADS);

  // Load Classes
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await getClassesApi({ limit: 100 });
        const list = res.data?.data || res.data || [];
        setClasses(list);
        if (list.length > 0) {
          setSelectedClassId(list[0]._id);
        }
      } catch (err) {
        toast.error("Failed to load class list.");
      }
    };
    loadClasses();
  }, []);

  // Fetch existing structures when class changes
  useEffect(() => {
    if (selectedClassId) {
      dispatch(fetchFeeStructuresByClass(selectedClassId));
    }
  }, [selectedClassId, dispatch]);

  // Fee Head Row Manipulation
  const handleHeadChange = (index, field, value) => {
    setFeeHeads((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === "amount" ? Number(value) || 0 : value,
      };
      return updated;
    });
  };

  const addFeeHead = () => {
    setFeeHeads((prev) => [...prev, { name: "", amount: 0 }]);
  };

  const removeFeeHead = (index) => {
    if (feeHeads.length <= 1) {
      toast.error("At least one fee head is required.");
      return;
    }
    setFeeHeads((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Live total sum
  const liveTotal = feeHeads.reduce((sum, h) => sum + (Number(h.amount) || 0), 0);

  // Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedClassId) {
      toast.error("Please select a target class.");
      return;
    }

    if (!dueDate) {
      toast.error("Please specify a payment due date.");
      return;
    }

    const invalidHead = feeHeads.find((h) => !h.name.trim() || Number(h.amount) <= 0);
    if (invalidHead) {
      toast.error("All fee heads must have a valid title and positive amount.");
      return;
    }

    try {
      const result = await dispatch(
        createFeeStructure({
          classId: selectedClassId,
          academicYear,
          term,
          feeHeads,
          dueDate,
        })
      ).unwrap();

      toast.success(
        `Fee Structure created! ${result.generatedTransactionsCount} student invoices auto-generated.`
      );
      // Reset form
      setFeeHeads(DEFAULT_FEE_HEADS);
      setDueDate("");
      dispatch(fetchFeeStructuresByClass(selectedClassId));
    } catch (err) {
      toast.error(err || "Failed to create fee structure.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Fee Structure & Invoicing Setup</h2>
        <p className="text-xs text-slate-500 mt-1">
          Define class-wise fee schedules, fee heads, and auto-generate student invoices in bulk.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Creation Form */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-[#1F4E79]/10 text-[#1F4E79] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Create New Fee Schedule</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                >
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      Class {cls.className} - {cls.section} ({cls.academicYear})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2026-27"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Term</label>
                <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                >
                  {TERMS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                />
              </div>
            </div>

            {/* Dynamic Fee Heads Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700">Fee Heads Breakdown</label>
                <button
                  type="button"
                  onClick={addFeeHead}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#1F4E79] hover:text-[#183e60]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Head
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {feeHeads.map((head, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Head Name (e.g. Tuition Fee)"
                      value={head.name}
                      onChange={(e) => handleHeadChange(idx, "name", e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#1F4E79]"
                    />
                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={head.amount}
                        onChange={(e) => handleHeadChange(idx, "amount", e.target.value)}
                        className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-[#1F4E79]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFeeHead(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Remove Head"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Highlight Bar */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl mt-4">
              <span className="text-xs font-semibold text-slate-600">Total Invoice Amount:</span>
              <span className="text-lg font-extrabold text-[#1F4E79]">₹{liveTotal.toLocaleString("en-IN")}</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-[#1F4E79] hover:bg-[#183e60] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Student Invoices...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Save & Generate Invoices for Class
                </>
              )}
            </button>
          </form>
        </div>

        {/* Existing Schedules Table */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Existing Class Fee Schedules</h3>
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#1F4E79]" />
              <p className="text-xs">Loading schedules...</p>
            </div>
          ) : structures.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <p className="text-xs">No fee structures configured for this class yet.</p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
              {structures.map((st) => (
                <div key={st._id} className="p-4 bg-slate-50 border border-slate-200/70 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        {st.term} Term
                      </span>
                      <span className="text-xs text-slate-400 ml-2">({st.academicYear})</span>
                    </div>
                    <span className="text-sm font-extrabold text-[#1F4E79]">
                      ₹{st.totalAmount?.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {st.feeHeads?.map((h, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-medium text-slate-600"
                      >
                        {h.name}: ₹{h.amount}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Due: {new Date(st.dueDate).toLocaleDateString("en-IN")}
                    </span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Invoices Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeeStructureSetup;
