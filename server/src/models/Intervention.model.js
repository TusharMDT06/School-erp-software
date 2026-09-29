const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const interventionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student reference is required"],
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference is required"],
      index: true,
    },
    riskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentRisk",
      default: null,
    },
    type: {
      type: String,
      enum: [
        "counselling",
        "parent_meeting",
        "remedial_classes",
        "mentoring",
        "other",
      ],
      required: [true, "Intervention type is required"],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assignee is required"],
      index: true,
    },
    notes: {
      type: [noteSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    outcome: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator reference is required"],
    },
  },
  { timestamps: true }
);

interventionSchema.index({ schoolId: 1, studentId: 1, status: 1 });

module.exports = mongoose.model("Intervention", interventionSchema);
