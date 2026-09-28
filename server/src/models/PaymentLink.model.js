const mongoose = require("mongoose");

const paymentLinkSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School is required"],
      index: true,
    },
    transactionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FeeTransaction",
        required: true,
      },
    ],
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required"],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount in paise is required"],
      min: [1, "Amount must be positive"],
    },
    razorpayLinkId: {
      type: String,
      default: null,
      index: true,
    },
    shortUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["created", "paid", "expired", "cancelled"],
      default: "created",
      index: true,
    },
    sentVia: {
      type: [String],
      default: [], // ["whatsapp", "sms", "email"]
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

paymentLinkSchema.index({ schoolId: 1, createdAt: -1 });

module.exports = mongoose.model("PaymentLink", paymentLinkSchema);
