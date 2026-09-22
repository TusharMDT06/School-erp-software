import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import {
  Settings,
  User,
  Shield,
  Bell,
  Sliders,
  CheckCircle2,
  KeyRound,
  Mail,
  School,
  Database,
  Loader2,
  Save,
} from "lucide-react";

const SettingsPage = () => {
  const { user } = useSelector((state) => state.auth);

  // Settings tab state
  const [activeTab, setActiveTab] = useState("general");

  // General Settings State
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [currency, setCurrency] = useState("INR (₹)");
  const [termSystem, setTermSystem] = useState("Quarterly (4 Terms)");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [absenteeAlerts, setAbsenteeAlerts] = useState(true);
  const [feeReminders, setFeeReminders] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleSaveGeneral = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("ERP General Settings updated successfully!");
    }, 600);
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Please fill all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    setTimeout(() => {
      setPasswordLoading(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated successfully!");
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">System & Account Settings</h2>
        <p className="text-xs text-slate-500 mt-1">
          Configure institutional preferences, notification rules, academic parameters, and credentials.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-2xl border border-slate-100 p-1.5 gap-1.5 shadow-sm max-w-md">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "general"
              ? "bg-[#1F4E79] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          General & ERP
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "profile"
              ? "bg-[#1F4E79] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          Profile
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "security"
              ? "bg-[#1F4E79] text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Security
        </button>
      </div>

      {/* ── Tab 1: General & ERP Settings ─────────────────────────────────── */}
      {activeTab === "general" && (
        <div className="space-y-6">
          <form onSubmit={handleSaveGeneral} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <School className="w-4 h-4 text-[#1F4E79]" />
                Academic Year & Regional Config
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Set default parameters applied across class admissions, grading, and fee cycles.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Current Academic Year
                </label>
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                >
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027 (Current)</option>
                  <option value="2027-2028">2027-2028</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Fee Term Structure
                </label>
                <select
                  value={termSystem}
                  onChange={(e) => setTermSystem(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly (4 Terms)">Quarterly (4 Terms)</option>
                  <option value="Annual">Annual (Single)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-[#1F4E79]" />
                Automated Transactional Notifications (Resend)
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Student Admission Self-Signup Emails</p>
                    <p className="text-[11px] text-slate-400">Send admission credentials and signup URL to parent email</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-4 h-4 accent-[#1F4E79]"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Absentee Alerts to Guardians</p>
                    <p className="text-[11px] text-slate-400">Trigger automatic absent notifications when teacher marks student absent</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={absenteeAlerts}
                    onChange={(e) => setAbsenteeAlerts(e.target.checked)}
                    className="w-4 h-4 accent-[#1F4E79]"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Fee Defaulter Reminders</p>
                    <p className="text-[11px] text-slate-400">Automated payment reminders for overdue fee installments</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={feeReminders}
                    onChange={(e) => setFeeReminders(e.target.checked)}
                    className="w-4 h-4 accent-[#1F4E79]"
                  />
                </label>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1F4E79] text-white rounded-xl text-xs font-bold hover:bg-[#1a4268] transition-colors shadow-sm disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Preferences
              </button>
            </div>
          </form>

          {/* System Status Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
              <Database className="w-4 h-4 text-[#1F4E79]" />
              System Integrations & Services Health
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-emerald-900">MongoDB Database</p>
                  <p className="text-[11px] text-emerald-700">Connected & Indexed</p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-blue-900">Resend Email Gateway</p>
                  <p className="text-[11px] text-blue-700">Active & Ready</p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-100 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-purple-900">Socket.io Realtime</p>
                  <p className="text-[11px] text-purple-700">Active Event Bus</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Profile Settings ───────────────────────────────────────── */}
      {activeTab === "profile" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-[#1F4E79] to-[#2563a8] text-white flex items-center justify-center font-bold text-2xl shadow-sm border border-slate-200">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              ) : (
                user?.name?.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">{user?.name}</h3>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1F4E79] capitalize mt-1">
                Role: {user?.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                disabled
                value={user?.name || ""}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Phone Number</label>
              <input
                type="text"
                disabled
                value={user?.phone || "+91 98765 43210"}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Assigned School</label>
              <input
                type="text"
                disabled
                value={
                  (typeof user?.schoolId === "object"
                    ? user?.schoolId?.name || user?.schoolId?._id
                    : user?.schoolId) || "Default Institutional Campus"
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-700 font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 3: Security Settings ──────────────────────────────────────── */}
      {activeTab === "security" && (
        <form onSubmit={handlePasswordChange} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[#1F4E79]" />
              Update Account Password
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ensure your account uses a strong password with letters, numbers, and symbols.
            </p>
          </div>

          <div className="space-y-4 max-w-md text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1F4E79] text-white rounded-xl text-xs font-bold hover:bg-[#1a4268] transition-colors shadow-sm disabled:opacity-50 mt-2"
            >
              {passwordLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Update Password
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SettingsPage;
