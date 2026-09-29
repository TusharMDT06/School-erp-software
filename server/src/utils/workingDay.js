const AcademicEvent = require("../models/AcademicEvent.model");
const { safeGet, safeSet, safeDel } = require("../config/redis");

const DEFAULT_WEEKLY_OFF = 0; // 0 = Sunday
const HOLIDAY_CACHE_TTL = 24 * 60 * 60; // 24 hours

/**
 * Returns whether a given date is a working day for the given school.
 * Non-working days:
 * 1. Configured weekly-off day (Sunday by default)
 * 2. Any published holiday or vacation covering that date
 *
 * @param {string|mongoose.Types.ObjectId} schoolId
 * @param {Date|string} dateInput
 * @returns {Promise<{ isWorkingDay: boolean, reason: string, type?: string, event?: Object }>}
 */
const isWorkingDay = async (schoolId, dateInput) => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return { isWorkingDay: true, reason: "Invalid Date" };
  }

  // 1. Check weekly off (default Sunday)
  if (d.getDay() === DEFAULT_WEEKLY_OFF) {
    return {
      isWorkingDay: false,
      reason: "Weekly Off (Sunday)",
      type: "weekly_off",
    };
  }

  if (!schoolId) {
    return { isWorkingDay: true, reason: "Regular Working Day" };
  }

  // 2. Check published holidays/vacations covering this date
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-12
  const cacheKey = `calendar:holidays:${schoolId.toString()}:${year}-${month}`;

  let holidays = null;
  const cached = await safeGet(cacheKey);
  if (cached) {
    try {
      holidays = JSON.parse(cached);
    } catch {}
  }

  if (!holidays) {
    const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    try {
      holidays = await AcademicEvent.find({
        schoolId,
        status: "published",
        type: { $in: ["holiday", "vacation"] },
        startDate: { $lte: monthEnd },
        endDate: { $gte: monthStart },
      })
        .select("title type startDate endDate")
        .lean();

      await safeSet(cacheKey, JSON.stringify(holidays), HOLIDAY_CACHE_TTL);
    } catch (err) {
      console.warn("[workingDay] Querying holidays failed:", err.message);
      holidays = [];
    }
  }

  // Compare normalized day
  const targetTime = new Date(year, d.getMonth(), d.getDate(), 12, 0, 0, 0).getTime();

  for (const h of holidays) {
    const start = new Date(h.startDate);
    const end = new Date(h.endDate);
    const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 0, 0, 0, 0).getTime();
    const endTime = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime();

    if (targetTime >= startTime && targetTime <= endTime) {
      return {
        isWorkingDay: false,
        reason: h.title,
        type: h.type,
        event: h,
      };
    }
  }

  return { isWorkingDay: true, reason: "Regular Working Day" };
};

/**
 * Invalidate Redis cache for a school's holiday calendar
 */
const invalidateHolidayCache = async (schoolId, year, month) => {
  if (!schoolId) return;
  const now = new Date();
  const y = year || now.getFullYear();
  const m = month || now.getMonth() + 1;

  // Clear current, previous, and next month
  await Promise.allSettled([
    safeDel(`calendar:holidays:${schoolId.toString()}:${y}-${m}`),
    safeDel(`calendar:holidays:${schoolId.toString()}:${y}-${m === 1 ? 12 : m - 1}`),
    safeDel(`calendar:holidays:${schoolId.toString()}:${y}-${m === 12 ? 1 : m + 1}`),
  ]);
};

/**
 * Calculates exact working days in a month for a specific school,
 * taking into account Sundays and declared holidays/vacations.
 */
const calculateSchoolWorkingDaysInMonth = async (schoolId, month, year) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    const check = await isWorkingDay(schoolId, d);
    if (check.isWorkingDay) {
      workingDays++;
    }
  }

  return workingDays;
};

module.exports = {
  isWorkingDay,
  invalidateHolidayCache,
  calculateSchoolWorkingDaysInMonth,
  DEFAULT_WEEKLY_OFF,
};
