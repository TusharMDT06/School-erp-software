const LedgerEntry = require("../models/LedgerEntry.model");
const CashClosing = require("../models/CashClosing.model");
const { ApiError } = require("./apiResponse");

/**
 * Helper to normalize any date into "YYYY-MM-DD" format
 */
const formatDateStr = (d) => {
  if (!d) d = new Date();
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return new Date().toISOString().split("T")[0];
  return dateObj.toISOString().split("T")[0];
};

/**
 * insertLedgerEntry — Shared helper used by ALL modules to insert LedgerEntry records.
 * Enforces the day-close lock: if a CashClosing exists for that date and school,
 * rejects new entries with an ApiError(400).
 *
 * @param {Object|Array<Object>} entryData - Single entry object or array of entry objects
 * @param {Object} options - Options containing optional { session }
 * @returns {Promise<Array<Object>|Object>} Created ledger entry / entries
 */
const insertLedgerEntry = async (entryData, { session = null } = {}) => {
  const isArray = Array.isArray(entryData);
  const entries = isArray ? entryData : [entryData];

  if (entries.length === 0) return isArray ? [] : null;

  // Check closed-day rule for each entry
  for (const entry of entries) {
    if (!entry.schoolId) {
      throw new ApiError(400, "School ID is required for ledger entry.");
    }

    const dateStr = formatDateStr(entry.date);
    const closingQuery = CashClosing.findOne({
      schoolId: entry.schoolId,
      date: dateStr,
    });
    if (session) closingQuery.session(session);

    const closedDay = await closingQuery.lean();
    if (closedDay) {
      throw new ApiError(
        400,
        `Cannot insert ledger entry for ${dateStr}: this day has been closed & locked. Corrections must be posted as reversal entries dated today.`
      );
    }
  }

  // Insert into LedgerEntry (creates immutable entries)
  const created = await LedgerEntry.create(entries, session ? { session } : {});
  return isArray ? created : created[0];
};

module.exports = insertLedgerEntry;
module.exports.formatDateStr = formatDateStr;
