const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School is required"],
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      required: [true, "Category is required"],
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    amount: {
      type: Number,
      required: [true, "Amount (paise) is required"],
      min: [1, "Amount must be at least 1 paisa"],
    },
    expenseDate: {
      type: Date,
      required: [true, "Expense date is required"],
    },
    paymentMode: {
      type: String,
      enum: {
        values: ["cash", "bank", "online"],
        message: "Payment mode must be cash, bank, or online",
      },
      required: [true, "Payment mode is required"],
    },
    billNumber: {
      type: String,
      trim: true,
      default: "",
    },
    billUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "pending_approval", "approved", "rejected", "paid"],
        message: "Invalid expense status",
      },
      default: "draft",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
    decisionRemarks: {
      type: String,
      trim: true,
      default: "",
    },
    paidOn: {
      type: Date,
      default: null,
    },
    ledgerEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LedgerEntry",
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
expenseSchema.index({ schoolId: 1, expenseDate: -1 });
expenseSchema.index({ schoolId: 1, status: 1 });
expenseSchema.index({ schoolId: 1, categoryId: 1 });
expenseSchema.index({ schoolId: 1, vendorId: 1 });

module.exports = mongoose.model("Expense", expenseSchema);
