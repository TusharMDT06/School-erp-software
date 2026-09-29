const mongoose = require("mongoose");

const officeHourSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      required: true,
    },
    start: {
      type: String, // HH:mm e.g. "09:00"
      default: "09:00",
    },
    end: {
      type: String, // HH:mm e.g. "16:00"
      default: "16:00",
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const teacherPreferenceSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher reference is required"],
      unique: true,
      index: true,
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      index: true,
    },
    officeHours: {
      type: [officeHourSchema],
      default: [
        { day: "Monday", start: "08:30", end: "16:00", enabled: true },
        { day: "Tuesday", start: "08:30", end: "16:00", enabled: true },
        { day: "Wednesday", start: "08:30", end: "16:00", enabled: true },
        { day: "Thursday", start: "08:30", end: "16:00", enabled: true },
        { day: "Friday", start: "08:30", end: "16:00", enabled: true },
        { day: "Saturday", start: "09:00", end: "13:00", enabled: false },
        { day: "Sunday", start: "09:00", end: "13:00", enabled: false },
      ],
    },
    autoReplyEnabled: {
      type: Boolean,
      default: true,
    },
    autoReplyText: {
      type: String,
      default: "Thank you for reaching out. I am currently outside my office hours. I will respond to your message during my next scheduled school hours.",
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TeacherPreference", teacherPreferenceSchema);
