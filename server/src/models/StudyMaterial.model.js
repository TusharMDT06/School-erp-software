const mongoose = require("mongoose");

const studyMaterialSchema = new mongoose.Schema(
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
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher reference is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Material title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ["pdf", "doc", "ppt", "video_link", "link", "image"],
        message: "Type must be pdf, doc, ppt, video_link, link, or image",
      },
      required: [true, "Material type is required"],
    },
    fileUrl: {
      type: String,
      default: null,
    },
    linkUrl: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    chapter: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    visibleFrom: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

studyMaterialSchema.index({ classId: 1, subject: 1, isPublished: 1 });
studyMaterialSchema.index({ teacherId: 1, createdAt: -1 });

module.exports = mongoose.model("StudyMaterial", studyMaterialSchema);
