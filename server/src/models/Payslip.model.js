const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const payslipSchema = new mongoose.Schema(
  {
    runId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayrollRun",
      required: [true, "Payroll run reference is required"],
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference is required"],
      index: true,
    },
    staffUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Staff user reference is required"],
      index: true,
    },
    staffName: {
      type: String,
      required: [true, "Staff name is required"],
      trim: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    workingDays: {
      type: Number,
      required: true,
      min: 0,
    },
    presentDays: {
      type: Number,
      required: true,
      min: 0,
    },
    unpaidLeaveDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    earnings: {
      type: [itemSchema],
      default: [],
    },
    deductions: {
      type: [itemSchema],
      default: [],
    },
    lopDeduction: {
      type: Number,
      default: 0,
      min: 0,
    },
    bonus: {
      type: Number,
      default: 0,
      min: 0,
    },
    adjustmentNote: {
      type: String,
      default: "",
      trim: true,
    },
    gross: {
      type: Number,
      required: true,
      min: 0,
    },
    totalDeductions: {
      type: Number,
      required: true,
      min: 0,
    },
    netPay: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "approved", "paid"],
        message: "Status must be draft, approved, or paid",
      },
      default: "draft",
      index: true,
    },
    paymentMode: {
      type: String,
      enum: ["cash", "bank", "online", null],
      default: null,
    },
    paidOn: {
      type: Date,
      default: null,
    },
    payslipUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

payslipSchema.index({ runId: 1, staffUserId: 1 }, { unique: true });
payslipSchema.index({ schoolId: 1, staffUserId: 1, month: 1, year: 1 });

module.exports = mongoose.model("Payslip", payslipSchema);
