import React, { useState, useEffect } from "react";
import {
  Clock,
  MessageSquare,
  Bell,
  Save,
  CheckCircle,
  FileText,
  Send,
  Plus,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  getTeacherPreferenceApi,
  updateTeacherPreferenceApi,
  getNoticeTemplatesApi,
  createClassNoticeApi,
  getMyClassNoticesApi,
} from "../../api/communicationApi";
import { getTeacherClassesAndSubjectsApi } from "../../api/teacherApi";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const CommunicationSettings = () => {
  const [activeTab, setActiveTab] = useState("office_hours");
  const [loading, setLoading] = useState(true);

  // Preference States
  const [officeHours, setOfficeHours] = useState([]);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [autoReplyText, setAutoReplyText] = useState("");
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Notice / Templates States
  const [templates, setTemplates] = useState([]);
  const [notices, setNotices] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [reqAck, setReqAck] = useState(false);
  const [postingNotice, setPostingNotice] = useState(false);

  useEffect(() => {
    fetchPreferences();
    fetchTemplatesAndNotices();
    fetchClasses();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const res = await getTeacherPreferenceApi();
      if (res.data?.success) {
        const pref = res.data.data;
        setOfficeHours(pref.officeHours || []);
        setAutoReplyEnabled(Boolean(pref.autoReplyEnabled));
        setAutoReplyText(pref.autoReplyText || "");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load preferences.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplatesAndNotices = async () => {
    try {
      const [tRes, nRes] = await Promise.all([
        getNoticeTemplatesApi(),
        getMyClassNoticesApi(),
      ]);
      if (tRes.data?.success) setTemplates(tRes.data.data || []);
      if (nRes.data?.success) setNotices(nRes.data.data || []);
    } catch (e) {}
  };

  const fetchClasses = async () => {
    try {
      const res = await getTeacherClassesAndSubjectsApi();
      if (res.data?.success) {
        const clsList = res.data.data.classes || [];
        setClasses(clsList);
        if (clsList.length > 0) setSelectedClassId(clsList[0]._id);
      }
    } catch (e) {}
  };

  const handleHourChange = (dayIndex, field, value) => {
    const updated = [...officeHours];
    updated[dayIndex] = { ...updated[dayIndex], [field]: value };
    setOfficeHours(updated);
  };

  const handleSavePreferences = async () => {
    try {
      setSavingPrefs(true);
      const res = await updateTeacherPreferenceApi({
        officeHours,
        autoReplyEnabled,
        autoReplyText,
      });
      if (res.data?.success) {
        toast.success("Office hours and auto-reply preferences updated!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save preferences.");
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSelectTemplate = (templateKey) => {
    const tmpl = templates.find((t) => t.key === templateKey);
    if (tmpl) {
      setNoticeTitle(tmpl.title);
      setNoticeBody(tmpl.template);
    }
  };

  const handlePostNotice = async (e) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeBody.trim() || !selectedClassId) {
      toast.error("Please fill in title, message, and target class.");
      return;
    }

    try {
      setPostingNotice(true);
      const res = await createClassNoticeApi({
        title: noticeTitle.trim(),
        body: noticeBody.trim(),
        classId: selectedClassId,
        requiresAcknowledgement: reqAck,
      });

      if (res.data?.success) {
        toast.success("Class notice posted successfully!");
        setNoticeTitle("");
        setNoticeBody("");
        fetchTemplatesAndNotices();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post class notice.");
    } finally {
      setPostingNotice(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
            Communication Controls
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            Office Hours & Class Announcements
          </h1>
          <p className="text-sm text-slate-600">
            Configure consultation hours, automated parent replies, and broadcast notices to your classes.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("office_hours")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "office_hours"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Office Hours & Auto-Reply
          </button>
          <button
            onClick={() => setActiveTab("class_notices")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === "class_notices"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Class Notices & Announcements
          </button>
        </div>
      </div>

      {/* ── Tab 1: Office Hours & Auto-Reply ─────────────────────────────────── */}
      {activeTab === "office_hours" && (
        <div className="my-6 max-w-3xl space-y-6">
          {/* Schedule Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Weekly Office Hours</h3>
              <p className="text-xs text-slate-500">
                Parents will see these hours on their consultation screen. Outside these hours, auto-replies are triggered.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {officeHours.map((slot, idx) => (
                <div key={slot.day || idx} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="w-28 font-semibold text-slate-800 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(slot.enabled)}
                      onChange={(e) => handleHourChange(idx, "enabled", e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span>{slot.day}</span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-600">
                    <input
                      type="time"
                      disabled={!slot.enabled}
                      value={slot.start || "08:30"}
                      onChange={(e) => handleHourChange(idx, "start", e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-mono disabled:opacity-40"
                    />
                    <span>to</span>
                    <input
                      type="time"
                      disabled={!slot.enabled}
                      value={slot.end || "16:00"}
                      onChange={(e) => handleHourChange(idx, "end", e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 font-mono disabled:opacity-40"
                    />
                  </div>

                  <span
                    className={`text-[11px] font-medium ${
                      slot.enabled ? "text-emerald-700" : "text-slate-400"
                    }`}
                  >
                    {slot.enabled ? "Active" : "Closed"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-reply Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Automated Off-Hours Reply</h3>
              <p className="text-xs text-slate-500">
                Protects teacher personal time by replying automatically once per day per conversation when a message arrives outside scheduled hours.
              </p>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={autoReplyEnabled}
                onChange={(e) => setAutoReplyEnabled(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="font-semibold">Enable Automated Out-of-Hours Reply</span>
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Auto-Reply Message Text
              </label>
              <textarea
                rows="3"
                value={autoReplyText}
                onChange={(e) => setAutoReplyText(e.target.value)}
                placeholder="Thank you for your message. I am currently outside my office hours..."
                className="w-full p-3 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={savingPrefs}
                onClick={handleSavePreferences}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingPrefs ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Class Notices & Announcements ────────────────────────────── */}
      {activeTab === "class_notices" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-6">
          {/* Post Notice Form */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Broadcast Class Notice</h3>
              <p className="text-xs text-slate-500">
                Post notices to your own classes. Visible to principal in circular records (max 5/day).
              </p>
            </div>

            {/* Template Quick Loader */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Quick Reusable Template
              </label>
              <select
                onChange={(e) => handleSelectTemplate(e.target.value)}
                defaultValue=""
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="" disabled>
                  Select a template to load...
                </option>
                {templates.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <form onSubmit={handlePostNotice} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Class
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.className}-{c.section}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Notice Title
                </label>
                <input
                  type="text"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="e.g. Unit Test Tomorrow or Homework Reminder"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Message Content
                </label>
                <textarea
                  rows="4"
                  value={noticeBody}
                  onChange={(e) => setNoticeBody(e.target.value)}
                  placeholder="Detailed announcement content..."
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reqAck}
                  onChange={(e) => setReqAck(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="font-medium">Require Parent Acknowledgement</span>
              </label>

              <button
                type="submit"
                disabled={postingNotice}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {postingNotice ? "Posting..." : "Broadcast Notice to Class"}
              </button>
            </form>
          </div>

          {/* Past Class Notices */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Published Class Announcements</h3>
            {notices.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center text-slate-400 border border-slate-200">
                No class announcements posted yet.
              </div>
            ) : (
              notices.map((n) => (
                <div
                  key={n._id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-900 text-sm">{n.title}</span>
                    <span className="text-slate-400">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-sans">{n.body}</p>
                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Audience:{" "}
                      {n.classIds?.map((c) => `${c.className}-${c.section}`).join(", ") ||
                        "Class"}
                    </span>
                    {n.requiresAcknowledgement && (
                      <span className="text-indigo-600 font-semibold">
                        Acknowledgement Required
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationSettings;
