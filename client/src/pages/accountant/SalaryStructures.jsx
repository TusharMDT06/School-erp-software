import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  DollarSign,
  TrendingUp,
  Percent,
  Calendar,
  User,
} from "lucide-react";
import {
  getSalaryStructuresApi,
  getEligibleStaffUsersApi,
  createSalaryStructureApi,
  updateSalaryStructureApi,
  deactivateSalaryStructureApi,
} from "../../api/payrollApi";

const fmt = (paise) =>
  "₹" + ((paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100);
const toRupees = (paise) => ((paise || 0) / 100).toString();

const SalaryStructures = () => {
  const [structures, setStructures] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("true");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    staffUserId: "",
    staffRole: "teacher",
    basic: "", // in rupees
    allowances: [{ name: "HRA", amount: "" }], // amount in rupees
    deductions: [{ name: "Provident Fund", type: "percent_of_basic", value: "12" }],
    effectiveFrom: new Date().toISOString().split("T")[0],
    isActive: true,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (activeFilter !== "all") params.isActive = activeFilter;
      if (search) params.search = search;

      const [resStruct, resStaff] = await Promise.all([
        getSalaryStructuresApi(params),
        getEligibleStaffUsersApi(),
      ]);

      setStructures(resStruct.data || []);
      setStaffUsers(resStaff.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load salary structures.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [roleFilter, activeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      staffUserId: "",
      staffRole: "teacher",
      basic: "",
      allowances: [
        { name: "HRA", amount: "" },
        { name: "Dearness Allowance", amount: "" },
      ],
      deductions: [
        { name: "Provident Fund", type: "percent_of_basic", value: "12" },
        { name: "Professional Tax", type: "fixed", value: "200" },
      ],
      effectiveFrom: new Date().toISOString().split("T")[0],
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingId(s._id);
    setFormData({
      staffUserId: s.staffUserId?._id || s.staffUserId,
      staffRole: s.staffRole,
      basic: toRupees(s.basic),
      allowances: (s.allowances || []).map((a) => ({
        name: a.name,
        amount: toRupees(a.amount),
      })),
      deductions: (s.deductions || []).map((d) => ({
        name: d.name,
        type: d.type,
        value: d.type === "fixed" ? toRupees(d.value) : String(d.value),
      })),
      effectiveFrom: s.effectiveFrom
        ? new Date(s.effectiveFrom).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      isActive: s.isActive,
    });
    setModalOpen(true);
  };

  const handleDeactivate = async (id, staffName) => {
    if (!window.confirm(`Are you sure you want to deactivate the salary structure for ${staffName}?`)) {
      return;
    }
    try {
      await deactivateSalaryStructureApi(id);
      toast.success("Salary structure deactivated.");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to deactivate structure.");
    }
  };

  // Dynamic rows helpers
  const addAllowanceRow = () => {
    setFormData((prev) => ({
      ...prev,
      allowances: [...prev.allowances, { name: "", amount: "" }],
    }));
  };

  const removeAllowanceRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      allowances: prev.allowances.filter((_, i) => i !== index),
    }));
  };

  const updateAllowance = (index, field, value) => {
    setFormData((prev) => {
      const next = [...prev.allowances];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, allowances: next };
    });
  };

  const addDeductionRow = () => {
    setFormData((prev) => ({
      ...prev,
      deductions: [...prev.deductions, { name: "", type: "fixed", value: "" }],
    }));
  };

  const removeDeductionRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      deductions: prev.deductions.filter((_, i) => i !== index),
    }));
  };

  const updateDeduction = (index, field, value) => {
    setFormData((prev) => {
      const next = [...prev.deductions];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, deductions: next };
    });
  };

  // Live estimated calculation in modal
  const basicRupees = Number(formData.basic || 0);
  const allowancesTotalRupees = formData.allowances.reduce(
    (sum, a) => sum + Number(a.amount || 0),
    0
  );
  const grossRupees = basicRupees + allowancesTotalRupees;
  const deductionsTotalRupees = formData.deductions.reduce((sum, d) => {
    if (d.type === "percent_of_basic") {
      return sum + (basicRupees * Number(d.value || 0)) / 100;
    }
    return sum + Number(d.value || 0);
  }, 0);
  const netEstimatedRupees = Math.max(0, grossRupees - deductionsTotalRupees);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.staffUserId) {
      return toast.error("Please select a staff member.");
    }
    if (!formData.basic || Number(formData.basic) < 0) {
      return toast.error("Please enter a valid basic salary.");
    }

    setSaving(true);
    try {
      const payload = {
        staffUserId: formData.staffUserId,
        staffRole: formData.staffRole,
        basic: toPaise(formData.basic),
        allowances: formData.allowances
          .filter((a) => a.name && Number(a.amount) >= 0)
          .map((a) => ({ name: a.name.trim(), amount: toPaise(a.amount) })),
        deductions: formData.deductions
          .filter((d) => d.name && Number(d.value) >= 0)
          .map((d) => ({
            name: d.name.trim(),
            type: d.type,
            value: d.type === "fixed" ? toPaise(d.value) : Number(d.value),
          })),
        effectiveFrom: formData.effectiveFrom,
        isActive: formData.isActive,
      };

      if (editingId) {
        await updateSalaryStructureApi(editingId, payload);
        toast.success("Salary structure updated successfully!");
      } else {
        await createSalaryStructureApi(payload);
        toast.success("Salary structure created successfully!");
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save salary structure.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-indigo-600" />
            Salary Structures
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure employee compensation plans, allowances, and statutory deductions.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-sm transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Salary Structure
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by staff name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Roles</option>
              <option value="teacher">Teacher</option>
              <option value="accountant">Accountant</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
            <option value="all">All Status</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-sm">Loading salary structures...</p>
          </div>
        ) : structures.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Wallet className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-slate-600">No salary structures found</p>
            <p className="text-sm mt-1">Click "Add Salary Structure" to define compensation for your staff.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-right">Basic Pay</th>
                  <th className="px-6 py-4">Allowances</th>
                  <th className="px-6 py-4">Deductions</th>
                  <th className="px-6 py-4 text-right">Est. Gross / Net</th>
                  <th className="px-6 py-4">Effective From</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {structures.map((s) => {
                  const staff = s.staffUserId || {};
                  const allowTotal = (s.allowances || []).reduce((sum, a) => sum + (a.amount || 0), 0);
                  const gross = (s.basic || 0) + allowTotal;
                  const dedTotal = (s.deductions || []).reduce((sum, d) => {
                    if (d.type === "percent_of_basic") {
                      return sum + Math.round(((s.basic || 0) * (d.value || 0)) / 100);
                    }
                    return sum + (d.value || 0);
                  }, 0);
                  const estNet = Math.max(0, gross - dedTotal);

                  return (
                    <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{staff.name || "N/A"}</div>
                        <div className="text-xs text-slate-400">{staff.email || "No email"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="capitalize px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {s.staffRole}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-800">
                        {fmt(s.basic)}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {s.allowances?.length ? (
                          <div>
                            <span className="font-medium text-slate-700">{fmt(allowTotal)}</span>
                            <span className="text-slate-400 ml-1">({s.allowances.length} items)</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {s.deductions?.length ? (
                          <div>
                            <span className="font-medium text-slate-700">{fmt(dedTotal)}</span>
                            <span className="text-slate-400 ml-1">({s.deductions.length} rules)</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="text-xs text-slate-500">Gross: {fmt(gross)}</div>
                        <div className="font-bold text-emerald-600">{fmt(estNet)}</div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {s.effectiveFrom ? new Date(s.effectiveFrom).toLocaleDateString("en-IN") : "—"}
                      </td>
                      <td className="px-6 py-4">
                        {s.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Structure"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {s.isActive && (
                            <button
                              onClick={() => handleDeactivate(s._id, staff.name)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Deactivate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Wallet className="w-6 h-6 text-indigo-600" />
                {editingId ? "Edit Salary Structure" : "New Salary Structure"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Employee Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                    Select Staff Member *
                  </label>
                  <select
                    disabled={!!editingId}
                    value={formData.staffUserId}
                    onChange={(e) => {
                      const selected = staffUsers.find((u) => u._id === e.target.value);
                      setFormData((prev) => ({
                        ...prev,
                        staffUserId: e.target.value,
                        staffRole: selected ? selected.role : prev.staffRole,
                      }));
                    }}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Choose Employee --</option>
                    {staffUsers.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.role}) - {u.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                    Staff Role
                  </label>
                  <input
                    type="text"
                    value={formData.staffRole}
                    onChange={(e) => setFormData({ ...formData, staffRole: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
                    placeholder="e.g. teacher, accountant"
                  />
                </div>
              </div>

              {/* Basic Salary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                    Basic Monthly Salary (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      placeholder="e.g. 35000"
                      value={formData.basic}
                      onChange={(e) => setFormData({ ...formData, basic: e.target.value })}
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1.5">
                    Effective From
                  </label>
                  <input
                    type="date"
                    value={formData.effectiveFrom}
                    onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Allowances Section */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Allowances & Perquisites
                  </span>
                  <button
                    type="button"
                    onClick={addAllowanceRow}
                    className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Allowance
                  </button>
                </div>

                <div className="space-y-2.5">
                  {formData.allowances.map((allow, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Allowance Name (e.g. HRA, Medical)"
                        value={allow.name}
                        onChange={(e) => updateAllowance(idx, "name", e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="relative w-36">
                        <span className="absolute left-3 top-2 text-slate-400 font-semibold text-xs">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Amount"
                          value={allow.amount}
                          onChange={(e) => updateAllowance(idx, "amount", e.target.value)}
                          className="w-full pl-6 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAllowanceRow(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formData.allowances.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No allowances added.</p>
                  )}
                </div>
              </div>

              {/* Deductions Section */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Percent className="w-4 h-4 text-rose-600" />
                    Deductions & Withholding
                  </span>
                  <button
                    type="button"
                    onClick={addDeductionRow}
                    className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Deduction
                  </button>
                </div>

                <div className="space-y-2.5">
                  {formData.deductions.map((ded, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Deduction Name (e.g. PF, Tax)"
                        value={ded.name}
                        onChange={(e) => updateDeduction(idx, "name", e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <select
                        value={ded.type}
                        onChange={(e) => updateDeduction(idx, "type", e.target.value)}
                        className="w-36 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="percent_of_basic">% of Basic</option>
                        <option value="fixed">Fixed ₹</option>
                      </select>
                      <div className="relative w-28">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder={ded.type === "fixed" ? "₹" : "%"}
                          value={ded.value}
                          onChange={(e) => updateDeduction(idx, "value", e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDeductionRow(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formData.deductions.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No deductions configured.</p>
                  )}
                </div>
              </div>

              {/* Live Preview Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div>
                  <div className="text-xs text-slate-400 uppercase">Basic</div>
                  <div className="text-sm font-semibold text-slate-700 mt-0.5">₹{basicRupees.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase">Gross Salary</div>
                  <div className="text-sm font-semibold text-slate-700 mt-0.5">₹{grossRupees.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase">Total Ded.</div>
                  <div className="text-sm font-semibold text-rose-600 mt-0.5">-₹{deductionsTotalRupees.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 uppercase">Est. Net Pay</div>
                  <div className="text-sm font-bold text-emerald-600 mt-0.5">₹{netEstimatedRupees.toLocaleString()}</div>
                </div>
              </div>

              {/* Status active checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                  Active Structure (Used in Payroll calculations)
                </label>
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? "Update Structure" : "Save Structure"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryStructures;
