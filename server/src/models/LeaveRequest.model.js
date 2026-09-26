const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Applicant user ID is required"],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
    requesterRole: {
      type: String,
      enum: {
        values: ["student", "teacher", "staff"],
        message: "requesterRole must be student, teacher, or staff",
      },
      required: [true, "Requester role is required"],
    },
    leaveType: {
      type: String,
      enum: {
        values: ["sick", "casual", "emergency", "medical", "other"],
        message: "Invalid leave type",
      },
      default: "casual",
    },
    fromDate: {
      type: Date,
      required: [true, "Leave from date is required"],
    },
    toDate: {
      type: Date,
      required: [true, "Leave to date is required"],
    },
    reason: {
      type: String,
      required: [true, "Reason for leave is required"],
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
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    decisionRemarks: {
      type: String,
      trim: true,
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

leaveRequestSchema.index({ schoolId: 1, status: 1 });
leaveRequestSchema.index({ applicantId: 1, createdAt: -1 });

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
