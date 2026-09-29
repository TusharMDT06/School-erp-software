const mongoose = require("mongoose");

const quizAttemptAnswerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    selectedIndex: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

const optionOrderSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    order: {
      type: [Number], // Maps displayed index -> original question.options index
      required: true,
    },
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    quizId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quiz",
      required: [true, "Quiz reference is required"],
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student reference is required"],
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      index: true,
    },
    answers: {
      type: [quizAttemptAnswerSchema],
      default: [],
    },
    questionOrder: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },
    optionOrders: {
      type: [optionOrderSchema],
      default: [],
    },
    startedAt: {
      type: Date,
      required: [true, "Started at time is required"],
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
      index: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 0,
    },
    autoSubmitted: {
      type: Boolean,
      default: false,
    },
    hiddenTabCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// One attempt per student per quiz
quizAttemptSchema.index({ quizId: 1, studentId: 1 }, { unique: true });
quizAttemptSchema.index({ submittedAt: 1, startedAt: 1 });

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
