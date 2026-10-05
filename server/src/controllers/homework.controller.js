const mongoose = require("mongoose");
const Homework = require("../models/Homework.model");
const HomeworkSubmission = require("../models/HomeworkSubmission.model");
const Student = require("../models/Student.model");
const User = require("../models/User.model");
const Teacher = require("../models/Teacher.model");
const ClassSection = require("../models/ClassSection.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const { assertTeacherOwnsClassSubject } = require("../utils/teacherAccess");
const { notify, notifyMany } = require("../services/notification.service");
const { invalidateTeacherDashboardCache } = require("../utils/dashboardCache");

// ══════════════════════════════════════════════════════════════════════════
//  TEACHER ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/homework
 * Teacher publishes a new homework assignment.
 */
const createHomework = async (req, res, next) => {
  try {
    const {
      classId,
      subject,
      title,
      description = "",
      dueDate,
      allowLateSubmission = false,
      maxMarks = null,
      submissionType = "file",
    } = req.body;

    if (!classId || !subject || !title || !dueDate) {
      throw new ApiError(400, "classId, subject, title, and dueDate are required.");
    }

    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      throw new ApiError(400, "Invalid dueDate format.");
    }

    // Ownership check: validates teacher is assigned to this class and subject
    const { teacher, classSection } = await assertTeacherOwnsClassSubject(
      req.user,
      classId,
      subject
    );

    // Process uploaded attachments if any
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map((file) => ({
        name: file.originalname,
        url: file.cloudinaryUrl || `/uploads/${file.filename}`,
      }));
    } else if (req.body.attachments) {
      try {
        attachments = typeof req.body.attachments === "string"
          ? JSON.parse(req.body.attachments)
          : req.body.attachments;
      } catch {
        attachments = [];
      }
    }

    const homework = await Homework.create({
      schoolId: classSection.schoolId,
      classId,
      subject: subject.trim(),
      teacherId: teacher._id,
      title: title.trim(),
      description: description.trim(),
      attachments,
      assignedDate: new Date(),
      dueDate: parsedDueDate,
      allowLateSubmission: Boolean(allowLateSubmission),
      maxMarks: maxMarks ? Number(maxMarks) : null,
      submissionType,
      status: "published",
    });

    // Notify students in class in-app immediately (emails are sent via daily 6 PM digest cron)
    const studentsInClass = await Student.find({
      classId,
      isAccountActivated: true,
      userId: { $ne: null },
    }).select("userId");

    const studentUserIds = studentsInClass.map((s) => s.userId).filter(Boolean);
    if (studentUserIds.length > 0) {
      notifyMany(studentUserIds, {
        type: "homework_assigned",
        title: `New Homework: ${subject}`,
        message: `"${title}" has been assigned for ${subject}. Due on ${parsedDueDate.toLocaleDateString("en-IN")}.`,
        data: {
          homeworkId: homework._id,
          subject,
          title,
          dueDate: parsedDueDate,
          schoolId: classSection.schoolId,
        },
        schoolId: classSection.schoolId,
        sendEmailFlag: false, // Per spec: emails go out in 6 PM digest, not individually
      }).catch((err) => console.warn("[createHomework] notify error:", err.message));
    }

    // Invalidate teacher dashboard cache
    await invalidateTeacherDashboardCache(teacher._id);

    res.status(201).json(new ApiResponse(201, homework, "Homework published successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/homework/:id
 * Teacher updates an existing homework.
 */
const updateHomework = async (req, res, next) => {
  try {
    const { id } = req.params;
    const homework = await Homework.findById(id);
    if (!homework) throw new ApiError(404, "Homework not found.");

    // Ownership check
    await assertTeacherOwnsClassSubject(req.user, homework.classId, homework.subject);

    const {
      title,
      description,
      dueDate,
      allowLateSubmission,
      maxMarks,
      submissionType,
    } = req.body;

    if (title !== undefined) homework.title = title.trim();
    if (description !== undefined) homework.description = description.trim();
    if (dueDate !== undefined) homework.dueDate = new Date(dueDate);
    if (allowLateSubmission !== undefined) homework.allowLateSubmission = Boolean(allowLateSubmission);
    if (maxMarks !== undefined) homework.maxMarks = maxMarks ? Number(maxMarks) : null;
    if (submissionType !== undefined) homework.submissionType = submissionType;

    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map((file) => ({
        name: file.originalname,
        url: file.cloudinaryUrl || `/uploads/${file.filename}`,
      }));
      homework.attachments.push(...newAttachments);
    }

    await homework.save();
    await invalidateTeacherDashboardCache(homework.teacherId);

    res.status(200).json(new ApiResponse(200, homework, "Homework updated successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/homework/:id/close
 * Teacher closes homework for submissions.
 */
const closeHomework = async (req, res, next) => {
  try {
    const { id } = req.params;
    const homework = await Homework.findById(id);
    if (!homework) throw new ApiError(404, "Homework not found.");

    await assertTeacherOwnsClassSubject(req.user, homework.classId, homework.subject);

    homework.status = "closed";
    await homework.save();
    await invalidateTeacherDashboardCache(homework.teacherId);

    res.status(200).json(new ApiResponse(200, homework, "Homework closed successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/homework/:id
 * Enforces requirement: "No delete once any submission exists (close instead)."
 */
const deleteHomework = async (req, res, next) => {
  try {
    const { id } = req.params;
    const homework = await Homework.findById(id);
    if (!homework) throw new ApiError(404, "Homework not found.");

    await assertTeacherOwnsClassSubject(req.user, homework.classId, homework.subject);

    const submissionCount = await HomeworkSubmission.countDocuments({ homeworkId: id });
    if (submissionCount > 0) {
      throw new ApiError(
        400,
        `Cannot delete homework with ${submissionCount} existing submission(s). Please close it instead.`
      );
    }

    await Homework.findByIdAndDelete(id);
    await invalidateTeacherDashboardCache(homework.teacherId);

    res.status(200).json(new ApiResponse(200, null, "Homework deleted successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/homework/mine
 * Teacher retrieves their assignments with submission statistics.
 */
const getMyHomework = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.id || req.user._id });
    if (!teacher) throw new ApiError(404, "Teacher profile not found.");

    const filter = { teacherId: teacher._id };
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.subject) filter.subject = new RegExp(`^${req.query.subject.trim()}$`, "i");
    if (req.query.status) filter.status = req.query.status;

    const homeworkList = await Homework.find(filter)
      .populate("classId", "className section academicYear")
      .sort({ createdAt: -1 })
      .lean();

    // Attach submission statistics for each homework
    const homeworkWithStats = await Promise.all(
      homeworkList.map(async (hw) => {
        const [totalStudents, submittedCount, reviewedCount, resubmitCount] = await Promise.all([
          Student.countDocuments({ classId: hw.classId?._id }),
          HomeworkSubmission.countDocuments({ homeworkId: hw._id, status: "submitted" }),
          HomeworkSubmission.countDocuments({ homeworkId: hw._id, status: "reviewed" }),
          HomeworkSubmission.countDocuments({ homeworkId: hw._id, status: "resubmit_requested" }),
        ]);

        const completedSubmissions = submittedCount + reviewedCount + resubmitCount;
        const pendingCount = Math.max(0, totalStudents - completedSubmissions);

        return {
          ...hw,
          stats: {
            totalStudents,
            submittedCount,
            reviewedCount,
            resubmitCount,
            pendingCount,
            completionRate: totalStudents > 0 ? Math.round((completedSubmissions / totalStudents) * 100) : 0,
          },
        };
      })
    );

    res.status(200).json(new ApiResponse(200, homeworkWithStats, "Teacher homework fetched."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/homework/:id/submissions
 * Returns three distinct lists: submitted, reviewed, and notSubmitted.
 */
const getHomeworkSubmissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const homework = await Homework.findById(id).populate("classId", "className section");
    if (!homework) throw new ApiError(404, "Homework not found.");

    await assertTeacherOwnsClassSubject(req.user, homework.classId?._id || homework.classId, homework.subject);

    // Fetch all submissions for this homework
    const submissions = await HomeworkSubmission.find({ homeworkId: id })
      .populate("studentId", "name rollNumber admissionNumber dob parentPhone userId")
      .populate("reviewedBy", "employeeId")
      .sort({ submittedAt: -1 })
      .lean();

    const submittedList = submissions.filter((s) => s.status === "submitted");
    const reviewedList = submissions.filter(
      (s) => s.status === "reviewed" || s.status === "resubmit_requested"
    );

    const submittedStudentIdSet = new Set(
      submissions.map((s) => s.studentId?._id?.toString()).filter(Boolean)
    );

    // Fetch all enrolled students in the class
    const allStudents = await Student.find({ classId: homework.classId?._id || homework.classId })
      .select("name rollNumber admissionNumber parentPhone userId")
      .sort({ rollNumber: 1, name: 1 })
      .lean();

    const notSubmittedList = allStudents.filter(
      (student) => !submittedStudentIdSet.has(student._id.toString())
    );

    res.status(200).json(
      new ApiResponse(
        200,
        {
          homework,
          submitted: submittedList,
          reviewed: reviewedList,
          notSubmitted: notSubmittedList,
          counts: {
            submitted: submittedList.length,
            reviewed: reviewedList.length,
            notSubmitted: notSubmittedList.length,
            totalStudents: allStudents.length,
          },
        },
        "Submissions fetched successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/homework/submissions/:id/review
 * Teacher grades a submission and leaves feedback.
 */
const reviewSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { marks = null, feedback = "", requestResubmit = false } = req.body;

    const submission = await HomeworkSubmission.findById(id).populate("homeworkId");
    if (!submission) throw new ApiError(404, "Submission not found.");

    const homework = submission.homeworkId;
    const { teacher } = await assertTeacherOwnsClassSubject(
      req.user,
      homework.classId,
      homework.subject
    );

    if (marks !== null && marks !== undefined && homework.maxMarks !== null) {
      if (Number(marks) > homework.maxMarks) {
        throw new ApiError(400, `Marks cannot exceed maximum marks (${homework.maxMarks}).`);
      }
    }

    submission.marks = marks !== null && marks !== undefined ? Number(marks) : null;
    submission.feedback = feedback.trim();
    submission.status = requestResubmit ? "resubmit_requested" : "reviewed";
    submission.reviewedAt = new Date();
    submission.reviewedBy = teacher._id;

    await submission.save();

    // Notify student
    const student = await Student.findById(submission.studentId).select("userId name");
    if (student?.userId) {
      notify(student.userId, {
        type: "homework_reviewed",
        title: `Homework Reviewed: ${homework.subject}`,
        message: requestResubmit
          ? `Your submission for "${homework.title}" requires revisions. Teacher feedback: ${feedback}`
          : `Your submission for "${homework.title}" was reviewed. Score: ${marks !== null ? `${marks}/${homework.maxMarks || "N/A"}` : "Graded"}.`,
        data: {
          homeworkId: homework._id,
          homeworkTitle: homework.title,
          marks,
          maxMarks: homework.maxMarks,
          feedback,
          requestResubmit,
          schoolId: homework.schoolId,
        },
        schoolId: homework.schoolId,
        sendEmailFlag: true,
      }).catch((err) => console.warn("[reviewSubmission] notify error:", err.message));
    }

    await invalidateTeacherDashboardCache(teacher._id);

    res.status(200).json(new ApiResponse(200, submission, "Submission reviewed successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/homework/:id/nudge
 * Sends reminder notifications to students/parents who have not submitted.
 * Limited to one nudge per 24 hours.
 */
const nudgeNonSubmittingStudents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const homework = await Homework.findById(id);
    if (!homework) throw new ApiError(404, "Homework not found.");

    await assertTeacherOwnsClassSubject(req.user, homework.classId, homework.subject);

    // Limit one nudge per 24 hours
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    if (homework.lastNudgeAt && Date.now() - new Date(homework.lastNudgeAt).getTime() < TWENTY_FOUR_HOURS) {
      const waitHours = Math.ceil(
        (TWENTY_FOUR_HOURS - (Date.now() - new Date(homework.lastNudgeAt).getTime())) / (60 * 60 * 1000)
      );
      throw new ApiError(
        429,
        `A nudge was already sent recently. Please wait ${waitHours} hour(s) before nudging again.`
      );
    }

    // Find non-submitted students
    const submissions = await HomeworkSubmission.find({ homeworkId: id }).select("studentId");
    const submittedStudentIds = new Set(submissions.map((s) => s.studentId.toString()));

    const allStudents = await Student.find({ classId: homework.classId })
      .select("name userId parentPhone parentEmail")
      .lean();

    const notSubmitted = allStudents.filter((s) => !submittedStudentIds.has(s._id.toString()));

    if (notSubmitted.length === 0) {
      return res.status(200).json(new ApiResponse(200, { recipientCount: 0 }, "All students have already submitted!"));
    }

    // Target student user IDs and parents
    const studentUserIds = notSubmitted.map((s) => s.userId).filter(Boolean);
    const parentPhones = notSubmitted.map((s) => s.parentPhone).filter(Boolean);

    let parentUserIds = [];
    if (parentPhones.length > 0) {
      const parentUsers = await User.find({
        role: "parent",
        phone: { $in: parentPhones },
      }).select("_id");
      parentUserIds = parentUsers.map((u) => u._id);
    }

    const allRecipientUserIds = Array.from(
      new Set([...studentUserIds.map((id) => id.toString()), ...parentUserIds.map((id) => id.toString())])
    );

    if (allRecipientUserIds.length > 0) {
      notifyMany(allRecipientUserIds, {
        type: "homework_due_reminder",
        title: `Reminder: Homework Due for ${homework.subject}`,
        message: `Reminder from teacher: "${homework.title}" (${homework.subject}) has not been submitted yet. Due date: ${new Date(homework.dueDate).toLocaleDateString("en-IN")}.`,
        data: {
          homeworkId: homework._id,
          homeworkTitle: homework.title,
          subject: homework.subject,
          dueDate: homework.dueDate,
          schoolId: homework.schoolId,
        },
        schoolId: homework.schoolId,
        sendEmailFlag: true,
      }).catch((err) => console.warn("[nudge] notify error:", err.message));
    }

    homework.lastNudgeAt = new Date();
    await homework.save();

    res.status(200).json(
      new ApiResponse(
        200,
        {
          notSubmittedCount: notSubmitted.length,
          recipientsCount: allRecipientUserIds.length,
          lastNudgeAt: homework.lastNudgeAt,
        },
        `Nudge sent successfully to ${notSubmitted.length} pending student(s).`
      )
    );
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  STUDENT ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/student/homework?status=pending|submitted|overdue
 * Returns homework for the logged-in student.
 */
const getStudentHomework = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id || req.user._id });
    if (!student) throw new ApiError(404, "Student profile not found.");

    const now = new Date();

    // Fetch published homework for student's class
    const homeworkList = await Homework.find({
      classId: student.classId,
      status: "published",
    })
      .populate("teacherId", "employeeId")
      .sort({ dueDate: 1 })
      .lean();

    // Fetch student's existing submissions
    const submissions = await HomeworkSubmission.find({ studentId: student._id }).lean();
    const submissionMap = new Map(submissions.map((s) => [s.homeworkId.toString(), s]));

    const enriched = homeworkList.map((hw) => {
      const submission = submissionMap.get(hw._id.toString()) || null;
      let computedStatus = "pending";

      if (submission && (submission.status === "submitted" || submission.status === "reviewed")) {
        computedStatus = "submitted";
      } else if (now > new Date(hw.dueDate)) {
        computedStatus = "overdue";
      } else {
        computedStatus = "pending";
      }

      return {
        ...hw,
        submission,
        computedStatus,
      };
    });

    const statusFilter = req.query.status;
    const filtered = statusFilter
      ? enriched.filter((hw) => hw.computedStatus === statusFilter)
      : enriched;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          homework: filtered,
          counts: {
            all: enriched.length,
            pending: enriched.filter((h) => h.computedStatus === "pending").length,
            submitted: enriched.filter((h) => h.computedStatus === "submitted").length,
            overdue: enriched.filter((h) => h.computedStatus === "overdue").length,
          },
        },
        "Student homework fetched."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/student/homework/:id/submit
 * Student uploads files/text for a homework assignment.
 */
const submitStudentHomework = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text = "" } = req.body;

    const student = await Student.findOne({ userId: req.user.id || req.user._id });
    if (!student) throw new ApiError(404, "Student profile not found.");

    const homework = await Homework.findById(id);
    if (!homework) throw new ApiError(404, "Homework not found.");

    if (homework.classId.toString() !== student.classId.toString()) {
      throw new ApiError(403, "This homework was not assigned to your class.");
    }

    if (homework.status === "closed") {
      throw new ApiError(400, "This homework assignment is closed for submissions.");
    }

    const now = new Date();
    const isPastDue = now.getTime() > new Date(homework.dueDate).getTime();

    if (isPastDue && !homework.allowLateSubmission) {
      throw new ApiError(400, "Submission deadline has passed and late submissions are not allowed for this assignment.");
    }

    // Process files
    let uploadedFiles = [];
    if (req.files && req.files.length > 0) {
      uploadedFiles = req.files.map((file) => ({
        name: file.originalname,
        url: file.cloudinaryUrl || `/uploads/${file.filename}`,
        size: file.size,
        mimeType: file.mimetype,
      }));
    }

    if (homework.submissionType === "file" && uploadedFiles.length === 0) {
      throw new ApiError(400, "At least one file must be uploaded for this assignment.");
    }

    if (homework.submissionType === "text" && !text.trim()) {
      throw new ApiError(400, "Text response is required for this assignment.");
    }

    // Upsert submission
    const existingSubmission = await HomeworkSubmission.findOne({
      homeworkId: homework._id,
      studentId: student._id,
    });

    let submission;
    if (existingSubmission) {
      existingSubmission.files = uploadedFiles.length > 0 ? uploadedFiles : existingSubmission.files;
      existingSubmission.text = text ? text.trim() : existingSubmission.text;
      existingSubmission.submittedAt = now;
      existingSubmission.isLate = isPastDue;
      existingSubmission.status = "submitted";
      submission = await existingSubmission.save();
    } else {
      submission = await HomeworkSubmission.create({
        homeworkId: homework._id,
        studentId: student._id,
        files: uploadedFiles,
        text: text.trim(),
        submittedAt: now,
        isLate: isPastDue,
        status: "submitted",
      });
    }

    // Invalidate teacher dashboard cache
    await invalidateTeacherDashboardCache(homework.teacherId);

    res.status(200).json(new ApiResponse(200, submission, "Homework submitted successfully."));
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  PARENT ENDPOINT
// ══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/parent/children/:studentId/homework
 * Parent reads homework assigned to their child.
 */
const getChildHomework = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) throw new ApiError(404, "Student record not found.");

    // Verify child belongs to this parent
    const isParentMatch =
      req.user.role === "admin" ||
      req.user.role === "superadmin" ||
      req.user.role === "principal" ||
      (student.guardianIds &&
        student.guardianIds.some(
          (gid) =>
            gid.toString() === req.user.id ||
            gid.toString() === req.user._id?.toString()
        )) ||
      (req.user.phone && student.parentPhone === req.user.phone) ||
      (req.user.email && student.parentEmail === req.user.email) ||
      (req.user.phone && student.guardianPhone === req.user.phone);

    if (!isParentMatch) {
      throw new ApiError(403, "Access denied. This student is not registered under your parent account.");
    }

    const homeworkList = await Homework.find({
      classId: student.classId,
      status: "published",
    })
      .sort({ dueDate: 1 })
      .lean();

    const submissions = await HomeworkSubmission.find({ studentId: student._id }).lean();
    const submissionMap = new Map(submissions.map((s) => [s.homeworkId.toString(), s]));

    const now = new Date();
    const enriched = homeworkList.map((hw) => {
      const submission = submissionMap.get(hw._id.toString()) || null;
      let computedStatus = "pending";

      if (submission && (submission.status === "submitted" || submission.status === "reviewed")) {
        computedStatus = "submitted";
      } else if (now > new Date(hw.dueDate)) {
        computedStatus = "overdue";
      } else {
        computedStatus = "pending";
      }

      return {
        ...hw,
        submission,
        computedStatus,
      };
    });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          student: {
            id: student._id,
            name: student.name,
            rollNumber: student.rollNumber,
          },
          homework: enriched,
        },
        "Child homework fetched."
      )
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  // Teacher
  createHomework,
  updateHomework,
  closeHomework,
  deleteHomework,
  getMyHomework,
  getHomeworkSubmissions,
  reviewSubmission,
  nudgeNonSubmittingStudents,
  // Student
  getStudentHomework,
  submitStudentHomework,
  // Parent
  getChildHomework,
};
