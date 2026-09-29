const cron = require("node-cron");
const Homework = require("../models/Homework.model");
const HomeworkSubmission = require("../models/HomeworkSubmission.model");
const Student = require("../models/Student.model");
const User = require("../models/User.model");
const { notifyMany } = require("../services/notification.service");

/**
 * Homework Due Reminder Cron
 * Runs every day at 5:00 PM (17:00).
 * Reminds students who have homework due tomorrow and have not yet submitted.
 */
const startHomeworkDueReminderCron = () => {
  // Run daily at 5:00 PM
  cron.schedule("0 17 * * *", async () => {
    console.log("[cron:homeworkDueReminder] Running 5:00 PM check for homework due tomorrow...");
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0));
      const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999));

      // Find all published homework due tomorrow
      const homeworkDueTomorrow = await Homework.find({
        status: "published",
        dueDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
      }).lean();

      if (homeworkDueTomorrow.length === 0) {
        console.log("[cron:homeworkDueReminder] No homework due tomorrow.");
        return;
      }

      console.log(`[cron:homeworkDueReminder] Found ${homeworkDueTomorrow.length} homework item(s) due tomorrow.`);

      for (const hw of homeworkDueTomorrow) {
        // Find existing submissions
        const submissions = await HomeworkSubmission.find({
          homeworkId: hw._id,
          status: { $in: ["submitted", "reviewed"] },
        }).select("studentId");

        const submittedIds = new Set(submissions.map((s) => s.studentId.toString()));

        // Find students in class
        const students = await Student.find({
          classId: hw.classId,
          isAccountActivated: true,
          userId: { $ne: null },
        })
          .select("userId parentPhone")
          .lean();

        const pendingStudents = students.filter((s) => !submittedIds.has(s._id.toString()));
        if (pendingStudents.length === 0) continue;

        const studentUserIds = pendingStudents.map((s) => s.userId).filter(Boolean);

        if (studentUserIds.length > 0) {
          await notifyMany(studentUserIds, {
            type: "homework_due_reminder",
            title: `Homework Due Tomorrow: ${hw.subject}`,
            message: `"${hw.title}" is due tomorrow (${new Date(hw.dueDate).toLocaleDateString("en-IN")}). Please submit on time!`,
            data: {
              homeworkId: hw._id,
              homeworkTitle: hw.title,
              subject: hw.subject,
              dueDate: hw.dueDate,
              schoolId: hw.schoolId,
            },
            schoolId: hw.schoolId,
            sendEmailFlag: true,
          });
        }
      }

      console.log("[cron:homeworkDueReminder] Completed successfully.");
    } catch (err) {
      console.error("[cron:homeworkDueReminder] Error executing job:", err.message);
    }
  });

  console.log("⏰ Homework Due Reminder cron scheduled for 5:00 PM daily.");
};

module.exports = {
  startHomeworkDueReminderCron,
};
