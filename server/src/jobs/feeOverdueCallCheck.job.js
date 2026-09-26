const cron = require("node-cron");
const FeeStructure = require("../models/FeeStructure.model");
const FeeTransaction = require("../models/FeeTransaction.model");
const Student = require("../models/Student.model");
const User = require("../models/User.model");
const ClassSection = require("../models/ClassSection.model");
const CallLog = require("../models/CallLog.model");
const { sendParentAlert } = require("../services/parentAlert.service");

/**
 * Scans all overdue fee transactions, identifies qualifying accounts
 * with no voice call alert in the last 3 days, and initiates automated calls.
 */
const runFeeOverdueCallCheck = async () => {
  try {
    console.log("⏰ [Fee Overdue Call Job] Starting overdue fee scan for automated calls...");

    const now = new Date();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    // Find all transactions that are overdue or pending with passed due date
    const transactions = await FeeTransaction.find({
      status: { $in: ["overdue", "pending", "partial"] },
      $expr: { $gt: ["$amountDue", "$amountPaid"] },
    })
      .populate("feeStructureId")
      .populate({
        path: "studentId",
        populate: [
          { path: "userId", select: "name phone email" },
          { path: "guardianIds", select: "name phone email" },
        ],
      });

    let alertedCount = 0;
    let skippedCount = 0;

    for (const tx of transactions) {
      if (!tx.studentId || !tx.feeStructureId) continue;

      const dueDate = new Date(tx.feeStructureId.dueDate);
      const isPastDue = dueDate < now;

      // Only alert if transaction status is overdue OR due date has elapsed
      if (tx.status !== "overdue" && !isPastDue) {
        continue;
      }

      // Auto-update status to overdue if past due
      if (tx.status !== "overdue" && isPastDue) {
        tx.status = "overdue";
        await tx.save().catch(() => {});
      }

      // ── Anti-Spam Check: Max 1 call per 3 days per transaction ──────────
      const existingRecentCall = await CallLog.findOne({
        reason: "fee_overdue",
        relatedEntityId: tx._id,
        createdAt: { $gte: threeDaysAgo },
      });

      if (existingRecentCall) {
        skippedCount++;
        continue;
      }

      // Retrieve student and primary guardian details
      const student = tx.studentId;
      const studentName = student.name || student.userId?.name || "Student";

      // Primary guardian is guardianIds[0]
      const primaryGuardian =
        Array.isArray(student.guardianIds) && student.guardianIds.length > 0
          ? student.guardianIds[0]
          : null;

      const parentPhone = primaryGuardian?.phone || student.userId?.phone;
      const parentUserId = primaryGuardian?._id || student.userId?._id;

      if (!parentPhone || !parentUserId) {
        console.warn(
          `⚠️ [Fee Overdue Call Job] No guardian or student phone number found for Student: "${studentName}" (Tx ID: ${tx._id})`
        );
        continue;
      }

      const remainingAmount = Math.max(0, tx.amountDue - tx.amountPaid);

      // Trigger the parent alert (fire-and-forget orchestrator)
      await sendParentAlert({
        parentUserId,
        parentPhone,
        studentName,
        reason: "fee_overdue",
        relatedEntityId: tx._id,
        contextData: {
          amountDue: remainingAmount,
          dueDate: tx.feeStructureId.dueDate,
        },
      });

      alertedCount++;
    }

    console.log(
      `✅ [Fee Overdue Call Job] Completed scan. Alerted: ${alertedCount}, Skipped (Recent alert <3 days): ${skippedCount}`
    );

    return { alertedCount, skippedCount };
  } catch (error) {
    console.error("❌ [Fee Overdue Call Job Error]:", error.message);
    return { error: error.message };
  }
};

/**
 * Initializes the automated daily fee overdue call check.
 * Runs every day at 10:00 AM server time.
 */
const initFeeOverdueCallJob = () => {
  // Cron schedule: At 10:00 AM every day
  cron.schedule("0 10 * * *", async () => {
    console.log("⏰ [Cron Job] Running daily 10:00 AM fee overdue call check...");
    await runFeeOverdueCallCheck();
  });

  console.log("🕒 Fee Overdue Call cron job scheduled (Daily at 10:00 AM).");
};

module.exports = {
  initFeeOverdueCallJob,
  runFeeOverdueCallCheck,
};
