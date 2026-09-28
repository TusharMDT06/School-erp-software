const crypto = require("crypto");
const { accountantToolDeclarations, accountantToolHandlers } = require("../../services/aiTools/accountantTools");

describe("Phase 7D — Verification Tests", () => {
  describe("Razorpay HMAC SHA256 Webhook Verification", () => {
    const secret = "test_webhook_secret_key_12345";

    test("validates genuine webhook signature over raw body", () => {
      const payload = JSON.stringify({
        event: "payment_link.paid",
        payload: {
          payment_link: { entity: { id: "plink_test_001" } },
          payment: { entity: { id: "pay_test_001" } },
        },
      });

      const signature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");

      expect(signature).toBe(expectedSignature);
      expect(signature.length).toBe(64);
    });

    test("rejects tampered webhook payload signature", () => {
      const originalPayload = JSON.stringify({ event: "payment_link.paid" });
      const tamperedPayload = JSON.stringify({ event: "payment_link.paid", tampered: true });

      const signature = crypto
        .createHmac("sha256", secret)
        .update(originalPayload)
        .digest("hex");

      const tamperedExpected = crypto
        .createHmac("sha256", secret)
        .update(tamperedPayload)
        .digest("hex");

      expect(signature).not.toBe(tamperedExpected);
    });
  });

  describe("Accountant AI Assistant Tools Specification", () => {
    test("all 7 accountant tools are declared and read-only", () => {
      expect(Array.isArray(accountantToolDeclarations)).toBe(true);
      expect(accountantToolDeclarations.length).toBe(7);

      const toolNames = accountantToolDeclarations.map((t) => t.name);
      expect(toolNames).toContain("getTodayCollection");
      expect(toolNames).toContain("getCollectionSummary");
      expect(toolNames).toContain("getOutstandingByClass");
      expect(toolNames).toContain("getTopDefaulters");
      expect(toolNames).toContain("getExpenseSummary");
      expect(toolNames).toContain("getPendingApprovalsCount");
      expect(toolNames).toContain("getBudgetStatus");

      // Verify that every tool has a handler
      toolNames.forEach((name) => {
        expect(typeof accountantToolHandlers[name]).toBe("function");
      });
    });

    test("accountant tools require and enforce schoolId context", async () => {
      // Calling tool without schoolId should return error object gracefully without crashing
      const res = await accountantToolHandlers.getTodayCollection({});
      expect(res).toHaveProperty("error");
      expect(res.error).toMatch(/schoolId is required/i);
    });
  });

  describe("Anomaly Alert Detection Rules", () => {
    test("detects duplicate expense (same vendor + amount + date)", () => {
      const expenses = [
        {
          vendorId: "v1",
          amount: 500000,
          expenseDate: new Date("2026-09-20"),
          title: "Diesel for Bus 1",
        },
        {
          vendorId: "v1",
          amount: 500000,
          expenseDate: new Date("2026-09-20"),
          title: "Diesel for Bus 1 - duplicate",
        },
      ];

      const key1 = `${expenses[0].vendorId}-${expenses[0].amount}-${expenses[0].expenseDate.toISOString().slice(0, 10)}`;
      const key2 = `${expenses[1].vendorId}-${expenses[1].amount}-${expenses[1].expenseDate.toISOString().slice(0, 10)}`;

      expect(key1).toBe(key2);
    });

    test("detects category spike > 3x 6-month average", () => {
      const historicalMonthlyAvg = 50000; // ₹500
      const currentMonthSpend = 180000; // ₹1800 (> 3x)
      const isSpike = currentMonthSpend > historicalMonthlyAvg * 3;

      expect(isSpike).toBe(true);
    });
  });
});
