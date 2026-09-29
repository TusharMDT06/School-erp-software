const cron = require("node-cron");
const path = require("path");
const MonthlyReport = require("../models/MonthlyReport.model");
const School = require("../models/School.model");
const {
  computeMonthlySnapshot,
  generateExecutiveSummary,
  buildPdfReport,
  buildExcelReport,
  REPORTS_DIR,
} = require("../controllers/monthlyReport.controller");
const { notifyMany } = require("../services/notification.service");

/**
 * runMonthlyReportGen — Automatically generates previous month's MIS report for all schools.
 */
async function runMonthlyReportGen() {
  console.log("[Cron:MonthlyReport] Running 1st-of-month 7:00 AM MIS Report generation...");

  try {
    const schools = await School.find({ isActive: true }).lean();
    const now = new Date();
    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    for (const school of schools) {
      try {
        console.log(`[Cron:MonthlyReport] Generating MIS report for ${school.name} (${prevMonth}/${prevYear})...`);

        // 1. Compute Data
        const snapshot = await computeMonthlySnapshot(school._id, prevMonth, prevYear);

        // 2. Gemini Narrative
        const summaryText = await generateExecutiveSummary(snapshot, school.name);

        // 3. File Paths
        const pdfFilename = `MIS_${school._id}_${prevYear}_${prevMonth}.pdf`;
        const excelFilename = `MIS_${school._id}_${prevYear}_${prevMonth}.xlsx`;

        const pdfPath = path.join(REPORTS_DIR, pdfFilename);
        const excelPath = path.join(REPORTS_DIR, excelFilename);

        // 4. Build Files
        await Promise.all([
          buildPdfReport(snapshot, school, summaryText, pdfPath),
          buildExcelReport(snapshot, school, excelPath),
        ]);

        const pdfUrl = `/uploads/reports/${pdfFilename}`;
        const excelUrl = `/uploads/reports/${excelFilename}`;

        // 5. Upsert Record
        const report = await MonthlyReport.findOneAndUpdate(
          { schoolId: school._id, month: prevMonth, year: prevYear },
          {
            schoolId: school._id,
            month: prevMonth,
            year: prevYear,
            dataSnapshot: snapshot,
            summaryText,
            pdfUrl,
            excelUrl,
            generatedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        // 6. Notify Principal and Admin
        await notifyMany(
          {
            schoolId: school._id,
            role: { $in: ["principal", "admin", "superadmin"] },
            isActive: true,
          },
          {
            type: "monthly_report_ready",
            title: `Monthly MIS Report Ready (${prevMonth}/${prevYear})`,
            message: `The institutional executive report for ${prevMonth}/${prevYear} has been compiled and is ready for download in PDF and Excel formats.`,
            data: {
              reportId: report._id,
              month: prevMonth,
              year: prevYear,
              schoolId: school._id,
            },
            sendEmailFlag: true,
            schoolId: school._id,
          }
        );

        console.log(`[Cron:MonthlyReport] Report generated successfully for ${school.name}.`);
      } catch (schoolErr) {
        console.error(`[Cron:MonthlyReport] Failed for school ${school.name}:`, schoolErr.message);
      }
    }
  } catch (err) {
    console.error("[Cron:MonthlyReport Error]", err);
  }
}

/**
 * startMonthlyReportCron — 7:00 AM on the 1st of every month
 */
function startMonthlyReportCron() {
  // Cron schedule: 7:00 AM on 1st of month
  cron.schedule("0 7 1 * *", () => {
    runMonthlyReportGen();
  });
  console.log("[Cron] Monthly MIS Report Generator scheduled at 07:00 AM on 1st of every month.");
}

module.exports = { startMonthlyReportCron, runMonthlyReportGen };
