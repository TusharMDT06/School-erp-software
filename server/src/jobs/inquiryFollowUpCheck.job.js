const cron = require("node-cron");
const AdmissionInquiry = require("../models/AdmissionInquiry.model");
const School = require("../models/School.model");
const { isWorkingDay } = require("../utils/workingDay");
const { notify } = require("../services/notification.service");

/**
 * runInquiryFollowUpCheck — Evaluates pending follow-ups for all schools.
 */
async function runInquiryFollowUpCheck() {
  console.log("[Cron:InquiryFollowUp] Running 9 AM daily follow-up check...");

  try {
    const schools = await School.find({ isActive: true }).select("_id name").lean();
    const today = new Date();
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    for (const school of schools) {
      // 1. Skip non-working days for this school
      const workCheck = await isWorkingDay(school._id, today);
      if (!workCheck.isWorkingDay) {
        console.log(`[Cron:InquiryFollowUp] Skipping school ${school.name} (${workCheck.reason}).`);
        continue;
      }

      // 2. Find inquiries with follow-up due on or before today
      const dueInquiries = await AdmissionInquiry.find({
        schoolId: school._id,
        nextFollowUpAt: { $lte: endOfToday },
        status: { $nin: ["admitted", "rejected", "lost"] },
        assignedTo: { $ne: null },
      })
        .select("childName parentName phone applyingForClass nextFollowUpAt assignedTo")
        .lean();

      if (dueInquiries.length === 0) continue;

      // 3. Group by assigned staff
      const groupedByAssignee = {};
      for (const inq of dueInquiries) {
        const uid = inq.assignedTo.toString();
        if (!groupedByAssignee[uid]) groupedByAssignee[uid] = [];
        groupedByAssignee[uid].push(inq);
      }

      // 4. Send digest notification and email to each staff member
      for (const [assigneeId, items] of Object.entries(groupedByAssignee)) {
        const dueCount = items.length;
        const topChildren = items
          .slice(0, 3)
          .map((i) => i.childName)
          .join(", ");
        const moreSuffix = dueCount > 3 ? ` and ${dueCount - 3} more` : "";

        await notify(assigneeId, {
          type: "inquiry_followup_due",
          title: `${dueCount} Admission Follow-up${dueCount > 1 ? "s" : ""} Due Today`,
          message: `You have ${dueCount} prospective admission inquiries scheduled for follow-up today (${topChildren}${moreSuffix}).`,
          data: {
            dueCount,
            schoolId: school._id,
          },
          sendEmailFlag: true,
          schoolId: school._id,
        });
      }

      console.log(
        `[Cron:InquiryFollowUp] Dispatched follow-up reminders to ${Object.keys(groupedByAssignee).length} staff members for ${dueInquiries.length} leads in school ${school.name}.`
      );
    }
  } catch (err) {
    console.error("[Cron:InquiryFollowUp Error]", err);
  }
}

/**
 * startInquiryCron — Schedules daily 9:00 AM follow-up alert
 */
function startInquiryCron() {
  // Cron schedule: 9:00 AM every day
  cron.schedule("0 9 * * *", () => {
    runInquiryFollowUpCheck();
  });
  console.log("[Cron] Admissions Follow-up Check scheduled at 09:00 AM daily.");
}

module.exports = { startInquiryCron, runInquiryFollowUpCheck };
