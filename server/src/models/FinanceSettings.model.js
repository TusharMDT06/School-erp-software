const mongoose = require("mongoose");

/**
 * FinanceSettings — per-school financial configuration.
 * Auto-created with defaults on first GET if none exist.
 */
const financeSettingsSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School is required"],
      unique: true,
    },
    schoolDisplayName: { type: String, trim: true, default: "" },
    address:           { type: String, trim: true, default: "" },
    phone:             { type: String, trim: true, default: "" },
    receiptPrefix:     { type: String, default: "RCPT", trim: true, uppercase: true },
    upiId:             { type: String, trim: true, default: "" },
    expenseApprovalThreshold: { type: Number, default: 10000 }, // rupees
    refundApprovalRequired:   { type: Boolean, default: true },
    lateFee: {
      enabled:   { type: Boolean, default: false },
      graceDays: { type: Number, default: 5 },
      type:      { type: String, enum: ["flat", "per_day", "percent"], default: "flat" },
      value:     { type: Number, default: 0 },        // rupees / % depending on type
      maxCap:    { type: Number, default: 0 },         // rupees; 0 = no cap
    },
    paidLeavesPerMonth: { type: Number, default: 1 },  // used by payroll (7C)
    // Atomic receipt sequence counter — incremented on each collect
    receiptSeq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FinanceSettings", financeSettingsSchema);
