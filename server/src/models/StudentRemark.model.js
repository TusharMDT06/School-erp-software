const mongoose = require("mongoose");

const studentRemarkSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference is required"],
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student reference is required"],
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher reference is required"],
      index: true,
    },
    type: {
      type: String,
      enum: ["positive", "academic", "behavior", "concern"],
      required: [true, "Remark type is required"],
      index: true,
    },
    text: {
      type: String,
      required: [true, "Remark text is required"],
      trim: true,
    },
    visibleToParent: {
      type: Boolean,
      default: false,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    parentAcknowledged: {
      type: Boolean,
      default: false,
    },
    parentAcknowledgedAt: {
      type: Date,
      default: null,
    },
    editHistory: [
      {
        text: { type: String, required: true },
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

studentRemarkSchema.index({ studentId: 1, createdAt: -1 });
studentRemarkSchema.index({ schoolId: 1, teacherId: 1, createdAt: -1 });

module.exports = mongoose.model("StudentRemark", studentRemarkSchema);
