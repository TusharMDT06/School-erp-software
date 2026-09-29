const mongoose = require("mongoose");
const PTMEvent = require("../models/PTMEvent.model");
const PTMSlot = require("../models/PTMSlot.model");
const StudentRemark = require("../models/StudentRemark.model");
const SubstituteAssignment = require("../models/SubstituteAssignment.model");
const SubstituteSuggestion = require("../models/SubstituteSuggestion.model");
const TeacherPreference = require("../models/TeacherPreference.model");
const StudentRisk = require("../models/StudentRisk.model");
const Incident = require("../models/Incident.model");
const AcademicEvent = require("../models/AcademicEvent.model");
const Teacher = require("../models/Teacher.model");
const Student = require("../models/Student.model");
const ClassSection = require("../models/ClassSection.model");
const Attendance = require("../models/Attendance.model");
const Result = require("../models/Result.model");
const Exam = require("../models/Exam.model");
const Homework = require("../models/Homework.model");
const HomeworkSubmission = require("../models/HomeworkSubmission.model");
const AuditLog = require("../models/AuditLog.model");
const Circular = require("../models/Circular.model");
const LessonPlan = require("../models/LessonPlan.model");
const User = require("../models/User.model");

jest.mock("../services/notification.service", () => ({
  notify: jest.fn().mockResolvedValue(true),
  notifyMany: jest.fn().mockResolvedValue(true),
}));

jest.mock("../config/geminiClient", () => ({
  generateContent: jest.fn().mockResolvedValue({}),
  parseResponse: jest.fn().mockReturnValue({ text: "Consistently demonstrating solid academic growth." }),
}));

const ptmCtrl = require("../controllers/ptm.controller");
const remarkCtrl = require("../controllers/studentRemark.controller");
const classTeacherCtrl = require("../controllers/classTeacher.controller");
const subCtrl = require("../controllers/teacherSubstitution.controller");
const commCtrl = require("../controllers/communication.controller");
const { teacherToolHandlers } = require("../services/aiTools/teacherTools");

describe("Phase 9C Tests — PTM, Remarks, Substitutions, Class Teacher Tools & AI Assist", () => {
  beforeEach(() => {
    jest.spyOn(AuditLog, "create").mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ============================================
  // 1. PTM (PARENT-TEACHER MEETINGS)
  // ============================================
  describe("1. Parent-Teacher Meetings (PTM)", () => {
    it("should generate slots across time window and trigger calendar hook", async () => {
      const schoolId = new mongoose.Types.ObjectId();
      const teacherId1 = new mongoose.Types.ObjectId();
      const classId1 = new mongoose.Types.ObjectId();

      jest.spyOn(PTMEvent, "create").mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        title: "Term 1 PTM",
        date: new Date("2026-10-15"),
        startTime: "09:00",
        endTime: "09:30",
        slotMinutes: 10,
        classIds: [classId1],
        status: "open",
      });

      jest.spyOn(ClassSection, "find").mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce([{ classTeacherId: teacherId1 }]),
      });

      jest.spyOn(Teacher, "find").mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce([]),
      });

      const insertManySpy = jest.spyOn(PTMSlot, "insertMany").mockResolvedValueOnce([]);
      const calSpy = jest.spyOn(AcademicEvent, "create").mockResolvedValueOnce({});

      const req = {
        user: { _id: new mongoose.Types.ObjectId(), schoolId, role: "principal" },
        body: {
          title: "Term 1 PTM",
          date: "2026-10-15",
          startTime: "09:00",
          endTime: "09:30",
          slotMinutes: 10,
          classIds: [classId1],
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      await ptmCtrl.createPTMEvent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(insertManySpy).toHaveBeenCalled();
      // From 09:00 to 09:30 with 10 min slots = 3 slots (09:00-09:10, 09:10-09:20, 09:20-09:30)
      const insertedSlots = insertManySpy.mock.calls[0][0];
      expect(insertedSlots.length).toBe(3);
      expect(insertedSlots[0].startTime).toBe("09:00");
      expect(insertedSlots[0].endTime).toBe("09:10");
      expect(calSpy).toHaveBeenCalledWith(expect.objectContaining({ type: "ptm" }));
    });

    it("should atomically book an open slot and reject taken slot with 409", async () => {
      const studentId = new mongoose.Types.ObjectId();
      const parentId = new mongoose.Types.ObjectId();
      const slotId = new mongoose.Types.ObjectId();
      const classId = new mongoose.Types.ObjectId();

      jest.spyOn(Student, "findById").mockResolvedValueOnce({
        _id: studentId,
        name: "Aarav Sharma",
        classId,
        guardianIds: [parentId],
      });

      jest.spyOn(PTMSlot, "findById").mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce({
          _id: slotId,
          ptmId: new mongoose.Types.ObjectId(),
          teacherId: { _id: new mongoose.Types.ObjectId() },
        }),
      });

      jest.spyOn(PTMEvent, "findById").mockResolvedValueOnce({
        status: "open",
        classIds: [classId],
      });

      jest.spyOn(PTMSlot, "findOne").mockResolvedValueOnce(null); // No prior booking

      // Mock findOneAndUpdate returning null (slot just taken race condition)
      jest.spyOn(PTMSlot, "findOneAndUpdate").mockReturnValueOnce({
        populate: jest.fn().mockReturnValueOnce({
          populate: jest.fn().mockResolvedValueOnce(null),
        }),
      });

      const req = {
        params: { id: slotId },
        body: { studentId },
        user: { _id: parentId, role: "parent" },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await ptmCtrl.bookSlot(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 409, message: expect.stringContaining("Slot just taken") })
      );
    });

    it("should enforce parent cancellation only at least 6 hours in advance", async () => {
      const parentId = new mongoose.Types.ObjectId();
      const slotId = new mongoose.Types.ObjectId();

      const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // Only 2 hours in future

      jest.spyOn(PTMSlot, "findById").mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce({
          _id: slotId,
          ptmId: new mongoose.Types.ObjectId(),
          teacherId: { _id: new mongoose.Types.ObjectId() },
          parentUserId: parentId,
          status: "booked",
          startTime: "10:00",
        }),
      });

      jest.spyOn(PTMEvent, "findById").mockResolvedValueOnce({
        date: futureDate,
      });

      const req = {
        params: { id: slotId },
        body: { reason: "Need to cancel" },
        user: { _id: parentId, role: "parent" },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await ptmCtrl.cancelSlot(req, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400, message: expect.stringContaining("6 hours") })
      );
    });

    it("should strip finance reasons and fees from student quick profile in teacher agenda", async () => {
      const teacherUserId = new mongoose.Types.ObjectId();
      const teacherId = new mongoose.Types.ObjectId();
      const studentId = new mongoose.Types.ObjectId();

      jest.spyOn(Teacher, "findOne").mockResolvedValueOnce({ _id: teacherId, userId: teacherUserId });

      const mockSlot = {
        _id: new mongoose.Types.ObjectId(),
        startTime: "09:00",
        endTime: "09:10",
        status: "booked",
        studentId: {
          _id: studentId,
          name: "Rohan Verma",
          rollNumber: "12",
          classId: { _id: new mongoose.Types.ObjectId(), className: "10", section: "A" },
        },
      };

      jest.spyOn(PTMSlot, "find").mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnValueOnce({
          lean: jest.fn().mockResolvedValueOnce([mockSlot]),
        }),
      });

      jest.spyOn(Attendance, "countDocuments").mockResolvedValue(20);
      jest.spyOn(Result, "findOne").mockReturnValueOnce({
        sort: jest.fn().mockReturnValueOnce({
          populate: jest.fn().mockReturnValueOnce({
            lean: jest.fn().mockResolvedValueOnce({ percentage: 88, grade: "A", examId: { name: "Mid-Term" } }),
          }),
        }),
      });
      jest.spyOn(Homework, "countDocuments").mockResolvedValue(10);
      jest.spyOn(HomeworkSubmission, "countDocuments").mockResolvedValue(9);
      jest.spyOn(StudentRemark, "find").mockReturnValueOnce({
        sort: jest.fn().mockReturnValueOnce({
          limit: jest.fn().mockReturnValueOnce({
            select: jest.fn().mockReturnValueOnce({
              lean: jest.fn().mockResolvedValueOnce([]),
            }),
          }),
        }),
      });

      // StudentRisk contains financial and academic factors
      jest.spyOn(StudentRisk, "findOne").mockReturnValueOnce({
        lean: jest.fn().mockResolvedValueOnce({
          band: "medium",
          score: 45,
          reasons: [
            { factor: "attendance", detail: "Low attendance in Math", visibility: "general" },
            { factor: "fees", detail: "Overdue tuition fees for Q2", visibility: "finance" },
          ],
        }),
      });

      const req = { user: { _id: teacherUserId, role: "teacher" }, query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await ptmCtrl.getTeacherAgenda(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const agendaData = res.json.mock.calls[0][0].data[0];
      const riskProfile = agendaData.studentQuickProfile.riskProfile;
      expect(riskProfile.band).toBe("medium");
      // Verify finance reasons are completely stripped
      expect(riskProfile.reasons.length).toBe(1);
      expect(riskProfile.reasons[0].factor).toBe("attendance");
      expect(agendaData.studentQuickProfile.fees).toBeUndefined();
    });
  });

  // ============================================
  // 2. STUDENT REMARKS
  // ============================================
  describe("2. Student Remarks", () => {
    it("should allow editing within 24h and push prior version to editHistory", async () => {
      const remarkId = new mongoose.Types.ObjectId();
      const teacherId = new mongoose.Types.ObjectId();
      const teacherUserId = new mongoose.Types.ObjectId();

      jest.spyOn(Teacher, "findOne").mockResolvedValueOnce({ _id: teacherId, userId: teacherUserId });

      const mockRemark = {
        _id: remarkId,
        teacherId,
        text: "Initial observation",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours old
        editHistory: [],
        save: jest.fn().mockResolvedValueOnce(true),
      };

      jest.spyOn(StudentRemark, "findById").mockResolvedValueOnce(mockRemark);

      const req = {
        params: { id: remarkId },
        body: { text: "Updated observation with progress notes" },
        user: { _id: teacherUserId, role: "teacher" },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await remarkCtrl.updateRemark(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockRemark.editHistory.length).toBe(1);
      expect(mockRemark.editHistory[0].text).toBe("Initial observation");
      expect(mockRemark.text).toBe("Updated observation with progress notes");
      expect(mockRemark.save).toHaveBeenCalled();
    });

    it("should reject editing remark older than 24 hours with 403", async () => {
      const remarkId = new mongoose.Types.ObjectId();
      const teacherId = new mongoose.Types.ObjectId();
      const teacherUserId = new mongoose.Types.ObjectId();

      jest.spyOn(Teacher, "findOne").mockResolvedValueOnce({ _id: teacherId, userId: teacherUserId });

      const mockRemark = {
        _id: remarkId,
        teacherId,
        text: "Old observation",
        createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000), // 26 hours old
        editHistory: [],
      };

      jest.spyOn(StudentRemark, "findById").mockResolvedValueOnce(mockRemark);

      const req = {
        params: { id: remarkId },
        body: { text: "Trying to edit after deadline" },
        user: { _id: teacherUserId, role: "teacher" },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await remarkCtrl.updateRemark(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403, message: expect.stringContaining("24 hours") })
      );
    });

    it("should escalate remark into an Incident and notify principal", async () => {
      const remarkId = new mongoose.Types.ObjectId();
      const studentId = new mongoose.Types.ObjectId();
      const principalId = new mongoose.Types.ObjectId();

      jest.spyOn(StudentRemark, "findById").mockReturnValueOnce({
        populate: jest.fn().mockResolvedValueOnce({
          _id: remarkId,
          text: "Repeated disturbance during lab sessions",
          studentId: { _id: studentId, name: "Kabir Singh" },
        }),
      });

      const incidentSpy = jest.spyOn(Incident, "create").mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
      });

      jest.spyOn(User, "find").mockReturnValueOnce({
        select: jest.fn().mockResolvedValueOnce([{ _id: principalId }]),
      });

      const req = {
        params: { id: remarkId },
        body: { severity: "medium", category: "behavior" },
        user: { _id: new mongoose.Types.ObjectId(), schoolId: new mongoose.Types.ObjectId(), role: "teacher" },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await remarkCtrl.escalateRemark(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(incidentSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "behavior",
          severity: "medium",
          description: expect.stringContaining("Repeated disturbance"),
        })
      );
      const { notify } = require("../services/notification.service");
      expect(notify).toHaveBeenCalledWith(
        principalId,
        expect.objectContaining({ type: "remark_escalated" })
      );
    });

    it("should strictly forbid deleting student remarks (immutable policy)", async () => {
      const req = { params: { id: "some-id" } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await remarkCtrl.deleteRemark(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ============================================
  // 3. SUBSTITUTIONS & LEAVE COVER
  // ============================================
  describe("3. Substitutions (Teacher Portal)", () => {
    it("should retrieve substitutions and attach absent teacher lesson plan for that date", async () => {
      const teacherId = new mongoose.Types.ObjectId();
      const absentTeacherId = new mongoose.Types.ObjectId();
      const classId = new mongoose.Types.ObjectId();

      jest.spyOn(Teacher, "findOne").mockResolvedValueOnce({ _id: teacherId });

      const mockSub = {
        _id: new mongoose.Types.ObjectId(),
        substituteTeacherId: teacherId,
        absentTeacherId: { _id: absentTeacherId, userId: { name: "Priya Sharma" } },
        classId: { _id: classId, className: "9", section: "B" },
        subject: "Physics",
        date: "2026-10-16",
        periodRef: "Period 2",
      };

      jest.spyOn(SubstituteAssignment, "find").mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnValueOnce({
          lean: jest.fn().mockResolvedValueOnce([mockSub]),
        }),
      });

      jest.spyOn(LessonPlan, "findOne").mockReturnValueOnce({
        select: jest.fn().mockReturnValueOnce({
          lean: jest.fn().mockResolvedValueOnce({
            topicTitle: "Optics and Lenses",
            activities: "Experiment with convex lenses",
          }),
        }),
      });

      const req = { user: { _id: new mongoose.Types.ObjectId(), role: "teacher" }, query: {} };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await subCtrl.getTeacherSubstitutions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const subResult = res.json.mock.calls[0][0].data[0];
      expect(subResult.absentTeacherLessonPlan.topicTitle).toBe("Optics and Lenses");
    });
  });

  // ============================================
  // 4. CLASS TEACHER TOOLS & BULK MESSAGING
  // ============================================
  describe("4. Class Teacher Tools & Bulk Messaging", () => {
    it("should enforce confirm flag and 3 sends per day rate limit on absentee messages", async () => {
      const teacherId = new mongoose.Types.ObjectId();
      const teacherUserId = new mongoose.Types.ObjectId();
      const classId = new mongoose.Types.ObjectId();

      jest.spyOn(Teacher, "findOne").mockResolvedValueOnce({ _id: teacherId, userId: teacherUserId });

      // 1. Without confirm: true -> 400 error
      const reqNoConfirm = {
        user: { _id: teacherUserId, role: "teacher" },
        body: { classId, confirm: false },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await classTeacherCtrl.sendAbsenteeMessage(reqNoConfirm, res, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400, message: expect.stringContaining("confirm") })
      );

      // 2. With 3 sends already today -> 429 rate limit error
      jest.spyOn(Teacher, "findOne").mockResolvedValueOnce({ _id: teacherId, userId: teacherUserId });
      jest.spyOn(ClassSection, "findOne").mockResolvedValueOnce({ _id: classId, classTeacherId: teacherId });
      jest.spyOn(AuditLog, "countDocuments").mockResolvedValueOnce(3); // 3 sent today

      const reqRateLimited = {
        user: { _id: teacherUserId, schoolId: new mongoose.Types.ObjectId(), role: "teacher" },
        body: { classId, confirm: true },
      };
      const nextRate = jest.fn();

      await classTeacherCtrl.sendAbsenteeMessage(reqRateLimited, res, nextRate);
      expect(nextRate).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 429, message: expect.stringContaining("Daily limit reached") })
      );
    });

    it("should draft AI report card remarks in batches of 5 with PII minimization and preserve existing remarks", async () => {
      const examId = new mongoose.Types.ObjectId();
      const studentId1 = new mongoose.Types.ObjectId();
      const studentId2 = new mongoose.Types.ObjectId();

      jest.spyOn(Exam, "findById").mockResolvedValueOnce({ _id: examId, name: "Annual Exam" });
      jest.spyOn(Teacher, "findOne").mockResolvedValueOnce({ _id: new mongoose.Types.ObjectId() });

      jest.spyOn(Student, "findById")
        .mockResolvedValueOnce({ _id: studentId1, name: "Sneha Reddy", classId: new mongoose.Types.ObjectId() })
        .mockResolvedValueOnce({ _id: studentId2, name: "Aditya Roy", classId: new mongoose.Types.ObjectId() });

      // Student 1 has no existing remark (will be saved)
      const mockResult1 = {
        percentage: 84,
        grade: "A",
        remarks: null,
        save: jest.fn().mockResolvedValue(true),
      };

      // Student 2 has existing remark (should be preserved unless confirmOverwrite is passed)
      const mockResult2 = {
        percentage: 72,
        grade: "B",
        remarks: "Hard worker and very attentive.",
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Result, "findOne").mockImplementation((query) => {
        if (query?.examId && typeof query.examId === "object" && query.examId.$ne) {
          return {
            sort: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(null),
            }),
          };
        }
        if (query?.studentId?.toString() === studentId1.toString()) {
          return Promise.resolve(mockResult1);
        }
        if (query?.studentId?.toString() === studentId2.toString()) {
          return Promise.resolve(mockResult2);
        }
        return Promise.resolve(null);
      });

      jest.spyOn(Attendance, "countDocuments").mockResolvedValue(50);
      jest.spyOn(Homework, "countDocuments").mockResolvedValue(10);
      jest.spyOn(HomeworkSubmission, "countDocuments").mockResolvedValue(9);

      const req = {
        body: {
          examId,
          studentIds: [studentId1, studentId2],
          tone: "encouraging",
          confirmOverwrite: false,
        },
        user: { _id: new mongoose.Types.ObjectId(), schoolId: new mongoose.Types.ObjectId(), role: "teacher" },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await classTeacherCtrl.draftReportRemarks(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      const drafts = res.json.mock.calls[0][0].data;
      expect(drafts.length).toBe(2);

      // Student 1 remark saved as draft
      expect(drafts[0].savedAsDraft).toBe(true);

      // Student 2 remark preserved (requires confirm to overwrite)
      expect(drafts[1].savedAsDraft).toBe(false);
      expect(drafts[1].existingRemark).toBe("Hard worker and very attentive.");
      expect(drafts[1].requiresConfirmToOverwrite).toBe(true);
    });
  });

  // ============================================
  // 5. COMMUNICATION CONTROLS & TEACHER AI TOOLS
  // ============================================
  describe("5. Communication Controls & Teacher AI Tools", () => {
    it("should enforce class notices rate limit of 5 per day per teacher", async () => {
      const teacherId = new mongoose.Types.ObjectId();
      const teacherUserId = new mongoose.Types.ObjectId();
      const classId = new mongoose.Types.ObjectId();

      jest.spyOn(Teacher, "findOne").mockResolvedValueOnce({
        _id: teacherId,
        assignedClasses: [classId],
      });
      jest.spyOn(ClassSection, "findById").mockResolvedValueOnce({
        _id: classId,
        className: "10",
        section: "A",
      });

      // 5 notices published today
      jest.spyOn(Circular, "countDocuments").mockResolvedValueOnce(5);

      const req = {
        user: { _id: teacherUserId, schoolId: new mongoose.Types.ObjectId(), role: "teacher" },
        body: {
          title: "Test Reminder",
          body: "Unit test tomorrow",
          classId,
        },
      };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await commCtrl.createClassNotice(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 429, message: expect.stringContaining("5 notices") })
      );
    });

    it("should execute read-only teacher AI tools and filter financial factors from students needing attention", async () => {
      const teacherId = new mongoose.Types.ObjectId();
      const classId = new mongoose.Types.ObjectId();

      const mockTeacherRecord = {
        _id: teacherId,
        assignedClasses: [classId],
        subjects: ["Biology"],
      };

      jest.spyOn(StudentRisk, "find").mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValueOnce([
          {
            band: "high",
            studentId: { name: "Ananya Roy", rollNumber: "5" },
            classId: { className: "9", section: "A" },
            reasons: [
              { factor: "academics", detail: "Scored < 40% in Biology quiz", visibility: "general" },
              { factor: "fees", detail: "Overdue bus fees", visibility: "finance" },
            ],
          },
        ]),
      });

      const attentionResult = await teacherToolHandlers.getStudentsNeedingAttention({
        teacherRecord: mockTeacherRecord,
        classId: classId.toString(),
      });

      expect(attentionResult.studentsNeedingAttentionCount).toBe(1);
      const studentInfo = attentionResult.students[0];
      // PII minimization: first name only
      expect(studentInfo.firstName).toBe("Ananya");
      // Financial reason stripped
      expect(studentInfo.academicOrDisciplineNotes.length).toBe(1);
      expect(studentInfo.academicOrDisciplineNotes[0]).toContain("Biology quiz");
      expect(studentInfo.academicOrDisciplineNotes[0]).not.toContain("bus fees");
    });
  });
});
