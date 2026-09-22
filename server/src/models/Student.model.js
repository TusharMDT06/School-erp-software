const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      sparse: true,
    },
    isAccountActivated: {
      type: Boolean,
      default: false,
      index: true,
    },
    signupTokenUsed: {
      type: Boolean,
      default: false,
    },
    admissionNumber: {
      type: String,
      required: [true, "Admission number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    dob: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "other"],
        message: "Gender must be male, female, or other",
      },
      default: null,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassSection",
      required: [true, "Class is required"],
    },
    rollNumber: {
      type: String,
      trim: true,
      default: null,
    },
    guardianIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Parent users
      },
    ],
    address: {
      type: String,
      trim: true,
      default: null,
    },
    bloodGroup: {
      type: String,
      trim: true,
      default: null,
    },
    documents: {
      type: [documentSchema],
      default: [],
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "transferred", "alumni"],
        message: "Status must be active, transferred, or alumni",
      },
      default: "active",
    },
  },
  { timestamps: true }
);

// Index for efficient class-based queries
studentSchema.index({ classId: 1, rollNumber: 1 });

module.exports = mongoose.model("Student", studentSchema);
