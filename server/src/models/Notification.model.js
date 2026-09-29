const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      index: true,
    },
    type: {
      type: String,
      enum: [
        "general",
        "holiday_declared",
        "event_published",
        "event_updated",
        "event_cancelled",
        "circular_published",
        "circular_reminder",
        "approval_decided",
        "expense_approval_needed",
        "expense_decision",
        "payroll_approved",
        "payroll_generated",
        "leave_decision",
        "fee_payment",
        "student_at_risk",
        "substitution_assigned",
        "incident_parent_notified",
        "inquiry_followup_due",
        "inquiry_assigned",
        "inquiry_acknowledged",
        "monthly_report_ready",
        "principal_morning_brief",
      ],
      default: "general",
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      default: "",
      trim: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ schoolId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
