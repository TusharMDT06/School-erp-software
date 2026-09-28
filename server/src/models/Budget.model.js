const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School is required"],
      index: true,
    },
    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      required: [true, "Category is required"],
    },
    allocatedAmount: {
      type: Number,
      required: [true, "Allocated amount (paise) is required"],
      min: [0, "Allocated amount cannot be negative"],
      default: 0,
    },
  },
  { timestamps: true }
);

budgetSchema.index({ schoolId: 1, academicYear: 1, categoryId: 1 }, { unique: true });

module.exports = mongoose.model("Budget", budgetSchema);
