const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

/**
 * Generates a branded PDF Fee Receipt using pdfkit.
 *
 * @param {Object} transaction - Populated FeeTransaction document
 * @returns {Promise<string>} - Relative receipt URL path (e.g. /uploads/receipts/RCPT-2026-00001.pdf)
 */
const generateReceipt = async (transaction) => {
  return new Promise((resolve, reject) => {
    try {
      const receiptsDir = path.join(__dirname, "../../uploads/receipts");
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }

      const receiptNumber = transaction.receiptNumber || `RCPT-${Date.now()}`;
      const fileName = `${receiptNumber}.pdf`;
      const filePath = path.join(receiptsDir, fileName);

      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Student and Class details
      const student = transaction.studentId || {};
      const studentUser = student.userId || {};
      const classSection = student.classId || {};
      const feeStructure = transaction.feeStructureId || {};

      const studentName = studentUser.name || "Student";
      const rollNumber = student.rollNumber || "N/A";
      const admissionNumber = student.admissionNumber || "N/A";
      const className = classSection.className
        ? `${classSection.className}-${classSection.section || "A"}`
        : "N/A";
      const academicYear = feeStructure.academicYear || "2026-27";
      const term = (feeStructure.term || "monthly").toUpperCase();

      const paymentDate = transaction.paidOn
        ? new Date(transaction.paidOn).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : new Date().toLocaleDateString("en-IN");

      // ── Header Banner ──────────────────────────────────────────────────────
      doc.rect(40, 40, 515, 60).fill("#1F4E79");
      doc
        .fillColor("#FFFFFF")
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("SCHOOL ERP ACADEMY", 55, 52);

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#E2E8F0")
        .text("Official Fee Payment Receipt", 55, 75);

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#FFFFFF")
        .text(`Receipt #: ${receiptNumber}`, 360, 55, { align: "right" });

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#CBD5E1")
        .text(`Date: ${paymentDate}`, 360, 72, { align: "right" });

      doc.moveDown(4);

      // ── Student & Payment Meta Box ─────────────────────────────────────────
      const metaTop = 120;
      doc.rect(40, metaTop, 515, 80).fill("#F8FAFC").stroke("#E2E8F0");

      doc.fillColor("#334155").font("Helvetica-Bold").fontSize(10);
      doc.text("Student Details", 55, metaTop + 10);
      doc.text("Payment Information", 310, metaTop + 10);

      doc.font("Helvetica").fontSize(9).fillColor("#64748B");
      doc.text(`Name: `, 55, metaTop + 28);
      doc.fillColor("#0F172A").font("Helvetica-Bold").text(studentName, 110, metaTop + 28);

      doc.fillColor("#64748B").font("Helvetica").text(`Class: `, 55, metaTop + 44);
      doc.fillColor("#0F172A").font("Helvetica-Bold").text(`${className} (${academicYear})`, 110, metaTop + 44);

      doc.fillColor("#64748B").font("Helvetica").text(`Adm / Roll: `, 55, metaTop + 60);
      doc.fillColor("#0F172A").font("Helvetica-Bold").text(`${admissionNumber} / ${rollNumber}`, 110, metaTop + 60);

      // Right column
      doc.fillColor("#64748B").font("Helvetica").text(`Payment Mode: `, 310, metaTop + 28);
      doc.fillColor("#0F172A").font("Helvetica-Bold").text((transaction.paymentMode || "Online").toUpperCase(), 400, metaTop + 28);

      doc.fillColor("#64748B").font("Helvetica").text(`Transaction ID: `, 310, metaTop + 44);
      doc.fillColor("#0F172A").font("Helvetica").text(transaction.razorpayPaymentId || "CASH/OFFLINE", 400, metaTop + 44);

      doc.fillColor("#64748B").font("Helvetica").text(`Term: `, 310, metaTop + 60);
      doc.fillColor("#0F172A").font("Helvetica-Bold").text(term, 400, metaTop + 60);

      // ── Fee Breakdown Table ────────────────────────────────────────────────
      const tableTop = 220;
      doc.rect(40, tableTop, 515, 24).fill("#1F4E79");
      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9);
      doc.text("SR.", 55, tableTop + 7);
      doc.text("FEE HEAD / PARTICULARS", 100, tableTop + 7);
      doc.text("AMOUNT (INR)", 430, tableTop + 7, { align: "right", width: 100 });

      let currentY = tableTop + 24;
      const feeHeads = feeStructure.feeHeads || [{ name: "Tuition & General Fee", amount: transaction.amountDue }];

      feeHeads.forEach((head, index) => {
        const rowBg = index % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
        doc.rect(40, currentY, 515, 22).fill(rowBg).stroke("#E2E8F0");
        doc.fillColor("#334155").font("Helvetica").fontSize(9);
        doc.text(String(index + 1), 55, currentY + 6);
        doc.text(head.name, 100, currentY + 6);
        doc.font("Helvetica-Bold").text(`INR ${Number(head.amount).toFixed(2)}`, 430, currentY + 6, {
          align: "right",
          width: 100,
        });
        currentY += 22;
      });

      // Total & Summary Rows
      doc.rect(40, currentY, 515, 24).fill("#F1F5F9").stroke("#CBD5E1");
      doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(9);
      doc.text("Total Fee Amount:", 100, currentY + 7);
      doc.text(`INR ${Number(transaction.amountDue).toFixed(2)}`, 430, currentY + 7, {
        align: "right",
        width: 100,
      });

      currentY += 24;
      doc.rect(40, currentY, 515, 26).fill("#DCFCE7").stroke("#86EFAC");
      doc.fillColor("#15803D").font("Helvetica-Bold").fontSize(10);
      doc.text("AMOUNT PAID:", 100, currentY + 8);
      doc.text(`INR ${Number(transaction.amountPaid).toFixed(2)}`, 430, currentY + 8, {
        align: "right",
        width: 100,
      });

      const remainingBalance = Math.max(0, transaction.amountDue - transaction.amountPaid);
      currentY += 26;

      if (remainingBalance > 0) {
        doc.rect(40, currentY, 515, 22).fill("#FEF2F2").stroke("#FECACA");
        doc.fillColor("#B91C1C").font("Helvetica-Bold").fontSize(9);
        doc.text("Remaining Balance Due:", 100, currentY + 6);
        doc.text(`INR ${Number(remainingBalance).toFixed(2)}`, 430, currentY + 6, {
          align: "right",
          width: 100,
        });
        currentY += 22;
      }

      // ── Status Stamp & Signature ──────────────────────────────────────────
      const footerY = 480;
      doc.rect(55, footerY, 110, 36).fill("#DCFCE7").stroke("#22C55E");
      doc.fillColor("#15803D").font("Helvetica-Bold").fontSize(14).text("PAID", 92, footerY + 11);

      // Signature Block
      doc.strokeColor("#94A3B8").lineWidth(1).moveTo(380, footerY + 30).lineTo(530, footerY + 30).stroke();
      doc.fillColor("#64748B").font("Helvetica").fontSize(8).text("Authorized Signature & Seal", 380, footerY + 35, {
        align: "center",
        width: 150,
      });

      // Terms Note
      doc.fillColor("#94A3B8").fontSize(7).text(
        "Note: This is a computer-generated official receipt and requires no physical signature. Fees once paid are non-refundable.",
        40,
        550,
        { align: "center", width: 515 }
      );

      doc.end();

      stream.on("finish", () => {
        resolve(`/uploads/receipts/${fileName}`);
      });

      stream.on("error", (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateReceipt;
