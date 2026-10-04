import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { logoutUser } from "../../features/auth/authSlice";
import { joinUserRoom, getSocket } from "../../utils/socket";
import toast from "react-hot-toast";
import AIChatWidget from "../ai/AIChatWidget";
import NotificationDropdown from "./NotificationDropdown";
import { getApprovalCountsApi } from "../../api/approvalApi";
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
  ChevronLeft,
  ChevronDown,
  Bell,
  UserCheck,
  AlertCircle,
  AlertTriangle,
  Receipt,
  Award,
  Send,
  BarChart3,
  CalendarCheck,
  Calendar,
  Wallet,
  UserCog,
  RotateCcw,
  CreditCard,
  Building2,
  PieChart,
  Lock,
  History,
  ArrowRightLeft,
  FileText,
  HeartHandshake,
  ShieldAlert,
  Layers,
  HelpCircle,
  MessageSquare,
  UserPlus,
  ListOrdered,
} from "lucide-react";

// ── Nav config per role with logical grouped accordions ───────────────────────
const NAV_ITEMS = {
  admin: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
    { icon: CalendarCheck, label: "Approvals", path: "/admin/approvals", badgeKey: "approvals" },

    // ── Students Group (Matching Photo 1) ──
    {
      icon: Users,
      label: "Students",
      children: [
        { icon: UserPlus, label: "New Admission", path: "/admin/students/admission" },
        { icon: Users, label: "All Students", path: "/admin/students" },
        { icon: ListOrdered, label: "Admissions CRM", path: "/admin/admissions" },
        { icon: HeartHandshake, label: "Student Welfare", path: "/admin/welfare" },
        { icon: CreditCard, label: "ID Card & Gate Pass", path: "/admin/students?action=idcard" },
      ],
    },

    // ── Teachers Group ──
    {
      icon: UserCheck,
      label: "Teachers",
      children: [
        { icon: Users, label: "All Teachers", path: "/admin/teachers" },
        { icon: UserPlus, label: "Add Teacher", path: "/admin/teachers/new" },
        { icon: UserCog, label: "Teacher Attendance", path: "/admin/teachers/attendance" },
        { icon: Wallet, label: "Teacher Salary", path: "/admin/teachers/salary" },
        { icon: UserCheck, label: "Staff Overview", path: "/admin/staff" },
      ],
    },

    // ── Exams & Results Group ──
    {
      icon: Award,
      label: "Exams & Results",
      children: [
        { icon: Award, label: "Exams Setup", path: "/admin/exams" },
        { icon: Send, label: "Publish Results", path: "/admin/exams/publish" },
        { icon: BarChart3, label: "Exam Analytics", path: "/admin/exams/analytics" },
      ],
    },

    // ── Fees & Finance Group ──
    {
      icon: DollarSign,
      label: "Fees & Finance",
      children: [
        { icon: DollarSign, label: "Fee Structures", path: "/admin/fees" },
        { icon: AlertTriangle, label: "Fee Defaulters", path: "/admin/fees/defaulters" },
        { icon: FileText, label: "Financial Reports", path: "/admin/reports" },
      ],
    },

    // ── Academics & Classes Group ──
    {
      icon: BookOpen,
      label: "Academics",
      children: [
        { icon: BookOpen, label: "Classes & Sections", path: "/admin/classes" },
        { icon: ClipboardList, label: "Student Attendance", path: "/admin/attendance" },
        { icon: BarChart3, label: "Academic Overview", path: "/admin/academics" },
      ],
    },

    // ── Campus & Notices Group ──
    {
      icon: Calendar,
      label: "Campus & Notices",
      children: [
        { icon: Calendar, label: "Calendar & Holidays", path: "/admin/calendar" },
        { icon: Send, label: "Circulars", path: "/admin/circulars" },
        { icon: ShieldAlert, label: "Incidents", path: "/admin/incidents" },
      ],
    },

    // ── System & Reports ──
    { icon: FileText, label: "Monthly MIS Reports", path: "/admin/mis-reports" },
    { icon: History, label: "Audit Logs", path: "/admin/audit-logs" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
  ],

  superadmin: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
    { icon: CalendarCheck, label: "Approvals", path: "/admin/approvals", badgeKey: "approvals" },

    // ── Students Group ──
    {
      icon: Users,
      label: "Students",
      children: [
        { icon: UserPlus, label: "New Admission", path: "/admin/students/admission" },
        { icon: Users, label: "All Students", path: "/admin/students" },
        { icon: ListOrdered, label: "Admissions CRM", path: "/admin/admissions" },
        { icon: HeartHandshake, label: "Student Welfare", path: "/admin/welfare" },
        { icon: CreditCard, label: "ID Card & Gate Pass", path: "/admin/students?action=idcard" },
      ],
    },

    // ── Teachers Group ──
    {
      icon: UserCheck,
      label: "Teachers",
      children: [
        { icon: Users, label: "All Teachers", path: "/admin/teachers" },
        { icon: UserPlus, label: "Add Teacher", path: "/admin/teachers/new" },
        { icon: UserCog, label: "Teacher Attendance", path: "/admin/teachers/attendance" },
        { icon: Wallet, label: "Teacher Salary", path: "/admin/teachers/salary" },
        { icon: UserCheck, label: "Staff Overview", path: "/admin/staff" },
      ],
    },

    // ── Exams & Results Group ──
    {
      icon: Award,
      label: "Exams & Results",
      children: [
        { icon: Award, label: "Exams Setup", path: "/admin/exams" },
        { icon: Send, label: "Publish Results", path: "/admin/exams/publish" },
        { icon: BarChart3, label: "Exam Analytics", path: "/admin/exams/analytics" },
      ],
    },

    // ── Fees & Finance Group ──
    {
      icon: DollarSign,
      label: "Fees & Finance",
      children: [
        { icon: DollarSign, label: "Fee Structures", path: "/admin/fees" },
        { icon: AlertTriangle, label: "Fee Defaulters", path: "/admin/fees/defaulters" },
        { icon: FileText, label: "Financial Reports", path: "/admin/reports" },
      ],
    },

    // ── Academics & Classes Group ──
    {
      icon: BookOpen,
      label: "Academics",
      children: [
        { icon: BookOpen, label: "Classes & Sections", path: "/admin/classes" },
        { icon: ClipboardList, label: "Student Attendance", path: "/admin/attendance" },
        { icon: BarChart3, label: "Academic Overview", path: "/admin/academics" },
      ],
    },

    // ── Campus & Notices Group ──
    {
      icon: Calendar,
      label: "Campus & Notices",
      children: [
        { icon: Calendar, label: "Calendar & Holidays", path: "/admin/calendar" },
        { icon: Send, label: "Circulars", path: "/admin/circulars" },
        { icon: ShieldAlert, label: "Incidents", path: "/admin/incidents" },
      ],
    },

    // ── System & Reports ──
    { icon: FileText, label: "Monthly MIS Reports", path: "/admin/mis-reports" },
    { icon: History, label: "Audit Logs", path: "/admin/audit-logs" },
    { icon: Building2, label: "Schools", path: "/admin/schools" },
    { icon: Settings, label: "Settings", path: "/admin/settings" },
  ],

  principal: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/principal/dashboard" },
    { icon: CalendarCheck, label: "Approval Center", path: "/principal/approvals", badgeKey: "approvals" },
    {
      icon: Users,
      label: "Students & Admissions",
      children: [
        { icon: ListOrdered, label: "Admissions CRM", path: "/principal/admissions" },
        { icon: HeartHandshake, label: "Student Welfare", path: "/principal/welfare" },
        { icon: BarChart3, label: "Academics", path: "/principal/academics" },
      ],
    },
    {
      icon: UserCheck,
      label: "Staff & Faculty",
      children: [
        { icon: UserCheck, label: "Staff Overview", path: "/principal/staff" },
      ],
    },
    {
      icon: Calendar,
      label: "Campus Management",
      children: [
        { icon: ShieldAlert, label: "Incidents", path: "/principal/incidents" },
        { icon: Calendar, label: "Academic Calendar", path: "/principal/calendar" },
        { icon: Send, label: "Circulars", path: "/principal/circulars" },
      ],
    },
    { icon: FileText, label: "Monthly MIS Reports", path: "/principal/reports" },
  ],

  teacher: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/teacher/dashboard" },
    {
      icon: Users,
      label: "My Class & Students",
      children: [
        { icon: Users, label: "My Class", path: "/teacher/my-class" },
        { icon: ClipboardList, label: "Attendance", path: "/teacher/attendance" },
        { icon: BookOpen, label: "Homework", path: "/teacher/homework" },
        { icon: Layers, label: "Study Materials", path: "/teacher/materials" },
        { icon: BookOpen, label: "Syllabus & Lesson Plans", path: "/teacher/syllabus" },
      ],
    },
    {
      icon: Award,
      label: "Exams & Assessments",
      children: [
        { icon: Award, label: "Gradebook", path: "/teacher/gradebook" },
        { icon: HelpCircle, label: "Online Quizzes", path: "/teacher/quizzes" },
        { icon: Award, label: "Marks Entry", path: "/teacher/marks" },
      ],
    },
    {
      icon: MessageSquare,
      label: "Parent & Student Connect",
      children: [
        { icon: CalendarCheck, label: "PTM", path: "/teacher/ptm" },
        { icon: MessageSquare, label: "Remarks", path: "/teacher/remarks" },
        { icon: Bell, label: "Notices", path: "/teacher/communication" },
        { icon: Send, label: "Circulars", path: "/circulars" },
      ],
    },
    {
      icon: ArrowRightLeft,
      label: "Timetable & Staff",
      children: [
        { icon: ArrowRightLeft, label: "Timetable & Substitutions", path: "/teacher/substitutions" },
        { icon: Receipt, label: "My Payslips", path: "/teacher/payslips" },
      ],
    },
  ],

  student: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/student/dashboard" },
    {
      icon: BookOpen,
      label: "Academics",
      children: [
        { icon: ClipboardList, label: "My Attendance", path: "/student/attendance" },
        { icon: BookOpen, label: "Homework", path: "/student/homework" },
        { icon: Layers, label: "Study Materials", path: "/student/materials" },
        { icon: HelpCircle, label: "Online Quizzes", path: "/student/quizzes" },
      ],
    },
    {
      icon: Award,
      label: "Performance & Fees",
      children: [
        { icon: Award, label: "My Gradebook", path: "/student/gradebook" },
        { icon: Award, label: "My Results", path: "/student/results" },
        { icon: Receipt, label: "Fee Status", path: "/student/fees" },
      ],
    },
    { icon: Calendar, label: "Calendar", path: "/calendar" },
    { icon: Send, label: "Circulars", path: "/circulars" },
  ],

  parent: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/parent/dashboard" },
    {
      icon: BookOpen,
      label: "Child Progress",
      children: [
        { icon: ClipboardList, label: "Attendance", path: "/parent/attendance" },
        { icon: BookOpen, label: "Homework", path: "/parent/homework" },
        { icon: Award, label: "Exam Results", path: "/parent/results" },
        { icon: MessageSquare, label: "Teacher Remarks", path: "/parent/remarks" },
      ],
    },
    {
      icon: CalendarCheck,
      label: "School Services",
      children: [
        { icon: CalendarCheck, label: "Book PTM", path: "/parent/ptm" },
        { icon: DollarSign, label: "Pay Fees", path: "/parent/fees" },
      ],
    },
    { icon: Calendar, label: "Calendar", path: "/calendar" },
    { icon: Send, label: "Circulars", path: "/circulars" },
  ],

  accountant: [
    { icon: LayoutDashboard, label: "Dashboard", path: "/accountant/dashboard" },
    {
      icon: DollarSign,
      label: "Fee Collection",
      children: [
        { icon: DollarSign, label: "Collect Fee", path: "/accountant/fee-counter" },
        { icon: DollarSign, label: "Fee Structures", path: "/accountant/finance" },
        { icon: Receipt, label: "Concessions", path: "/accountant/concessions" },
        { icon: AlertTriangle, label: "Fee Defaulters", path: "/accountant/fees/defaulters" },
        { icon: RotateCcw, label: "Refunds", path: "/accountant/refunds" },
      ],
    },
    {
      icon: CreditCard,
      label: "Expenses & Budget",
      children: [
        { icon: CreditCard, label: "Expenses", path: "/accountant/expenses" },
        { icon: Building2, label: "Vendors", path: "/accountant/vendors" },
        { icon: PieChart, label: "Budget", path: "/accountant/budget" },
        { icon: Lock, label: "Day Close", path: "/accountant/day-close" },
      ],
    },
    {
      icon: Wallet,
      label: "Payroll & Accounts",
      children: [
        { icon: Wallet, label: "Payroll", path: "/accountant/payroll" },
        { icon: BookOpen, label: "Ledger", path: "/accountant/ledger" },
        { icon: FileText, label: "Financial Reports", path: "/accountant/reports" },
        { icon: ArrowRightLeft, label: "Reconciliation", path: "/accountant/reconciliation" },
      ],
    },
    { icon: History, label: "My Activity", path: "/accountant/my-activity" },
    { icon: Settings, label: "Finance Settings", path: "/accountant/settings" },
  ],
};

const ROLE_COLORS = {
  superadmin: "from-purple-500 to-purple-700",
  admin: "from-[#1F4E79] to-[#2563a8]",
  principal: "from-blue-700 to-indigo-800",
  teacher: "from-emerald-500 to-emerald-700",
  student: "from-sky-500 to-sky-700",
  parent: "from-teal-500 to-teal-700",
  accountant: "from-amber-500 to-amber-700",
};

// ── Desktop Sidebar (Collapsible with Grouped Accordions) ─────────────────────
const DesktopSidebar = ({
  user,
  roleColor,
  navItems,
  isActive,
  onLogout,
  approvalPendingCount = 0,
  collapsed,
  onToggle,
}) => {
  // Check if any child of a item group is active
  const isGroupActive = useCallback(
    (item) => {
      if (!item.children) return false;
      return item.children.some((child) => isActive(child.path));
    },
    [isActive]
  );

  // Maintain open state for accordion groups
  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    navItems.forEach((item) => {
      if (item.children && item.children.some((child) => isActive(child.path))) {
        initial[item.label] = true;
      }
    });
    return initial;
  });

  // Automatically expand group when active child route changes
  useEffect(() => {
    navItems.forEach((item) => {
      if (item.children && isGroupActive(item)) {
        setOpenGroups((prev) => ({
          ...prev,
          [item.label]: true,
        }));
      }
    });
  }, [navItems, isGroupActive]);

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <aside
      className="relative flex flex-col h-full bg-white border-r border-slate-100 select-none overflow-hidden transition-all duration-300 ease-in-out"
      style={{ width: collapsed ? "64px" : "240px" }}
    >
      {/* Header */}
      <div
        className={`bg-gradient-to-r ${roleColor} flex items-center flex-shrink-0 overflow-hidden`}
        style={{ padding: collapsed ? "14px 0" : "14px 14px", justifyContent: collapsed ? "center" : "space-between" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0 overflow-hidden">
              <p className="text-white font-bold text-sm leading-none truncate whitespace-nowrap">School ERP</p>
              <p className="text-white/70 text-xs capitalize mt-0.5 truncate whitespace-nowrap">{user?.role} Portal</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors flex-shrink-0 ml-2"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button (collapsed mode) */}
      {collapsed && (
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full py-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100 flex-shrink-0"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* User info — full */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-[#1F4E79] to-[#2563a8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm border border-slate-200">
              {user?.profileImage ? (
                <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
              ) : user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* User avatar — collapsed */}
      {collapsed && (
        <div className="flex justify-center py-3 border-b border-slate-100 flex-shrink-0">
          <div
            className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-[#1F4E79] to-[#2563a8] flex items-center justify-center text-white font-bold text-sm shadow-sm border border-slate-200"
            title={user?.name}
          >
            {user?.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
            ) : user?.name?.charAt(0)?.toUpperCase()}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ padding: collapsed ? "6px 4px" : "6px 8px" }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;

          // ── ACCORDION GROUP WITH CHILDREN ──
          if (item.children) {
            const groupActive = isGroupActive(item);
            const isOpen = !!openGroups[item.label];

            if (collapsed) {
              // Collapsed mode: icon with flyout popover on hover
              return (
                <div key={item.label} className="relative group mb-1 flex justify-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-xl cursor-pointer transition-colors ${
                      groupActive
                        ? "bg-[#1F4E79] text-white shadow-sm shadow-[#1F4E79]/30"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {groupActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/70 rounded-r-full" />
                    )}
                  </div>

                  {/* Flyout popover on hover */}
                  <div className="absolute left-full top-0 ml-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-100 flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[#1F4E79]" />
                      <p className="text-xs font-bold text-slate-800">{item.label}</p>
                    </div>
                    <div className="py-1 px-1 space-y-0.5 max-h-64 overflow-y-auto">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = isActive(child.path);
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                              childActive
                                ? "bg-blue-50 text-blue-600 font-semibold"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            <ChildIcon className={`w-3.5 h-3.5 flex-shrink-0 ${childActive ? "text-blue-600" : "text-slate-400"}`} />
                            <span className="truncate">{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            // Expanded Desktop Accordion
            return (
              <div key={item.label} className="mb-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(item.label)}
                  className={`w-full flex items-center justify-between rounded-xl text-xs font-semibold px-3 py-2.5 transition-all duration-150 group select-none ${
                    groupActive
                      ? "text-[#1F4E79] bg-slate-50 font-bold"
                      : "text-slate-700 hover:bg-slate-50/80 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        groupActive ? "text-[#1F4E79]" : "text-slate-500 group-hover:text-slate-700"
                      }`}
                    />
                    <span className="truncate text-left">{item.label}</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 flex-shrink-0 ml-1 ${
                      isOpen ? "rotate-0 text-slate-700" : "-rotate-90"
                    }`}
                  />
                </button>

                {/* Submenu Tree — Indented with vertical guide line matching Photo 1 */}
                {isOpen && (
                  <div className="relative ml-4 pl-3 my-1 space-y-0.5 border-l-2 border-slate-200/90 transition-all duration-200">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const active = isActive(child.path);
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 group ${
                            active
                              ? "bg-blue-50 text-blue-600 font-semibold shadow-2xs"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <ChildIcon
                            className={`w-4 h-4 flex-shrink-0 transition-colors ${
                              active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                            }`}
                          />
                          <span className="truncate">{child.label}</span>
                          {child.badgeKey === "approvals" && approvalPendingCount > 0 && (
                            <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-500 text-white">
                              {approvalPendingCount}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // ── SINGLE ITEM (NO CHILDREN) ──
          const active = isActive(item.path);
          return (
            <Link
              key={`${item.path}-${item.label}`}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`relative flex items-center rounded-xl text-xs font-semibold transition-all duration-150 group mb-0.5
                ${collapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-2.5"}
                ${active
                  ? "bg-[#1F4E79] text-white shadow-sm shadow-[#1F4E79]/30"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}
            >
              {/* Active indicator left bar (collapsed mode) */}
              {active && collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/70 rounded-r-full" />
              )}

              <Icon
                className={`flex-shrink-0 transition-transform ${collapsed ? "w-5 h-5" : "w-4 h-4"} ${
                  active ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                }`}
              />

              {!collapsed && (
                <>
                  <span className="truncate flex-1">{item.label}</span>
                  {item.badgeKey === "approvals" && approvalPendingCount > 0 && (
                    <span className={`ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full flex-shrink-0 ${active ? "bg-white text-[#1F4E79]" : "bg-amber-500 text-white"}`}>
                      {approvalPendingCount}
                    </span>
                  )}
                  {active && (!item.badgeKey || approvalPendingCount === 0) && (
                    <ChevronRight className="w-3.5 h-3.5 ml-auto flex-shrink-0" />
                  )}
                </>
              )}

              {/* Badge dot on icon when collapsed */}
              {collapsed && item.badgeKey === "approvals" && approvalPendingCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
              )}

              {/* Tooltip when collapsed */}
              {collapsed && (
                <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
                  {item.label}
                  {item.badgeKey === "approvals" && approvalPendingCount > 0 && (
                    <span className="ml-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{approvalPendingCount}</span>
                  )}
                  <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div
        className="border-t border-slate-100 flex-shrink-0"
        style={{ padding: collapsed ? "6px 4px" : "6px 8px" }}
      >
        <button
          onClick={onLogout}
          title={collapsed ? "Sign Out" : undefined}
          className={`relative flex items-center w-full rounded-xl text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-150 group
            ${collapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-2.5"}`}
        >
          <LogOut className={`flex-shrink-0 text-slate-400 group-hover:text-red-500 ${collapsed ? "w-5 h-5" : "w-4 h-4"}`} />
          {!collapsed && <span>Sign Out</span>}
          {collapsed && (
            <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
              Sign Out
              <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};

/**
 * MobileSidebarContent — Full sidebar for mobile drawer overlay with nested groups
 */
const MobileSidebarContent = ({
  user,
  roleColor,
  navItems,
  isActive,
  onItemClick,
  onLogout,
  onClose,
  approvalPendingCount = 0,
}) => {
  const isGroupActive = useCallback(
    (item) => {
      if (!item.children) return false;
      return item.children.some((child) => isActive(child.path));
    },
    [isActive]
  );

  const [openGroups, setOpenGroups] = useState(() => {
    const initial = {};
    navItems.forEach((item) => {
      if (item.children && item.children.some((child) => isActive(child.path))) {
        initial[item.label] = true;
      }
    });
    return initial;
  });

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <aside className="flex flex-col h-full bg-white border-r border-slate-100 shadow-sm select-none">
      <div className={`p-4 bg-gradient-to-r ${roleColor} flex items-center justify-between`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-none truncate">School ERP</p>
            <p className="text-white/70 text-xs capitalize mt-0.5 truncate">{user?.role} Portal</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors" aria-label="Close menu">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#1F4E79] to-[#2563a8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm border border-slate-200">
            {user?.profileImage ? (
              <img src={user.profileImage} alt={user.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = "none"; }} />
            ) : user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;

          if (item.children) {
            const groupActive = isGroupActive(item);
            const isOpen = !!openGroups[item.label];
            return (
              <div key={item.label} className="mb-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(item.label)}
                  className={`w-full flex items-center justify-between rounded-xl text-xs font-semibold px-3 py-2.5 transition-all duration-150 select-none ${
                    groupActive ? "text-[#1F4E79] bg-slate-50 font-bold" : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${groupActive ? "text-[#1F4E79]" : "text-slate-500"}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-0 text-slate-700" : "-rotate-90"}`}
                  />
                </button>

                {isOpen && (
                  <div className="relative ml-4 pl-3 my-1 space-y-0.5 border-l-2 border-slate-200/90">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const active = isActive(child.path);
                      return (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={onItemClick}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                            active
                              ? "bg-blue-50 text-blue-600 font-semibold shadow-2xs"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <ChildIcon className={`w-4 h-4 flex-shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`} />
                          <span className="truncate">{child.label}</span>
                          {child.badgeKey === "approvals" && approvalPendingCount > 0 && (
                            <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-500 text-white">
                              {approvalPendingCount}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = isActive(item.path);
          return (
            <Link
              key={`${item.path}-${item.label}`}
              to={item.path}
              onClick={onItemClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group
                ${active ? "bg-[#1F4E79] text-white shadow-sm shadow-[#1F4E79]/30" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"}`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`} />
              <span className="truncate">{item.label}</span>
              {item.badgeKey === "approvals" && approvalPendingCount > 0 && (
                <span className={`ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full ${active ? "bg-white text-[#1F4E79]" : "bg-amber-500 text-white"}`}>{approvalPendingCount}</span>
              )}
              {active && (!item.badgeKey || approvalPendingCount === 0) && (
                <ChevronRight className="w-3.5 h-3.5 ml-auto flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-100 flex-shrink-0">
        <button onClick={onLogout} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-150 group">
          <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

// ── Mobile Sidebar (Full drawer) ───────────────────────────────────────────────

const DashboardLayout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [approvalCount, setApprovalCount] = useState(0);

  const navItems = NAV_ITEMS[user?.role] || NAV_ITEMS.admin;
  const roleColor = ROLE_COLORS[user?.role] || ROLE_COLORS.admin;

  // Fetch pending approval counts for badge (principal, admin, superadmin)
  useEffect(() => {
    if (["principal", "admin", "superadmin"].includes(user?.role)) {
      getApprovalCountsApi()
        .then((res) => {
          const total = res.data?.data?.totalPending || res.data?.totalPending || 0;
          setApprovalCount(total);
        })
        .catch(() => {});
    }
  }, [user?.role, location.pathname]);

  // Auto-close mobile sidebar whenever route location changes
  useEffect(() => {
    setMobileSidebarOpen(false);
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

  // Universal isActive check for all role portals including nested queries
  const isActive = useCallback(
    (path) => {
      if (!path) return false;
      // If target path has query param, e.g. /admin/students?action=new
      if (path.includes("?")) {
        const [targetPath, targetQuery] = path.split("?");
        if (location.pathname !== targetPath) return false;
        const currentParams = new URLSearchParams(location.search);
        const targetParams = new URLSearchParams(targetQuery);
        let matches = true;
        targetParams.forEach((val, key) => {
          if (currentParams.get(key) !== val) matches = false;
        });
        return matches;
      }

      // If current URL has an action query param (e.g. ?action=new), a generic path without query shouldn't also be active
      if (location.search && location.search.includes("action=")) {
        return false;
      }

      if (location.pathname === path) return true;
      // Do not do startsWith matching on dashboard routes to avoid highlighting dashboard on sub-pages
      if (path.endsWith("/dashboard")) return false;
      return location.pathname.startsWith(`${path}/`);
    },
    [location.pathname, location.search]
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar — collapsible, hidden on mobile */}
      <div className="hidden lg:flex flex-col flex-shrink-0 transition-all duration-300" style={{ width: desktopCollapsed ? "64px" : "240px" }}>
        <DesktopSidebar
          user={user}
          roleColor={roleColor}
          navItems={navItems}
          isActive={isActive}
          onLogout={handleLogout}
          approvalPendingCount={approvalCount}
          collapsed={desktopCollapsed}
          onToggle={() => setDesktopCollapsed((v) => !v)}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-200 ease-out">
            <MobileSidebarContent
              user={user}
              roleColor={roleColor}
              navItems={navItems}
              isActive={isActive}
              onItemClick={() => setMobileSidebarOpen(false)}
              onLogout={handleLogout}
              onClose={() => setMobileSidebarOpen(false)}
              approvalPendingCount={approvalCount}
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
              onClick={() => setMobileSidebarOpen(true)}
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
            <NotificationDropdown />
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

      {/* AI Chat Widget â€” available to all roles */}
      <AIChatWidget />
    </div>
  );
};

export default DashboardLayout;

