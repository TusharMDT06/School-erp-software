const mongoose = require("mongoose");

const quizQuestionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    options: {
      type: [String],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length === 4;
        },
        message: "Question must have exactly 4 options.",
      },
      required: [true, "Exactly 4 options are required"],
    },
    correctIndex: {
      type: Number,
      required: [true, "Correct option index is required"],
      min: 0,
      max: 3,
    },
    explanation: {
      type: String,
      default: "",
      trim: true,
    },
    marks: {
      type: Number,
      default: 1,
      min: [1, "Marks per question must be at least 1"],
    },
  },
  { _id: true }
);

const quizSchema = new mongoose.Schema(
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
      required: [true, "Quiz title is required"],
      trim: true,
    },
    durationMinutes: {
      type: Number,
      required: [true, "Duration in minutes is required"],
      default: 15,
      min: [1, "Duration must be at least 1 minute"],
    },
    questions: {
      type: [quizQuestionSchema],
      default: [],
    },
    shuffleQuestions: {
      type: Boolean,
      default: false,
    },
    shuffleOptions: {
      type: Boolean,
      default: false,
    },
    availableFrom: {
      type: Date,
      default: Date.now,
    },
    availableUntil: {
      type: Date,
      default: null,
    },
    showResults: {
      type: String,
      enum: ["immediately", "after_close"],
      default: "immediately",
    },
    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
      index: true,
    },
  },
  { timestamps: true }
);

quizSchema.index({ classId: 1, subject: 1, status: 1 });
quizSchema.index({ teacherId: 1, status: 1 });
quizSchema.index({ schoolId: 1, status: 1 });

module.exports = mongoose.model("Quiz", quizSchema);
