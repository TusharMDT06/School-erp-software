const mongoose = require("mongoose");

const lessonActivitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Activity name is required"],
      trim: true,
    },
    minutes: {
      type: Number,
      default: 10,
      min: [1, "Minutes must be at least 1"],
    },
  },
  { _id: false }
);

const lessonPlanSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference is required"],
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher reference is required"],
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
    date: {
      type: String,
      required: [true, "Date is required (YYYY-MM-DD)"],
      index: true,
    },
    unitId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SyllabusUnit",
      default: null,
    },
    topicTitle: {
      type: String,
      required: [true, "Topic title is required"],
      trim: true,
    },
    objectives: {
      type: [String],
      default: [],
    },
    activities: {
      type: [lessonActivitySchema],
      default: [],
    },
    resources: {
      type: [String],
      default: [],
    },
    assessmentIdea: {
      type: String,
      default: "",
      trim: true,
    },
    homeworkIdea: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: ["planned", "taught", "skipped"],
      default: "planned",
      index: true,
    },
    reflection: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

lessonPlanSchema.index({ schoolId: 1, teacherId: 1, date: 1 });
lessonPlanSchema.index({ classId: 1, subject: 1, date: 1 });

module.exports = mongoose.model("LessonPlan", lessonPlanSchema);
