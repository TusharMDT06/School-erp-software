import { useSelector } from "react-redux";
import { LayoutDashboard, Sparkles } from "lucide-react";

/**
 * DashboardPlaceholder
 * ─────────────────────
 * Temporary dashboard page rendered for each role until Phase 2 content is built.
 */
const DashboardPlaceholder = ({ role }) => {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 bg-[#1F4E79]/10 rounded-2xl flex items-center justify-center mb-6">
        <LayoutDashboard className="w-10 h-10 text-[#1F4E79]" />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-amber-400" />
        <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
          Phase 2 — Coming Soon
        </span>
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">
        Welcome, {user?.name}!
      </h2>
      <p className="text-slate-500 max-w-sm">
        You're logged in as <span className="font-semibold text-[#1F4E79] capitalize">{role}</span>. 
        This dashboard content will be built in Phase 2.
      </p>
      <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-left max-w-sm w-full">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Session Info</p>
        <div className="space-y-1 text-sm text-slate-600">
          <p><span className="font-medium">Email:</span> {user?.email}</p>
          <p><span className="font-medium">Role:</span> <span className="capitalize">{user?.role}</span></p>
          <p><span className="font-medium">School ID:</span> {user?.schoolId || "N/A"}</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPlaceholder;
