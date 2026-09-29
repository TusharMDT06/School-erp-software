const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      default: Date.now,
    },
    mode: {
      type: String,
      enum: ["call", "whatsapp", "visit", "email"],
      default: "call",
    },
    notes: {
      type: String,
      required: true,
      trim: true,
    },
    by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { _id: true, timestamps: false }
);

const admissionInquirySchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    childName: {
      type: String,
      required: [true, "Child name is required"],
      trim: true,
    },
    dob: {
      type: Date,
      default: null,
    },
    applyingForClass: {
      type: String,
      required: [true, "Applying for class is required"],
      trim: true,
    },
    parentName: {
      type: String,
      required: [true, "Parent name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    source: {
      type: String,
      enum: ["walk_in", "phone", "website", "referral", "social_media", "other"],
      default: "website",
    },
    referredBy: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "new",
        "contacted",
        "visit_scheduled",
        "visited",
        "application_submitted",
        "documents_pending",
        "admitted",
        "rejected",
        "lost",
      ],
      default: "new",
      index: true,
    },
    followUps: [followUpSchema],
    nextFollowUpAt: {
      type: Date,
      default: null,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    lostReason: {
      type: String,
      trim: true,
      default: "",
    },
    convertedStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes specified in Phase 8C
admissionInquirySchema.index({ schoolId: 1, status: 1 });
admissionInquirySchema.index({ schoolId: 1, nextFollowUpAt: 1 });
admissionInquirySchema.index({ schoolId: 1, phone: 1 });
admissionInquirySchema.index({ nextFollowUpAt: 1, status: 1 });

module.exports = mongoose.model("AdmissionInquiry", admissionInquirySchema);
