import { useState, useEffect } from "react";
import { Save, Building2, Receipt, QrCode, AlertCircle } from "lucide-react";
import { getFinanceSettingsApi, updateFinanceSettingsApi } from "../../api/accountantApi";
import toast from "react-hot-toast";

export default function FinanceSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFinanceSettingsApi()
      .then((res) => setSettings(res.data))
      .catch(() => toast.error("Failed to load settings."))
      .finally(() => setLoading(false));
  }, []);

  const set = (key, val) => setSettings((prev) => ({ ...prev, [key]: val }));
  const setLateFee = (key, val) =>
    setSettings((prev) => ({ ...prev, lateFee: { ...prev.lateFee, [key]: val } }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateFinanceSettingsApi(settings);
      toast.success("Finance settings saved.");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Finance Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure late fees, UPI, receipt prefix, and more</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* School Info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-rose-600" />
            <h2 className="font-semibold text-slate-700">School Information</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Display Name</label>
              <input value={settings.schoolDisplayName || ""} onChange={(e) => set("schoolDisplayName", e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Phone</label>
              <input value={settings.phone || ""} onChange={(e) => set("phone", e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-slate-600 block mb-1">Address</label>
              <textarea value={settings.address || ""} onChange={(e) => set("address", e.target.value)} rows={2} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none resize-none" />
            </div>
          </div>
        </div>

        {/* Receipt & UPI */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-rose-600" />
            <h2 className="font-semibold text-slate-700">Receipt & UPI</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Receipt Prefix</label>
              <input value={settings.receiptPrefix || "RCPT"} onChange={(e) => set("receiptPrefix", e.target.value.toUpperCase())} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none font-mono" />
              <p className="text-xs text-slate-400 mt-1">E.g. RCPT → RCPT-2026-00001</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1 flex items-center gap-1">
                <QrCode className="w-3 h-3" /> UPI ID
              </label>
              <input value={settings.upiId || ""} onChange={(e) => set("upiId", e.target.value)} placeholder="school@upi" className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none" />
              <p className="text-xs text-slate-400 mt-1">Used for UPI QR generation at counter</p>
            </div>
          </div>
        </div>

        {/* Approval Settings */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="font-semibold text-slate-700 mb-4">Approval Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Expense Approval Threshold (₹)</label>
              <input type="number" value={settings.expenseApprovalThreshold || 0} onChange={(e) => set("expenseApprovalThreshold", Number(e.target.value))} min={0} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none" />
            </div>
            <div className="flex items-center gap-3 mt-4">
              <input
                type="checkbox"
                id="refundApproval"
                checked={settings.refundApprovalRequired ?? true}
                onChange={(e) => set("refundApprovalRequired", e.target.checked)}
                className="accent-rose-600 w-4 h-4"
              />
              <label htmlFor="refundApproval" className="text-sm text-slate-700 font-medium">Refund requires admin approval</label>
            </div>
          </div>
        </div>

        {/* Late Fee */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <h2 className="font-semibold text-slate-700">Late Fee Policy</h2>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="lateFeeEnabled"
              checked={settings.lateFee?.enabled ?? false}
              onChange={(e) => setLateFee("enabled", e.target.checked)}
              className="accent-rose-600 w-4 h-4"
            />
            <label htmlFor="lateFeeEnabled" className="text-sm text-slate-700 font-medium">Enable Late Fee</label>
          </div>
          {settings.lateFee?.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Grace Days</label>
                <input type="number" min={0} value={settings.lateFee?.graceDays ?? 5} onChange={(e) => setLateFee("graceDays", Number(e.target.value))} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Type</label>
                <select value={settings.lateFee?.type || "flat"} onChange={(e) => setLateFee("type", e.target.value)} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none">
                  <option value="flat">Flat (₹ one-time)</option>
                  <option value="per_day">Per Day (₹/day)</option>
                  <option value="percent">Percent (%)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">
                  Value {settings.lateFee?.type === "percent" ? "(%)" : "(₹)"}
                </label>
                <input type="number" min={0} value={settings.lateFee?.value ?? 0} onChange={(e) => setLateFee("value", Number(e.target.value))} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Max Cap (₹, 0 = no cap)</label>
                <input type="number" min={0} value={settings.lateFee?.maxCap ?? 0} onChange={(e) => setLateFee("maxCap", Number(e.target.value))} className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none" />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 text-white font-semibold text-sm rounded-xl hover:bg-rose-700 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
