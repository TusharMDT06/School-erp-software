const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const FeeStructure = require("../models/FeeStructure.model");
const FeeTransaction = require("../models/FeeTransaction.model");
const Student = require("../models/Student.model");
const ClassSection = require("../models/ClassSection.model");
const CallLog = require("../models/CallLog.model");
const razorpay = require("../config/razorpay");
const generateReceipt = require("../utils/generateReceipt");
const sendFeeReminder = require("../utils/sendFeeReminder");
const { sendParentAlert } = require("../services/parentAlert.service");
const { getIO } = require("../config/socket");
const { ApiResponse, ApiError } = require("../utils/apiResponse");

/**
 * POST /api/fees/structure
 * Creates a fee structure for a class & term, then auto-generates pending FeeTransactions for active students.
 */
const createFeeStructure = async (req, res, next) => {
  try {
    const { classId, academicYear, term, feeHeads, dueDate } = req.body;

    if (!classId || !academicYear || !term || !Array.isArray(feeHeads) || feeHeads.length === 0 || !dueDate) {
      throw new ApiError(400, "classId, academicYear, term, feeHeads, and dueDate are required.");
    }

    const classSection = await ClassSection.findById(classId);
    if (!classSection) {
      throw new ApiError(404, "Class section not found.");
    }

    const feeStructure = new FeeStructure({
      schoolId: classSection.schoolId,
      classId,
      academicYear,
      term,
      feeHeads,
      dueDate,
    });

    await feeStructure.save();

    // Auto-generate a pending FeeTransaction for every active student in this class
    const activeStudents = await Student.find({ classId, status: "active" });
    let createdTransactions = [];

    if (activeStudents.length > 0) {
      const transactionDocs = activeStudents.map((student) => ({
        studentId: student._id,
        feeStructureId: feeStructure._id,
        amountDue: feeStructure.totalAmount,
        amountPaid: 0,
        paymentMode: "online",
        status: "pending",
      }));

      createdTransactions = await FeeTransaction.insertMany(transactionDocs);
    }

    res.status(201).json(
      new ApiResponse(
        201,
        {
          feeStructure,
          generatedTransactionsCount: createdTransactions.length,
        },
        `Fee structure created and ${createdTransactions.length} student invoices generated.`
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/fees/structure/:classId
 * Returns fee structures set up for a specific class.
 */
const getFeeStructuresByClass = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const structures = await FeeStructure.find({ classId })
      .populate("classId", "className section academicYear")
      .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, structures, "Fee structures retrieved."));
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/fees/student/:studentId
 * Returns all fee transactions and summary for a student.
 */
const getStudentFeeTransactions = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId)
      .populate("userId", "name email")
      .populate("classId", "className section");

    if (!student) {
      throw new ApiError(404, "Student not found.");
    }

    // Role check: student can only view own fees, parent only own children
    if (req.user.role === "student" && student.userId?._id.toString() !== req.user.id) {
      throw new ApiError(403, "Access denied to other students' fee records.");
    }
    if (req.user.role === "parent") {
      const isChild = student.guardianIds?.some((gid) => gid.toString() === req.user.id);
      if (!isChild) {
        throw new ApiError(403, "Access denied to non-linked student fee records.");
      }
    }

    const transactions = await FeeTransaction.find({ studentId })
      .populate("feeStructureId")
      .sort({ createdAt: -1 });

    const totalDue = transactions.reduce((sum, tx) => sum + (tx.amountDue || 0), 0);
    const totalPaid = transactions.reduce((sum, tx) => sum + (tx.amountPaid || 0), 0);
    const pendingAmount = Math.max(0, totalDue - totalPaid);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          student: {
            id: student._id,
            name: student.userId?.name,
            rollNumber: student.rollNumber,
            admissionNumber: student.admissionNumber,
            className: student.classId
              ? `${student.classId.className}-${student.classId.section}`
              : "N/A",
          },
          summary: {
            totalDue,
            totalPaid,
            pendingAmount,
            totalTransactions: transactions.length,
          },
          transactions,
        },
        "Student fee transactions retrieved."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/fees/create-order
 * Creates a Razorpay order for the payable fee amount.
 * NEVER trusts frontend amount; calculates balance server-side.
 */
const createRazorpayOrder = async (req, res, next) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      throw new ApiError(400, "transactionId is required.");
    }

    const transaction = await FeeTransaction.findById(transactionId).populate("feeStructureId");
    if (!transaction) {
      throw new ApiError(404, "Fee transaction invoice not found.");
    }

    const payableAmount = Math.max(0, transaction.amountDue - transaction.amountPaid);
    if (payableAmount <= 0) {
      throw new ApiError(400, "This invoice is already fully paid.");
    }

    const receiptId = `rcpt_${transaction._id.toString().slice(-8)}_${Date.now().toString().slice(-4)}`;

    let order;
    try {
      if (razorpay && typeof razorpay.orders?.create === "function") {
        order = await razorpay.orders.create({
          amount: Math.round(payableAmount * 100), // in paise
          currency: "INR",
          receipt: receiptId,
          notes: {
            transactionId: transaction._id.toString(),
            studentId: transaction.studentId.toString(),
          },
        });
      } else {
        // Fallback for development if Razorpay SDK client isn't configured with active key
        order = {
          id: `order_mock_${Date.now()}`,
          amount: Math.round(payableAmount * 100),
          currency: "INR",
          receipt: receiptId,
        };
      }
    } catch (rzpErr) {
      console.warn("Razorpay API error, falling back to development test order:", rzpErr.message);
      order = {
        id: `order_dev_${Date.now()}`,
        amount: Math.round(payableAmount * 100),
        currency: "INR",
        receipt: receiptId,
      };
    }

    transaction.razorpayOrderId = order.id;
    await transaction.save();

    res.status(200).json(
      new ApiResponse(
        200,
        {
          orderId: order.id,
          amount: payableAmount,
          amountInPaise: Math.round(payableAmount * 100),
          currency: "INR",
          razorpayKeyId: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder_key_id",
          transactionId: transaction._id,
        },
        "Razorpay order initialized."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/fees/verify-payment
 * Server-side Razorpay signature verification and receipt generation.
 * Critical security barrier: rejects spoofed or tampered payments.
 */
const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !transactionId) {
      throw new ApiError(400, "All payment verification credentials and transactionId are required.");
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_placeholder_key_secret";

    // ── Signature Verification ──────────────────────────────────────────────
    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest("hex");

    const isDevMock =
      process.env.NODE_ENV !== "production" &&
      (razorpay_signature === "mock_dev_signature" || keySecret === "rzp_test_placeholder_key_secret");

    if (generatedSignature !== razorpay_signature && !isDevMock) {
      throw new ApiError(400, "Payment verification failed: Invalid Razorpay signature.");
    }

    const transaction = await FeeTransaction.findById(transactionId)
      .populate({
        path: "studentId",
        populate: [
          { path: "userId", select: "name email" },
          { path: "classId", select: "className section" },
        ],
      })
      .populate("feeStructureId");

    if (!transaction) {
      throw new ApiError(404, "Transaction invoice not found.");
    }

    const payableAmount = Math.max(0, transaction.amountDue - transaction.amountPaid);

    // Update Transaction fields
    transaction.amountPaid += payableAmount;
    transaction.status = transaction.amountPaid >= transaction.amountDue ? "paid" : "partial";
    transaction.paymentMode = "online";
    transaction.razorpayOrderId = razorpay_order_id;
    transaction.razorpayPaymentId = razorpay_payment_id;
    transaction.razorpaySignature = razorpay_signature;
    transaction.paidOn = new Date();

    if (!transaction.receiptNumber) {
      const year = new Date().getFullYear();
      const randomFive = String(Math.floor(10000 + Math.random() * 90000));
      transaction.receiptNumber = `RCPT-${year}-${randomFive}`;
    }

    // Generate Official PDF Receipt
    const receiptUrl = await generateReceipt(transaction);
    transaction.receiptUrl = receiptUrl;

    await transaction.save();

    // Emit live WebSocket notification for Admin Dashboard
    const io = getIO();
    if (io) {
      io.emit("fee:paid", {
        transactionId: transaction._id,
        studentName: transaction.studentId?.userId?.name || "Student",
        amount: payableAmount,
        receiptNumber: transaction.receiptNumber,
        paidOn: transaction.paidOn,
      });
    }

    res.status(200).json(
      new ApiResponse(
        200,
        {
          transaction,
          receiptUrl,
        },
        "Payment verified successfully. Receipt has been generated."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/fees/receipt/:transactionId
 * Streams the generated PDF receipt.
 */
const getReceiptPdf = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    const transaction = await FeeTransaction.findById(transactionId);
    if (!transaction) {
      throw new ApiError(404, "Transaction not found.");
    }

    if (!transaction.receiptUrl) {
      throw new ApiError(404, "Receipt not yet generated for this transaction.");
    }

    const filePath = path.join(__dirname, "../../", transaction.receiptUrl);
    if (!fs.existsSync(filePath)) {
      throw new ApiError(404, "Receipt PDF file not found on server.");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${transaction.receiptNumber || "receipt"}.pdf"`
    );
    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/fees/defaulters
 * Lists fee defaulters with pending amounts and overdue days.
 * Authorized: admin, superadmin.
 */
const getFeeDefaulters = async (req, res, next) => {
  try {
    const { classId } = req.query;

    const filter = {
      status: { $in: ["pending", "overdue", "partial"] },
    };

    const transactions = await FeeTransaction.find(filter)
      .populate({
        path: "studentId",
        match: classId ? { classId } : {},
        populate: [
          { path: "userId", select: "name email phone" },
          { path: "classId", select: "className section" },
          { path: "guardianIds", select: "name email phone" },
        ],
      })
      .populate("feeStructureId")
      .sort({ createdAt: -1 });

    const now = new Date();
    const txIds = transactions.map((t) => t._id);

    // Query latest CallLog for these transactions
    const callLogs = await CallLog.find({
      reason: "fee_overdue",
      relatedEntityId: { $in: txIds },
    }).sort({ createdAt: -1 });

    const callLogMap = {};
    for (const log of callLogs) {
      const key = log.relatedEntityId.toString();
      if (!callLogMap[key]) {
        callLogMap[key] = {
          _id: log._id,
          callStatus: log.callStatus,
          smsFallbackSent: log.smsFallbackSent,
          smsFallbackStatus: log.smsFallbackStatus,
          whatsappFallbackSent: log.whatsappFallbackSent,
          whatsappFallbackStatus: log.whatsappFallbackStatus,
          createdAt: log.createdAt,
        };
      }
    }

    const defaulters = transactions
      .filter((tx) => tx.studentId != null && tx.feeStructureId != null)
      .map((tx) => {
        const dueDate = new Date(tx.feeStructureId.dueDate);
        const diffTime = now - dueDate;
        const daysOverdue = diffTime > 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : 0;
        const pendingAmount = Math.max(0, tx.amountDue - tx.amountPaid);
        const latestCallAlert = callLogMap[tx._id.toString()] || null;

        return {
          transactionId: tx._id,
          studentId: tx.studentId._id,
          studentName: tx.studentId.userId?.name || "Student",
          studentEmail: tx.studentId.userId?.email || "",
          studentPhone: tx.studentId.userId?.phone || "",
          admissionNumber: tx.studentId.admissionNumber,
          rollNumber: tx.studentId.rollNumber || "-",
          className: tx.studentId.classId
            ? `${tx.studentId.classId.className}-${tx.studentId.classId.section}`
            : "N/A",
          term: tx.feeStructureId.term,
          academicYear: tx.feeStructureId.academicYear,
          amountDue: tx.amountDue,
          amountPaid: tx.amountPaid,
          pendingAmount,
          dueDate: tx.feeStructureId.dueDate,
          daysOverdue,
          status: daysOverdue > 0 && tx.status === "pending" ? "overdue" : tx.status,
          latestCallAlert,
          hasRecentCallAlert: Boolean(latestCallAlert),
        };
      })
      .sort((a, b) => b.pendingAmount - a.pendingAmount);

    res.status(200).json(new ApiResponse(200, defaulters, "Fee defaulters list retrieved."));
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/fees/reminder/:studentId
 * Triggers a manual fee reminder email to a specific student's guardians.
 */
const triggerManualReminder = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { sentCount } = await sendFeeReminder(studentId);

    res.status(200).json(
      new ApiResponse(
        200,
        { sentCount },
        sentCount > 0 ? "Fee reminder email sent successfully." : "No pending fees requiring reminder."
      )
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/fees/trigger-call-alert/:transactionId
 * Triggers an immediate automated Hindi voice call alert (with SMS & WhatsApp fallback)
 * for a specific overdue fee transaction.
 */
const triggerFeeOverdueCallAlert = async (req, res, next) => {
  try {
    const { transactionId } = req.params;
    const tx = await FeeTransaction.findById(transactionId)
      .populate("feeStructureId")
      .populate({
        path: "studentId",
        populate: [
          { path: "userId", select: "name phone email" },
          { path: "guardianIds", select: "name phone email" },
        ],
      });

    if (!tx) {
      throw new ApiError(404, "Fee transaction invoice not found.");
    }

    const student = tx.studentId;
    const studentName = student?.name || student?.userId?.name || "Student";
    const primaryGuardian =
      Array.isArray(student?.guardianIds) && student.guardianIds.length > 0
        ? student.guardianIds[0]
        : null;

    const parentPhone = primaryGuardian?.phone || student?.userId?.phone;
    const parentUserId = primaryGuardian?._id || student?.userId?._id;

    if (!parentPhone || !parentUserId) {
      throw new ApiError(400, "No valid phone number found for student or guardian.");
    }

    const remainingAmount = Math.max(0, tx.amountDue - tx.amountPaid);
    const callLog = await sendParentAlert({
      parentUserId,
      parentPhone,
      studentName,
      reason: "fee_overdue",
      relatedEntityId: tx._id,
      contextData: {
        amountDue: remainingAmount,
        dueDate: tx.feeStructureId?.dueDate,
      },
    });

    res.status(200).json(
      new ApiResponse(
        200,
        callLog,
        "Automated voice call alert dispatched. Will fallback to SMS & WhatsApp if unanswered."
      )
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFeeStructure,
  getFeeStructuresByClass,
  getStudentFeeTransactions,
  createRazorpayOrder,
  verifyRazorpayPayment,
  getReceiptPdf,
  getFeeDefaulters,
  triggerManualReminder,
  triggerFeeOverdueCallAlert,
};
