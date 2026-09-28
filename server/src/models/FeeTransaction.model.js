const mongoose = require("mongoose");

// ── Sub-schema: individual payment split ──────────────────────────────────
const paymentSplitSchema = new mongoose.Schema(
  {
    mode: {
      type: String,
      enum: {
        values: ["cash", "cheque", "upi", "card", "netbanking", "online"],
        message: "Invalid payment mode",
      },
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },   // paise
    reference: { type: String, default: "" },            // UPI ref, txn id
    chequeNo:   { type: String, default: "" },
    chequeBank: { type: String, default: "" },
    chequeDate: { type: Date,   default: null },
    chequeStatus: {
      type: String,
      enum: ["na", "pending_clearance", "cleared", "bounced"],
      default: "na",
    },
    paidOn: { type: Date, default: null },
  },
  { _id: true }
);

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
    installmentNo: { type: Number, default: null },       // null = no installment
    amountDue:  { type: Number, required: true, min: 0 }, // paise
    amountPaid: { type: Number, default: 0,    min: 0 },  // paise

    // Frozen at collect time (computed on read before that)
    concessionAmount: { type: Number, default: 0, min: 0 }, // paise
    lateFeeAmount:    { type: Number, default: 0, min: 0 }, // paise

    // Split payments (one entry per payment mode per collect event)
    payments: { type: [paymentSplitSchema], default: [] },

    // Legacy Razorpay (online flow must not break)
    paymentMode: {
      type: String,
      enum: { values: ["online", "cash", "cheque", "bank_transfer"], message: "Invalid mode" },
      default: "online",
    },
    razorpayOrderId:   { type: String, trim: true, default: null },
    razorpayPaymentId: { type: String, trim: true, default: null },
    razorpaySignature: { type: String, trim: true, default: null },

    status: {
      type: String,
      enum: {
        values: ["pending", "paid", "partial", "overdue", "failed", "reversed"],
        message: "Invalid status",
      },
      default: "pending",
    },
    paidOn: { type: Date, default: null },

    // Counter collection
    collectedBy:          { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    counterReceiptNumber: { type: String, sparse: true, default: null },

    // Reversal
    isReversed:     { type: Boolean, default: false },
    reversalReason: { type: String, default: "" },
    reversedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reversedAt:     { type: Date, default: null },
    reversalLedgerEntryId: { type: mongoose.Schema.Types.ObjectId, ref: "LedgerEntry", default: null },

    // Idempotency
    idempotencyKey: { type: String, sparse: true, default: null },

    receiptUrl:    { type: String, default: null },
    receiptNumber: { type: String, unique: true, sparse: true, trim: true },
    remarks:       { type: String, default: "" },
  },
  { timestamps: true }
);

// Indexes
feeTransactionSchema.index({ studentId: 1, status: 1 });
feeTransactionSchema.index({ feeStructureId: 1 });
feeTransactionSchema.index({ razorpayOrderId: 1 });
feeTransactionSchema.index({ collectedBy: 1 });

module.exports = mongoose.model("FeeTransaction", feeTransactionSchema);
