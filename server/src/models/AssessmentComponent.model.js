const mongoose = require("mongoose");

const assessmentComponentSchema = new mongoose.Schema(
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
    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Component name is required (e.g. Unit Test 1, Project)"],
      trim: true,
    },
    maxMarks: {
      type: Number,
      required: [true, "Max marks is required"],
      min: [1, "Max marks must be at least 1"],
    },
    weightage: {
      type: Number,
      required: [true, "Weightage is required"],
      min: [0, "Weightage cannot be negative"],
      max: [100, "Weightage cannot exceed 100"],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher reference is required"],
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

assessmentComponentSchema.index({ classId: 1, subject: 1, academicYear: 1 });
assessmentComponentSchema.index({ schoolId: 1, isPublished: 1 });

module.exports = mongoose.model("AssessmentComponent", assessmentComponentSchema);
