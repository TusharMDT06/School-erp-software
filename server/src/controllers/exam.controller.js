const Exam = require("../models/Exam.model");
const Result = require("../models/Result.model");
const ClassSection = require("../models/ClassSection.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

/**
 * POST /api/exams
 * Creates a new examination schedule with subject allocations.
 * Authorized: admin, superadmin.
 */
const createExam = async (req, res, next) => {
  try {
    const { classId, examName, academicYear, subjects } = req.body;

    if (!classId || !examName || !academicYear || !Array.isArray(subjects) || subjects.length === 0) {
      throw new ApiError(400, "classId, examName, academicYear, and a non-empty subjects list are required.");
    }

    const classSection = await ClassSection.findById(classId);
    if (!classSection) {
      throw new ApiError(404, "Class section not found.");
    }

    for (const sub of subjects) {
      if (!sub.subjectName || !sub.maxMarks || sub.passingMarks === undefined) {
        throw new ApiError(400, "Each subject requires subjectName, maxMarks, and passingMarks.");
      }
      if (sub.passingMarks > sub.maxMarks) {
        throw new ApiError(400, `Passing marks cannot exceed max marks for ${sub.subjectName}.`);
      }
    }

    const exam = new Exam({
      schoolId: classSection.schoolId,
      classId,
      examName,
      academicYear,
      subjects,
      resultPublished: false,
    });

    await exam.save();

    res.status(201).json(new ApiResponse(201, exam, "Examination schedule created successfully."));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/exams/class/:classId
 * Lists all exams for a specific class section.
 */
const getExamsByClass = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const exams = await Exam.find({ classId })
      .populate("classId", "className section academicYear")
      .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, exams, "Class examinations retrieved."));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/exams/:id
 * Retrieves details for a specific examination.
 */
const getExamById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id).populate("classId", "className section academicYear");

    if (!exam) {
      throw new ApiError(404, "Examination not found.");
    }

    res.status(200).json(new ApiResponse(200, exam, "Exam details retrieved."));
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/exams/:id
 * Updates an examination schedule.
 * Cannot modify core subject scheme if results are already published.
 */
const updateExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { examName, academicYear, subjects } = req.body;

    const exam = await Exam.findById(id);
    if (!exam) {
      throw new ApiError(404, "Examination not found.");
    }

    if (exam.resultPublished) {
      throw new ApiError(400, "Cannot modify an examination whose results have already been published.");
    }

    if (examName) exam.examName = examName;
    if (academicYear) exam.academicYear = academicYear;
    if (Array.isArray(subjects) && subjects.length > 0) exam.subjects = subjects;

    await exam.save();

    res.status(200).json(new ApiResponse(200, exam, "Examination updated successfully."));
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/exams/:id
 * Deletes an examination only if no student marks/results have been recorded yet.
 */
const deleteExam = async (req, res, next) => {
  try {
    const { id } = req.params;

    const exam = await Exam.findById(id);
    if (!exam) {
      throw new ApiError(404, "Examination not found.");
    }

    const resultsCount = await Result.countDocuments({ examId: id });
    if (resultsCount > 0) {
      throw new ApiError(
        400,
        `Cannot delete this examination because ${resultsCount} student result record(s) already exist. Clear marks first.`
      );
    }

    await Exam.findByIdAndDelete(id);

    res.status(200).json(new ApiResponse(200, { id }, "Examination deleted successfully."));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createExam,
  getExamsByClass,
  getExamById,
  updateExam,
  deleteExam,
};
