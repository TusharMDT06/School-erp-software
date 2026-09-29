const mongoose = require("mongoose");

const riskReasonSchema = new mongoose.Schema(
  {
    factor: {
      type: String,
      enum: ["attendance", "academics", "fees", "leave", "discipline", "other"],
      required: true,
    },
    detail: {
      type: String,
      required: true,
      trim: true,
    },
    visibility: {
      type: String,
      enum: ["general", "finance"],
      default: "general",
    },
  },
  { _id: false }
);

const studentRiskSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student reference is required"],
      unique: true,
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference is required"],
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassSection",
      required: [true, "Class section is required"],
      index: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
      default: 0,
    },
    band: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
      default: "low",
      index: true,
    },
    previousBand: {
      type: String,
      enum: ["low", "medium", "high", null],
      default: null,
    },
    reasons: {
      type: [riskReasonSchema],
      default: [],
    },
    computedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

studentRiskSchema.index({ schoolId: 1, band: 1 });
studentRiskSchema.index({ schoolId: 1, classId: 1, band: 1 });

module.exports = mongoose.model("StudentRisk", studentRiskSchema);
