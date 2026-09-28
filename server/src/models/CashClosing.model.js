const mongoose = require("mongoose");

const cashClosingSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School is required"],
      index: true,
    },
    // Normalized date string "YYYY-MM-DD"
    date: {
      type: String,
      required: [true, "Date is required (YYYY-MM-DD)"],
      trim: true,
    },
    openingCash: {
      type: Number,
      required: true,
      default: 0, // paise
    },
    cashCollected: {
      type: Number,
      required: true,
      default: 0, // paise
    },
    cashExpensesAndRefunds: {
      type: Number,
      required: true,
      default: 0, // paise
    },
    expectedClosingCash: {
      type: Number,
      required: true,
      default: 0, // paise
    },
    actualCash: {
      type: Number,
      required: [true, "Actual physical cash count (paise) is required"],
    },
    difference: {
      type: Number,
      required: true,
      default: 0, // paise (actualCash - expectedClosingCash)
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Closed by user is required"],
    },
    closedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

cashClosingSchema.index({ schoolId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("CashClosing", cashClosingSchema);
