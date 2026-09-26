const LeaveRequest = require("../models/LeaveRequest.model");
const Student = require("../models/Student.model");
const User = require("../models/User.model");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const sendEmail = require("../utils/sendEmail");
const { getIO } = require("../config/socket");
const { sendParentAlert } = require("../services/parentAlert.service");

/**
 * POST /api/leaves
 * Submit a new leave request.
 */
const createLeaveRequest = async (req, res, next) => {
  try {
    const { leaveType, fromDate, toDate, reason } = req.body;

    if (!fromDate || !toDate || !reason) {
      throw new ApiError(400, "fromDate, toDate, and reason are required.");
    }

    let requesterRole = req.user.role;
    let studentId = null;

    if (requesterRole === "student") {
      const student = await Student.findOne({ userId: req.user._id });
      if (student) {
        studentId = student._id;
      }
    }

    const leaveRequest = await LeaveRequest.create({
      schoolId: req.user.schoolId,
      applicantId: req.user._id,
      studentId,
      requesterRole: ["student", "teacher"].includes(requesterRole) ? requesterRole : "staff",
      leaveType: leaveType || "casual",
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      reason,
      status: "pending",
    });

    res.status(201).json(new ApiResponse(201, leaveRequest, "Leave request submitted successfully."));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/leaves
 * Retrieve leave requests.
 * Admins see all school leaves; teachers/students can filter for their own.
 */
const getLeaveRequests = async (req, res, next) => {
  try {
    const { status, requesterRole, mine } = req.query;
    const filter = { schoolId: req.user.schoolId };

    if (status) filter.status = status;
    if (requesterRole) filter.requesterRole = requesterRole;

    if (mine === "true" || ["student", "teacher"].includes(req.user.role)) {
      if (req.user.role === "admin" || req.user.role === "superadmin") {
        if (mine === "true") filter.applicantId = req.user._id;
      } else {
        filter.applicantId = req.user._id;
      }
    }

    const leaves = await LeaveRequest.find(filter)
      .populate("applicantId", "name email phone role profileImage")
      .populate({
        path: "studentId",
        populate: [
          { path: "classId", select: "className section" },
          { path: "guardianIds", select: "name email phone" },
        ],
      })
      .populate("decidedBy", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, leaves, "Leave requests fetched successfully."));
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/leaves/:id/decide
 * Approve or reject a leave request.
 * Authorized: admin, superadmin, teacher
 */
const decide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, decisionRemarks } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      throw new ApiError(400, "Status must be either 'approved' or 'rejected'.");
    }

    const leaveRequest = await LeaveRequest.findById(id).populate("applicantId", "name email phone role");
    if (!leaveRequest) {
      throw new ApiError(404, "Leave request not found.");
    }

    leaveRequest.status = status;
    leaveRequest.decisionRemarks = decisionRemarks || "";
    leaveRequest.decidedBy = req.user._id;
    leaveRequest.decidedAt = new Date();
    await leaveRequest.save();

    // ── INTEGRATION POINT 1: Multi-Channel Alert on Student Leave Approval ────
    if (status === "approved" && leaveRequest.requesterRole === "student") {
      // 1. Fetch student record and guardians
      const student = await Student.findOne({
        $or: [
          ...(leaveRequest.studentId ? [{ _id: leaveRequest.studentId }] : []),
          { userId: leaveRequest.applicantId?._id || leaveRequest.applicantId },
        ],
      }).populate("guardianIds", "name email phone");

      const studentName =
        student?.name || leaveRequest.applicantId?.name || "Student";

      const primaryGuardian =
        student && Array.isArray(student.guardianIds) && student.guardianIds.length > 0
          ? student.guardianIds[0]
          : null;

      const parentPhone = primaryGuardian?.phone || leaveRequest.applicantId?.phone;
      const parentUserId = primaryGuardian?._id || leaveRequest.applicantId?._id;

      if (parentPhone && parentUserId) {
        // Asynchronously dispatch automated parent voice call + SMS/WhatsApp fallback
        sendParentAlert({
          parentUserId,
          parentPhone,
          studentName,
          reason: "leave_approved",
          relatedEntityId: leaveRequest._id,
          contextData: {
            fromDate: leaveRequest.fromDate,
            toDate: leaveRequest.toDate,
          },
        }).catch((err) => {
          console.error("❌ [LeaveApproval Alert Error]:", err.message);
        });
      } else {
        console.warn(
          `⚠️ [LeaveApproval] No primary guardian phone on file for approved student leave: "${studentName}" (Leave ID: ${leaveRequest._id})`
        );
      }

      // 2. Existing Phase 6 Email Notification to Parent / Student
      const recipientEmail = primaryGuardian?.email || leaveRequest.applicantId?.email;
      if (recipientEmail) {
        const fromStr = new Date(leaveRequest.fromDate).toLocaleDateString("en-IN");
        const toStr = new Date(leaveRequest.toDate).toLocaleDateString("en-IN");
        sendEmail({
          to: recipientEmail,
          subject: `Leave Approved: ${studentName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #1F4E79;">School ERP — Leave Application Approved</h2>
              <p>Dear Parent / Guardian,</p>
              <p>The leave application for <strong>${studentName}</strong> from <strong>${fromStr}</strong> to <strong>${toStr}</strong> has been <span style="color: #16a34a; font-weight: bold;">APPROVED</span>.</p>
              ${decisionRemarks ? `<p><strong>Remarks:</strong> ${decisionRemarks}</p>` : ""}
              <p style="margin-top: 24px; font-size: 12px; color: #64748b;">This is an automated notification from School ERP.</p>
            </div>
          `,
        }).catch((emailErr) => {
          console.warn("[LeaveApproval Email Notice]:", emailErr.message);
        });
      }

      // 3. Real-time Socket.io notification
      const io = getIO();
      if (io && parentUserId) {
        io.to(`user:${parentUserId.toString()}`).emit("leave:decided", {
          leaveId: leaveRequest._id,
          status: "approved",
          studentName,
        });
      }
    }

    res.status(200).json(
      new ApiResponse(
        200,
        leaveRequest,
        `Leave request ${status} successfully. Parent notified via email, call, and backup SMS/WhatsApp if unanswered.`
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLeaveRequest,
  getLeaveRequests,
  decide,
};
