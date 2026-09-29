const mongoose = require("mongoose");
const Teacher = require("../models/Teacher.model");
const User = require("../models/User.model");
const ClassSection = require("../models/ClassSection.model");
const SubstituteAssignment = require("../models/SubstituteAssignment.model");
const { ApiError } = require("./apiResponse");

/**
 * Resolves or auto-heals the teacher document corresponding to the authenticated user.
 * Guarantees that users with role "teacher" or privileged roles don't fail with 404.
 */
const getOrEnsureTeacher = async (user) => {
  if (!user) return null;
  const userId = user._id || user.id;
  if (!userId) return null;

  let teacher = await Teacher.findOne({ userId });
  if (!teacher && user.email) {
    const userDoc = await User.findOne({ email: user.email });
    if (userDoc) {
      teacher = await Teacher.findOne({ userId: userDoc._id });
    }
  }

  // If still not found and user has role === "teacher", auto-create minimal profile
  if (!teacher && user.role === "teacher") {
    try {
      const empId = `EMP-${Date.now().toString().slice(-6)}`;
      teacher = await Teacher.create({
        userId,
        employeeId: empId,
        subjects: [],
        assignedClasses: [],
      });
    } catch (e) {
      teacher = await Teacher.findOne({ userId });
    }
  }

  // If user is admin/principal/superadmin, fallback to school's first teacher
  if (!teacher && ["admin", "principal", "superadmin"].includes(user.role)) {
    teacher =
      (await Teacher.findOne({ schoolId: user.schoolId })) ||
      (await Teacher.findOne());
  }

  return teacher;
};

/**
 * Validates that the logged-in user is a teacher and owns/is assigned to the specified class and subject.
 * Also checks if the teacher is the class teacher or has an active substitution for that class/date.
 *
 * @param {Object} user - The req.user object (must have role === "teacher")
 * @param {string|ObjectId} classId - Target class section ID
 * @param {string} [subject] - Optional subject name to verify
 * @param {Object} [options] - Additional options:
 *   - allowClassTeacherOnly: boolean (only class teacher of this class can perform this action)
 *   - date: string | Date (check for active substitute assignment on this date, YYYY-MM-DD)
 * @returns {Promise<{ teacher: Object, isClassTeacher: boolean, isSubstitute: boolean }>}
 * @throws {ApiError} 403 if unauthorized or teacher profile not found
 */
const assertTeacherOwnsClassSubject = async (user, classId, subject = null, options = {}) => {
  if (!user || user.role !== "teacher") {
    throw new ApiError(403, "Access restricted to teachers.");
  }

  const teacher = await getOrEnsureTeacher(user);
  if (!teacher) {
    throw new ApiError(403, "Teacher profile not found for this account.");
  }

  if (!classId) {
    throw new ApiError(400, "Class ID is required for verification.");
  }

  const classSection = await ClassSection.findById(classId);
  if (!classSection) {
    throw new ApiError(404, "Class section not found.");
  }

  const isClassTeacher =
    classSection.classTeacherId &&
    classSection.classTeacherId.toString() === teacher._id.toString();

  // If only class teacher is allowed (e.g. specific class-level actions)
  if (options.allowClassTeacherOnly) {
    if (!isClassTeacher) {
      throw new ApiError(403, "Access denied. You must be the assigned class teacher for this class.");
    }
    return { teacher, classSection, isClassTeacher: true, isSubstitute: false };
  }

  const isAssignedClass = teacher.assignedClasses?.some(
    (assignedId) => assignedId.toString() === classId.toString()
  );

  // Check active substitute assignment if date is provided or if not directly assigned
  let isSubstitute = false;
  if (options.date) {
    const dateStr =
      typeof options.date === "string"
        ? options.date.slice(0, 10)
        : new Date(options.date).toISOString().slice(0, 10);

    const subFilter = {
      substituteTeacherId: teacher._id,
      classId,
      date: dateStr,
      status: { $in: ["assigned", "acknowledged", "completed"] },
    };
    if (subject) {
      subFilter.subject = new RegExp(`^${subject.trim()}$`, "i");
    }

    const subAssignment = await SubstituteAssignment.findOne(subFilter);
    if (subAssignment) {
      isSubstitute = true;
    }
  }

  // If teacher is class teacher, they can perform class-level operations
  if (isClassTeacher) {
    // If subject is specified, verify subject ownership or allow if teacher's subjects include it
    if (subject) {
      const subjectMatch = teacher.subjects?.some(
        (s) => s.trim().toLowerCase() === subject.trim().toLowerCase()
      );
      if (!subjectMatch && !isSubstitute) {
        throw new ApiError(403, `Access denied. You do not teach subject "${subject}" in this class.`);
      }
    }
    return { teacher, classSection, isClassTeacher: true, isSubstitute };
  }

  // If not class teacher, must be in assignedClasses or active substitute
  if (!isAssignedClass && !isSubstitute) {
    throw new ApiError(403, "Access denied. You are not assigned to this class.");
  }

  // If subject is specified, must match teacher's subjects or substitute assignment
  if (subject && !isSubstitute) {
    const subjectMatch = teacher.subjects?.some(
      (s) => s.trim().toLowerCase() === subject.trim().toLowerCase()
    );
    if (!subjectMatch) {
      throw new ApiError(403, `Access denied. You do not teach subject "${subject}".`);
    }
  }

  return { teacher, classSection, isClassTeacher: false, isSubstitute };
};

/**
 * Retrieves teacher's assigned classes and subjects for select dropdowns.
 */
const getTeacherClassesAndSubjects = async (user) => {
  const teacher = await getOrEnsureTeacher(user);

  if (!teacher) {
    throw new ApiError(404, "Teacher profile not found.");
  }

  const populatedTeacher = await Teacher.findById(teacher._id).populate({
    path: "assignedClasses",
    select: "_id className section academicYear",
  });

  // Also find if teacher is class teacher for any classes
  const classTeacherOf = await ClassSection.find({
    classTeacherId: teacher._id,
  }).select("_id className section academicYear");

  // Merge classes without duplicates
  const classMap = new Map();
  (populatedTeacher?.assignedClasses || []).forEach((c) => {
    if (c) classMap.set(c._id.toString(), { ...c.toObject(), isClassTeacher: false });
  });
  classTeacherOf.forEach((c) => {
    const existing = classMap.get(c._id.toString());
    if (existing) {
      existing.isClassTeacher = true;
    } else {
      classMap.set(c._id.toString(), { ...c.toObject(), isClassTeacher: true });
    }
  });

  return {
    teacherId: teacher._id,
    classes: Array.from(classMap.values()),
    subjects: teacher.subjects || [],
  };
};

module.exports = {
  getOrEnsureTeacher,
  assertTeacherOwnsClassSubject,
  getTeacherClassesAndSubjects,
};
