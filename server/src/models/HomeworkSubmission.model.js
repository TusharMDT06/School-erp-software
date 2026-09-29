const mongoose = require("mongoose");

const submissionFileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: "" },
  },
  { _id: false }
);

const homeworkSubmissionSchema = new mongoose.Schema(
  {
    homeworkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Homework",
      required: [true, "Homework reference is required"],
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student reference is required"],
      index: true,
    },
    files: {
      type: [submissionFileSchema],
      default: [],
    },
    text: {
      type: String,
      trim: true,
      default: "",
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: {
        values: ["submitted", "reviewed", "resubmit_requested"],
        message: "Status must be submitted, reviewed, or resubmit_requested",
      },
      default: "submitted",
      index: true,
    },
    marks: {
      type: Number,
      default: null,
      min: [0, "Marks cannot be negative"],
    },
    feedback: {
      type: String,
      trim: true,
      default: "",
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },
  },
  { timestamps: true }
);

// Unique compound index: One submission per homework per student
homeworkSubmissionSchema.index({ homeworkId: 1, studentId: 1 }, { unique: true });
homeworkSubmissionSchema.index({ studentId: 1, status: 1 });
homeworkSubmissionSchema.index({ homeworkId: 1, status: 1 });

module.exports = mongoose.model("HomeworkSubmission", homeworkSubmissionSchema);
