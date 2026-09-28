const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { toRupees, formatMoney } = require("./money");

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Converts a positive number to Indian Currency Words.
 * e.g., 53800 -> "Fifty Three Thousand Eight Hundred Rupees Only"
 */
const numberToWordsIndian = (num) => {
  const integerPart = Math.floor(Math.abs(num || 0));
  if (integerPart === 0) return "Zero Rupees Only";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  const convertTwoDigits = (n) => {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return `${tens[t]}${o ? " " + ones[o] : ""}`;
  };

  const convertThreeDigits = (n) => {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    let res = "";
    if (h > 0) res += `${ones[h]} Hundred`;
    if (rem > 0) res += `${res ? " and " : ""}${convertTwoDigits(rem)}`;
    return res;
  };

  let remainder = integerPart;
  const parts = [];

  // Crores (1,00,00,000)
  const crores = Math.floor(remainder / 10000000);
  if (crores > 0) {
    parts.push(`${convertTwoDigits(crores)} Crore`);
    remainder %= 10000000;
  }

  // Lakhs (1,00,000)
  const lakhs = Math.floor(remainder / 100000);
  if (lakhs > 0) {
    parts.push(`${convertTwoDigits(lakhs)} Lakh`);
    remainder %= 100000;
  }

  // Thousands (1,000)
  const thousands = Math.floor(remainder / 1000);
  if (thousands > 0) {
    parts.push(`${convertTwoDigits(thousands)} Thousand`);
    remainder %= 1000;
  }

  // Hundreds and units
  if (remainder > 0) {
    parts.push(convertThreeDigits(remainder));
  }

  return `${parts.join(" ")} Rupees Only`;
};

/**
 * Generates a branded Payslip PDF using pdfkit.
 *
 * @param {Object} payslip - Populated or raw Payslip document
 * @param {Object} school - School details (name, address, phone)
 * @returns {Promise<string>} - Relative payslip URL (e.g. /uploads/payslips/PAYSLIP-12345.pdf)
 */
const generatePayslipPdf = async (payslip, school = {}) => {
  return new Promise((resolve, reject) => {
    try {
      const payslipsDir = path.join(__dirname, "../../uploads/payslips");
      if (!fs.existsSync(payslipsDir)) {
        fs.mkdirSync(payslipsDir, { recursive: true });
      }

      const fileName = `PAYSLIP-${payslip._id}-${Date.now()}.pdf`;
      const filePath = path.join(payslipsDir, fileName);

      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const schoolName = school.name || school.schoolDisplayName || "SCHOOL ERP ACADEMY";
      const schoolAddress = school.address || "Main Campus, Education City";
      const schoolPhone = school.phone || "+91 98765 43210";
      const monthStr = MONTH_NAMES[payslip.month] || `Month ${payslip.month}`;

      // ── Header Banner ──────────────────────────────────────────────────────
      doc.rect(40, 40, 515, 65).fill("#0F172A"); // Dark slate
      doc
        .fillColor("#FFFFFF")
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(schoolName.toUpperCase(), 55, 52, { width: 500, ellipsis: true });

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#94A3B8")
        .text(`${schoolAddress} | Phone: ${schoolPhone}`, 55, 74, { width: 500 });

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#38BDF8")
        .text(`SALARY PAYSLIP — ${monthStr.toUpperCase()} ${payslip.year}`, 55, 88);

      let y = 120;

      // ── Staff & Attendance Meta Grid ───────────────────────────────────────
      doc.rect(40, y, 515, 75).fill("#F8FAFC").stroke("#E2E8F0");
      doc.lineWidth(0.5);

      doc.fillColor("#475569").font("Helvetica-Bold").fontSize(8);
      doc.text("EMPLOYEE NAME", 55, y + 10);
      doc.fillColor("#0F172A").font("Helvetica").fontSize(9);
      doc.text(payslip.staffName || "Staff Member", 55, y + 22);

      doc.fillColor("#475569").font("Helvetica-Bold").fontSize(8);
      doc.text("PAY PERIOD", 220, y + 10);
      doc.fillColor("#0F172A").font("Helvetica").fontSize(9);
      doc.text(`${monthStr} ${payslip.year}`, 220, y + 22);

      doc.fillColor("#475569").font("Helvetica-Bold").fontSize(8);
      doc.text("STATUS", 400, y + 10);
      const isPaid = payslip.status === "paid";
      doc
        .fillColor(isPaid ? "#16A34A" : "#D97706")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text((payslip.status || "draft").toUpperCase(), 400, y + 22);

      // Row 2: Attendance
      doc.fillColor("#475569").font("Helvetica-Bold").fontSize(8);
      doc.text("WORKING DAYS", 55, y + 42);
      doc.fillColor("#0F172A").font("Helvetica").fontSize(9);
      doc.text(`${payslip.workingDays} Days`, 55, y + 54);

      doc.fillColor("#475569").font("Helvetica-Bold").fontSize(8);
      doc.text("PRESENT / PAID DAYS", 220, y + 42);
      doc.fillColor("#0F172A").font("Helvetica").fontSize(9);
      doc.text(`${payslip.presentDays} Days`, 220, y + 54);

      doc.fillColor("#475569").font("Helvetica-Bold").fontSize(8);
      doc.text("UNPAID LEAVE (LOP)", 400, y + 42);
      doc
        .fillColor(payslip.unpaidLeaveDays > 0 ? "#DC2626" : "#0F172A")
        .font(payslip.unpaidLeaveDays > 0 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(9)
        .text(`${payslip.unpaidLeaveDays || 0} Days`, 400, y + 54);

      y += 90;

      // ── Earnings and Deductions Tables Side-by-Side ─────────────────────────
      const tableWidth = 250;
      const leftX = 40;
      const rightX = 305;

      // Earnings Table Header
      doc.rect(leftX, y, tableWidth, 20).fill("#1E293B");
      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8.5);
      doc.text("EARNINGS", leftX + 10, y + 6);
      doc.text("AMOUNT", leftX + 180, y + 6, { width: 60, align: "right" });

      // Deductions Table Header
      doc.rect(rightX, y, tableWidth, 20).fill("#1E293B");
      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(8.5);
      doc.text("DEDUCTIONS", rightX + 10, y + 6);
      doc.text("AMOUNT", rightX + 180, y + 6, { width: 60, align: "right" });

      y += 20;

      const earningsList = [...(payslip.earnings || [])];
      if (payslip.bonus > 0) {
        earningsList.push({ name: "Bonus / Incentive", amount: payslip.bonus });
      }

      const deductionsList = [...(payslip.deductions || [])];
      if (payslip.lopDeduction > 0) {
        deductionsList.push({
          name: `Loss of Pay (${payslip.unpaidLeaveDays}d)`,
          amount: payslip.lopDeduction,
        });
      }

      const maxRows = Math.max(earningsList.length, deductionsList.length, 1);
      const rowHeight = 20;

      for (let i = 0; i < maxRows; i++) {
        const rowBg = i % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
        doc.rect(leftX, y, tableWidth, rowHeight).fill(rowBg).stroke("#E2E8F0");
        doc.rect(rightX, y, tableWidth, rowHeight).fill(rowBg).stroke("#E2E8F0");

        // Earnings row
        const earn = earningsList[i];
        if (earn) {
          doc.fillColor("#334155").font("Helvetica").fontSize(8.5);
          doc.text(earn.name, leftX + 10, y + 5, { width: 160, ellipsis: true });
          doc.text(formatMoney(earn.amount), leftX + 170, y + 5, { width: 70, align: "right" });
        }

        // Deductions row
        const ded = deductionsList[i];
        if (ded) {
          doc.fillColor("#334155").font("Helvetica").fontSize(8.5);
          doc.text(ded.name, rightX + 10, y + 5, { width: 160, ellipsis: true });
          doc.text(formatMoney(ded.amount), rightX + 170, y + 5, { width: 70, align: "right" });
        }

        y += rowHeight;
      }

      // Subtotals Row
      const subtotalGross = payslip.gross + (payslip.bonus || 0);
      doc.rect(leftX, y, tableWidth, 22).fill("#F1F5F9").stroke("#CBD5E1");
      doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(9);
      doc.text("Total Gross Earnings", leftX + 10, y + 6);
      doc.text(formatMoney(subtotalGross), leftX + 160, y + 6, { width: 80, align: "right" });

      doc.rect(rightX, y, tableWidth, 22).fill("#F1F5F9").stroke("#CBD5E1");
      doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(9);
      doc.text("Total Deductions", rightX + 10, y + 6);
      doc.text(formatMoney(payslip.totalDeductions), rightX + 160, y + 6, {
        width: 80,
        align: "right",
      });

      y += 35;

      // ── Net Pay Banner ─────────────────────────────────────────────────────
      doc.rect(40, y, 515, 60).fill("#F0FDF4").stroke("#86EFAC");
      doc.lineWidth(1);

      doc.fillColor("#166534").font("Helvetica-Bold").fontSize(10);
      doc.text("NET SALARY PAYABLE", 55, y + 12);

      doc.fontSize(16).fillColor("#15803D").text(formatMoney(payslip.netPay), 55, y + 26);

      const netInWords = numberToWordsIndian(toRupees(payslip.netPay));
      doc
        .fontSize(8.5)
        .font("Helvetica-Oblique")
        .fillColor("#166534")
        .text(`In Words: ${netInWords}`, 55, y + 46, { width: 490 });

      y += 72;

      // ── LOP Note or Adjustment Note ────────────────────────────────────────
      if (payslip.unpaidLeaveDays > 0 || payslip.adjustmentNote) {
        doc.rect(40, y, 515, 34).fill("#FFFBEB").stroke("#FDE68A");
        doc.fillColor("#B45309").font("Helvetica-Bold").fontSize(8);
        doc.text("NOTES & ADJUSTMENTS:", 50, y + 6);

        let noteText = "";
        if (payslip.unpaidLeaveDays > 0) {
          noteText += `Loss of Pay applied for ${payslip.unpaidLeaveDays} day(s) of unpaid leave (${formatMoney(
            payslip.lopDeduction
          )}). `;
        }
        if (payslip.adjustmentNote) {
          noteText += `Remark: ${payslip.adjustmentNote}`;
        }

        doc.fillColor("#78350F").font("Helvetica").fontSize(8).text(noteText, 50, y + 18, {
          width: 495,
        });
        y += 42;
      }

      // ── Payment Info & Signatures ──────────────────────────────────────────
      const footerY = Math.max(y + 20, 680);

      // Payment Details
      doc.fillColor("#64748B").font("Helvetica").fontSize(8);
      doc.text(
        `Payment Mode: ${(payslip.paymentMode || "N/A").toUpperCase()} | Paid On: ${
          payslip.paidOn ? new Date(payslip.paidOn).toLocaleDateString("en-IN") : "Pending"
        }`,
        40,
        footerY
      );

      // Signature lines
      const sigY = footerY + 30;
      doc.strokeColor("#CBD5E1").lineWidth(1).moveTo(380, sigY).lineTo(540, sigY).stroke();
      doc.fillColor("#475569").font("Helvetica-Bold").fontSize(8).text(
        "Authorized Signatory",
        380,
        sigY + 5,
        { width: 160, align: "center" }
      );

      doc.fillColor("#94A3B8").font("Helvetica").fontSize(7).text(
        "This is a system generated payslip and does not require a physical signature.",
        40,
        sigY + 30,
        { width: 515, align: "center" }
      );

      doc.end();

      stream.on("finish", () => {
        resolve(`/uploads/payslips/${fileName}`);
      });

      stream.on("error", (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generatePayslipPdf, numberToWordsIndian };
