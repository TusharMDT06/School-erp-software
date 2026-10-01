import { useEffect, useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Calendar,
  FileText,
  AlertTriangle,
  BookOpen,
  DollarSign,
  UserCheck,
  Users,
  BarChart3,
  Sparkles,
  Inbox,
  Clock,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getMyNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  deleteNotificationApi,
  clearAllNotificationsApi,
} from "../../api/notificationApi";
import { getSocket, joinUserRoom } from "../../utils/socket";

// Helper to format relative time
const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
};

// Map notification type to icon and accent colors
const getNotificationTypeMeta = (type) => {
  switch (type) {
    case "holiday_declared":
    case "event_published":
    case "event_updated":
    case "event_cancelled":
      return {
        icon: Calendar,
        bg: "bg-sky-50 text-sky-600 border-sky-100",
        path: "/calendar",
      };
    case "circular_published":
    case "circular_reminder":
      return {
        icon: FileText,
        bg: "bg-purple-50 text-purple-600 border-purple-100",
        path: "/circulars",
      };
    case "monthly_report_ready":
      return {
        icon: BarChart3,
        bg: "bg-indigo-50 text-indigo-600 border-indigo-100",
        path: "/principal/reports",
      };
    case "student_at_risk":
    case "incident_parent_notified":
    case "remark_escalated":
      return {
        icon: AlertTriangle,
        bg: "bg-rose-50 text-rose-600 border-rose-100",
        path: "/principal/welfare",
      };
    case "homework_assigned":
    case "homework_due_reminder":
    case "homework_reviewed":
    case "homework_digest":
      return {
        icon: BookOpen,
        bg: "bg-amber-50 text-amber-600 border-amber-100",
        path: "/homework",
      };
    case "fee_payment":
    case "expense_approval_needed":
    case "expense_decision":
    case "payroll_approved":
      return {
        icon: DollarSign,
        bg: "bg-emerald-50 text-emerald-600 border-emerald-100",
        path: "/fees",
      };
    case "inquiry_assigned":
    case "inquiry_followup_due":
      return {
        icon: Users,
        bg: "bg-teal-50 text-teal-600 border-teal-100",
        path: "/principal/admissions",
      };
    case "attendance_correction":
    case "absentee_notice":
      return {
        icon: UserCheck,
        bg: "bg-blue-50 text-blue-600 border-blue-100",
        path: "/attendance",
      };
    default:
      return {
        icon: Bell,
        bg: "bg-slate-100 text-slate-600 border-slate-200",
        path: null,
      };
  }
};

const NotificationDropdown = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasNewAlert, setHasNewAlert] = useState(false);

  const dropdownRef = useRef(null);

  // Fetch notifications from server
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await getMyNotificationsApi();
      if (res?.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.warn("Failed to load notifications:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?._id) {
      fetchNotifications();
      joinUserRoom(user._id);

      // Listen for incoming real-time socket notifications
      const socket = getSocket();
      const onNotification = (notif) => {
        setNotifications((prev) => [
          {
            _id: notif._id || `temp-${Date.now()}`,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            data: notif.data,
            isRead: false,
            createdAt: notif.createdAt || new Date(),
          },
          ...prev,
        ]);
        setUnreadCount((prev) => prev + 1);
        setHasNewAlert(true);

        // Toast alert for real-time notification
        toast(
          (t) => (
            <div className="flex items-start gap-2.5">
              <Bell className="w-4 h-4 text-[#1F4E79] flex-shrink-0 mt-0.5 animate-bounce" />
              <div>
                <p className="text-xs font-semibold text-slate-800">{notif.title}</p>
                {notif.message && (
                  <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                    {notif.message}
                  </p>
                )}
              </div>
            </div>
          ),
          {
            duration: 4000,
            position: "top-right",
            style: {
              borderRadius: "12px",
              background: "#fff",
              color: "#333",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              border: "1px solid #e2e8f0",
              padding: "10px 14px",
            },
          }
        );
      };

      socket.on("notification", onNotification);

      return () => {
        socket.off("notification", onNotification);
      };
    }
  }, [user?._id]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    setHasNewAlert(false);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  // Mark single notification as read
  const handleMarkAsRead = async (notif) => {
    if (notif.isRead) return;
    try {
      await markNotificationReadApi(notif._id);
      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notif._id ? { ...item, isRead: true, readAt: new Date() } : item
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn("Failed to mark notification as read:", err.message);
    }
  };

  // Click on notification item
  const handleItemClick = async (notif) => {
    await handleMarkAsRead(notif);
    const meta = getNotificationTypeMeta(notif.type);
    const targetUrl = notif.data?.url || meta.path;

    if (targetUrl) {
      setIsOpen(false);
      navigate(targetUrl);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await markAllNotificationsReadApi();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true, readAt: new Date() }))
      );
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error("Failed to mark all as read");
    }
  };

  // Delete single notification
  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteNotificationApi(id);
      const target = notifications.find((n) => n._id === id);
      if (target && !target.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
      setNotifications((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      toast.error("Failed to delete notification");
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    if (notifications.length === 0) return;
    try {
      await clearAllNotificationsApi();
      setNotifications([]);
      setUnreadCount(0);
      toast.success("Notifications cleared");
    } catch (err) {
      toast.error("Failed to clear notifications");
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20 ${
          isOpen ? "bg-slate-100 text-[#1F4E79]" : ""
        }`}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell
          className={`w-5 h-5 transition-transform duration-200 ${
            hasNewAlert ? "animate-wiggle text-[#1F4E79]" : ""
          } ${isOpen ? "scale-105" : ""}`}
        />

        {/* Dynamic Badge for unread count */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 rounded-full ring-2 ring-white shadow-xs animate-in zoom-in-50 duration-200">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden transform origin-top-right transition-all animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800">Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1F4E79] hover:text-[#163755] px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Notifications Scroll List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-50">
            {loading && notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-300 border-t-[#1F4E79] rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading updates...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-100">
                  <Inbox className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No notifications</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">
                  You are all caught up! New alerts and updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const meta = getNotificationTypeMeta(notif.type);
                const IconComponent = meta.icon;

                return (
                  <div
                    key={notif._id}
                    onClick={() => handleItemClick(notif)}
                    className={`group relative px-4 py-3.5 flex items-start gap-3 cursor-pointer transition-all duration-150 ${
                      notif.isRead
                        ? "bg-white hover:bg-slate-50/80 text-slate-600"
                        : "bg-blue-50/30 hover:bg-blue-50/60 text-slate-900"
                    }`}
                  >
                    {/* Category Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-2xs mt-0.5 ${meta.bg}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-5">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className={`text-xs leading-snug truncate ${
                            notif.isRead ? "font-medium text-slate-700" : "font-semibold text-slate-900"
                          }`}
                        >
                          {notif.title}
                        </p>
                      </div>

                      {notif.message && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {notif.message}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatTimeAgo(notif.createdAt)}
                        </span>

                        {!notif.isRead && (
                          <span className="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full" />
                        )}
                      </div>
                    </div>

                    {/* Delete hover action */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteNotification(e, notif._id)}
                      className="absolute right-3 top-3.5 opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                      title="Remove notification"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-100 text-center">
              <span className="text-[11px] text-slate-400">
                School ERP Real-time Notifications
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
