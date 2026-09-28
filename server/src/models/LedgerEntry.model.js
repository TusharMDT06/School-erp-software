const mongoose = require("mongoose");

/**
 * LedgerEntry — IMMUTABLE single source of truth for money movement.
 * Rows are INSERT-ONLY. Pre-hooks on update/delete operations throw errors.
 */
const ledgerEntrySchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School is required"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    account: {
      type: String,
      enum: { values: ["cash", "bank", "online"], message: "Invalid account type" },
      required: true,
    },
    direction: {
      type: String,
      enum: { values: ["in", "out"], message: "Direction must be in or out" },
      required: true,
    },
    category: {
      type: String,
      enum: {
        values: ["fee_collection", "refund", "expense", "payroll", "reversal", "other_income"],
        message: "Invalid category",
      },
      required: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount (paise) is required"],
      min: [1, "Amount must be positive"],
    },
    referenceType: { type: String, default: null },  // "FeeTransaction", "Refund", etc.
    referenceId:   { type: mongoose.Schema.Types.ObjectId, default: null },
    narration:     { type: String, trim: true, default: "" },
    reversalOf:    { type: mongoose.Schema.Types.ObjectId, ref: "LedgerEntry", default: null },
    createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// ── Immutability pre-hooks ─────────────────────────────────────────────────
const IMMUTABLE_ERR = () => {
  throw new Error("LedgerEntry is immutable — updates and deletes are not allowed.");
};

ledgerEntrySchema.pre("updateOne",        IMMUTABLE_ERR);
ledgerEntrySchema.pre("findOneAndUpdate", IMMUTABLE_ERR);
ledgerEntrySchema.pre("deleteOne",        IMMUTABLE_ERR);
ledgerEntrySchema.pre("deleteMany",       IMMUTABLE_ERR);
ledgerEntrySchema.pre("findOneAndDelete", IMMUTABLE_ERR);

// ── Indexes ────────────────────────────────────────────────────────────────
ledgerEntrySchema.index({ schoolId: 1, date: -1 });
ledgerEntrySchema.index({ referenceType: 1, referenceId: 1 });

module.exports = mongoose.model("LedgerEntry", ledgerEntrySchema);
