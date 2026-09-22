const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      unique: true,
    },
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },
    subjects: {
      type: [String],
      default: [],
    },
    qualifications: {
      type: [String],
      default: [],
    },
    joiningDate: {
      type: Date,
      default: null,
    },
    assignedClasses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ClassSection",
      },
    ],
    salary: {
      type: Number,
      default: null,
      min: [0, "Salary cannot be negative"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Teacher", teacherSchema);
