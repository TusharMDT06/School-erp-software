const mongoose = require("mongoose");

const circularSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Circular title is required"],
      trim: true,
    },
    body: {
      type: String,
      required: [true, "Circular body is required"],
    },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
    audienceRoles: {
      type: [String],
      default: ["teacher", "student", "parent"],
    },
    classIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ClassSection",
      },
    ],
    requiresAcknowledgement: {
      type: Boolean,
      default: false,
    },
    ackDeadline: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "published"],
        message: "Status must be draft or published",
      },
      default: "draft",
      index: true,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    lastRemindedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

circularSchema.index({ schoolId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Circular", circularSchema);
