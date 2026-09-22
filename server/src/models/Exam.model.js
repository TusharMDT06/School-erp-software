const mongoose = require("mongoose");

const examSubjectSchema = new mongoose.Schema(
  {
    subjectName: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },
    maxMarks: {
      type: Number,
      required: [true, "Max marks is required"],
      min: [1, "Max marks must be greater than 0"],
    },
    passingMarks: {
      type: Number,
      required: [true, "Passing marks is required"],
      min: [0, "Passing marks cannot be negative"],
    },
    examDate: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference is required"],
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassSection",
      required: [true, "Class section is required"],
    },
    examName: {
      type: String,
      required: [true, "Exam name is required"],
      trim: true,
    },
    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
    },
    subjects: {
      type: [examSubjectSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one subject is required for an examination",
      },
    },
    resultPublished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

examSchema.index({ classId: 1, academicYear: 1, examName: 1 });

module.exports = mongoose.model("Exam", examSchema);
