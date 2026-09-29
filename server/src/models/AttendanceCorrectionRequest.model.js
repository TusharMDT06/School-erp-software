const mongoose = require("mongoose");

const attendanceChangeItemSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    studentName: {
      type: String,
      default: "",
    },
    from: {
      type: String,
      enum: ["present", "absent", "late", "leave", "not_marked"],
      required: true,
    },
    to: {
      type: String,
      enum: ["present", "absent", "late", "leave"],
      required: true,
    },
  },
  { _id: false }
);

const attendanceCorrectionRequestSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference is required"],
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassSection",
      required: [true, "Class section reference is required"],
      index: true,
    },
    date: {
      type: Date,
      required: [true, "Attendance date to correct is required"],
      index: true,
    },
    changes: {
      type: [attendanceChangeItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one attendance change must be provided",
      },
    },
    reason: {
      type: String,
      required: [true, "Reason for attendance correction is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "approved", "rejected"],
        message: "Status must be pending, approved, or rejected",
      },
      default: "pending",
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Requesting user reference is required"],
      index: true,
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

attendanceCorrectionRequestSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
attendanceCorrectionRequestSchema.index({ classId: 1, date: 1 });

module.exports = mongoose.model("AttendanceCorrectionRequest", attendanceCorrectionRequestSchema);
