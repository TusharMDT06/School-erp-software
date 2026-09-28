const mongoose = require("mongoose");

/**
 * FeeConcession — concession/scholarship records with approval workflow.
 */
const feeConcessionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required"],
    },
    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ["sibling", "merit", "staff_ward", "need_based", "custom"],
        message: "Invalid concession type",
      },
      required: true,
    },
    valueType: {
      type: String,
      enum: { values: ["percent", "fixed"], message: "valueType must be percent or fixed" },
      required: true,
    },
    value: {
      type: Number,
      required: [true, "Concession value is required"],
      min: [0, "Value cannot be negative"],
    },
    applyOn: {
      type: String,
      default: "total",
      trim: true,
    },
    reason: {
      type: String,
      required: [true, "Reason is required"],
      trim: true,
      minlength: [5, "Reason must be at least 5 characters"],
    },
    status: {
      type: String,
      enum: { values: ["pending", "approved", "rejected"], message: "Invalid status" },
      default: "pending",
    },
    requestedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedBy:      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt:      { type: Date, default: null },
    decisionRemarks:{ type: String, default: "" },
  },
  { timestamps: true }
);

feeConcessionSchema.index({ schoolId: 1, studentId: 1, status: 1 });

module.exports = mongoose.model("FeeConcession", feeConcessionSchema);
