import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Plus,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Upload,
  AlertCircle,
  Eye,
  ExternalLink,
  DollarSign,
  Building2,
  Calendar,
  X,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  getExpensesApi,
  createExpenseApi,
  payExpenseApi,
  cancelExpenseApi,
  getCategoriesApi,
  getVendorsApi,
  createVendorApi,
} from "../../api/expenseApi";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

const fmt = (paise) =>
  "₹" + ((paise || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const STATUS_BADGE = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  pending_approval: "bg-amber-100 text-amber-800 border-amber-300",
  approved: "bg-blue-100 text-blue-800 border-blue-300",
  rejected: "bg-rose-100 text-rose-800 border-rose-300",
  paid: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

export default function Expenses() {
  const { user } = useSelector((s) => s.auth);
  const canManage = ["admin", "superadmin", "accountant"].includes(user?.role);

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  // Drawer / Modal states
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [previewBillUrl, setPreviewBillUrl] = useState(null);

  // Quick Add Vendor modal
  const [quickVendorOpen, setQuickVendorOpen] = useState(false);
  const [quickVendorName, setQuickVendorName] = useState("");
  const [quickVendorPhone, setQuickVendorPhone] = useState("");

  // Duplicate prompt modal
  const [duplicateModal, setDuplicateModal] = useState({
    isOpen: false,
    message: "",
    pendingPayload: null,
  });

  // Form state
  const [form, setForm] = useState({
    title: "",
    categoryId: "",
    vendorId: "",
    amountRupees: "",
    expenseDate: new Date().toISOString().split("T")[0],
    paymentMode: "cash",
    billNumber: "",
    description: "",
    file: null,
    filePreview: null,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter !== "all") params.status = statusFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (vendorFilter) params.vendorId = vendorFilter;
      if (search) params.search = search;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [expRes, catRes, venRes] = await Promise.all([
        getExpensesApi(params),
        getCategoriesApi({ isActive: true }),
        getVendorsApi({ isActive: true }),
      ]);

      setExpenses(expRes.data?.expenses || []);
      setTotal(expRes.data?.pagination?.total || 0);
      setCategories(catRes.data || []);
      setVendors(venRes.data || []);
    } catch {
      toast.error("Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, vendorFilter, search, startDate, endDate, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle file select
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    setForm((prev) => ({
      ...prev,
      file,
      filePreview: isImage ? URL.createObjectURL(file) : null,
    }));
  };

  // Submit expense
  const handleSubmit = async (e, confirmDuplicate = false) => {
    if (e) e.preventDefault();

    if (!form.title.trim()) return toast.error("Expense title is required.");
    if (!form.categoryId) return toast.error("Please select a category.");
    if (!form.amountRupees || Number(form.amountRupees) <= 0) {
      return toast.error("Please enter a valid amount.");
    }

    const amountPaise = Math.round(Number(form.amountRupees) * 100);

    const formData = new FormData();
    formData.append("title", form.title.trim());
    formData.append("categoryId", form.categoryId);
    if (form.vendorId) formData.append("vendorId", form.vendorId);
    formData.append("amount", amountPaise);
    formData.append("expenseDate", form.expenseDate);
    formData.append("paymentMode", form.paymentMode);
    if (form.billNumber) formData.append("billNumber", form.billNumber.trim());
    if (form.description) formData.append("description", form.description.trim());
    if (form.file) formData.append("bill", form.file);
    if (confirmDuplicate) formData.append("confirmDuplicate", "true");

    try {
      await createExpenseApi(formData);
      toast.success(
        amountPaise > 1000000 // default or settings threshold
          ? "Expense submitted and sent for admin approval."
          : "Expense created and approved!"
      );
      setDrawerOpen(false);
      setDuplicateModal({ isOpen: false, message: "", pendingPayload: null });
      setForm({
        title: "",
        categoryId: "",
        vendorId: "",
        amountRupees: "",
        expenseDate: new Date().toISOString().split("T")[0],
        paymentMode: "cash",
        billNumber: "",
        description: "",
        file: null,
        filePreview: null,
      });
      loadData();
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.duplicateDetected) {
        setDuplicateModal({
          isOpen: true,
          message: err.response.data.message,
          pendingPayload: formData,
        });
      } else {
        toast.error(err.response?.data?.message || "Failed to create expense.");
      }
    }
  };

  // Quick add vendor
  const handleQuickAddVendor = async (e) => {
    e.preventDefault();
    if (!quickVendorName.trim()) return toast.error("Vendor name is required.");
    try {
      const res = await createVendorApi({
        name: quickVendorName.trim(),
        phone: quickVendorPhone.trim(),
      });
      toast.success(`Vendor "${res.data.name}" added.`);
      setVendors((prev) => [...prev, res.data]);
      setForm((prev) => ({ ...prev, vendorId: res.data._id }));
      setQuickVendorOpen(false);
      setQuickVendorName("");
      setQuickVendorPhone("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add vendor.");
    }
  };

  // Pay expense
  const handlePay = async (id) => {
    if (!window.confirm("Are you sure you want to mark this expense as PAID? This will post an outflow entry to the ledger.")) {
      return;
    }
    setPayingId(id);
    try {
      await payExpenseApi(id);
      toast.success("Expense marked as paid and posted to ledger.");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark as paid.");
    } finally {
      setPayingId(null);
    }
  };

  // Cancel expense
  const handleCancel = async (id) => {
    const reason = window.prompt("Reason for cancelling this expense:");
    if (reason === null) return;
    setCancellingId(id);
    try {
      await cancelExpenseApi(id, { reason });
      toast.success("Expense cancelled.");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel expense.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-rose-600" />
            Expense Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track day-to-day school operational expenditures, bills, and payment vouchers.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        )}
      </div>

      {/* ── Filters Bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search title, bill..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
        >
          <option value="all">All Statuses</option>
          <option value="pending_approval">Awaiting Approval</option>
          <option value="approved">Approved (Unpaid)</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected / Cancelled</option>
          <option value="draft">Draft</option>
        </select>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Vendor filter */}
        <select
          value={vendorFilter}
          onChange={(e) => {
            setVendorFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
        >
          <option value="">All Vendors</option>
          {vendors.map((v) => (
            <option key={v._id} value={v._id}>
              {v.name}
            </option>
          ))}
        </select>

        {/* Start Date */}
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
          title="From date"
        />

        {/* End Date */}
        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
          title="To date"
        />
      </div>

      {/* ── Table of Expenses ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-16 px-4">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No expenses found</p>
            <p className="text-xs text-slate-400 mt-1">
              Try adjusting your filters or click &ldquo;Add Expense&rdquo; to create a new one.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Expense Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Vendor</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Bill</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {expenses.map((exp) => (
                  <tr key={exp._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{exp.title}</div>
                      {exp.billNumber && (
                        <div className="text-xs text-slate-400">Bill #: {exp.billNumber}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium">
                        {exp.categoryId?.name || "Uncategorized"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {exp.vendorId?.name ? (
                        <span className="text-slate-800 font-medium">{exp.vendorId.name}</span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(exp.expenseDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 uppercase text-xs font-semibold text-slate-500">
                      {exp.paymentMode}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {fmt(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {exp.billUrl ? (
                        <a
                          href={exp.billUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium underline"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View
                        </a>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          STATUS_BADGE[exp.status] || "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {exp.status === "pending_approval" && (
                          <Clock className="w-3 h-3 mr-1 inline animate-pulse" />
                        )}
                        {exp.status === "pending_approval"
                          ? "Awaiting admin approval"
                          : exp.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      {exp.status === "approved" && canManage && (
                        <button
                          onClick={() => handlePay(exp._id)}
                          disabled={payingId === exp._id}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
                        >
                          {payingId === exp._id ? "Posting..." : "Mark as paid"}
                        </button>
                      )}
                      {["draft", "pending_approval", "approved"].includes(exp.status) && canManage && (
                        <button
                          onClick={() => handleCancel(exp._id)}
                          disabled={cancellingId === exp._id}
                          className="px-2 py-1 text-slate-400 hover:text-rose-600 text-xs transition"
                          title="Cancel Expense"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Expense Drawer / Modal ───────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-rose-600" />
                  New Operational Expense
                </h2>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form id="expenseForm" onSubmit={(e) => handleSubmit(e, false)} className="mt-5 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Expense Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Science Lab Chemicals, Diesel for Bus 4"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                {/* Category & Vendor */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-600">Vendor</label>
                      <button
                        type="button"
                        onClick={() => setQuickVendorOpen(true)}
                        className="text-xs text-rose-600 hover:underline font-medium"
                      >
                        + Quick Add
                      </button>
                    </div>
                    <select
                      value={form.vendorId}
                      onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    >
                      <option value="">No vendor (Internal)</option>
                      {vendors.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Amount (Rupees) & Mode */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Amount (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={form.amountRupees}
                        onChange={(e) => setForm({ ...form, amountRupees: e.target.value })}
                        className="w-full pl-7 pr-3 py-2 text-sm font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Payment Mode *
                    </label>
                    <select
                      required
                      value={form.paymentMode}
                      onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    >
                      <option value="cash">Cash</option>
                      <option value="bank">Bank / Cheque</option>
                      <option value="online">Online / UPI</option>
                    </select>
                  </div>
                </div>

                {/* Date & Bill Number */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Expense Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={form.expenseDate}
                      onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Bill / Invoice #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. INV-2025-098"
                      value={form.billNumber}
                      onChange={(e) => setForm({ ...form, billNumber: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Notes / Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief description or purpose..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                {/* Bill upload with preview */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Upload Bill / Receipt
                  </label>
                  <div className="border-2 border-dashed border-slate-300 hover:border-rose-400 rounded-xl p-4 text-center cursor-pointer transition relative">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    {form.filePreview ? (
                      <div className="space-y-2">
                        <img
                          src={form.filePreview}
                          alt="Bill preview"
                          className="max-h-36 mx-auto rounded-lg shadow-sm border border-slate-200"
                        />
                        <p className="text-xs text-slate-600 font-medium">{form.file?.name}</p>
                      </div>
                    ) : form.file ? (
                      <div className="flex items-center justify-center gap-2 text-slate-700">
                        <FileText className="w-6 h-6 text-rose-600" />
                        <span className="text-xs font-medium">{form.file.name}</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                        <p className="text-xs text-slate-600">Click or drag bill receipt here</p>
                        <p className="text-[10px] text-slate-400">PDF, JPG, PNG up to 10MB</p>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="expenseForm"
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium shadow-md transition"
              >
                Save Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Add Vendor Modal ───────────────────────────────────────────── */}
      {quickVendorOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-rose-600" />
              Quick Add Vendor
            </h3>
            <form onSubmit={handleQuickAddVendor} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Stationers"
                  value={quickVendorName}
                  onChange={(e) => setQuickVendorName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={quickVendorPhone}
                  onChange={(e) => setQuickVendorPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickVendorOpen(false)}
                  className="flex-1 py-2 text-sm border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium"
                >
                  Add Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Duplicate Guard Modal ────────────────────────────────────────────── */}
      {duplicateModal.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="w-8 h-8 shrink-0" />
              <h3 className="text-lg font-bold text-slate-800">Duplicate Expense Warning</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{duplicateModal.message}</p>
            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() =>
                  setDuplicateModal({ isOpen: false, message: "", pendingPayload: null })
                }
                className="flex-1 py-2.5 text-sm border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium"
              >
                Review & Edit
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(null, true)}
                className="flex-1 py-2.5 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-medium shadow-md"
              >
                Confirm Duplicate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
