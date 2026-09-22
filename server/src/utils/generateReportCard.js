const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

/**
 * Generates an official branded PDF Student Report Card using pdfkit.
 *
 * @param {Object} student - Populated Student document
 * @param {Object} exam - Exam document
 * @param {Object} result - Result document
 * @returns {Promise<string>} - Relative report card URL (e.g. /uploads/reportcards/...)
 */
const generateReportCard = async (student, exam, result) => {
  return new Promise((resolve, reject) => {
    try {
      const outputDir = path.join(__dirname, "../../uploads/reportcards");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const safeStudentId = student._id?.toString() || "student";
      const safeExamId = exam._id?.toString() || "exam";
      const fileName = `RC_${safeStudentId}_${safeExamId}.pdf`;
      const filePath = path.join(outputDir, fileName);

      const doc = new PDFDocument({ margin: 40, size: "A4" });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const studentName = student.userId?.name || "Student Name";
      const rollNumber = student.rollNumber || "N/A";
      const admissionNumber = student.admissionNumber || "N/A";
      const className = student.classId
        ? `${student.classId.className}-${student.classId.section || "A"}`
        : "N/A";
      const examName = exam.examName || "Term Examination";
      const academicYear = exam.academicYear || "2026-27";

      // ── Header Banner ──────────────────────────────────────────────────────
      doc.rect(40, 40, 515, 65).fill("#1F4E79");
      doc
        .fillColor("#FFFFFF")
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("SCHOOL ERP ACADEMY", 55, 50);

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#E2E8F0")
        .text("Comprehensive Academic Performance Report", 55, 73);

      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor("#FFFFFF")
        .text(academicYear, 400, 53, { align: "right", width: 140 });

      doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#CBD5E1")
        .text("Official Report Card", 400, 70, { align: "right", width: 140 });

      // ── Student Info Box ───────────────────────────────────────────────────
      const infoTop = 120;
      doc.rect(40, infoTop, 515, 60).fill("#F8FAFC").stroke("#E2E8F0");

      doc.fillColor("#64748B").font("Helvetica").fontSize(9);
      doc.text("Student Name:", 55, infoTop + 12);
      doc.fillColor("#0F172A").font("Helvetica-Bold").text(studentName, 130, infoTop + 12);

      doc.fillColor("#64748B").font("Helvetica").text("Class & Section:", 55, infoTop + 32);
      doc.fillColor("#0F172A").font("Helvetica-Bold").text(className, 130, infoTop + 32);

      doc.fillColor("#64748B").font("Helvetica").text("Roll Number:", 330, infoTop + 12);
      doc.fillColor("#0F172A").font("Helvetica-Bold").text(rollNumber, 410, infoTop + 12);

      doc.fillColor("#64748B").font("Helvetica").text("Examination:", 330, infoTop + 32);
      doc.fillColor("#0F172A").font("Helvetica-Bold").text(examName, 410, infoTop + 32);

      // ── Marks Table ────────────────────────────────────────────────────────
      const tableTop = 195;
      doc.rect(40, tableTop, 515, 24).fill("#1F4E79");
      doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(9);
      doc.text("SR.", 55, tableTop + 7);
      doc.text("SUBJECT", 95, tableTop + 7);
      doc.text("MAX MARKS", 260, tableTop + 7, { align: "center", width: 80 });
      doc.text("PASS MARKS", 350, tableTop + 7, { align: "center", width: 80 });
      doc.text("MARKS OBTAINED", 430, tableTop + 7, { align: "center", width: 110 });

      let currentY = tableTop + 24;

      const examSubjectsMap = new Map();
      (exam.subjects || []).forEach((s) => {
        examSubjectsMap.set(s.subjectName.toLowerCase().trim(), s);
      });

      const marksList = result.marksObtained || [];

      marksList.forEach((item, index) => {
        const subConfig = examSubjectsMap.get((item.subjectName || "").toLowerCase().trim()) || {
          maxMarks: 100,
          passingMarks: 35,
        };

        const isRowFail = item.marks < subConfig.passingMarks;
        const rowBg = index % 2 === 0 ? "#FFFFFF" : "#F8FAFC";

        doc.rect(40, currentY, 515, 22).fill(rowBg).stroke("#E2E8F0");
        doc.fillColor("#334155").font("Helvetica").fontSize(9);
        doc.text(String(index + 1), 55, currentY + 6);
        doc.text(item.subjectName, 95, currentY + 6);
        doc.text(String(subConfig.maxMarks), 260, currentY + 6, { align: "center", width: 80 });
        doc.text(String(subConfig.passingMarks), 350, currentY + 6, { align: "center", width: 80 });

        doc
          .font("Helvetica-Bold")
          .fillColor(isRowFail ? "#DC2626" : "#0F172A")
          .text(String(item.marks), 430, currentY + 6, { align: "center", width: 110 });

        currentY += 22;
      });

      // ── Table Summary Row ──────────────────────────────────────────────────
      doc.rect(40, currentY, 515, 24).fill("#F1F5F9").stroke("#CBD5E1");
      doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(9);
      doc.text("TOTAL AGGREGATE", 95, currentY + 7);
      doc.text(String(result.totalMaxMarks || 0), 260, currentY + 7, { align: "center", width: 80 });
      doc.text("-", 350, currentY + 7, { align: "center", width: 80 });
      doc.text(String(result.totalMarksObtained || 0), 430, currentY + 7, { align: "center", width: 110 });

      currentY += 35;

      // ── Score & Grade Summary Cards ────────────────────────────────────────
      const isPassed = result.overallStatus === "pass";

      doc.rect(40, currentY, 160, 60).fill("#F8FAFC").stroke("#E2E8F0");
      doc.fillColor("#64748B").font("Helvetica").fontSize(9).text("Percentage Score", 55, currentY + 12);
      doc
        .fillColor("#1F4E79")
        .font("Helvetica-Bold")
        .fontSize(20)
        .text(`${Number(result.percentage || 0).toFixed(1)}%`, 55, currentY + 28);

      doc.rect(215, currentY, 160, 60).fill("#F8FAFC").stroke("#E2E8F0");
      doc.fillColor("#64748B").font("Helvetica").fontSize(9).text("Letter Grade", 230, currentY + 12);
      doc
        .fillColor("#1F4E79")
        .font("Helvetica-Bold")
        .fontSize(20)
        .text(result.grade || "F", 230, currentY + 28);

      const statusBg = isPassed ? "#DCFCE7" : "#FEE2E2";
      const statusBorder = isPassed ? "#86EFAC" : "#FCA5A5";
      const statusColor = isPassed ? "#15803D" : "#B91C1C";

      doc.rect(390, currentY, 165, 60).fill(statusBg).stroke(statusBorder);
      doc.fillColor(statusColor).font("Helvetica").fontSize(9).text("Result Status", 405, currentY + 12);
      doc
        .fillColor(statusColor)
        .font("Helvetica-Bold")
        .fontSize(20)
        .text(isPassed ? "PASSED" : "FAILED", 405, currentY + 28);

      currentY += 75;

      // ── Teacher / AI Remarks Box ───────────────────────────────────────────
      doc.rect(40, currentY, 515, 65).fill("#F8FAFC").stroke("#E2E8F0");
      doc.fillColor("#1F4E79").font("Helvetica-Bold").fontSize(9).text("TEACHER REMARK & APPRAISAL", 55, currentY + 10);
      doc
        .fillColor("#334155")
        .font("Helvetica-Oblique")
        .fontSize(9)
        .text(
          result.remarks ||
            "Consistent participation and diligent efforts exhibited throughout this examination cycle.",
          55,
          currentY + 26,
          { width: 485, lineGap: 3 }
        );

      currentY += 95;

      // ── Signatures ─────────────────────────────────────────────────────────
      doc.strokeColor("#94A3B8").lineWidth(1).moveTo(65, currentY + 40).lineTo(205, currentY + 40).stroke();
      doc.fillColor("#64748B").font("Helvetica").fontSize(9).text("Class Teacher Signature", 65, currentY + 46, {
        align: "center",
        width: 140,
      });

      doc.strokeColor("#94A3B8").lineWidth(1).moveTo(385, currentY + 40).lineTo(525, currentY + 40).stroke();
      doc.fillColor("#64748B").font("Helvetica").fontSize(9).text("Principal / Head of School", 385, currentY + 46, {
        align: "center",
        width: 140,
      });

      // Footer
      doc
        .fillColor("#94A3B8")
        .fontSize(7.5)
        .text(
          "Grading Scale: A+ (>=90%), A (>=80%), B+ (>=70%), B (>=60%), C (>=50%), D (>=35%), F (<35% / Subject Fail)",
          40,
          740,
          { align: "center", width: 515 }
        );

      doc.end();

      stream.on("finish", () => {
        resolve(`/uploads/reportcards/${fileName}`);
      });

      stream.on("error", (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateReportCard;
