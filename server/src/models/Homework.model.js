const mongoose = require("mongoose");

const homeworkAttachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const homeworkSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference is required"],
      index: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassSection",
      required: [true, "Class section reference is required"],
      index: true,
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher reference is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Homework title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    attachments: {
      type: [homeworkAttachmentSchema],
      default: [],
    },
    assignedDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
      index: true,
    },
    allowLateSubmission: {
      type: Boolean,
      default: false,
    },
    maxMarks: {
      type: Number,
      default: null,
      min: [1, "Max marks must be greater than 0"],
    },
    submissionType: {
      type: String,
      enum: {
        values: ["file", "text", "none"],
        message: "Submission type must be file, text, or none",
      },
      default: "file",
    },
    status: {
      type: String,
      enum: {
        values: ["published", "closed"],
        message: "Status must be published or closed",
      },
      default: "published",
      index: true,
    },
    lastNudgeAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound indexes
homeworkSchema.index({ classId: 1, dueDate: 1 });
homeworkSchema.index({ teacherId: 1, status: 1 });
homeworkSchema.index({ schoolId: 1, status: 1, dueDate: 1 });

module.exports = mongoose.model("Homework", homeworkSchema);
