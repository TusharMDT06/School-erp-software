const mongoose = require("mongoose");

const classSectionSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
    },
    className: {
      type: String,
      required: [true, "Class name is required"],
      trim: true,
    },
    section: {
      type: String,
      required: [true, "Section is required"],
      trim: true,
      uppercase: true,
    },
    classTeacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },
    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
    },
  },
  { timestamps: true }
);

// Compound unique index — one class+section per school per academic year
classSectionSchema.index(
  { schoolId: 1, className: 1, section: 1, academicYear: 1 },
  { unique: true }
);

module.exports = mongoose.model("ClassSection", classSectionSchema);
