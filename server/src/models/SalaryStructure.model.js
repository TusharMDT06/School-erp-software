const mongoose = require("mongoose");

const allowanceSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Allowance name is required"], trim: true },
    amount: { type: Number, required: [true, "Allowance amount in paise is required"], min: 0 },
  },
  { _id: false }
);

const deductionSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Deduction name is required"], trim: true },
    type: {
      type: String,
      enum: {
        values: ["fixed", "percent_of_basic"],
        message: "Deduction type must be 'fixed' or 'percent_of_basic'",
      },
      default: "fixed",
    },
    value: { type: Number, required: [true, "Deduction value is required"], min: 0 }, // paise if fixed, % if percent_of_basic
  },
  { _id: false }
);

const salaryStructureSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School is required"],
      index: true,
    },
    staffUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Staff user ID is required"],
      index: true,
    },
    staffRole: {
      type: String,
      required: [true, "Staff role is required"],
      trim: true,
    },
    basic: {
      type: Number,
      required: [true, "Basic salary in paise is required"],
      min: [0, "Basic salary cannot be negative"],
    },
    allowances: {
      type: [allowanceSchema],
      default: [],
    },
    deductions: {
      type: [deductionSchema],
      default: [],
    },
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// One active salary structure per staff member per school
salaryStructureSchema.index(
  { schoolId: 1, staffUserId: 1 },
  {
    unique: true,
    partialFilterExpression: { isActive: true },
  }
);

module.exports = mongoose.model("SalaryStructure", salaryStructureSchema);
