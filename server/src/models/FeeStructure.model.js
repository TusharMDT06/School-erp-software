const mongoose = require("mongoose");

const feeHeadSchema = new mongoose.Schema(
  {
    name:   { type: String, required: [true, "Fee head name is required"], trim: true },
    amount: { type: Number, required: [true, "Fee head amount is required"], min: 0 }, // rupees
  },
  { _id: false }
);

const installmentSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true },
    amount:  { type: Number, required: true, min: 0 }, // rupees
    dueDate: { type: Date, required: true },
  },
  { _id: false }
);

const feeStructureSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassSection",
      required: [true, "Class section is required"],
    },
    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
    },
    term: {
      type: String,
      enum: {
        values: ["monthly", "quarterly", "annual"],
        message: "Term must be monthly, quarterly, or annual",
      },
      required: [true, "Term is required"],
    },
    feeHeads: {
      type: [feeHeadSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one fee head is required",
      },
    },
    totalAmount: { type: Number, default: 0 }, // rupees (auto-calculated)
    dueDate:     { type: Date, required: [true, "Due date is required"] },

    // Optional installments — if provided, one FeeTransaction is created per installment per student
    installments: { type: [installmentSchema], default: [] },
  },
  { timestamps: true }
);

// Pre-save: auto-calculate totalAmount from feeHeads
feeStructureSchema.pre("save", function (next) {
  if (Array.isArray(this.feeHeads)) {
    this.totalAmount = this.feeHeads.reduce((sum, head) => sum + (head.amount || 0), 0);
  }
  next();
});

feeStructureSchema.index({ classId: 1, academicYear: 1, term: 1 });

module.exports = mongoose.model("FeeStructure", feeStructureSchema);
