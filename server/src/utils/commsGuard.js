const { isWorkingDay } = require("./workingDay");

/**
 * Returns whether the current or specified time is within "Quiet Time"
 * for telephone calls, SMS, and WhatsApp alerts.
 * Rules:
 * - Between 8:00 PM (20:00) and 8:00 AM (08:00)
 * - On non-working days (Sundays and declared school holidays/vacations)
 * Note: Email and In-App notifications are unaffected.
 *
 * @param {string|mongoose.Types.ObjectId} [schoolId]
 * @param {Date|string} [dateInput=new Date()]
 * @param {string} [channel="phone"] - "phone", "sms", "whatsapp", "email", "in_app"
 * @returns {Promise<{ isQuiet: boolean, reason: string, nextAllowedTime: Date }>}
 */
const isQuietTime = async (schoolId = null, dateInput = new Date(), channel = "phone") => {
  // Email and In-App notifications are never constrained by quiet hours
  if (channel === "email" || channel === "in_app") {
    return { isQuiet: false, reason: "Channel unaffected by quiet hours", nextAllowedTime: null };
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return { isQuiet: false, reason: "Invalid Date", nextAllowedTime: null };
  }

  const hours = d.getHours();

  // 1. Check time window: 8 PM (20:00) to 8 AM (08:00)
  if (hours >= 20 || hours < 8) {
    const nextWindow = getNextAllowedWindowDate(d);
    return {
      isQuiet: true,
      reason: "Quiet Hours (restricted between 8 PM and 8 AM)",
      nextAllowedTime: nextWindow,
    };
  }

  // 2. Check non-working day (Sunday or declared Holiday)
  const workCheck = await isWorkingDay(schoolId, d);
  if (!workCheck.isWorkingDay) {
    const nextWindow = getNextAllowedWindowDate(d);
    return {
      isQuiet: true,
      reason: `Restricted on non-working day: ${workCheck.reason}`,
      nextAllowedTime: nextWindow,
    };
  }

  return { isQuiet: false, reason: "Allowed communication window", nextAllowedTime: null };
};

/**
 * Calculates the next allowable communication window (8:00 AM on next business day).
 */
const getNextAllowedWindowDate = (fromDate) => {
  const next = new Date(fromDate);
  if (next.getHours() >= 20) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(8, 0, 0, 0);
  // If next falls on Sunday, advance to Monday
  if (next.getDay() === 0) {
    next.setDate(next.getDate() + 1);
  }
  return next;
};

module.exports = {
  isQuietTime,
  getNextAllowedWindowDate,
};
