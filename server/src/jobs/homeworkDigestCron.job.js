const cron = require("node-cron");
const Homework = require("../models/Homework.model");
const Student = require("../models/Student.model");
const User = require("../models/User.model");
const { notify } = require("../services/notification.service");

/**
 * Homework Daily Digest Cron
 * Runs every day at 6:00 PM (18:00).
 * Consolidates all homework assigned today and sends ONE digest email per student and parent.
 */
const startHomeworkDigestCron = () => {
  cron.schedule("0 18 * * *", async () => {
    console.log("[cron:homeworkDigest] Running 6:00 PM daily homework digest job...");
    try {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const todayEnd = new Date(now.setHours(23, 59, 59, 999));

      // Find all homework assigned today
      const todayHomeworkList = await Homework.find({
        status: "published",
        createdAt: { $gte: todayStart, $lte: todayEnd },
      }).lean();

      if (todayHomeworkList.length === 0) {
        console.log("[cron:homeworkDigest] No homework assigned today. Skipping digest.");
        return;
      }

      console.log(`[cron:homeworkDigest] Found ${todayHomeworkList.length} homework assignment(s) created today.`);

      // Group homework by classId
      const classHomeworkMap = new Map();
      todayHomeworkList.forEach((hw) => {
        const cId = hw.classId.toString();
        if (!classHomeworkMap.has(cId)) {
          classHomeworkMap.set(cId, []);
        }
        classHomeworkMap.get(cId).push({
          id: hw._id,
          title: hw.title,
          subject: hw.subject,
          dueDate: hw.dueDate,
          description: hw.description,
        });
      });

      // For each class, find enrolled students and their parents
      for (const [classId, homeworks] of classHomeworkMap.entries()) {
        const students = await Student.find({
          classId,
          isAccountActivated: true,
        })
          .select("userId parentPhone parentEmail name")
          .lean();

        for (const student of students) {
          const hwSummaryMessage = homeworks
            .map((h) => `• ${h.subject}: "${h.title}" (Due: ${new Date(h.dueDate).toLocaleDateString("en-IN")})`)
            .join("\n");

          // 1. Notify Student
          if (student.userId) {
            await notify(student.userId, {
              type: "homework_digest",
              title: `Daily Homework Digest (${homeworks.length} assigned)`,
              message: `Here is your daily homework digest for today:\n${hwSummaryMessage}`,
              data: {
                homeworkList: homeworks,
                date: new Date(),
              },
              sendEmailFlag: true,
            }).catch((err) => console.warn(`[cron:homeworkDigest] student notify error:`, err.message));
          }

          // 2. Notify Parent (Find user by phone or email)
          if (student.parentPhone || student.parentEmail) {
            const parentUser = await User.findOne({
              role: "parent",
              $or: [
                ...(student.parentPhone ? [{ phone: student.parentPhone }] : []),
                ...(student.parentEmail ? [{ email: student.parentEmail }] : []),
              ],
            }).select("_id");

            if (parentUser) {
              await notify(parentUser._id, {
                type: "homework_digest",
                title: `Daily Homework Digest for ${student.name}`,
                message: `Here is the homework assigned today for ${student.name}:\n${hwSummaryMessage}`,
                data: {
                  homeworkList: homeworks,
                  studentName: student.name,
                  date: new Date(),
                },
                sendEmailFlag: true,
              }).catch((err) => console.warn(`[cron:homeworkDigest] parent notify error:`, err.message));
            }
          }
        }
      }

      console.log("[cron:homeworkDigest] 6:00 PM daily digest completed successfully.");
    } catch (err) {
      console.error("[cron:homeworkDigest] Error executing job:", err.message);
    }
  });

  console.log("📚 Homework Daily Digest cron scheduled for 6:00 PM daily.");
};

module.exports = {
  startHomeworkDigestCron,
};
