const TeacherAttendance = require("../models/TeacherAttendance.model");
const Teacher = require("../models/Teacher.model");
const User = require("../models/User.model");
const { ApiError, ApiResponse } = require("../utils/apiResponse");
const sendEmail = require("../utils/sendEmail");

// ─── Helper: normalize date to midnight UTC ─────────────────────────────────
const toMidnightUTC = (dateStr) => {
  const d = new Date(dateStr);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// ─── Helper: send absent notification email ──────────────────────────────────
const sendAbsentEmail = async (teacher, date) => {
  try {
    const user = await User.findById(teacher.userId).select("name email");
    if (!user?.email) return;

    const dateStr = new Date(date).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    await sendEmail({
      to: user.email,
      subject: `Absence Notification — ${dateStr}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #1F4E79, #2563a8); padding: 28px 32px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">School ERP System</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0; font-size: 13px;">Staff Attendance Notification</p>
          </div>
          <div style="padding: 28px 32px;">
            <p style="font-size: 15px; color: #334155; margin: 0 0 16px;">Dear <strong>${user.name}</strong>,</p>
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0; font-size: 14px; color: #7f1d1d; font-weight: 600;">
                You have been marked <strong>ABSENT</strong> for <strong>${dateStr}</strong>.
              </p>
            </div>
            <p style="font-size: 13px; color: #64748b; margin: 0 0 8px;">
              If you believe this is a mistake, please contact the school administration immediately.
            </p>
            <p style="font-size: 13px; color: #64748b; margin: 0;">
              Please note that repeated absences may affect your monthly salary calculation.
            </p>
          </div>
          <div style="background: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0;">This is an automated notification from School ERP System. Please do not reply to this email.</p>
          </div>
        </div>
      `,
    });

    return true;
  } catch (err) {
    console.error("❌ [TeacherAttendance] Absent email failed:", err.message);
    return false;
  }
};

// ────────────────────────────────────────────────────────────────────────────
// POST /api/teacher-attendance/mark
// Body: { date, records: [{ teacherId, status, remarks }] }
// ────────────────────────────────────────────────────────────────────────────
exports.markTeacherAttendance = async (req, res, next) => {
  try {
    const { date, records } = req.body;
    const schoolId = req.user.schoolId;

    if (!date || !Array.isArray(records) || records.length === 0) {
      throw new ApiError(400, "date and records[] are required.");
    }

    const normalizedDate = toMidnightUTC(date);
    const markedBy = req.user.id;

    const results = [];

    for (const rec of records) {
      const { teacherId, status, remarks } = rec;
      if (!teacherId || !status) continue;

      const existing = await TeacherAttendance.findOne({
        teacherId,
        date: normalizedDate,
      });

      let doc;
      let isNewAbsent = false;

      if (existing) {
        const wasAbsent = existing.status === "absent";
        existing.status = status;
        existing.remarks = remarks || null;
        existing.markedBy = markedBy;
        doc = await existing.save();
        // Only send email if newly switched to absent (wasn't absent before)
        isNewAbsent = !wasAbsent && status === "absent" && !existing.emailSent;
      } else {
        doc = await TeacherAttendance.create({
          teacherId,
          schoolId,
          date: normalizedDate,
          status,
          remarks: remarks || null,
          markedBy,
        });
        isNewAbsent = status === "absent";
      }

      results.push(doc);

      // Fire absent email asynchronously
      if (isNewAbsent) {
        const teacher = await Teacher.findById(teacherId).select("userId");
        if (teacher) {
          sendAbsentEmail(teacher, normalizedDate).then((sent) => {
            if (sent) {
              TeacherAttendance.findByIdAndUpdate(doc._id, { emailSent: true }).catch(() => {});
            }
          });
        }
      }
    }

    res.status(200).json(
      new ApiResponse(200, results, `Attendance marked for ${results.length} teacher(s).`)
    );
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET /api/teacher-attendance?date=YYYY-MM-DD
// Returns all teacher attendance for a given date
// ────────────────────────────────────────────────────────────────────────────
exports.getTeacherAttendanceByDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    const schoolId = req.user.schoolId;

    if (!date) throw new ApiError(400, "date query param is required.");

    const normalizedDate = toMidnightUTC(date);

    const records = await TeacherAttendance.find({
      schoolId,
      date: normalizedDate,
    })
      .populate({
        path: "teacherId",
        select: "employeeId subjects",
        populate: { path: "userId", select: "name email phone profileImage" },
      })
      .lean();

    res.status(200).json(new ApiResponse(200, records, "Teacher attendance fetched."));
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET /api/teacher-attendance/summary?month=9&year=2026&teacherId=...
// Monthly attendance summary (for salary calc)
// ────────────────────────────────────────────────────────────────────────────
exports.getTeacherAttendanceSummary = async (req, res, next) => {
  try {
    const { month, year, teacherId } = req.query;
    const schoolId = req.user.schoolId;

    if (!month || !year) throw new ApiError(400, "month and year are required.");

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const startDate = new Date(Date.UTC(y, m - 1, 1));
    const endDate = new Date(Date.UTC(y, m, 1));

    const matchQuery = {
      schoolId: require("mongoose").Types.ObjectId.createFromHexString
        ? require("mongoose").Types.ObjectId.createFromHexString(String(schoolId))
        : schoolId,
      date: { $gte: startDate, $lt: endDate },
    };

    if (teacherId) {
      const mongoose = require("mongoose");
      matchQuery.teacherId = mongoose.Types.ObjectId.createFromHexString
        ? mongoose.Types.ObjectId.createFromHexString(teacherId)
        : teacherId;
    }

    const summary = await TeacherAttendance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$teacherId",
          present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
          leave: { $sum: { $cond: [{ $eq: ["$status", "leave"] }, 1, 0] } },
          holiday: { $sum: { $cond: [{ $eq: ["$status", "holiday"] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "teachers",
          localField: "_id",
          foreignField: "_id",
          as: "teacher",
        },
      },
      { $unwind: { path: "$teacher", preserveNullAndEmpty: true } },
      {
        $lookup: {
          from: "users",
          localField: "teacher.userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmpty: true } },
      {
        $project: {
          _id: 1,
          present: 1,
          absent: 1,
          late: 1,
          leave: 1,
          holiday: 1,
          total: 1,
          employeeId: "$teacher.employeeId",
          baseSalary: { $ifNull: ["$teacher.salary", 25000] },
          name: "$user.name",
          email: "$user.email",
        },
      },
    ]);

    res.status(200).json(new ApiResponse(200, summary, "Monthly summary fetched."));
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────────────────────────
// GET /api/teacher-attendance/salary?month=9&year=2026
// Salary calculation with leave deductions
// ────────────────────────────────────────────────────────────────────────────
exports.getTeacherSalary = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const schoolId = req.user.schoolId;

    if (!month || !year) throw new ApiError(400, "month and year are required.");

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    const daysInMonth = new Date(y, m, 0).getDate();

    // Get all User accounts with role=teacher belonging to this school
    const teacherUsers = await User.find({ role: "teacher", schoolId }).select("_id name email phone").lean();
    const userIds = teacherUsers.map((u) => u._id);

    // Get Teacher profiles for these users
    const teachers = await Teacher.find({ userId: { $in: userIds } }).lean();

    // Build a userId -> teacherProfile map and userId -> userInfo map
    const userMap = {};
    teacherUsers.forEach((u) => { userMap[String(u._id)] = u; });

    const startDate = new Date(Date.UTC(y, m - 1, 1));
    const endDate   = new Date(Date.UTC(y, m, 1));

    // Get attendance for this month for all teachers
    const teacherIds = teachers.map((t) => t._id);
    const allAttendance = await TeacherAttendance.find({
      teacherId: { $in: teacherIds },
      date: { $gte: startDate, $lt: endDate },
    }).lean();

    // Group attendance by teacherId
    const attMap = {};
    allAttendance.forEach((rec) => {
      const tid = String(rec.teacherId);
      if (!attMap[tid]) attMap[tid] = { present: 0, absent: 0, late: 0, leave: 0, holiday: 0 };
      attMap[tid][rec.status] = (attMap[tid][rec.status] || 0) + 1;
    });

    const salaryData = teachers.map((teacher) => {
      const tid = String(teacher._id);
      const userInfo = userMap[String(teacher.userId)] || {};
      const att = attMap[tid] || { present: 0, absent: 0, late: 0, leave: 0, holiday: 0 };
      const baseSalary = teacher.salary || 25000;

      const perDaySalary  = baseSalary / daysInMonth;
      const absentDeduction = att.absent  * perDaySalary;
      const leaveDeduction  = att.leave   * perDaySalary;
      const lateDeduction   = att.late    * (perDaySalary / 2);
      const totalDeduction  = absentDeduction + leaveDeduction + lateDeduction;
      const netSalary       = Math.max(0, baseSalary - totalDeduction);
      const markedDays      = att.present + att.absent + att.late + att.leave + att.holiday;

      return {
        teacherId:        teacher._id,
        employeeId:       teacher.employeeId,
        name:             userInfo.name  || "Unknown",
        email:            userInfo.email || "",
        baseSalary,
        daysInMonth,
        markedDays,
        present:          att.present,
        absent:           att.absent,
        late:             att.late,
        leave:            att.leave,
        holiday:          att.holiday,
        absentDeduction:  Math.round(absentDeduction),
        leaveDeduction:   Math.round(leaveDeduction),
        lateDeduction:    Math.round(lateDeduction),
        totalDeduction:   Math.round(totalDeduction),
        netSalary:        Math.round(netSalary),
        attendancePercent: markedDays > 0
          ? Math.round(((att.present + att.late * 0.5) / markedDays) * 100)
          : null,
      };
    });

    res.status(200).json(new ApiResponse(200, salaryData, "Salary data calculated."));
  } catch (error) {
    next(error);
  }
};

