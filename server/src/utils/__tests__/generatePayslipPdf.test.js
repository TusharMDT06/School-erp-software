const fs = require("fs");
const path = require("path");
const { generatePayslipPdf, numberToWordsIndian } = require("../generatePayslipPdf");
const { toPaise } = require("../money");

describe("Payslip PDF and Number to Words Generator", () => {
  describe("numberToWordsIndian", () => {
    test("converts various numbers into correct Indian words", () => {
      expect(numberToWordsIndian(0)).toBe("Zero Rupees Only");
      expect(numberToWordsIndian(500)).toBe("Five Hundred Rupees Only");
      expect(numberToWordsIndian(1250)).toBe("One Thousand Two Hundred and Fifty Rupees Only");
      expect(numberToWordsIndian(53800)).toBe(
        "Fifty Three Thousand Eight Hundred Rupees Only"
      );
      expect(numberToWordsIndian(100000)).toBe("One Lakh Rupees Only");
      expect(numberToWordsIndian(1250000)).toBe(
        "Twelve Lakh Fifty Thousand Rupees Only"
      );
    });
  });

  describe("generatePayslipPdf", () => {
    test("generates a valid PDF file and returns relative path", async () => {
      const mockPayslip = {
        _id: "test-payslip-12345",
        staffName: "Priya Sharma",
        month: 4,
        year: 2026,
        workingDays: 26,
        presentDays: 24,
        unpaidLeaveDays: 2,
        earnings: [
          { name: "Basic Salary", amount: toPaise(40000) },
          { name: "HRA", amount: toPaise(8000) },
        ],
        deductions: [
          { name: "Provident Fund", amount: toPaise(4800) },
          { name: "Professional Tax", amount: toPaise(200) },
        ],
        lopDeduction: toPaise(3692),
        bonus: toPaise(1000),
        adjustmentNote: "Bonus for outstanding exam performance",
        gross: toPaise(48000),
        totalDeductions: toPaise(8692),
        netPay: toPaise(40308),
        status: "approved",
        paymentMode: "bank",
        paidOn: new Date("2026-04-30"),
      };

      const school = {
        name: "Springfield Academy",
        address: "123 Education Lane, Delhi",
        phone: "+91 11 2345 6789",
      };

      const pdfUrl = await generatePayslipPdf(mockPayslip, school);
      expect(pdfUrl).toMatch(/^\/uploads\/payslips\/PAYSLIP-test-payslip-12345.*\.pdf$/);

      const filePath = path.join(__dirname, "../../../", pdfUrl);
      expect(fs.existsSync(filePath)).toBe(true);

      // Verify file is non-empty PDF
      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(1000);

      // Cleanup generated test file
      fs.unlinkSync(filePath);
    });
  });
});
