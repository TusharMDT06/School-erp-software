const {
  calculateWorkingDaysInMonth,
  calculateApprovedLeaveDaysInMonth,
  calculateStaffPayroll,
} = require("../payrollCalculator");
const { toPaise } = require("../money");

describe("Payroll Calculator Utility", () => {
  describe("calculateWorkingDaysInMonth", () => {
    test("calculates working days in April 2026 excluding Sundays", () => {
      // April 2026 has 30 days.
      // April 5, 12, 19, 26 are Sundays (4 Sundays).
      // Working days = 30 - 4 = 26 days.
      const workingDays = calculateWorkingDaysInMonth(4, 2026);
      expect(workingDays).toBe(26);
    });

    test("calculates working days in February 2026 excluding Sundays", () => {
      // February 2026 has 28 days.
      // Feb 1, 8, 15, 22 are Sundays (4 Sundays).
      // Working days = 28 - 4 = 24 days.
      const workingDays = calculateWorkingDaysInMonth(2, 2026);
      expect(workingDays).toBe(24);
    });
  });

  describe("calculateApprovedLeaveDaysInMonth", () => {
    test("counts leave days within month and ignores Sundays", () => {
      // Leave from April 3, 2026 (Friday) to April 6, 2026 (Monday).
      // Days: Apr 3 (Fri), Apr 4 (Sat), Apr 5 (Sun - skipped), Apr 6 (Mon).
      // Total working leave days = 3.
      const leaves = [
        {
          fromDate: new Date("2026-04-03T00:00:00.000Z"),
          toDate: new Date("2026-04-06T23:59:59.000Z"),
        },
      ];
      const count = calculateApprovedLeaveDaysInMonth(leaves, 4, 2026);
      expect(count).toBe(3);
    });

    test("handles cross-month leaves correctly", () => {
      // Leave from March 28, 2026 to April 3, 2026.
      // Days in April: Apr 1 (Wed), Apr 2 (Thu), Apr 3 (Fri) = 3 days.
      const leaves = [
        {
          fromDate: new Date("2026-03-28T00:00:00.000Z"),
          toDate: new Date("2026-04-03T23:59:59.000Z"),
        },
      ];
      const count = calculateApprovedLeaveDaysInMonth(leaves, 4, 2026);
      expect(count).toBe(3);
    });
  });

  describe("calculateStaffPayroll", () => {
    test("computes basic, allowances, percent_of_basic deductions, and netPay without LOP", () => {
      // Basic: 50,000 INR = 5,000,000 paise
      // HRA Allowance: 10,000 INR = 1,000,000 paise
      // Gross = 60,000 INR = 6,000,000 paise
      // PF Deduction: 12% of basic = 12% * 50,000 = 6,000 INR = 600,000 paise
      // Professional Tax: fixed 200 INR = 20,000 paise
      // NetPay = 6,000,000 - 620,000 = 5,380,000 paise (53,800 INR)
      const result = calculateStaffPayroll({
        basic: toPaise(50000),
        allowances: [{ name: "HRA", amount: toPaise(10000) }],
        deductions: [
          { name: "Provident Fund", type: "percent_of_basic", value: 12 },
          { name: "Professional Tax", type: "fixed", value: toPaise(200) },
        ],
        workingDays: 26,
        approvedLeaveDays: 1,
        paidLeavesPerMonth: 1, // quota covers 1 day leave
      });

      expect(result.unpaidLeaveDays).toBe(0);
      expect(result.lopDeduction).toBe(0);
      expect(result.gross).toBe(toPaise(60000));
      expect(result.totalDeductions).toBe(toPaise(6200));
      expect(result.netPay).toBe(toPaise(53800));
    });

    test("computes LOP deduction when approved leaves exceed paid leave quota", () => {
      // Gross = 26,000 INR = 2,600,000 paise
      // Working days = 26. Daily rate = 1,000 INR = 100,000 paise.
      // Approved leave = 3 days. Quota = 1 day.
      // Unpaid leave = 2 days.
      // LOP deduction = 2 * 1,000 = 2,000 INR = 200,000 paise.
      const result = calculateStaffPayroll({
        basic: toPaise(26000),
        allowances: [],
        deductions: [],
        workingDays: 26,
        approvedLeaveDays: 3,
        paidLeavesPerMonth: 1,
      });

      expect(result.unpaidLeaveDays).toBe(2);
      expect(result.lopDeduction).toBe(toPaise(2000));
      expect(result.gross).toBe(toPaise(26000));
      expect(result.totalDeductions).toBe(toPaise(2000));
      expect(result.netPay).toBe(toPaise(24000));
    });

    test("includes bonus and never allows netPay to become negative", () => {
      // Basic = 1,000 INR. High fixed deduction = 5,000 INR. Bonus = 500 INR.
      // Gross = 1,000. Total payable = 1,500. Total deduction = 5,000.
      // NetPay should be floored at 0.
      const result = calculateStaffPayroll({
        basic: toPaise(1000),
        allowances: [],
        deductions: [{ name: "Large Penalty", type: "fixed", value: toPaise(5000) }],
        workingDays: 26,
        approvedLeaveDays: 0,
        paidLeavesPerMonth: 1,
        bonus: toPaise(500),
      });

      expect(result.netPay).toBe(0);
    });
  });
});
