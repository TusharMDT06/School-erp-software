const mongoose = require("mongoose");

const markEntrySchema = new mongoose.Schema(
  {
    subjectName: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },
    marks: {
      type: Number,
      required: [true, "Marks obtained is required"],
      min: [0, "Marks cannot be negative"],
    },
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student reference is required"],
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: [true, "Exam reference is required"],
    },
    marksObtained: {
      type: [markEntrySchema],
      default: [],
    },
    totalMarksObtained: {
      type: Number,
      default: 0,
    },
    totalMaxMarks: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    grade: {
      type: String,
      trim: true,
      default: "F",
    },
    overallStatus: {
      type: String,
      enum: {
        values: ["pass", "fail"],
        message: "Status must be pass or fail",
      },
      default: "pass",
    },
    remarks: {
      type: String,
      trim: true,
      default: null,
    },
    reportCardUrl: {
      type: String,
      default: null,
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher (enteredBy) reference is required"],
    },
  },
  { timestamps: true }
);

// Compound unique index — one result record per student per exam
resultSchema.index({ studentId: 1, examId: 1 }, { unique: true });
resultSchema.index({ examId: 1, overallStatus: 1 });

module.exports = mongoose.model("Result", resultSchema);
