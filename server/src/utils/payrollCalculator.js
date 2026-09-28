const { addMoney, subMoney, toPaise } = require("./money");

const WEEKLY_OFF_DAY = 0; // 0 = Sunday

/**
 * Returns number of calendar days in a given month.
 * @param {number} month - 1-12
 * @param {number} year - full year (e.g. 2026)
 */
const getDaysInMonth = (month, year) => {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
};

/**
 * Calculates working days in a month by excluding the configured weekly-off day (Sundays by default).
 * @param {number} month - 1-12
 * @param {number} year - full year
 * @param {number} [weeklyOffDay=0] - 0 (Sunday) to 6 (Saturday)
 * @returns {number}
 */
const calculateWorkingDaysInMonth = (month, year, weeklyOffDay = WEEKLY_OFF_DAY) => {
  const daysInMonth = getDaysInMonth(month, year);
  let workingDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCDay() !== weeklyOffDay) {
      workingDays++;
    }
  }

  return workingDays;
};

/**
 * Calculates approved leave days that overlap with the target month,
 * excluding weekly-off days.
 *
 * @param {Array<Object>} leaveRequests - Array of approved LeaveRequest objects
 * @param {number} month - 1-12
 * @param {number} year - full year
 * @param {number} [weeklyOffDay=0]
 * @returns {number}
 */
const calculateApprovedLeaveDaysInMonth = (leaveRequests = [], month, year, weeklyOffDay = WEEKLY_OFF_DAY) => {
  const daysInMonth = getDaysInMonth(month, year);
  const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month - 1, daysInMonth, 23, 59, 59, 999));

  const countedDayTimestamps = new Set();

  for (const leave of leaveRequests) {
    if (!leave.fromDate || !leave.toDate) continue;

    const fromDate = new Date(leave.fromDate);
    const toDate = new Date(leave.toDate);

    // Overlap range
    const start = new Date(Math.max(fromDate.getTime(), monthStart.getTime()));
    const end = new Date(Math.min(toDate.getTime(), monthEnd.getTime()));

    if (start <= end) {
      let curr = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
      const endDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

      while (curr <= endDay) {
        if (curr.getUTCDay() !== weeklyOffDay) {
          countedDayTimestamps.add(curr.toISOString().split("T")[0]);
        }
        curr.setUTCDate(curr.getUTCDate() + 1);
      }
    }
  }

  return countedDayTimestamps.size;
};

/**
 * Pure payroll calculation for a single staff member.
 * All currency values in integer paise.
 *
 * @param {Object} params
 * @param {number} params.basic - basic salary in paise
 * @param {Array<{name: string, amount: number}>} [params.allowances=[]] - allowance list (amount in paise)
 * @param {Array<{name: string, type: 'fixed'|'percent_of_basic', value: number}>} [params.deductions=[]]
 * @param {number} params.workingDays - total working days in the month
 * @param {number} [params.approvedLeaveDays=0] - approved leave days taken in the month
 * @param {number} [params.paidLeavesPerMonth=0] - school quota of paid leave per month
 * @param {number} [params.bonus=0] - additional bonus in paise
 * @param {Array<{name: string, amount: number}>} [params.extraDeductions=[]] - optional manual extra deductions
 * @returns {Object}
 */
const calculateStaffPayroll = ({
  basic = 0,
  allowances = [],
  deductions = [],
  workingDays = 0,
  approvedLeaveDays = 0,
  paidLeavesPerMonth = 0,
  bonus = 0,
  extraDeductions = [],
}) => {
  const safeBasic = Math.max(0, Math.round(basic || 0));
  const safeBonus = Math.max(0, Math.round(bonus || 0));
  const safeWorkingDays = Math.max(1, workingDays || 1);

  // 1. Unpaid leave days
  const unpaidLeaveDays = Math.max(0, (approvedLeaveDays || 0) - (paidLeavesPerMonth || 0));
  const presentDays = Math.max(0, safeWorkingDays - (approvedLeaveDays || 0));

  // 2. Earnings
  const earnings = [
    { name: "Basic Salary", amount: safeBasic },
    ...allowances.map((a) => ({
      name: a.name || "Allowance",
      amount: Math.max(0, Math.round(a.amount || 0)),
    })),
  ];

  const gross = earnings.reduce((acc, curr) => addMoney(acc, curr.amount), 0);

  // 3. Deductions (fixed or percent_of_basic)
  const computedDeductions = deductions.map((d) => {
    let amount = 0;
    if (d.type === "percent_of_basic") {
      amount = Math.round((safeBasic * (d.value || 0)) / 100);
    } else {
      amount = Math.round(d.value || 0);
    }
    return {
      name: d.name || "Deduction",
      amount: Math.max(0, amount),
    };
  });

  // Manual extra deductions if any
  for (const extra of extraDeductions) {
    computedDeductions.push({
      name: extra.name || "Extra Deduction",
      amount: Math.max(0, Math.round(extra.amount || 0)),
    });
  }

  const standardDeductionsTotal = computedDeductions.reduce(
    (acc, curr) => addMoney(acc, curr.amount),
    0
  );

  // 4. LOP Deduction = (gross / workingDays) * unpaidLeaveDays
  let lopDeduction = 0;
  if (unpaidLeaveDays > 0 && safeWorkingDays > 0) {
    lopDeduction = Math.min(gross, Math.round((gross / safeWorkingDays) * unpaidLeaveDays));
  }

  // 5. Total deductions & Net pay
  const totalDeductions = addMoney(standardDeductionsTotal, lopDeduction);
  const totalPayableBeforeDeduction = addMoney(gross, safeBonus);
  const netPay = subMoney(totalPayableBeforeDeduction, totalDeductions);

  return {
    workingDays: safeWorkingDays,
    presentDays,
    unpaidLeaveDays,
    earnings,
    deductions: computedDeductions,
    lopDeduction,
    bonus: safeBonus,
    gross,
    totalDeductions,
    netPay,
  };
};

module.exports = {
  WEEKLY_OFF_DAY,
  getDaysInMonth,
  calculateWorkingDaysInMonth,
  calculateApprovedLeaveDaysInMonth,
  calculateStaffPayroll,
};
