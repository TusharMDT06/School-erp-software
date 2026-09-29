const mongoose = require("mongoose");
const StudyMaterial = require("../models/StudyMaterial.model");
const Student = require("../models/Student.model");
const Teacher = require("../models/Teacher.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const { assertTeacherOwnsClassSubject } = require("../utils/teacherAccess");
const { notifyMany } = require("../services/notification.service");

// ══════════════════════════════════════════════════════════════════════════
//  TEACHER ENDPOINTS
// ══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/study-materials
 * Teacher uploads or links study material for their assigned class and subject.
 */
const createStudyMaterial = async (req, res, next) => {
  try {
    const {
      classId,
      subject,
      title,
      description = "",
      type,
      linkUrl = null,
      chapter = "",
      visibleFrom = null,
      isPublished = true,
    } = req.body;

    if (!classId || !subject || !title || !type) {
      throw new ApiError(400, "classId, subject, title, and type are required.");
    }

    const { teacher, classSection } = await assertTeacherOwnsClassSubject(
      req.user,
      classId,
      subject
    );

    let fileUrl = null;
    let fileName = null;
    let fileSize = 0;

    if (req.file) {
      fileUrl = req.file.cloudinaryUrl || `/uploads/${req.file.filename}`;
      fileName = req.file.originalname;
      fileSize = req.file.size;
    } else if (["link", "video_link"].includes(type) && !linkUrl) {
      throw new ApiError(400, "linkUrl is required for link and video_link types.");
    }

    const material = await StudyMaterial.create({
      schoolId: classSection.schoolId,
      classId,
      subject: subject.trim(),
      teacherId: teacher._id,
      title: title.trim(),
      description: description.trim(),
      type,
      fileUrl,
      fileName,
      fileSize,
      linkUrl: linkUrl ? linkUrl.trim() : null,
      chapter: chapter ? chapter.trim() : "",
      visibleFrom: visibleFrom ? new Date(visibleFrom) : new Date(),
      isPublished: Boolean(isPublished),
    });

    // If published immediately, notify students in class in-app
    if (material.isPublished) {
      const students = await Student.find({
        classId,
        isAccountActivated: true,
        userId: { $ne: null },
      }).select("userId");

      const studentUserIds = students.map((s) => s.userId).filter(Boolean);
      if (studentUserIds.length > 0) {
        notifyMany(studentUserIds, {
          type: "material_published",
          title: `Study Material: ${subject}`,
          message: `New study material "${title}" added for ${subject} (${chapter || "General"}).`,
          data: {
            materialId: material._id,
            subject,
            title,
            type,
            chapter,
            schoolId: classSection.schoolId,
          },
          schoolId: classSection.schoolId,
          sendEmailFlag: false, // in-app only per spec
        }).catch((err) => console.warn("[createStudyMaterial] notify error:", err.message));
      }
    }

    res.status(201).json(new ApiResponse(201, material, "Study material created successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/study-materials/mine
 * Teacher views their uploaded study materials.
 */
const getMyStudyMaterials = async (req, res, next) => {
  try {
    const teacher = await Teacher.findOne({ userId: req.user.id || req.user._id });
    if (!teacher) throw new ApiError(404, "Teacher profile not found.");

    const filter = { teacherId: teacher._id };
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.subject) filter.subject = new RegExp(`^${req.query.subject.trim()}$`, "i");
    if (req.query.chapter) filter.chapter = new RegExp(`^${req.query.chapter.trim()}$`, "i");

    const materials = await StudyMaterial.find(filter)
      .populate("classId", "className section")
      .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, materials, "Study materials fetched."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/study-materials/:id
 * Teacher updates study material.
 */
const updateStudyMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const material = await StudyMaterial.findById(id);
    if (!material) throw new ApiError(404, "Study material not found.");

    await assertTeacherOwnsClassSubject(req.user, material.classId, material.subject);

    const { title, description, chapter, linkUrl, visibleFrom } = req.body;
    if (title !== undefined) material.title = title.trim();
    if (description !== undefined) material.description = description.trim();
    if (chapter !== undefined) material.chapter = chapter.trim();
    if (linkUrl !== undefined) material.linkUrl = linkUrl.trim();
    if (visibleFrom !== undefined) material.visibleFrom = new Date(visibleFrom);

    if (req.file) {
      material.fileUrl = req.file.cloudinaryUrl || `/uploads/${req.file.filename}`;
      material.fileName = req.file.originalname;
      material.fileSize = req.file.size;
    }

    await material.save();
    res.status(200).json(new ApiResponse(200, material, "Study material updated."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/study-materials/:id/toggle-publish
 * Flips published state (unpublish instead of delete).
 */
const togglePublishMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const material = await StudyMaterial.findById(id);
    if (!material) throw new ApiError(404, "Study material not found.");

    await assertTeacherOwnsClassSubject(req.user, material.classId, material.subject);

    material.isPublished = !material.isPublished;
    await material.save();

    res.status(200).json(
      new ApiResponse(
        200,
        material,
        `Material ${material.isPublished ? "published" : "unpublished"} successfully.`
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/study-materials/:id
 * Unpublishes or deletes material (unpublish instead of delete pattern).
 */
const deleteStudyMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const material = await StudyMaterial.findById(id);
    if (!material) throw new ApiError(404, "Study material not found.");

    await assertTeacherOwnsClassSubject(req.user, material.classId, material.subject);

    // If published, unpublish first for safety
    if (material.isPublished) {
      material.isPublished = false;
      await material.save();
      return res.status(200).json(
        new ApiResponse(
          200,
          material,
          "Material unpublished. Repeat deletion if permanent removal is intended."
        )
      );
    }

    await StudyMaterial.findByIdAndDelete(id);
    res.status(200).json(new ApiResponse(200, null, "Study material deleted successfully."));
  } catch (err) {
    next(err);
  }
};

// ══════════════════════════════════════════════════════════════════════════
//  STUDENT ENDPOINT
// ══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/student/materials?subject=&chapter=
 * Returns published study materials for the logged-in student's class.
 */
const getStudentMaterials = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id || req.user._id });
    if (!student) throw new ApiError(404, "Student profile not found.");

    const now = new Date();
    const filter = {
      classId: student.classId,
      isPublished: true,
      visibleFrom: { $lte: now },
    };

    if (req.query.subject) {
      filter.subject = new RegExp(`^${req.query.subject.trim()}$`, "i");
    }

    if (req.query.chapter) {
      filter.chapter = new RegExp(`^${req.query.chapter.trim()}$`, "i");
    }

    const materials = await StudyMaterial.find(filter)
      .populate("teacherId", "employeeId")
      .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, materials, "Study materials fetched."));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createStudyMaterial,
  getMyStudyMaterials,
  updateStudyMaterial,
  togglePublishMaterial,
  deleteStudyMaterial,
  getStudentMaterials,
};
