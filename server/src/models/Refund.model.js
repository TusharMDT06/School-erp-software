const mongoose = require("mongoose");

/**
 * Refund — fee refund with approval workflow.
 */
const refundSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeTransaction",
      required: [true, "Transaction is required"],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Refund amount (paise) is required"],
      min: [1, "Amount must be positive"],
    },
    reason: {
      type: String,
      required: [true, "Reason is required"],
      trim: true,
      minlength: [5, "Reason must be at least 5 characters"],
    },
    status: {
      type: String,
      enum: { values: ["pending", "approved", "rejected", "paid"], message: "Invalid status" },
      default: "pending",
    },
    mode: {
      type: String,
      enum: { values: ["cash", "bank", "online"], message: "Invalid mode" },
      default: "cash",
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedAt:   { type: Date, default: null },
    paidOn:      { type: Date, default: null },
    ledgerEntryId: { type: mongoose.Schema.Types.ObjectId, ref: "LedgerEntry", default: null },
  },
  { timestamps: true }
);

refundSchema.index({ schoolId: 1, status: 1 });
refundSchema.index({ transactionId: 1 });

module.exports = mongoose.model("Refund", refundSchema);
