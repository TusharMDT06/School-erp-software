const express = require("express");
const router = express.Router();
const { handleRazorpayWebhook } = require("../controllers/paymentLink.controller");

// PUBLIC webhook endpoint — verified by x-razorpay-signature over raw request body
router.post("/", handleRazorpayWebhook);

module.exports = router;
