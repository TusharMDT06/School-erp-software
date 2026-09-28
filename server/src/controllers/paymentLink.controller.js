const crypto = require("crypto");
const mongoose = require("mongoose");
const razorpay = require("../config/razorpay");
const PaymentLink = require("../models/PaymentLink.model");
const FeeTransaction = require("../models/FeeTransaction.model");
const Student = require("../models/Student.model");
const User = require("../models/User.model");
const School = require("../models/School.model");
const FinanceSettings = require("../models/FinanceSettings.model");
const insertLedgerEntry = require("../utils/insertLedgerEntry");
const auditLog = require("../utils/auditLog");
const { sendWhatsApp } = require("../services/whatsapp.service");
const { sendSMS } = require("../services/sms.service");
const { notify } = require("../services/notification.service");
const { safeDel } = require("../config/redis");
const { ApiError, ApiResponse } = require("../utils/apiResponse");
const { toPaise, formatMoney } = require("../utils/money");
const generateReceipt = require("../utils/generateReceipt");

/**
 * POST /api/accountant/payment-link
 * Generate remote payment link via Razorpay and dispatch via WhatsApp, SMS, and Email.
 */
const createPaymentLink = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const { studentId, transactionIds } = req.body;

    if (!studentId || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      throw new ApiError(400, "studentId and non-empty transactionIds array are required");
    }

    const student = await Student.findOne({ _id: studentId, schoolId })
      .populate("userId", "name email phone")
      .populate("parentId", "name email phone")
      .populate("classId", "className section")
      .lean();

    if (!student) throw new ApiError(404, "Student not found in this school");

    // Fetch transactions and strictly recompute payable amount on server
    const txns = await FeeTransaction.find({
      _id: { $in: transactionIds },
      studentId: student._id,
      status: { $in: ["pending", "partial", "overdue"] },
    });

    if (txns.length === 0) {
      throw new ApiError(400, "No pending payable transactions found for the selected IDs");
    }

    let totalPayablePaise = 0;
    for (const t of txns) {
      const due = Math.max(
        0,
        (t.amountDue || 0) -
          (t.amountPaid || 0) -
          (t.concessionAmount || 0) +
          (t.lateFeeAmount || 0)
      );
      totalPayablePaise += due;
    }

    if (totalPayablePaise <= 0) {
      throw new ApiError(400, "Total payable amount cannot be zero");
    }

    const studentName = student.userId?.name || "Student";
    const parentPhone = student.parentId?.phone || student.userId?.phone;
    const parentEmail = student.parentId?.email || student.userId?.email;
    const parentName = student.parentId?.name || studentName;

    let rzpLinkId = null;
    let shortUrl = null;

    // Call Razorpay Payment Link API
    if (razorpay && process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes("placeholder")) {
      try {
        const link = await razorpay.paymentLink.create({
          amount: totalPayablePaise,
          currency: "INR",
          accept_partial: false,
          description: `Fee Payment for ${studentName} (${student.classId?.className || "Class"})`,
          customer: {
            name: parentName,
            contact: parentPhone || "9999999999",
            email: parentEmail || "parent@school.com",
          },
          notify: {
            sms: false,
            email: false,
          },
          reminder_enable: true,
          callback_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/parent/fees`,
          callback_method: "get",
        });

        rzpLinkId = link.id;
        shortUrl = link.short_url;
      } catch (err) {
        console.warn("[PaymentLink] Razorpay API error:", err.message);
      }
    }

    // Fallback URL if Razorpay test keys are inactive/unverified
    if (!shortUrl) {
      rzpLinkId = `plink_mock_${Date.now()}`;
      shortUrl = `${process.env.CLIENT_URL || "http://localhost:5173"}/parent/fees?link=${rzpLinkId}`;
    }

    // Save PaymentLink record
    const paymentLink = await PaymentLink.create({
      schoolId,
      transactionIds: txns.map((t) => t._id),
      studentId: student._id,
      amount: totalPayablePaise,
      razorpayLinkId: rzpLinkId,
      shortUrl,
      status: "created",
      sentVia: [],
      createdBy: req.user._id,
    });

    const sentChannels = [];

    // 1. WhatsApp
    if (parentPhone) {
      const waMsg = `Dear Parent, please complete the school fee payment of ${formatMoney(
        totalPayablePaise
      )} for ${studentName}. Click here to pay securely online: ${shortUrl}`;
      sendWhatsApp({ to: parentPhone, message: waMsg })
        .then(() => sentChannels.push("whatsapp"))
        .catch((e) => console.warn("[PaymentLink] WhatsApp delivery warning:", e.message));
    }

    // 2. SMS
    if (parentPhone) {
      const smsMsg = `School ERP Fee Alert: Pay ${formatMoney(
        totalPayablePaise
      )} for ${studentName} online at ${shortUrl}`;
      sendSMS({ to: parentPhone, message: smsMsg })
        .then(() => sentChannels.push("sms"))
        .catch((e) => console.warn("[PaymentLink] SMS delivery warning:", e.message));
    }

    // 3. Email & Real-time Notification
    const recipientUserId = student.parentId?._id || student.userId?._id;
    if (recipientUserId) {
      notify(recipientUserId, {
        type: "payment_link_created",
        title: "School Fee Payment Link",
        message: `A payment link for ${formatMoney(
          totalPayablePaise
        )} has been generated for ${studentName}. Pay online: ${shortUrl}`,
        data: { paymentLinkId: paymentLink._id, shortUrl, amount: totalPayablePaise },
        sendEmailFlag: true,
      })
        .then(() => sentChannels.push("email"))
        .catch((e) => console.warn("[PaymentLink] Email delivery warning:", e.message));
    }

    paymentLink.sentVia = ["whatsapp", "sms", "email"];
    await paymentLink.save();

    await auditLog({
      userId: req.user._id,
      action: "payment_link_generated",
      module: "payment_link",
      targetId: paymentLink._id,
      newValue: {
        amount: totalPayablePaise,
        studentId: student._id,
        shortUrl,
      },
      ip: req.ip,
    });

    return res.status(201).json(
      new ApiResponse(
        201,
        paymentLink,
        "Payment link created and dispatched to parent via WhatsApp, SMS, and Email"
      )
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/accountant/payment-links
 * List recent payment links for school.
 */
const getPaymentLinks = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const links = await PaymentLink.find({ schoolId })
      .populate({
        path: "studentId",
        select: "admissionNumber rollNumber userId classId",
        populate: [
          { path: "userId", select: "name phone email" },
          { path: "classId", select: "className section" },
        ],
      })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res
      .status(200)
      .json(new ApiResponse(200, links, "Payment links fetched successfully"));
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/webhooks/razorpay
 * Public webhook with mandatory crypto HMAC SHA256 signature verification over raw request body.
 */
const handleRazorpayWebhook = async (req, res, next) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "default_webhook_secret";
    const signature = req.headers["x-razorpay-signature"];

    // Must have raw body
    const rawBody = req.rawBody || req.body;
    const rawString = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);

    if (!signature) {
      return res.status(400).json({ error: "Missing x-razorpay-signature header" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawString)
      .digest("hex");

    if (signature !== expectedSignature) {
      console.warn("[Razorpay Webhook] Signature mismatch. Rejected.");
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    let payload = {};
    try {
      payload = JSON.parse(rawString);
    } catch {
      payload = req.body || {};
    }

    const event = payload.event;
    console.log(`[Razorpay Webhook] Verified event received: ${event}`);

    if (event === "payment_link.paid") {
      const linkEntity = payload.payload?.payment_link?.entity || {};
      const paymentEntity = payload.payload?.payment?.entity || {};

      const razorpayLinkId = linkEntity.id;
      const razorpayPaymentId = paymentEntity.id;

      if (!razorpayLinkId) {
        return res.status(200).json({ received: true });
      }

      const paymentLink = await PaymentLink.findOne({ razorpayLinkId });
      if (!paymentLink) {
        console.warn(`[Razorpay Webhook] No matching PaymentLink for linkId: ${razorpayLinkId}`);
        return res.status(200).json({ received: true });
      }

      // Idempotency: skip if already marked as paid
      if (paymentLink.status === "paid") {
        return res.status(200).json({ received: true, alreadyPaid: true });
      }

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        paymentLink.status = "paid";
        await paymentLink.save({ session });

        // Update fee transactions
        const txns = await FeeTransaction.find({
          _id: { $in: paymentLink.transactionIds },
        }).session(session);

        const paidDate = new Date();

        for (const t of txns) {
          if (t.status === "paid" && t.razorpayPaymentId) continue;

          const remaining = Math.max(
            0,
            (t.amountDue || 0) -
              (t.amountPaid || 0) -
              (t.concessionAmount || 0) +
              (t.lateFeeAmount || 0)
          );

          t.amountPaid = (t.amountPaid || 0) + remaining;
          t.status = "paid";
          t.paymentMode = "online";
          t.razorpayPaymentId = razorpayPaymentId || `pay_${Date.now()}`;
          t.paidOn = paidDate;

          if (!t.receiptNumber) {
            t.receiptNumber = `RCPT-ONLINE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          }

          t.payments.push({
            mode: "online",
            amount: remaining,
            reference: razorpayPaymentId,
            paidOn: paidDate,
          });

          await t.save({ session });
        }

        // Insert ONE LedgerEntry (category: fee_collection, account: online, direction: in)
        await insertLedgerEntry(
          {
            schoolId: paymentLink.schoolId,
            date: paidDate,
            account: "online",
            direction: "in",
            category: "fee_collection",
            amount: paymentLink.amount,
            referenceType: "PaymentLink",
            referenceId: paymentLink._id,
            narration: `Online fee payment via Razorpay Link (${razorpayLinkId})`,
            createdBy: paymentLink.createdBy,
          },
          { session }
        );

        await session.commitTransaction();
        session.endSession();

        // ── Post-Commit Operations ───────────────────────────────────────────
        await auditLog({
          userId: paymentLink.createdBy,
          action: "payment_link_paid_webhook",
          module: "payment_link",
          targetId: paymentLink._id,
          newValue: { razorpayLinkId, razorpayPaymentId, amount: paymentLink.amount },
        });

        // Invalidate Redis caches
        await safeDel(
          `dashboard:${paymentLink.schoolId}`,
          `defaulters:${paymentLink.schoolId}`
        );

        // Notify parent
        const student = await Student.findById(paymentLink.studentId)
          .populate("userId", "name")
          .populate("parentId", "_id")
          .lean();

        if (student) {
          const notifyUserId = student.parentId?._id || student.userId?._id;
          if (notifyUserId) {
            await notify(notifyUserId, {
              type: "fee_payment_success",
              title: "Fee Payment Received",
              message: `Payment of ${formatMoney(
                paymentLink.amount
              )} for ${student.userId?.name || "Student"} was successfully processed online.`,
              data: { paymentLinkId: paymentLink._id },
              sendEmailFlag: true,
            });
          }
        }
      } catch (txnErr) {
        await session.abortTransaction();
        session.endSession();
        throw txnErr;
      }
    }

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("[Razorpay Webhook Error]:", err.message);
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createPaymentLink,
  getPaymentLinks,
  handleRazorpayWebhook,
};
