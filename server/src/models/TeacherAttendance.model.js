const mongoose = require("mongoose");

/**
 * TeacherAttendance — daily attendance record for a single teacher.
 * Separate from student Attendance to keep concerns clean.
 */
const teacherAttendanceSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher reference is required"],
    },
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference is required"],
    },
    date: {
      type: Date,
      required: [true, "Attendance date is required"],
    },
    status: {
      type: String,
      enum: {
        values: ["present", "absent", "late", "leave", "holiday"],
        message: "Status must be present, absent, late, leave, or holiday",
      },
      required: [true, "Attendance status is required"],
    },
    remarks: {
      type: String,
      trim: true,
      default: null,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Marked-by user reference is required"],
    },
    emailSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound unique index — one record per teacher per day
teacherAttendanceSchema.index({ teacherId: 1, date: 1 }, { unique: true });
teacherAttendanceSchema.index({ schoolId: 1, date: 1 });

module.exports = mongoose.model("TeacherAttendance", teacherAttendanceSchema);
