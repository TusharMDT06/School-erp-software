const mongoose = require("mongoose");

const academicEventSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: {
        values: ["holiday", "vacation", "half_day", "exam", "ptm", "event"],
        message: "Invalid event type",
      },
      required: [true, "Event type is required"],
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    audience: {
      type: String,
      enum: {
        values: ["all", "staff_only", "students_parents", "class_specific"],
        message: "Invalid audience type",
      },
      default: "all",
    },
    classIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ClassSection",
      },
    ],
    status: {
      type: String,
      enum: {
        values: ["draft", "published", "cancelled"],
        message: "Invalid event status",
      },
      default: "draft",
      index: true,
    },
    notifyChannels: {
      type: [
        {
          type: String,
          enum: ["email", "in_app", "sms", "whatsapp"],
        },
      ],
      default: ["email", "in_app"],
    },
    notificationStats: {
      startedAt: { type: Date, default: null },
      total: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      completedAt: { type: Date, default: null },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

academicEventSchema.index({ schoolId: 1, startDate: 1, endDate: 1 });
academicEventSchema.index({ schoolId: 1, status: 1 });
academicEventSchema.index({ schoolId: 1, type: 1, status: 1 });

module.exports = mongoose.model("AcademicEvent", academicEventSchema);
