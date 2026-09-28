const mongoose = require("mongoose");

const DEFAULT_EXPENSE_CATEGORIES = [
  "Electricity",
  "Water",
  "Stationery",
  "Maintenance & Repairs",
  "Transport Fuel",
  "Events",
  "Software & Internet",
  "Cleaning",
  "Miscellaneous",
];

const expenseCategorySchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

expenseCategorySchema.index({ schoolId: 1, name: 1 }, { unique: true });

const ExpenseCategory = mongoose.model("ExpenseCategory", expenseCategorySchema);

module.exports = ExpenseCategory;
module.exports.DEFAULT_EXPENSE_CATEGORIES = DEFAULT_EXPENSE_CATEGORIES;
