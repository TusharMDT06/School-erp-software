const mongoose = require("mongoose");

const ptmEventSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "PTM title is required"],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      index: true,
    },
    startTime: {
      type: String,
      required: [true, "Start time is required (e.g. 09:00)"],
      trim: true,
    },
    endTime: {
      type: String,
      required: [true, "End time is required (e.g. 13:00)"],
      trim: true,
    },
    slotMinutes: {
      type: Number,
      default: 10,
      min: 5,
      max: 60,
    },
    classIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ClassSection",
      },
    ],
    status: {
      type: String,
      enum: ["draft", "open", "closed"],
      default: "draft",
      index: true,
    },
    bookingClosesAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

ptmEventSchema.index({ schoolId: 1, date: -1 });

module.exports = mongoose.model("PTMEvent", ptmEventSchema);
