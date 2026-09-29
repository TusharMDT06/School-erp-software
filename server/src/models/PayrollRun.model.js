const mongoose = require("mongoose");

const payrollRunSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference is required"],
      index: true,
    },
    month: {
      type: Number,
      required: [true, "Month is required"],
      min: [1, "Month must be between 1 and 12"],
      max: [12, "Month must be between 1 and 12"],
    },
    year: {
      type: Number,
      required: [true, "Year is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "approved", "paid", "rejected"],
        message: "Status must be draft, approved, paid, or rejected",
      },
      default: "draft",
      index: true,
    },
    totalGross: {
      type: Number,
      default: 0,
      min: [0, "Total gross cannot be negative"],
    },
    totalDeductions: {
      type: Number,
      default: 0,
      min: [0, "Total deductions cannot be negative"],
    },
    totalNet: {
      type: Number,
      default: 0,
      min: [0, "Total net cannot be negative"],
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Generated-by user reference is required"],
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    paidOn: {
      type: Date,
      default: null,
    },
    paymentMode: {
      type: String,
      enum: ["cash", "bank", "online", null],
      default: null,
    },
  },
  { timestamps: true }
);

// One payroll run per month/year per school
payrollRunSchema.index({ schoolId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("PayrollRun", payrollRunSchema);
