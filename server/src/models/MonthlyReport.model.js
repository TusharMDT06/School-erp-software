const mongoose = require("mongoose");

const monthlyReportSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    dataSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    summaryText: {
      type: String,
      default: "",
    },
    pdfUrl: {
      type: String,
      default: "",
    },
    excelUrl: {
      type: String,
      default: "",
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Compound unique on schoolId, month, year
monthlyReportSchema.index({ schoolId: 1, month: 1, year: 1 }, { unique: true });
monthlyReportSchema.index({ schoolId: 1, generatedAt: -1 });

module.exports = mongoose.model("MonthlyReport", monthlyReportSchema);
