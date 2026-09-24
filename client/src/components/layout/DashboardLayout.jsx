import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { logoutUser } from "../../features/auth/authSlice";
import { joinUserRoom, getSocket } from "../../utils/socket";
import toast from "react-hot-toast";
import AIChatWidget from "../ai/AIChatWidget";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  UserCheck,
  AlertCircle,
  AlertTriangle,
  Receipt,
  Award,
  Send,
  BarChart3,
  Sparkles,
} from "lucide-react";

// ── Nav config per role ────────────────────────────────────────────────────
const NAV_ITEMS = {
  admin: [
    { icon: LayoutDashboard, label: "Dashboard",       path: "/admin/dashboard" },
    { icon: GraduationCap,   label: "Students",        path: "/admin/students" },
    { icon: UserCheck,       label: "Teachers",        path: "/admin/teachers" },
    { icon: BookOpen,        label: "Classes",         path: "/admin/classes" },
    { icon: ClipboardList,   label: "Attendance",      path: "/admin/attendance" },
    { icon: DollarSign,      label: "Fee Structures",  path: "/admin/fees" },
    { icon: AlertTriangle,   label: "Fee Defaulters",  path: "/admin/fees/defaulters" },
    { icon: Award,           label: "Exams Setup",     path: "/admin/exams" },
    { icon: Send,            label: "Publish Results", path: "/admin/exams/publish" },
    { icon: BarChart3,       label: "Exam Analytics",  path: "/admin/exams/analytics" },
    { icon: Settings,        label: "Settings",        path: "/admin/settings" },
  ],
  superadmin: [
    { icon: LayoutDashboard, label: "Dashboard",       path: "/admin/dashboard" },
    { icon: GraduationCap,   label: "Students",        path: "/admin/students" },
    { icon: UserCheck,       label: "Teachers",        path: "/admin/teachers" },
    { icon: BookOpen,        label: "Classes",         path: "/admin/classes" },
    { icon: ClipboardList,   label: "Attendance",      path: "/admin/attendance" },
    { icon: DollarSign,      label: "Fee Structures",  path: "/admin/fees" },
    { icon: AlertTriangle,   label: "Fee Defaulters",  path: "/admin/fees/defaulters" },
    { icon: Award,           label: "Exams Setup",     path: "/admin/exams" },
    { icon: Send,            label: "Publish Results", path: "/admin/exams/publish" },
    { icon: BarChart3,       label: "Exam Analytics",  path: "/admin/exams/analytics" },
    { icon: Users,           label: "Schools",         path: "/admin/schools" },
    { icon: Settings,        label: "Settings",        path: "/admin/settings" },
  ],
  teacher: [
    { icon: LayoutDashboard, label: "Dashboard",       path: "/teacher/dashboard" },
    { icon: GraduationCap,   label: "My Students",     path: "/teacher/students" },
    { icon: ClipboardList,   label: "Attendance",      path: "/teacher/attendance" },
    { icon: Award,           label: "Marks Entry",     path: "/teacher/marks" },
    { icon: BookOpen,        label: "Classes",         path: "/teacher/classes" },
  ],
  student: [
    { icon: LayoutDashboard, label: "Dashboard",       path: "/student/dashboard" },
    { icon: ClipboardList,   label: "My Attendance",   path: "/student/attendance" },
    { icon: Award,           label: "My Results",      path: "/student/results" },
    { icon: Receipt,         label: "Fee Status",      path: "/student/fees" },
  ],
  parent: [
    { icon: LayoutDashboard, label: "Dashboard",       path: "/parent/dashboard" },
    { icon: ClipboardList,   label: "Attendance",      path: "/parent/attendance" },
    { icon: Award,           label: "Exam Results",    path: "/parent/results" },
    { icon: DollarSign,      label: "Pay Fees",        path: "/parent/fees" },
  ],
  accountant: [
    { icon: LayoutDashboard, label: "Dashboard",       path: "/accountant/dashboard" },
    { icon: DollarSign,      label: "Fee Structures",  path: "/accountant/finance" },
    { icon: AlertTriangle,   label: "Defaulters",      path: "/accountant/fees/defaulters" },
  ],
};

const ROLE_COLORS = {
  superadmin: "from-purple-500 to-purple-700",
  admin: "from-[#1F4E79] to-[#2563a8]",
  teacher: "from-emerald-500 to-emerald-700",
  student: "from-sky-500 to-sky-700",
  parent: "from-amber-500 to-amber-700",
  accountant: "from-rose-500 to-rose-700",
};

/**
 * SidebarContent — Stable module-level component so it is never recreated during renders.
 */
const SidebarContent = ({
  user,
  roleColor,
  navItems,
  isActive,
  onItemClick,
  onLogout,
  onClose,
  isMobile = false,
}) => (
  <aside className="flex flex-col h-full bg-white border-r border-slate-100 shadow-sm select-none">
    {/* Header / Logo */}
    <div className={`p-4 lg:p-5 bg-gradient-to-r ${roleColor} flex items-center justify-between`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-none truncate">School ERP</p>
          <p className="text-white/70 text-xs capitalize mt-0.5 truncate">{user?.role} Portal</p>
        </div>
      </div>
      {isMobile && (
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>

    {/* User info */}
    <div className="p-4 border-b border-slate-100 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#1F4E79] to-[#2563a8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm border border-slate-200">
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
            user?.name?.charAt(0)?.toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
        </div>
      </div>
    </div>

    {/* Navigation */}
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group
              ${active
                ? "bg-[#1F4E79] text-white shadow-sm shadow-[#1F4E79]/30"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
          >
            <Icon
              className={`w-4 h-4 flex-shrink-0 ${
                active ? "text-white" : "text-slate-400 group-hover:text-slate-600"
              }`}
            />
            <span className="truncate">{item.label}</span>
            {active && <ChevronRight className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
          </Link>
        );
      })}
    </nav>

    {/* Logout */}
    <div className="p-3 border-t border-slate-100 flex-shrink-0">
      <button
        onClick={onLogout}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-150 group"
      >
        <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
        Sign Out
      </button>
    </div>
  </aside>
);

const DashboardLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = NAV_ITEMS[user?.role] || NAV_ITEMS.admin;
  const roleColor = ROLE_COLORS[user?.role] || ROLE_COLORS.admin;

  // Auto-close mobile sidebar whenever route location changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Real-time Socket.io room joining & live alerts (absentee, fees, and results published)
  useEffect(() => {
    if (user?.id) {
      joinUserRoom(user.id);
      const socket = getSocket();

      // 1. Absentee alert
      const handleAbsentNotification = (data) => {
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
              } max-w-sm w-full bg-white shadow-xl rounded-2xl border-l-4 border-rose-500 p-4 border border-slate-100 transition-all duration-200 flex items-start gap-3 pointer-events-auto`}
            >
              <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  Attendance Alert
                </p>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed font-medium">
                  {data.message || `${data.studentName} was marked absent.`}
                </p>
                <p className="mt-1.5 text-[10px] text-slate-400">{data.date}</p>
              </div>
              <button
                type="button"
                onClick={() => toast.dismiss(t.id)}
                className="text-slate-400 hover:text-slate-600 text-base leading-none p-1"
              >
                &times;
              </button>
            </div>
          ),
          { duration: 9000, position: "top-right" }
        );
      };

      // 2. Fee payment notification
      const handleFeePaidNotification = (data) => {
        if (["admin", "superadmin", "accountant"].includes(user?.role)) {
          toast.success(
            `💰 Fee Paid: ₹${data.amount?.toLocaleString("en-IN")} received from ${data.studentName} (${data.receiptNumber})`,
            { duration: 6000, position: "bottom-right" }
          );
        }
      };

      // 3. Results published notification
      const handleResultsPublished = (data) => {
        toast.custom(
          (t) => (
            <div
              className={`${
                t.visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
              } max-w-sm w-full bg-white shadow-xl rounded-2xl border-l-4 border-emerald-500 p-4 border border-slate-100 transition-all duration-200 flex items-start gap-3 pointer-events-auto`}
            >
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Award className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Results Published!
                </p>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed font-medium">
                  {data.examName} results are live! Score: <strong>{data.percentage}% ({data.grade})</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => toast.dismiss(t.id)}
                className="text-slate-400 hover:text-slate-600 text-base leading-none p-1"
              >
                &times;
              </button>
            </div>
          ),
          { duration: 8000, position: "top-right" }
        );
      };

      socket.on("attendance:absent", handleAbsentNotification);
      socket.on("fee:paid", handleFeePaidNotification);
      socket.on("results:published", handleResultsPublished);

      return () => {
        socket.off("attendance:absent", handleAbsentNotification);
        socket.off("fee:paid", handleFeePaidNotification);
        socket.off("results:published", handleResultsPublished);
      };
    }
  }, [user]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    toast.success("Logged out successfully.");
    navigate("/login", { replace: true });
  };

  // Universal isActive check for all role portals
  const isActive = useCallback(
    (path) => {
      if (location.pathname === path) return true;
      // Do not do startsWith matching on dashboard routes to avoid highlighting dashboard on sub-pages
      if (path.endsWith("/dashboard")) return false;
      return location.pathname.startsWith(`${path}/`);
    },
    [location.pathname]
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar (hidden on mobile/tablet) */}
      <div className="hidden lg:flex lg:w-64 lg:flex-shrink-0 flex-col">
        <SidebarContent
          user={user}
          roleColor={roleColor}
          navItems={navItems}
          isActive={isActive}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop (z-40) */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel (z-50) */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-200 ease-out">
            <SidebarContent
              user={user}
              roleColor={roleColor}
              navItems={navItems}
              isActive={isActive}
              onItemClick={() => setSidebarOpen(false)}
              onLogout={handleLogout}
              onClose={() => setSidebarOpen(false)}
              isMobile={true}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-100 px-4 lg:px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors flex-shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-slate-800 capitalize truncate">
                {location.pathname.split("/").filter(Boolean).join(" › ")}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-[#1F4E79] to-[#2563a8] flex items-center justify-center text-white font-bold text-xs shadow-sm ring-2 ring-slate-100">
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
                user?.name?.charAt(0)?.toUpperCase()
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* AI Chat Widget — available to all roles */}
      <AIChatWidget />
    </div>
  );
};

export default DashboardLayout;
