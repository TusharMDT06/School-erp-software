/**
 * lateFee.js — Pure function to compute late fee in paise.
 * NEVER mutates the transaction; computed on-read, frozen at collect time.
 */

/**
 * @param {Object} transaction - FeeTransaction doc (must have dueDate or feeStructureId.dueDate, amountDue, amountPaid in paise)
 * @param {Object} settings    - FinanceSettings.lateFee sub-doc
 * @param {Date}   asOfDate    - Date to compute as-of (typically today)
 * @returns {number}           - Late fee in paise (never negative)
 */
const calculateLateFee = (transaction, settings, asOfDate = new Date()) => {
  try {
    if (!settings || !settings.enabled) return 0;

    const dueDate =
      transaction.dueDate ||
      transaction.feeStructureId?.dueDate ||
      null;

    if (!dueDate) return 0;

    const dueMoment = new Date(dueDate);
    const graceDays = settings.graceDays || 0;
    const graceCutoff = new Date(dueMoment);
    graceCutoff.setDate(graceCutoff.getDate() + graceDays);

    const asOf = new Date(asOfDate);
    asOf.setHours(0, 0, 0, 0);
    graceCutoff.setHours(0, 0, 0, 0);

    if (asOf <= graceCutoff) return 0;

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysLate = Math.floor((asOf - graceCutoff) / msPerDay);
    if (daysLate <= 0) return 0;

    // pendingAmount in paise
    const pendingPaise = Math.max(0, (transaction.amountDue || 0) - (transaction.amountPaid || 0));
    if (pendingPaise <= 0) return 0;

    // value is in rupees → convert to paise
    const { type, value = 0, maxCap } = settings;
    const valuePaise = Math.round(value * 100);
    const maxCapPaise = maxCap ? Math.round(maxCap * 100) : null;

    let latePaise = 0;
    if (type === "flat") {
      latePaise = valuePaise;
    } else if (type === "per_day") {
      latePaise = valuePaise * daysLate;
    } else if (type === "percent") {
      latePaise = Math.round((value / 100) * pendingPaise);
    }

    if (maxCapPaise !== null) {
      latePaise = Math.min(latePaise, maxCapPaise);
    }

    return Math.max(0, latePaise);
  } catch {
    return 0;
  }
};

module.exports = { calculateLateFee };
