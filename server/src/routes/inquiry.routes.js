const express = require("express");
const router = express.Router();
const inquiryController = require("../controllers/inquiry.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { publicInquiryRateLimit } = require("../middlewares/publicInquiryRateLimit.middleware");

// ── Public Endpoint (Honeypot + Upstash Rate Limit + Joi Validation) ─────────
router.post("/public/inquiries", publicInquiryRateLimit, inquiryController.publicSubmitInquiry);

// ── Protected Admissions CRM Endpoints (Principal, Admin, Superadmin) ────────
router.use(
  "/inquiries",
  authMiddleware,
  authorizeRoles("principal", "admin", "superadmin")
);

router.get("/inquiries", inquiryController.getInquiries);
router.post("/inquiries", inquiryController.createInquiry);
router.get("/inquiries/duplicate", inquiryController.checkDuplicateInquiry);
router.get("/inquiries/funnel", inquiryController.getInquiryFunnel);
router.get("/inquiries/:id", inquiryController.getInquiryById);
router.post("/inquiries/:id/follow-ups", inquiryController.addFollowUp);
router.put("/inquiries/:id/status", inquiryController.updateInquiryStatus);
router.post("/inquiries/:id/convert", inquiryController.convertInquiry);

module.exports = router;
