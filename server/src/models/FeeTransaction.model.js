const mongoose = require("mongoose");

const feeTransactionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required"],
    },
    feeStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeStructure",
      required: [true, "Fee structure is required"],
    },
    amountDue: {
      type: Number,
      required: [true, "Amount due is required"],
      min: [0, "Amount due cannot be negative"],
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: [0, "Amount paid cannot be negative"],
    },
    paymentMode: {
      type: String,
      enum: {
        values: ["online", "cash", "cheque", "bank_transfer"],
        message: "Payment mode must be online, cash, cheque, or bank_transfer",
      },
      default: "online",
    },
    razorpayOrderId: {
      type: String,
      trim: true,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      default: null,
    },
    razorpaySignature: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "paid", "partial", "overdue", "failed"],
        message: "Status must be pending, paid, partial, overdue, or failed",
      },
      default: "pending",
    },
    paidOn: {
      type: Date,
      default: null,
    },
    receiptUrl: {
      type: String,
      default: null,
    },
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
  },
  { timestamps: true }
);

// Index on { studentId, status } for fast defaulter / pending fee lookups
feeTransactionSchema.index({ studentId: 1, status: 1 });
feeTransactionSchema.index({ feeStructureId: 1 });
feeTransactionSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.model("FeeTransaction", feeTransactionSchema);
