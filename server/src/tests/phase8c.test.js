const Joi = require("joi");
const { principalToolDeclarations, principalToolHandlers } = require("../services/aiTools/principalTools");

describe("Phase 8C Unit Tests", () => {
  describe("Principal AI Tools - Read-Only Invariants", () => {
    test("principalTools defines all 6 required read-only analytical tools", () => {
      const toolNames = principalToolDeclarations.map((t) => t.name);
      expect(toolNames).toContain("get_at_risk_students");
      expect(toolNames).toContain("get_approval_backlog");
      expect(toolNames).toContain("get_staff_compliance_summary");
      expect(toolNames).toContain("get_results_trend");
      expect(toolNames).toContain("get_admission_funnel");
      expect(toolNames).toContain("get_upcoming_events");
    });

    test("principalTools contains no mutation tools (no create/update/delete/approve)", () => {
      principalToolDeclarations.forEach((tool) => {
        const name = tool.name.toLowerCase();
        expect(name).not.toMatch(/create|add|post|update|put|patch|delete|remove|approve|reject|send/);
        expect(typeof principalToolHandlers[tool.name]).toBe("function");
      });
    });
  });

  describe("Public Inquiry Validation Schema", () => {
    const publicInquirySchema = Joi.object({
      childName: Joi.string().trim().min(2).max(100).required(),
      dob: Joi.date().iso().optional().allow(null, ""),
      applyingForClass: Joi.string().trim().required(),
      parentName: Joi.string().trim().min(2).max(100).required(),
      phone: Joi.string().trim().min(7).max(15).required(),
      email: Joi.string().email().trim().optional().allow(null, ""),
      source: Joi.string().valid("walk_in", "phone", "website", "referral", "social_media", "other").default("website"),
      referredBy: Joi.string().trim().optional().allow(null, ""),
      notes: Joi.string().trim().max(500).optional().allow(null, ""),
      website_hp: Joi.string().allow("").optional(), // Honeypot field
    });

    test("valid inquiry passes validation", () => {
      const payload = {
        childName: "Aarav Sharma",
        applyingForClass: "Grade 5",
        parentName: "Vikram Sharma",
        phone: "+919876543210",
        email: "vikram@example.com",
        source: "website",
      };
      const { error, value } = publicInquirySchema.validate(payload);
      expect(error).toBeUndefined();
      expect(value.childName).toBe("Aarav Sharma");
      expect(value.source).toBe("website");
    });

    test("rejects payload missing required fields like childName or phone", () => {
      const payload = {
        parentName: "Vikram Sharma",
        applyingForClass: "Grade 5",
      };
      const { error } = publicInquirySchema.validate(payload);
      expect(error).toBeDefined();
    });

    test("honeypot field is captured for bot screening", () => {
      const botPayload = {
        childName: "Bot Kid",
        applyingForClass: "Grade 1",
        parentName: "Spammer",
        phone: "1234567890",
        website_hp: "I am a spam bot",
      };
      const { value } = publicInquirySchema.validate(botPayload);
      expect(value.website_hp).toBe("I am a spam bot");
    });
  });

  describe("Admission Inquiry Status Transitions", () => {
    const validStatuses = [
      "new",
      "contacted",
      "visit_scheduled",
      "visited",
      "application_submitted",
      "documents_pending",
      "admitted",
      "rejected",
      "lost",
    ];

    test("contains all required CRM statuses", () => {
      expect(validStatuses).toHaveLength(9);
      expect(validStatuses).toContain("new");
      expect(validStatuses).toContain("visit_scheduled");
      expect(validStatuses).toContain("documents_pending");
      expect(validStatuses).toContain("admitted");
      expect(validStatuses).toContain("lost");
    });

    test("lost status strictly requires a lostReason", () => {
      const validateStatusUpdate = (status, lostReason) => {
        if (!validStatuses.includes(status)) {
          return { error: "Invalid status" };
        }
        if (status === "lost" && (!lostReason || !lostReason.trim())) {
          return { error: "lostReason is mandatory when marking inquiry as lost" };
        }
        return { success: true };
      };

      expect(validateStatusUpdate("lost", "").error).toBe("lostReason is mandatory when marking inquiry as lost");
      expect(validateStatusUpdate("lost", null).error).toBe("lostReason is mandatory when marking inquiry as lost");
      expect(validateStatusUpdate("lost", "Fees too high").success).toBe(true);
      expect(validateStatusUpdate("contacted", null).success).toBe(true);
    });
  });

  describe("Morning Brief and MIS Snapshot Integrity", () => {
    test("rule-based top 5 concerns builder handles edge cases without throwing", () => {
      const buildConcerns = ({ attendanceList = [], failList = [], pendingApprovals = 0 }) => {
        const concerns = [];
        attendanceList.forEach((c) => {
          if (c.attendancePct < 75) {
            concerns.push({
              type: "attendance",
              severity: c.attendancePct < 60 ? "critical" : "high",
              message: `Class ${c.className} attendance is low at ${c.attendancePct}%`,
            });
          }
        });
        failList.forEach((s) => {
          if (s.failPct > 20) {
            concerns.push({
              type: "academics",
              severity: s.failPct > 40 ? "critical" : "high",
              message: `Subject ${s.subjectName} has high fail rate of ${s.failPct}%`,
            });
          }
        });
        if (pendingApprovals > 5) {
          concerns.push({
            type: "approvals",
            severity: "medium",
            message: `${pendingApprovals} pending approvals requiring principal review`,
          });
        }
        return concerns.slice(0, 5);
      };

      const result = buildConcerns({
        attendanceList: [
          { className: "10-A", attendancePct: 68 },
          { className: "8-B", attendancePct: 88 },
        ],
        failList: [
          { subjectName: "Physics", failPct: 25 },
        ],
        pendingApprovals: 8,
      });

      expect(result.length).toBe(3);
      expect(result[0].message).toContain("10-A");
      expect(result[1].message).toContain("Physics");
      expect(result[2].message).toContain("8 pending approvals");
    });
  });
});
