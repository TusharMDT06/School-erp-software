const mongoose = require("mongoose");

const substituteSuggestionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference is required"],
      index: true,
    },
    leaveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LeaveRequest",
      default: null,
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Absent teacher reference is required"],
      index: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: [true, "Date is required (YYYY-MM-DD)"],
      index: true,
    },
    periodRef: {
      type: String,
      required: [true, "Period reference is required"],
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
    coverNotes: {
      type: String,
      default: "",
      trim: true,
    },
    suggestedSubstituteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

substituteSuggestionSchema.index({ schoolId: 1, date: 1 });
substituteSuggestionSchema.index({ teacherId: 1, date: 1 });

module.exports = mongoose.model("SubstituteSuggestion", substituteSuggestionSchema);
