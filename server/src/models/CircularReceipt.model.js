const mongoose = require("mongoose");

const circularReceiptSchema = new mongoose.Schema(
  {
    circularId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Circular",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    acknowledgedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

circularReceiptSchema.index({ circularId: 1, userId: 1 }, { unique: true });
circularReceiptSchema.index({ userId: 1, acknowledgedAt: 1 });

module.exports = mongoose.model("CircularReceipt", circularReceiptSchema);
