const Student = require("../models/Student.model");
const sendEmail = require("./sendEmail");
const { getIO } = require("../config/socket");

/**
 * Asynchronously notifies the student's parents / guardians when marked absent:
 * 1. Sends an email notification via Resend
 * 2. Emits a real-time Socket.io event `attendance:absent` to the parent's personal room
 *
 * @param {string|ObjectId} studentId - Student record ID
 * @param {Date|string}      date      - Normalized attendance date
 */
const notifyAbsentee = async (studentId, date) => {
  try {
    const student = await Student.findById(studentId)
      .populate("userId", "name email")
      .populate("classId", "className section")
      .populate("guardianIds", "name email _id");

    if (!student) {
      console.warn(`[notifyAbsentee] Student not found for ID: ${studentId}`);
      return;
    }

    const studentName = student.userId?.name || "Student";
    const className = student.classId
      ? `${student.classId.className}-${student.classId.section}`
      : "Class";

    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const parents = student.guardianIds || [];
    const io = getIO();

    for (const parent of parents) {
      if (!parent) continue;

      // 1. Real-time Socket.io event
      if (io) {
        const roomName = `user:${parent._id.toString()}`;
        io.to(roomName).emit("attendance:absent", {
          studentId: student._id,
          studentName,
          className,
          date: formattedDate,
          message: `Attendance Alert: ${studentName} (${className}) has been marked ABSENT on ${formattedDate}.`,
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Email via Resend
      if (parent.email) {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg: 8px;">
            <div style="background-color: #1F4E79; padding: 16px; border-radius: 6px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px;">School ERP — Attendance Alert</h1>
            </div>
            <div style="padding: 20px 0; color: #334155; line-height: 1.6;">
              <p>Dear <strong>${parent.name || "Parent/Guardian"}</strong>,</p>
              <p>This is an automated notification to inform you that your child <strong>${studentName}</strong> (Class: <strong>${className}</strong>, Roll No: <strong>${student.rollNumber || "N/A"}</strong>) has been marked <span style="color: #dc2626; font-weight: bold; background-color: #fee2e2; padding: 2px 6px; border-radius: 4px;">ABSENT</span> on <strong>${formattedDate}</strong>.</p>
              <p>If you believe this is an error or if leave was pre-applied, please contact the class teacher or school administration.</p>
              <div style="margin-top: 24px; padding: 12px; background-color: #f8fafc; border-left: 4px solid #1F4E79; font-size: 13px; color: #64748b;">
                School Administration Office<br/>
                Automated Attendance Monitoring System
              </div>
            </div>
          </div>
        `;

        await sendEmail({
          to: parent.email,
          subject: `Attendance Alert: ${studentName} marked Absent on ${formattedDate}`,
          html: emailHtml,
        }).catch((err) => {
          console.warn(`[notifyAbsentee] Failed to send email to ${parent.email}:`, err.message);
        });
      }
    }
  } catch (error) {
    console.error("[notifyAbsentee] Error in absentee notification:", error.message);
    // Never throw — avoid breaking attendance marking flow
  }
};

module.exports = notifyAbsentee;
