/**
 * money.js — All monetary math in integer paise (1 ₹ = 100 paise).
 * NEVER use floating point for money. Use these helpers everywhere.
 */

/** Convert rupees (Number) to paise (integer). */
const toPaise = (rupees) => Math.round((rupees || 0) * 100);

/** Convert paise (integer) to rupees (Number, 2 dp). */
const toRupees = (paise) => (paise || 0) / 100;

/** Add two paise amounts safely. */
const addMoney = (a, b) => (a || 0) + (b || 0);

/** Subtract b from a in paise, floored at 0. */
const subMoney = (a, b) => Math.max(0, (a || 0) - (b || 0));

/** Format paise as ₹ string (e.g. ₹1,250.50). */
const formatMoney = (paise) =>
  "₹" + toRupees(paise).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

module.exports = { toPaise, toRupees, addMoney, subMoney, formatMoney };
