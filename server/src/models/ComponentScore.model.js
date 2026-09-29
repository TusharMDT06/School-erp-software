const mongoose = require("mongoose");

const componentScoreSchema = new mongoose.Schema(
  {
    componentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AssessmentComponent",
      required: [true, "Assessment component reference is required"],
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student reference is required"],
      index: true,
    },
    marks: {
      type: Number,
      min: [0, "Marks cannot be negative"],
      default: null,
    },
    absent: {
      type: Boolean,
      default: false,
    },
    remark: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// Unique compound index: only one score per student per assessment component
componentScoreSchema.index({ componentId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("ComponentScore", componentScoreSchema);
