import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  DollarSign,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
} from "lucide-react";
import {
  getVendorsApi,
  createVendorApi,
  updateVendorApi,
  deleteVendorApi,
} from "../../api/expenseApi";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

const fmt = (paise) =>
  "₹" + ((paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });

export default function Vendors() {
  const { user } = useSelector((s) => s.auth);
  const canManage = ["admin", "superadmin", "accountant"].includes(user?.role);

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  // Modal for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    gstin: "",
    isActive: true,
  });

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (activeFilter) params.isActive = activeFilter;
      const res = await getVendorsApi(params);
      setVendors(res.data || []);
    } catch {
      toast.error("Failed to load vendors.");
    } finally {
      setLoading(false);
    }
  }, [search, activeFilter]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setForm({
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      gstin: "",
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (v) => {
    setEditingVendor(v);
    setForm({
      name: v.name || "",
      contactPerson: v.contactPerson || "",
      phone: v.phone || "",
      email: v.email || "",
      address: v.address || "",
      gstin: v.gstin || "",
      isActive: v.isActive ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Vendor name is required.");

    setSaving(true);
    try {
      if (editingVendor) {
        await updateVendorApi(editingVendor._id, form);
        toast.success("Vendor updated successfully.");
      } else {
        await createVendorApi(form);
        toast.success("Vendor created successfully.");
      }
      setModalOpen(false);
      loadVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save vendor.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDeactivate = async (vendor) => {
    const action = vendor.isActive ? "deactivate" : "reactivate";
    if (
      !window.confirm(
        `Are you sure you want to ${action} "${vendor.name}"? (No vendor records are hard-deleted)`
      )
    ) {
      return;
    }

    try {
      if (vendor.isActive) {
        await deleteVendorApi(vendor._id);
        toast.success(`Vendor "${vendor.name}" deactivated.`);
      } else {
        await updateVendorApi(vendor._id, { isActive: true });
        toast.success(`Vendor "${vendor.name}" reactivated.`);
      }
      loadVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} vendor.`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-rose-600" />
            Vendor Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage school service providers, utility contractors, suppliers, and track total payouts.
          </p>
        </div>
        {canManage && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Add Vendor
          </button>
        )}
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by vendor name, contact, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
        >
          <option value="">All Statuses</option>
          <option value="true">Active Only</option>
          <option value="false">Deactivated Only</option>
        </select>
      </div>

      {/* ── Vendor Cards / Table ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No vendors found</p>
            <p className="text-xs text-slate-400 mt-1">
              Add vendors to assign invoices and record purchases.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3.5 px-4">Vendor Name</th>
                  <th className="py-3.5 px-4">Contact Person</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">GSTIN</th>
                  <th className="py-3.5 px-4 text-right">Total Paid</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {vendors.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div>{v.name}</div>
                      {v.address && (
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 font-normal">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-xs">{v.address}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {v.contactPerson || <span className="text-slate-400 italic">Not set</span>}
                    </td>
                    <td className="py-3 px-4 space-y-1">
                      {v.phone && (
                        <div className="text-xs text-slate-600 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {v.phone}
                        </div>
                      )}
                      {v.email && (
                        <div className="text-xs text-slate-600 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          {v.email}
                        </div>
                      )}
                      {!v.phone && !v.email && (
                        <span className="text-xs text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs uppercase text-slate-600">
                      {v.gstin || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
                        {fmt(v.totalPaid)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          v.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {v.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      {canManage && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(v)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Edit vendor"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleDeactivate(v)}
                            className={`p-1.5 rounded-lg transition ${
                              v.isActive
                                ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={v.isActive ? "Deactivate (soft delete)" : "Reactivate"}
                          >
                            {v.isActive ? (
                              <Trash2 className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in-50 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-rose-600" />
                {editingVendor ? "Edit Vendor" : "Add New Vendor"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Stationers & Books"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Sharma"
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="vendor@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="07AAAAA0000A1Z5"
                    value={form.gstin}
                    onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl uppercase focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Address</label>
                <textarea
                  rows={2}
                  placeholder="Shop #, Street, City, State..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {editingVendor && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-slate-700">
                    Vendor is active
                  </label>
                </div>
              )}

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium shadow-md transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingVendor ? "Update Vendor" : "Create Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
