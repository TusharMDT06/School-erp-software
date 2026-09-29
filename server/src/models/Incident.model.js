const mongoose = require("mongoose");

const incidentAttachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const incidentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference is required"],
      index: true,
    },
    studentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
      },
    ],
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reporter reference is required"],
      index: true,
    },
    date: {
      type: Date,
      required: [true, "Incident date is required"],
      default: Date.now,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "bullying",
        "misconduct",
        "damage",
        "absenteeism",
        "safety",
        "health",
        "other",
      ],
      required: [true, "Category is required"],
      index: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      required: [true, "Severity level is required"],
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    actionTaken: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["open", "under_review", "closed"],
      default: "open",
      index: true,
    },
    followUpDate: {
      type: Date,
      default: null,
    },
    parentNotified: {
      type: Boolean,
      default: false,
    },
    parentNotifiedAt: {
      type: Date,
      default: null,
    },
    attachments: {
      type: [incidentAttachmentSchema],
      default: [],
    },
    confidential: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

incidentSchema.index({ schoolId: 1, date: -1 });
incidentSchema.index({ schoolId: 1, status: 1 });
incidentSchema.index({ studentIds: 1 });

module.exports = mongoose.model("Incident", incidentSchema);
