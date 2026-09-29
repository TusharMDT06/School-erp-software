import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronRight,
  RefreshCw,
  FileText,
  CalendarCheck,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  getPTMEventsApi,
  getPTMEventByIdApi,
  getPTMSlotsApi,
  bookPTMSlotApi,
  cancelPTMSlotApi,
} from "../../api/ptmApi";
import { getParentChildrenApi } from "../../api/parentPortalApi";

const PTMBooking = () => {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [eventDetails, setEventDetails] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingSlotId, setBookingSlotId] = useState(null);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    try {
      setLoading(true);
      // 1. Fetch children
      const childRes = await getParentChildrenApi();
      const childList = childRes.data?.data?.children || childRes.data?.data || [];
      setChildren(childList);

      let firstChildId = "";
      if (childList.length > 0) {
        firstChildId = childList[0]._id;
        setSelectedChildId(firstChildId);
      }

      // 2. Fetch PTM events
      const eventsRes = await getPTMEventsApi({ status: "open" });
      const eventList = eventsRes.data?.data || [];
      setEvents(eventList);

      if (eventList.length > 0) {
        const firstEventId = eventList[0]._id;
        setSelectedEventId(firstEventId);
        fetchEventDetails(firstEventId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to initialize PTM booking.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEventDetails = async (eventId) => {
    try {
      setSlotsLoading(true);
      const res = await getPTMEventByIdApi(eventId);
      if (res.data?.success) {
        setEventDetails(res.data.data);
        const teachers = res.data.data.teachers || [];
        if (teachers.length > 0) {
          setSelectedTeacherId(teachers[0]._id);
          fetchSlots(eventId, teachers[0]._id);
        } else {
          setSlots([]);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load event details.");
    } finally {
      setSlotsLoading(false);
    }
  };

  const fetchSlots = async (eventId, teacherId) => {
    if (!eventId) return;
    try {
      setSlotsLoading(true);
      const res = await getPTMSlotsApi(eventId, { teacherId });
      if (res.data?.success) {
        setSlots(res.data.data || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load slots.");
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleBookSlot = async (slotId) => {
    if (!selectedChildId) {
      toast.error("Please select a child first.");
      return;
    }

    try {
      setBookingSlotId(slotId);
      const res = await bookPTMSlotApi(slotId, { studentId: selectedChildId });
      if (res.data?.success) {
        toast.success("Meeting slot booked successfully!");
        fetchSlots(selectedEventId, selectedTeacherId);
      }
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error("Slot was just taken by another parent. Please choose another slot.");
      } else {
        toast.error(err.response?.data?.message || "Failed to book slot.");
      }
      fetchSlots(selectedEventId, selectedTeacherId);
    } finally {
      setBookingSlotId(null);
    }
  };

  const handleCancelSlot = async (slotId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;

    try {
      const res = await cancelPTMSlotApi(slotId, { reason: "Parent requested cancellation." });
      if (res.data?.success) {
        toast.success("Appointment cancelled successfully.");
        fetchSlots(selectedEventId, selectedTeacherId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel slot.");
    }
  };

  const selectedChild = children.find((c) => c._id === selectedChildId);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200">
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          Parent Portal
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">
          Parent-Teacher Meeting (PTM) Booking
        </h1>
        <p className="text-sm text-slate-600">
          Reserve 1-on-1 appointment slots with your child's teachers and review meeting notes.
        </p>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        {/* Child Selector */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            1. Select Child
          </label>
          <select
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
          >
            {children.map((ch) => (
              <option key={ch._id} value={ch._id}>
                {ch.name} (Class: {ch.classId?.className}-{ch.classId?.section})
              </option>
            ))}
          </select>
        </div>

        {/* PTM Event Selector */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            2. PTM Conference
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => {
              setSelectedEventId(e.target.value);
              fetchEventDetails(e.target.value);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
          >
            {events.map((ev) => (
              <option key={ev._id} value={ev._id}>
                {ev.title} ({new Date(ev.date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        {/* Teacher Selector */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            3. Select Teacher
          </label>
          <select
            value={selectedTeacherId}
            onChange={(e) => {
              setSelectedTeacherId(e.target.value);
              fetchSlots(selectedEventId, e.target.value);
            }}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
          >
            {(eventDetails?.teachers || []).map((t) => (
              <option key={t._id} value={t._id}>
                {t.userId?.name} ({t.subjects?.join(", ") || "Teacher"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Slots Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-100 gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Available Meeting Slots</h3>
            <p className="text-xs text-slate-500">
              Each slot is {eventDetails?.event?.slotMinutes || 10} minutes. One slot per teacher
              per student.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-600" />
              Your Appointment
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-300" />
              Unavailable
            </span>
          </div>
        </div>

        {slotsLoading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            Loading time slots...
          </div>
        ) : slots.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            No meeting slots configured for this teacher in the selected conference.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {slots.map((slot) => {
              const isOpen = slot.status === "open";
              const isMine = slot.isMyBooking;
              const isCompleted = slot.status === "completed";

              if (isMine) {
                return (
                  <div
                    key={slot._id}
                    className="p-3 rounded-xl border-2 border-indigo-600 bg-indigo-50/50 flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                        Your Booking
                      </span>
                      <p className="font-bold text-slate-900 text-sm mt-1">
                        {slot.startTime} - {slot.endTime}
                      </p>
                      {isCompleted && (
                        <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
                          ✓ Completed
                        </span>
                      )}
                    </div>

                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => handleCancelSlot(slot._id)}
                        className="mt-3 w-full py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                );
              }

              if (isOpen) {
                return (
                  <button
                    key={slot._id}
                    type="button"
                    disabled={bookingSlotId === slot._id}
                    onClick={() => handleBookSlot(slot._id)}
                    className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/40 hover:bg-emerald-100/60 hover:border-emerald-500 transition text-left flex flex-col justify-between group shadow-sm disabled:opacity-50"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Open
                      </span>
                      <p className="font-bold text-slate-800 text-sm mt-1 group-hover:text-emerald-900">
                        {slot.startTime} - {slot.endTime}
                      </p>
                    </div>

                    <span className="mt-3 text-xs font-semibold text-emerald-700 group-hover:underline">
                      {bookingSlotId === slot._id ? "Booking..." : "Book Now →"}
                    </span>
                  </button>
                );
              }

              return (
                <div
                  key={slot._id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-100/60 opacity-60 flex flex-col justify-between cursor-not-allowed"
                >
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                      Unavailable
                    </span>
                    <p className="font-medium text-slate-500 text-sm mt-1 line-through">
                      {slot.startTime} - {slot.endTime}
                    </p>
                  </div>
                  <span className="mt-3 text-[11px] text-slate-400">Booked</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Meetings & Shared Summaries */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-slate-900 text-lg mb-1">
          Meeting Summaries & Teacher Feedback
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Discussion records, recommendations, and action targets posted by teachers following your meetings.
        </p>

        {slots.filter((s) => s.isMyBooking && s.sharedSummary).length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No meeting summaries published for this conference session yet.
          </p>
        ) : (
          <div className="space-y-4">
            {slots
              .filter((s) => s.isMyBooking && s.sharedSummary)
              .map((slot) => (
                <div
                  key={slot._id}
                  className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Meeting with {slot.teacherId?.userId?.name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Slot: {slot.startTime} - {slot.endTime}
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-full">
                      Completed
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed">
                    <strong>Teacher Summary: </strong>
                    <p className="mt-1">{slot.sharedSummary}</p>
                  </div>

                  {slot.actionItems && slot.actionItems.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                        Agreed Action Items:
                      </span>
                      <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                        {slot.actionItems.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PTMBooking;
