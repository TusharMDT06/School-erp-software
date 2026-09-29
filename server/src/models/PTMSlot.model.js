const mongoose = require("mongoose");

const ptmSlotSchema = new mongoose.Schema(
  {
    ptmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PTMEvent",
      required: [true, "PTM reference is required"],
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher reference is required"],
      index: true,
    },
    startTime: {
      type: String,
      required: [true, "Start time is required (HH:mm)"],
    },
    endTime: {
      type: String,
      required: [true, "End time is required (HH:mm)"],
    },
    parentUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["open", "booked", "completed", "cancelled", "no_show"],
      default: "open",
      index: true,
    },
    notes: {
      type: String,
      default: "", // private to teacher
      trim: true,
    },
    sharedSummary: {
      type: String,
      default: "", // visible to parent
      trim: true,
    },
    actionItems: {
      type: [String],
      default: [],
    },
    bookedAt: {
      type: Date,
      default: null,
    },
    reminderSent24h: {
      type: Boolean,
      default: false,
    },
    reminderSent1h: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Unique partial index on { ptmId, teacherId, studentId } for non-cancelled & booked slots
ptmSlotSchema.index(
  { ptmId: 1, teacherId: 1, studentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $nin: ["cancelled", "open"] },
      studentId: { $ne: null },
    },
  }
);

ptmSlotSchema.index({ ptmId: 1, teacherId: 1, startTime: 1 });
ptmSlotSchema.index({ status: 1, bookedAt: 1 });

module.exports = mongoose.model("PTMSlot", ptmSlotSchema);
