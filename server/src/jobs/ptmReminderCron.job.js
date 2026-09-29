const cron = require("node-cron");
const PTMSlot = require("../models/PTMSlot.model");
const PTMEvent = require("../models/PTMEvent.model");
const Teacher = require("../models/Teacher.model");
const Student = require("../models/Student.model");
const { notify } = require("../services/notification.service");

let sendWhatsAppMessage = null;
try {
  const wa = require("../services/whatsapp.service");
  sendWhatsAppMessage = wa.sendWhatsAppMessage || wa.sendMessage || null;
} catch (e) {
  // WhatsApp service not configured
}

/**
 * PTM Reminder Cron Job
 * Runs every 15 minutes.
 * Sends 24-hour and 1-hour notifications before scheduled PTM slots.
 */
const startPTMReminderCron = () => {
  cron.schedule("*/15 * * * *", async () => {
    try {
      const now = new Date();

      // Find all booked slots that haven't received both reminders
      const pendingSlots = await PTMSlot.find({
        status: "booked",
        $or: [{ reminderSent24h: false }, { reminderSent1h: false }],
      })
        .populate("ptmId")
        .populate("teacherId")
        .populate("studentId", "name rollNumber admissionNumber guardianIds")
        .populate("parentUserId", "name email phone");

      for (const slot of pendingSlots) {
        if (!slot.ptmId || !slot.ptmId.date || !slot.startTime) continue;

        // Build slot start date object
        const eventDateStr = new Date(slot.ptmId.date).toISOString().split("T")[0];
        const slotStartDateTime = new Date(`${eventDateStr}T${slot.startTime}:00`);

        const diffMinutes = Math.round((slotStartDateTime.getTime() - now.getTime()) / (1000 * 60));

        // 24-hour reminder: between 23h and 25h (1380 to 1500 minutes)
        if (!slot.reminderSent24h && diffMinutes > 0 && diffMinutes <= 1500 && diffMinutes >= 1320) {
          const teacherUser = await Teacher.findById(slot.teacherId?._id).select("userId");
          const teacherUserId = teacherUser?.userId;

          // Notify Parent
          if (slot.parentUserId?._id) {
            await notify(slot.parentUserId._id, {
              type: "ptm_reminder",
              title: "PTM Reminder: Meeting Tomorrow",
              message: `Reminder: You have a Parent-Teacher Meeting tomorrow at ${slot.startTime} for ${slot.studentId?.name || "your child"}.`,
              data: { slotId: slot._id, ptmId: slot.ptmId._id },
              sendEmail: true,
            });

            if (sendWhatsAppMessage && slot.parentUserId.phone) {
              sendWhatsAppMessage(
                slot.parentUserId.phone,
                `Reminder: Your PTM appointment is scheduled tomorrow at ${slot.startTime}.`
              ).catch(() => {});
            }
          }

          // Notify Teacher
          if (teacherUserId) {
            await notify(teacherUserId, {
              type: "ptm_reminder",
              title: "PTM Reminder: Schedule Tomorrow",
              message: `You have a scheduled PTM appointment tomorrow at ${slot.startTime} with parent of ${slot.studentId?.name || "student"}.`,
              data: { slotId: slot._id, ptmId: slot.ptmId._id },
            });
          }

          slot.reminderSent24h = true;
          await slot.save();
        }

        // 1-hour reminder: between 0 and 75 minutes (0 to 75 minutes)
        if (!slot.reminderSent1h && diffMinutes > 0 && diffMinutes <= 75) {
          const teacherUser = await Teacher.findById(slot.teacherId?._id).select("userId");
          const teacherUserId = teacherUser?.userId;

          // Notify Parent
          if (slot.parentUserId?._id) {
            await notify(slot.parentUserId._id, {
              type: "ptm_reminder",
              title: "PTM Reminder: Starting in 1 Hour",
              message: `Reminder: Your PTM meeting with teacher starts at ${slot.startTime} (in ~${diffMinutes} mins).`,
              data: { slotId: slot._id, ptmId: slot.ptmId._id },
              sendEmail: true,
            });

            if (sendWhatsAppMessage && slot.parentUserId.phone) {
              sendWhatsAppMessage(
                slot.parentUserId.phone,
                `Reminder: Your PTM appointment begins at ${slot.startTime}.`
              ).catch(() => {});
            }
          }

          // Notify Teacher
          if (teacherUserId) {
            await notify(teacherUserId, {
              type: "ptm_reminder",
              title: "PTM Reminder: Starting in 1 Hour",
              message: `Appointment with parent of ${slot.studentId?.name || "student"} starts at ${slot.startTime}.`,
              data: { slotId: slot._id, ptmId: slot.ptmId._id },
            });
          }

          slot.reminderSent1h = true;
          await slot.save();
        }
      }
    } catch (err) {
      console.warn("[cron:ptmReminder] Error running reminder check:", err.message);
    }
  });
};

module.exports = { startPTMReminderCron };
