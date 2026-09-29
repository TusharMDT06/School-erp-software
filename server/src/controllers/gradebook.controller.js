const mongoose = require("mongoose");
const ExcelJS = require("exceljs");
const AssessmentComponent = require("../models/AssessmentComponent.model");
const ComponentScore = require("../models/ComponentScore.model");
const Student = require("../models/Student.model");
const Homework = require("../models/Homework.model");
const HomeworkSubmission = require("../models/HomeworkSubmission.model");
const ClassSection = require("../models/ClassSection.model");
const { ApiResponse, ApiError } = require("../utils/apiResponse");
const { assertTeacherOwnsClassSubject } = require("../utils/teacherAccess");

// NOTE: Future Hook: This continuous assessment weighted internal marks can be fed directly into report cards / term exam summaries.

/**
 * Validates that total weightage for a class + subject + academicYear does not exceed 100%.
 */
const validateClassSubjectWeightage = async (classId, subject, academicYear, newWeightage, excludeComponentId = null) => {
  const query = {
    classId,
    subject: new RegExp(`^${subject.trim()}$`, "i"),
    academicYear,
  };
  if (excludeComponentId) {
    query._id = { $ne: excludeComponentId };
  }

  const existing = await AssessmentComponent.find(query);
  const currentTotal = existing.reduce((sum, c) => sum + (c.weightage || 0), 0);
  const proposedTotal = currentTotal + Number(newWeightage);

  if (proposedTotal > 100) {
    throw new ApiError(
      400,
      `Total weightage cannot exceed 100%. Current total is ${currentTotal}%. Maximum allowed for this component is ${Math.max(
        0,
        100 - currentTotal
      )}%.`
    );
  }

  return { currentTotal, proposedTotal };
};

/**
 * POST /api/gradebook/components
 * Create an assessment component with weightage check.
 */
const createComponent = async (req, res, next) => {
  try {
    const { classId, subject, academicYear, name, maxMarks, weightage, date } = req.body;

    if (!classId || !subject || !academicYear || !name || maxMarks === undefined || weightage === undefined) {
      throw new ApiError(400, "classId, subject, academicYear, name, maxMarks, and weightage are required.");
    }

    const { teacher, classSection } = await assertTeacherOwnsClassSubject(req.user, classId, subject);

    await validateClassSubjectWeightage(classId, subject, academicYear, weightage);

    const component = await AssessmentComponent.create({
      schoolId: classSection.schoolId,
      classId: classSection._id,
      subject: subject.trim(),
      academicYear: academicYear.trim(),
      name: name.trim(),
      maxMarks: Number(maxMarks),
      weightage: Number(weightage),
      date: date ? new Date(date) : new Date(),
      teacherId: teacher._id,
      isPublished: false,
    });

    res.status(201).json(new ApiResponse(201, component, "Assessment component created successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/gradebook/components
 */
const getComponents = async (req, res, next) => {
  try {
    const { classId, subject, academicYear } = req.query;

    if (!classId || !subject) {
      throw new ApiError(400, "classId and subject query params are required.");
    }

    const filter = {
      classId,
      subject: new RegExp(`^${subject.trim()}$`, "i"),
    };
    if (academicYear) filter.academicYear = academicYear;

    const components = await AssessmentComponent.find(filter)
      .populate("teacherId", "name employeeId")
      .sort({ date: 1, createdAt: 1 });

    const totalWeightage = components.reduce((sum, c) => sum + (c.weightage || 0), 0);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          components,
          totalWeightage,
          remainingWeightage: Math.max(0, 100 - totalWeightage),
        },
        "Assessment components fetched successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/gradebook/components/:id
 */
const getComponentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const component = await AssessmentComponent.findById(id).populate("teacherId", "name");
    if (!component) throw new ApiError(404, "Assessment component not found.");

    res.status(200).json(new ApiResponse(200, component, "Assessment component fetched."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/gradebook/components/:id
 */
const updateComponent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const component = await AssessmentComponent.findById(id);
    if (!component) throw new ApiError(404, "Assessment component not found.");

    await assertTeacherOwnsClassSubject(req.user, component.classId, component.subject);

    const { name, maxMarks, weightage, date, isPublished } = req.body;

    if (weightage !== undefined && Number(weightage) !== component.weightage) {
      await validateClassSubjectWeightage(
        component.classId,
        component.subject,
        component.academicYear,
        weightage,
        component._id
      );
      component.weightage = Number(weightage);
    }

    if (name !== undefined) component.name = name.trim();
    if (maxMarks !== undefined) component.maxMarks = Number(maxMarks);
    if (date !== undefined) component.date = new Date(date);
    if (isPublished !== undefined) component.isPublished = Boolean(isPublished);

    await component.save();

    res.status(200).json(new ApiResponse(200, component, "Assessment component updated successfully."));
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/gradebook/components/:id
 */
const deleteComponent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const component = await AssessmentComponent.findById(id);
    if (!component) throw new ApiError(404, "Assessment component not found.");

    await assertTeacherOwnsClassSubject(req.user, component.classId, component.subject);

    // Remove component and all associated student scores
    await AssessmentComponent.findByIdAndDelete(id);
    await ComponentScore.deleteMany({ componentId: id });

    res.status(200).json(new ApiResponse(200, null, "Assessment component and associated scores deleted."));
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/gradebook/components/:id/scores
 * Bulk spreadsheet grid save for student scores.
 */
const saveComponentScores = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { scores } = req.body; // Array of { studentId, marks, absent, remark }

    if (!Array.isArray(scores)) {
      throw new ApiError(400, "scores must be an array of student marks.");
    }

    const component = await AssessmentComponent.findById(id);
    if (!component) throw new ApiError(404, "Assessment component not found.");

    await assertTeacherOwnsClassSubject(req.user, component.classId, component.subject);

    const bulkOps = [];
    for (const item of scores) {
      if (!item.studentId) continue;

      const isAbsent = Boolean(item.absent);
      let marksValue = null;

      if (!isAbsent && item.marks !== null && item.marks !== undefined && item.marks !== "") {
        const num = Number(item.marks);
        if (isNaN(num) || num < 0 || num > component.maxMarks) {
          throw new ApiError(
            400,
            `Marks for student ${item.studentId} must be between 0 and maximum marks (${component.maxMarks}).`
          );
        }
        marksValue = num;
      }

      bulkOps.push({
        updateOne: {
          filter: { componentId: component._id, studentId: item.studentId },
          update: {
            $set: {
              marks: marksValue,
              absent: isAbsent,
              remark: item.remark ? String(item.remark).trim() : "",
            },
          },
          upsert: true,
        },
      });
    }

    if (bulkOps.length > 0) {
      await ComponentScore.bulkWrite(bulkOps);
    }

    const updatedScores = await ComponentScore.find({ componentId: component._id });

    res.status(200).json(
      new ApiResponse(
        200,
        {
          componentId: component._id,
          savedCount: bulkOps.length,
          scores: updatedScores,
        },
        "Component scores saved successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Helper to compute reviewed homework averages per student for a given class & subject.
 */
const computeHomeworkAverages = async (classId, subject) => {
  const homeworks = await Homework.find({
    classId,
    subject: new RegExp(`^${subject.trim()}$`, "i"),
    maxMarks: { $gt: 0 },
  }).select("_id maxMarks");

  if (homeworks.length === 0) return new Map();

  const hwMap = new Map();
  homeworks.forEach((h) => hwMap.set(h._id.toString(), h.maxMarks));

  const submissions = await HomeworkSubmission.find({
    homeworkId: { $in: homeworks.map((h) => h._id) },
    status: "reviewed",
    marks: { $ne: null },
  }).select("studentId homeworkId marks");

  const studentHwAgg = new Map();
  for (const sub of submissions) {
    const sId = sub.studentId.toString();
    const max = hwMap.get(sub.homeworkId.toString()) || 100;
    const pct = (sub.marks / max) * 100;

    if (!studentHwAgg.has(sId)) {
      studentHwAgg.set(sId, { totalPct: 0, count: 0 });
    }
    const current = studentHwAgg.get(sId);
    current.totalPct += pct;
    current.count += 1;
  }

  const finalAvg = new Map();
  for (const [sId, agg] of studentHwAgg.entries()) {
    finalAvg.set(sId, Math.round(agg.totalPct / agg.count));
  }
  return finalAvg;
};

/**
 * Helper: Computes student rows with components, internal totals, percentage and trends.
 */
const buildClassGradebookData = async (classId, subject, academicYear, onlyPublished = false) => {
  const componentFilter = {
    classId,
    subject: new RegExp(`^${subject.trim()}$`, "i"),
  };
  if (academicYear) componentFilter.academicYear = academicYear;
  if (onlyPublished) componentFilter.isPublished = true;

  const components = await AssessmentComponent.find(componentFilter).sort({ date: 1, createdAt: 1 });

  const students = await Student.find({ classId }).sort({ rollNumber: 1, name: 1 });

  const componentIds = components.map((c) => c._id);
  const allScores = await ComponentScore.find({ componentId: { $in: componentIds } });

  // Map of `${componentId}_${studentId}` -> score
  const scoreMap = new Map();
  allScores.forEach((s) => {
    scoreMap.set(`${s.componentId.toString()}_${s.studentId.toString()}`, s);
  });

  const hwAvgMap = await computeHomeworkAverages(classId, subject);

  const studentRows = students.map((student) => {
    const sId = student._id.toString();
    let totalWeightedScore = 0;
    let assessedWeightage = 0;
    const componentResults = [];

    components.forEach((comp) => {
      const score = scoreMap.get(`${comp._id.toString()}_${sId}`);
      let percentage = null;
      let weightedMarks = 0;

      if (score && !score.absent && score.marks !== null && score.marks !== undefined) {
        percentage = Math.round((score.marks / comp.maxMarks) * 100);
        weightedMarks = Number(((score.marks / comp.maxMarks) * comp.weightage).toFixed(2));
        totalWeightedScore += weightedMarks;
        assessedWeightage += comp.weightage;
      } else if (score && score.absent) {
        percentage = 0;
        weightedMarks = 0;
        assessedWeightage += comp.weightage;
      }

      componentResults.push({
        componentId: comp._id,
        name: comp.name,
        maxMarks: comp.maxMarks,
        weightage: comp.weightage,
        date: comp.date,
        isPublished: comp.isPublished,
        marks: score?.marks ?? null,
        absent: Boolean(score?.absent),
        percentage,
        weightedMarks,
        remark: score?.remark || "",
      });
    });

    // Trend calculation: compare latest component vs previous component
    let trend = "stable";
    let trendDelta = 0;
    const evaluatedComponents = componentResults.filter((c) => c.percentage !== null);
    if (evaluatedComponents.length >= 2) {
      const latest = evaluatedComponents[evaluatedComponents.length - 1].percentage;
      const prev = evaluatedComponents[evaluatedComponents.length - 2].percentage;
      trendDelta = latest - prev;
      if (trendDelta >= 5) trend = "up";
      else if (trendDelta <= -5) trend = "down";
    }

    const overallPercentage =
      assessedWeightage > 0
        ? Math.round((totalWeightedScore / assessedWeightage) * 100)
        : null;

    const hwAverage = hwAvgMap.get(sId) ?? null;

    return {
      studentId: student._id,
      name: student.name,
      rollNumber: student.rollNumber || "-",
      admissionNumber: student.admissionNumber,
      components: componentResults,
      weightedInternalTotal: Number(totalWeightedScore.toFixed(2)),
      assessedWeightage,
      overallPercentage,
      trend,
      trendDelta,
      homeworkAveragePercentage: hwAverage,
    };
  });

  return { components, students: studentRows };
};

/**
 * GET /api/gradebook/class?classId=&subject=
 */
const getClassGradebook = async (req, res, next) => {
  try {
    const { classId, subject, academicYear } = req.query;

    if (!classId || !subject) {
      throw new ApiError(400, "classId and subject query params are required.");
    }

    if (req.user.role === "teacher") {
      await assertTeacherOwnsClassSubject(req.user, classId, subject);
    } else if (!["admin", "superadmin", "principal"].includes(req.user.role)) {
      throw new ApiError(403, "Access denied.");
    }

    const { components, students } = await buildClassGradebookData(
      classId,
      subject,
      academicYear,
      false
    );

    res.status(200).json(
      new ApiResponse(
        200,
        {
          classId,
          subject,
          components,
          students,
        },
        "Class gradebook fetched successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/gradebook/analytics?classId=&subject=
 * Computes:
 * - distribution buckets: 90-100%, 75-89%, 60-74%, 40-59%, <40%
 * - class average percentage
 * - "needs support" list (overall < 40% OR drop of 15+ points)
 * - most-improved list
 */
const getGradebookAnalytics = async (req, res, next) => {
  try {
    const { classId, subject, academicYear } = req.query;

    if (!classId || !subject) {
      throw new ApiError(400, "classId and subject query params are required.");
    }

    if (req.user.role === "teacher") {
      await assertTeacherOwnsClassSubject(req.user, classId, subject);
    }

    const { students } = await buildClassGradebookData(classId, subject, academicYear, false);

    const buckets = {
      "90-100%": 0,
      "75-89%": 0,
      "60-74%": 0,
      "40-59%": 0,
      "< 40%": 0,
    };

    let totalPercentageSum = 0;
    let countedStudents = 0;
    const needsSupport = [];
    const improvers = [];

    students.forEach((s) => {
      if (s.overallPercentage !== null) {
        totalPercentageSum += s.overallPercentage;
        countedStudents += 1;

        if (s.overallPercentage >= 90) buckets["90-100%"]++;
        else if (s.overallPercentage >= 75) buckets["75-89%"]++;
        else if (s.overallPercentage >= 60) buckets["60-74%"]++;
        else if (s.overallPercentage >= 40) buckets["40-59%"]++;
        else buckets["< 40%"]++;

        // Needs support: below 40% OR dropped 15+ points
        if (s.overallPercentage < 40 || s.trendDelta <= -15) {
          needsSupport.push({
            studentId: s.studentId,
            name: s.name,
            rollNumber: s.rollNumber,
            overallPercentage: s.overallPercentage,
            trendDelta: s.trendDelta,
            reason:
              s.overallPercentage < 40 && s.trendDelta <= -15
                ? "Low score (<40%) & significant drop (-15+%)"
                : s.overallPercentage < 40
                ? "Overall score below 40%"
                : `Score dropped by ${Math.abs(s.trendDelta)}% vs previous component`,
          });
        }

        // Most improved candidate: jump > 0
        if (s.trendDelta > 0) {
          improvers.push({
            studentId: s.studentId,
            name: s.name,
            rollNumber: s.rollNumber,
            overallPercentage: s.overallPercentage,
            trendDelta: s.trendDelta,
          });
        }
      }
    });

    const classAverage = countedStudents > 0 ? Math.round(totalPercentageSum / countedStudents) : 0;

    // Sort improvers by highest positive jump
    improvers.sort((a, b) => b.trendDelta - a.trendDelta);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          classId,
          subject,
          totalStudents: students.length,
          evaluatedStudents: countedStudents,
          classAverage,
          distribution: Object.entries(buckets).map(([range, count]) => ({
            range,
            count,
          })),
          needsSupport,
          mostImproved: improvers.slice(0, 5),
        },
        "Gradebook analytics computed successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/gradebook/export?classId=&subject=
 * Generates formatted Excel spreadsheet using exceljs.
 */
const exportGradebookExcel = async (req, res, next) => {
  try {
    const { classId, subject, academicYear } = req.query;

    if (!classId || !subject) {
      throw new ApiError(400, "classId and subject query params are required.");
    }

    const { components, students } = await buildClassGradebookData(
      classId,
      subject,
      academicYear,
      false
    );

    const classSection = await ClassSection.findById(classId);
    const classNameStr = classSection
      ? `${classSection.className}${classSection.section ? `-${classSection.section}` : ""}`
      : "Class";

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "School ERP Gradebook";
    const sheet = workbook.addWorksheet(`${subject} Gradebook`);

    // Title Row
    sheet.mergeCells("A1:G1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = `Gradebook Report: ${classNameStr} | Subject: ${subject}`;
    titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F4E79" },
    };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 30;

    // Build Header Columns
    const headerCols = [
      { header: "Roll No", key: "rollNo", width: 10 },
      { header: "Admission No", key: "admNo", width: 16 },
      { header: "Student Name", key: "name", width: 24 },
    ];

    components.forEach((comp, idx) => {
      headerCols.push({
        header: `${comp.name}\n(Max ${comp.maxMarks} | Wt ${comp.weightage}%)`,
        key: `comp_${idx}`,
        width: 18,
      });
    });

    headerCols.push(
      { header: "HW Avg %", key: "hwAvg", width: 12 },
      { header: "Weighted Total %", key: "weightedPct", width: 18 },
      { header: "Trend", key: "trend", width: 12 }
    );

    // Header Row on Row 3
    const headerRow = sheet.getRow(3);
    headerCols.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.header;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2E75B6" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      sheet.getColumn(idx + 1).width = col.width;
    });
    headerRow.height = 36;

    // Populate data rows
    students.forEach((student, rIdx) => {
      const rowNum = rIdx + 4;
      const row = sheet.getRow(rowNum);

      row.getCell(1).value = student.rollNumber;
      row.getCell(2).value = student.admissionNumber;
      row.getCell(3).value = student.name;

      components.forEach((comp, cIdx) => {
        const compResult = student.components.find((c) => c.componentId.toString() === comp._id.toString());
        const cell = row.getCell(cIdx + 4);
        if (compResult?.absent) {
          cell.value = "ABS";
          cell.font = { color: { argb: "FFFF0000" }, bold: true };
        } else if (compResult?.marks !== null && compResult?.marks !== undefined) {
          cell.value = compResult.marks;
        } else {
          cell.value = "-";
        }
        cell.alignment = { horizontal: "center" };
      });

      const nextColIdx = components.length + 4;
      row.getCell(nextColIdx).value = student.homeworkAveragePercentage !== null ? `${student.homeworkAveragePercentage}%` : "-";
      row.getCell(nextColIdx + 1).value = student.overallPercentage !== null ? `${student.overallPercentage}%` : "-";
      row.getCell(nextColIdx + 2).value = student.trend.toUpperCase();

      row.getCell(nextColIdx).alignment = { horizontal: "center" };
      row.getCell(nextColIdx + 1).alignment = { horizontal: "center" };
      row.getCell(nextColIdx + 2).alignment = { horizontal: "center" };

      // Zebra striping
      if (rIdx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF2F4F7" },
          };
        });
      }
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Gradebook_${classNameStr}_${subject}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/student/gradebook
 * Student view: only published components for the student's class.
 */
const getStudentGradebook = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id || req.user._id });
    if (!student) throw new ApiError(404, "Student profile not found.");

    const { subject } = req.query;

    const filter = {
      classId: student.classId,
      isPublished: true,
    };
    if (subject) {
      filter.subject = new RegExp(`^${subject.trim()}$`, "i");
    }

    const components = await AssessmentComponent.find(filter).sort({ date: 1 });
    const compIds = components.map((c) => c._id);

    const scores = await ComponentScore.find({
      componentId: { $in: compIds },
      studentId: student._id,
    });

    const scoreMap = new Map();
    scores.forEach((s) => scoreMap.set(s.componentId.toString(), s));

    let totalWeightedScore = 0;
    let assessedWeightage = 0;

    const results = components.map((comp) => {
      const score = scoreMap.get(comp._id.toString());
      let percentage = null;
      let weightedMarks = 0;

      if (score && !score.absent && score.marks !== null && score.marks !== undefined) {
        percentage = Math.round((score.marks / comp.maxMarks) * 100);
        weightedMarks = Number(((score.marks / comp.maxMarks) * comp.weightage).toFixed(2));
        totalWeightedScore += weightedMarks;
        assessedWeightage += comp.weightage;
      } else if (score && score.absent) {
        percentage = 0;
        assessedWeightage += comp.weightage;
      }

      return {
        componentId: comp._id,
        name: comp.name,
        subject: comp.subject,
        maxMarks: comp.maxMarks,
        weightage: comp.weightage,
        date: comp.date,
        marks: score?.marks ?? null,
        absent: Boolean(score?.absent),
        percentage,
        weightedMarks,
        remark: score?.remark || "",
      };
    });

    const overallPercentage =
      assessedWeightage > 0
        ? Math.round((totalWeightedScore / assessedWeightage) * 100)
        : null;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          student: {
            id: student._id,
            name: student.name,
            rollNumber: student.rollNumber,
          },
          components: results,
          weightedInternalTotal: Number(totalWeightedScore.toFixed(2)),
          assessedWeightage,
          overallPercentage,
        },
        "Student gradebook fetched successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/parent/gradebook
 * Parent view: read-only for their child, verified ownership, published only.
 */
const getParentGradebook = async (req, res, next) => {
  try {
    const { studentId, subject } = req.query;

    if (!studentId) {
      throw new ApiError(400, "studentId query param is required.");
    }

    // Verify parent has relationship with this student
    const student = await Student.findById(studentId);
    if (!student) throw new ApiError(404, "Student not found.");

    if (
      student.parentUserId &&
      student.parentUserId.toString() !== (req.user.id || req.user._id).toString()
    ) {
      throw new ApiError(403, "Access denied. You do not have access to this student's gradebook.");
    }

    const filter = {
      classId: student.classId,
      isPublished: true,
    };
    if (subject) filter.subject = new RegExp(`^${subject.trim()}$`, "i");

    const components = await AssessmentComponent.find(filter).sort({ date: 1 });
    const compIds = components.map((c) => c._id);

    const scores = await ComponentScore.find({
      componentId: { $in: compIds },
      studentId: student._id,
    });

    const scoreMap = new Map();
    scores.forEach((s) => scoreMap.set(s.componentId.toString(), s));

    let totalWeightedScore = 0;
    let assessedWeightage = 0;

    const results = components.map((comp) => {
      const score = scoreMap.get(comp._id.toString());
      let percentage = null;
      let weightedMarks = 0;

      if (score && !score.absent && score.marks !== null && score.marks !== undefined) {
        percentage = Math.round((score.marks / comp.maxMarks) * 100);
        weightedMarks = Number(((score.marks / comp.maxMarks) * comp.weightage).toFixed(2));
        totalWeightedScore += weightedMarks;
        assessedWeightage += comp.weightage;
      } else if (score && score.absent) {
        percentage = 0;
        assessedWeightage += comp.weightage;
      }

      return {
        componentId: comp._id,
        name: comp.name,
        subject: comp.subject,
        maxMarks: comp.maxMarks,
        weightage: comp.weightage,
        date: comp.date,
        marks: score?.marks ?? null,
        absent: Boolean(score?.absent),
        percentage,
        weightedMarks,
        remark: score?.remark || "",
      };
    });

    const overallPercentage =
      assessedWeightage > 0
        ? Math.round((totalWeightedScore / assessedWeightage) * 100)
        : null;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          student: {
            id: student._id,
            name: student.name,
            rollNumber: student.rollNumber,
          },
          components: results,
          weightedInternalTotal: Number(totalWeightedScore.toFixed(2)),
          assessedWeightage,
          overallPercentage,
        },
        "Child gradebook fetched successfully."
      )
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createComponent,
  getComponents,
  getComponentById,
  updateComponent,
  deleteComponent,
  saveComponentScores,
  getClassGradebook,
  getGradebookAnalytics,
  exportGradebookExcel,
  getStudentGradebook,
  getParentGradebook,
};
