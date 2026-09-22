const FeeTransaction = require("../models/FeeTransaction.model");
const sendEmail = require("./sendEmail");

/**
 * Sends fee reminder emails via Resend to parents/guardians whose fee dueDate is within 3 days or overdue.
 *
 * @param {string|null} specificStudentId - Optional studentId for targeted manual reminder
 * @returns {Promise<{ sentCount: number, failedCount: number }>}
 */
const sendFeeReminder = async (specificStudentId = null) => {
  let sentCount = 0;
  let failedCount = 0;

  try {
    const filter = {
      status: { $in: ["pending", "partial", "overdue"] },
    };

    if (specificStudentId) {
      filter.studentId = specificStudentId;
    }

    const transactions = await FeeTransaction.find(filter)
      .populate({
        path: "studentId",
        select: "rollNumber admissionNumber userId guardianIds classId",
        populate: [
          { path: "userId", select: "name email" },
          { path: "guardianIds", select: "name email" },
          { path: "classId", select: "className section" },
        ],
      })
      .populate("feeStructureId");

    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    for (const tx of transactions) {
      const feeStructure = tx.feeStructureId;
      if (!feeStructure) continue;

      const dueDate = new Date(feeStructure.dueDate);
      const isOverdue = dueDate < now;
      const isDueSoon = dueDate <= threeDaysFromNow && dueDate >= now;

      // If manual target, send regardless; if batch cron, send if dueSoon or overdue
      if (!specificStudentId && !isOverdue && !isDueSoon) {
        continue;
      }

      // Update status to overdue if past dueDate and still pending
      if (isOverdue && tx.status === "pending") {
        tx.status = "overdue";
        await tx.save();
      }

      const student = tx.studentId;
      if (!student) continue;

      const studentName = student.userId?.name || "Student";
      const className = student.classId
        ? `${student.classId.className}-${student.classId.section}`
        : "Class";
      const pendingAmount = Math.max(0, tx.amountDue - tx.amountPaid);
      const formattedDueDate = dueDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const term = (feeStructure.term || "Fee").toUpperCase();
      const parents = student.guardianIds || [];
      const recipientEmails = parents
        .map((p) => p?.email)
        .filter(Boolean);

      if (recipientEmails.length === 0 && student.userId?.email) {
        recipientEmails.push(student.userId.email);
      }

      if (recipientEmails.length === 0) continue;

      const subject = isOverdue
        ? `⚠️ Urgent: School Fee Payment Overdue — ${studentName}`
        : `🔔 Reminder: School Fee Due Soon (${formattedDueDate}) — ${studentName}`;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <div style="background-color: ${isOverdue ? "#b91c1c" : "#1F4E79"}; padding: 18px; border-radius: 6px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px;">School ERP — Fee Reminder</h1>
          </div>
          <div style="padding: 20px 0; color: #334155; line-height: 1.6;">
            <p>Dear Parent / Guardian,</p>
            <p>This is a notification regarding the pending fee for your ward <strong>${studentName}</strong> (Class: <strong>${className}</strong>, Roll No: <strong>${student.rollNumber || "N/A"}</strong>).</p>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr>
                  <td style="color: #64748b; padding: 6px 0;">Fee Term:</td>
                  <td style="font-weight: bold; text-align: right;">${term} (${feeStructure.academicYear})</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 6px 0;">Due Date:</td>
                  <td style="font-weight: bold; text-align: right; color: ${isOverdue ? "#b91c1c" : "#0f172a"};">${formattedDueDate} ${isOverdue ? "(OVERDUE)" : ""}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 6px 0;">Total Amount:</td>
                  <td style="text-align: right;">INR ${tx.amountDue.toFixed(2)}</td>
                </tr>
                <tr style="border-top: 1px solid #cbd5e1; font-weight: bold;">
                  <td style="padding: 8px 0; color: #1F4E79;">Pending Balance:</td>
                  <td style="padding: 8px 0; text-align: right; color: #b91c1c; font-size: 16px;">INR ${pendingAmount.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <p>Please log in to your School ERP Parent Portal to securely pay online via UPI, Credit/Debit Card, or Net Banking.</p>

            <div style="text-align: center; margin: 25px 0;">
              <a href="${process.env.CLIENT_URL || "http://localhost:5173"}/parent/fees" style="background-color: #1F4E79; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Pay Fees Online</a>
            </div>

            <p style="font-size: 12px; color: #94a3b8; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
              If you have already made this payment in cash or bank transfer, please disregard this reminder.
            </p>
          </div>
        </div>
      `;

      try {
        await sendEmail({
          to: recipientEmails,
          subject,
          html: emailHtml,
        });
        sentCount++;
      } catch (err) {
        console.warn(`[sendFeeReminder] Failed sending to ${recipientEmails.join(", ")}:`, err.message);
        failedCount++;
      }
    }
  } catch (error) {
    console.error("[sendFeeReminder] Error in reminder process:", error.message);
  }

  return { sentCount, failedCount };
};

module.exports = sendFeeReminder;
