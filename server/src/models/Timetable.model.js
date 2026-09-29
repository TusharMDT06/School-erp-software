const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
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
      required: [true, "Class section is required"],
      index: true,
    },
    day: {
      type: String,
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      required: [true, "Day of week is required"],
      lowercase: true,
      trim: true,
    },
    periodIndex: {
      type: Number,
      required: [true, "Period index is required"],
      min: 1,
      max: 12,
    },
    periodLabel: {
      type: String,
      default: function () {
        return `Period ${this.periodIndex}`;
      },
    },
    subject: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher reference is required"],
      index: true,
    },
    startTime: {
      type: String,
      default: "09:00",
    },
    endTime: {
      type: String,
      default: "09:45",
    },
  },
  { timestamps: true }
);

// One schedule slot per class section per period
timetableSchema.index(
  { schoolId: 1, classId: 1, day: 1, periodIndex: 1 },
  { unique: true }
);

// Rapid lookup for teacher schedule conflicts
timetableSchema.index({ schoolId: 1, teacherId: 1, day: 1, periodIndex: 1 });

module.exports = mongoose.model("Timetable", timetableSchema);
