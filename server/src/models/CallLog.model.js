const mongoose = require("mongoose");

const callLogSchema = new mongoose.Schema(
  {
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient parent user ID is required"],
    },
    recipientPhone: {
      type: String,
      required: [true, "Recipient phone number is required"],
      trim: true,
    },
    reason: {
      type: String,
      enum: {
        values: ["leave_approved", "fee_overdue"],
        message: "Reason must be either 'leave_approved' or 'fee_overdue'",
      },
      required: [true, "Alert reason is required"],
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Related entity ID (LeaveRequest or FeeTransaction) is required"],
    },
    message: {
      type: String,
      required: [true, "Alert message content is required"],
      trim: true,
    },
    callStatus: {
      type: String,
      enum: {
        values: ["initiated", "completed", "failed", "no-answer", "busy"],
        message: "callStatus must be initiated, completed, failed, no-answer, or busy",
      },
      default: "initiated",
    },
    twilioCallSid: {
      type: String,
      trim: true,
      default: null,
    },
    smsFallbackSent: {
      type: Boolean,
      default: false,
    },
    smsFallbackSid: {
      type: String,
      trim: true,
      default: null,
    },
    smsFallbackStatus: {
      type: String,
      enum: {
        values: ["not_sent", "sent", "failed"],
        message: "smsFallbackStatus must be not_sent, sent, or failed",
      },
      default: "not_sent",
    },
    whatsappFallbackSent: {
      type: Boolean,
      default: false,
    },
    whatsappFallbackSid: {
      type: String,
      trim: true,
      default: null,
    },
    whatsappFallbackStatus: {
      type: String,
      enum: {
        values: ["not_sent", "sent", "failed"],
        message: "whatsappFallbackStatus must be not_sent, sent, or failed",
      },
      default: "not_sent",
    },
  },
  { timestamps: true }
);

// Compound index to prevent duplicate alerts for the same event
callLogSchema.index({ reason: 1, relatedEntityId: 1 });
// Index for fast webhook callback matching by Twilio Call SID
callLogSchema.index({ twilioCallSid: 1 });
// Index for safety-net cron lookups
callLogSchema.index({ callStatus: 1, createdAt: 1, smsFallbackSent: 1 });

module.exports = mongoose.model("CallLog", callLogSchema);
