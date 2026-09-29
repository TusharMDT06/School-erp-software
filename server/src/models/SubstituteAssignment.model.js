const mongoose = require("mongoose");

const substituteAssignmentSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference is required"],
      index: true,
    },
    date: {
      type: String,
      required: [true, "Date is required (YYYY-MM-DD)"],
      index: true,
    },
    periodRef: {
      type: String,
      required: [true, "Period reference is required (e.g. monday_1 or Period 1)"],
      trim: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassSection",
      required: [true, "Class section is required"],
      index: true,
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },
    absentTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Absent teacher reference is required"],
      index: true,
    },
    substituteTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Substitute teacher reference is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ["assigned", "acknowledged", "completed", "cancelled"],
      default: "assigned",
      index: true,
    },
    notes: {
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

// Unique on { date, periodRef, classId } to prevent duplicate assignment for same slot
substituteAssignmentSchema.index(
  { date: 1, periodRef: 1, classId: 1 },
  { unique: true }
);

substituteAssignmentSchema.index({ schoolId: 1, date: 1 });
substituteAssignmentSchema.index({ substituteTeacherId: 1, date: 1 });

module.exports = mongoose.model(
  "SubstituteAssignment",
  substituteAssignmentSchema
);
