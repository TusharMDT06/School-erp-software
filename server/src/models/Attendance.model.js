const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student reference is required"],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassSection",
      required: [true, "Class section reference is required"],
    },
    date: {
      type: Date,
      required: [true, "Attendance date is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["present", "absent", "late", "leave"],
        message: "Status must be present, absent, late, or leave",
      },
      required: [true, "Attendance status is required"],
    },
    remarks: {
      type: String,
      trim: true,
      default: null,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher reference (markedBy) is required"],
    },
  },
  { timestamps: true }
);

// Compound unique index — prevents duplicate attendance entries for the same student on the same day
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

// Index for fast class-wise daily lookups and date ranges
attendanceSchema.index({ classId: 1, date: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
