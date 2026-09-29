const mongoose = require("mongoose");

const syllabusTopicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Topic title is required"],
      trim: true,
    },
    plannedHours: {
      type: Number,
      default: 1,
      min: [0.1, "Planned hours must be greater than 0"],
    },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    completedOn: {
      type: Date,
      default: null,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: true }
);

const syllabusUnitSchema = new mongoose.Schema(
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
      index: true,
    },
    className: {
      type: String,
      required: [true, "Class name is required"],
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      index: true,
    },
    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
      index: true,
    },
    unitNo: {
      type: Number,
      required: [true, "Unit number is required"],
      min: 1,
    },
    title: {
      type: String,
      required: [true, "Unit title is required"],
      trim: true,
    },
    topics: {
      type: [syllabusTopicSchema],
      default: [],
    },
    plannedStart: {
      type: Date,
    },
    plannedEnd: {
      type: Date,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher reference is required"],
      index: true,
    },
  },
  { timestamps: true }
);

syllabusUnitSchema.index({ schoolId: 1, classId: 1, subject: 1, academicYear: 1 });
syllabusUnitSchema.index({ schoolId: 1, className: 1, subject: 1, academicYear: 1 });
syllabusUnitSchema.index({ teacherId: 1, subject: 1 });

module.exports = mongoose.model("SyllabusUnit", syllabusUnitSchema);
