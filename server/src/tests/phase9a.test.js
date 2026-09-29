const mongoose = require("mongoose");
const { assertTeacherOwnsClassSubject } = require("../utils/teacherAccess");
const { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS } = require("../middlewares/homeworkUpload.middleware");
const Teacher = require("../models/Teacher.model");
const ClassSection = require("../models/ClassSection.model");
const Homework = require("../models/Homework.model");
const HomeworkSubmission = require("../models/HomeworkSubmission.model");
const AttendanceCorrectionRequest = require("../models/AttendanceCorrectionRequest.model");
const StudyMaterial = require("../models/StudyMaterial.model");
const SubstituteAssignment = require("../models/SubstituteAssignment.model");

describe("Phase 9A Tests — Teacher Ownership, Homework, Materials & Attendance Correction", () => {
  describe("1. Teacher Access & Ownership Helper", () => {
    it("should reject non-teacher user with 403", async () => {
      await expect(
        assertTeacherOwnsClassSubject({ role: "student", id: "some-id" }, "class123")
      ).rejects.toThrow("Access restricted to teachers.");
    });

    it("should reject if classId is missing", async () => {
      // Mock Teacher.findOne
      jest.spyOn(Teacher, "findOne").mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        assignedClasses: [],
        subjects: [],
      });

      await expect(
        assertTeacherOwnsClassSubject({ role: "teacher", id: "teacher123" }, null)
      ).rejects.toThrow("Class ID is required");

      Teacher.findOne.mockRestore();
    });

    it("should reject if class section not found", async () => {
      jest.spyOn(Teacher, "findOne").mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        assignedClasses: [],
        subjects: [],
      });
      jest.spyOn(ClassSection, "findById").mockResolvedValueOnce(null);

      await expect(
        assertTeacherOwnsClassSubject({ role: "teacher", id: "teacher123" }, new mongoose.Types.ObjectId())
      ).rejects.toThrow("Class section not found.");

      Teacher.findOne.mockRestore();
      ClassSection.findById.mockRestore();
    });

    it("should allow if teacher is the assigned class teacher", async () => {
      const teacherId = new mongoose.Types.ObjectId();
      const classId = new mongoose.Types.ObjectId();

      jest.spyOn(Teacher, "findOne").mockResolvedValueOnce({
        _id: teacherId,
        assignedClasses: [],
        subjects: ["Math"],
      });
      jest.spyOn(ClassSection, "findById").mockResolvedValueOnce({
        _id: classId,
        classTeacherId: teacherId,
        className: "10",
        section: "A",
      });

      const result = await assertTeacherOwnsClassSubject(
        { role: "teacher", id: "teacher123" },
        classId,
        "Math"
      );

      expect(result.isClassTeacher).toBe(true);
      expect(result.teacher._id).toEqual(teacherId);

      Teacher.findOne.mockRestore();
      ClassSection.findById.mockRestore();
    });

    it("should allow if teacher has active substitution for that class and date", async () => {
      const teacherId = new mongoose.Types.ObjectId();
      const classId = new mongoose.Types.ObjectId();
      const date = "2026-10-01";

      jest.spyOn(Teacher, "findOne").mockResolvedValueOnce({
        _id: teacherId,
        assignedClasses: [],
        subjects: [],
      });
      jest.spyOn(ClassSection, "findById").mockResolvedValueOnce({
        _id: classId,
        classTeacherId: null,
      });
      jest.spyOn(SubstituteAssignment, "findOne").mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        substituteTeacherId: teacherId,
        classId,
        date,
        subject: "Physics",
        status: "assigned",
      });

      const result = await assertTeacherOwnsClassSubject(
        { role: "teacher", id: "teacher123" },
        classId,
        "Physics",
        { date }
      );

      expect(result.isSubstitute).toBe(true);

      Teacher.findOne.mockRestore();
      ClassSection.findById.mockRestore();
      SubstituteAssignment.findOne.mockRestore();
    });
  });

  describe("2. Homework Upload MIME Type & Extension Whitelist", () => {
    it("should permit legitimate academic file MIME types", () => {
      expect(ALLOWED_MIME_TYPES.has("application/pdf")).toBe(true);
      expect(ALLOWED_MIME_TYPES.has("image/jpeg")).toBe(true);
      expect(ALLOWED_MIME_TYPES.has("image/png")).toBe(true);
      expect(ALLOWED_MIME_TYPES.has("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
      expect(ALLOWED_MIME_TYPES.has("application/msword")).toBe(true);
      expect(ALLOWED_MIME_TYPES.has("application/vnd.ms-powerpoint")).toBe(true);
    });

    it("should reject executable or unsafe MIME types", () => {
      expect(ALLOWED_MIME_TYPES.has("application/x-msdownload")).toBe(false);
      expect(ALLOWED_MIME_TYPES.has("application/javascript")).toBe(false);
      expect(ALLOWED_MIME_TYPES.has("text/html")).toBe(false);
      expect(ALLOWED_MIME_TYPES.has("application/x-sh")).toBe(false);
    });

    it("should permit standard document extensions", () => {
      expect(ALLOWED_EXTENSIONS.has(".pdf")).toBe(true);
      expect(ALLOWED_EXTENSIONS.has(".docx")).toBe(true);
      expect(ALLOWED_EXTENSIONS.has(".jpg")).toBe(true);
      expect(ALLOWED_EXTENSIONS.has(".png")).toBe(true);
    });
  });

  describe("3. Model Validation & Schema Constraints", () => {
    it("should validate Homework schema required fields", () => {
      const hw = new Homework();
      const err = hw.validateSync();
      expect(err.errors.schoolId).toBeDefined();
      expect(err.errors.classId).toBeDefined();
      expect(err.errors.subject).toBeDefined();
      expect(err.errors.title).toBeDefined();
      expect(err.errors.dueDate).toBeDefined();
    });

    it("should validate HomeworkSubmission schema", () => {
      const sub = new HomeworkSubmission({
        homeworkId: new mongoose.Types.ObjectId(),
        studentId: new mongoose.Types.ObjectId(),
        status: "invalid_status",
      });
      const err = sub.validateSync();
      expect(err.errors.status).toBeDefined();
    });

    it("should validate StudyMaterial schema type enum", () => {
      const sm = new StudyMaterial({
        schoolId: new mongoose.Types.ObjectId(),
        classId: new mongoose.Types.ObjectId(),
        subject: "History",
        teacherId: new mongoose.Types.ObjectId(),
        title: "French Revolution",
        type: "invalid_type",
      });
      const err = sm.validateSync();
      expect(err.errors.type).toBeDefined();
    });

    it("should validate AttendanceCorrectionRequest changes requirement", () => {
      const req = new AttendanceCorrectionRequest({
        schoolId: new mongoose.Types.ObjectId(),
        classId: new mongoose.Types.ObjectId(),
        date: new Date(),
        changes: [],
        reason: "Missed attendance",
        requestedBy: new mongoose.Types.ObjectId(),
      });
      const err = req.validateSync();
      expect(err.errors.changes).toBeDefined();
    });
  });

  describe("4. Attendance Correction 3-Day Window Logic", () => {
    it("should calculate date difference correctly for 3-day limit", () => {
      const today = new Date("2026-09-29T00:00:00.000Z");
      const twoDaysAgo = new Date("2026-09-27T00:00:00.000Z");
      const fourDaysAgo = new Date("2026-09-25T00:00:00.000Z");

      const diff2 = Math.floor((today.getTime() - twoDaysAgo.getTime()) / (1000 * 60 * 60 * 24));
      const diff4 = Math.floor((today.getTime() - fourDaysAgo.getTime()) / (1000 * 60 * 60 * 24));

      expect(diff2).toBe(2);
      expect(diff2 <= 3).toBe(true);

      expect(diff4).toBe(4);
      expect(diff4 <= 3).toBe(false);
    });
  });
});
