const { calculateRiskScore, RISK_WEIGHTS, BANDS } = require("../utils/riskScore");

describe("calculateRiskScore Pure Function Tests", () => {
  test("returns score 0 and band 'low' with empty reasons for high-performing student", () => {
    const result = calculateRiskScore({
      attendancePct: 98,
      marksTrend: { currentPct: 85, previousPct: 88, dropPct: 3 },
      feeOverdueDays: 0,
      leaveFrequency: 1,
      openIncidents: 0,
    });

    expect(result.score).toBe(0);
    expect(result.band).toBe("low");
    expect(result.reasons).toEqual([]);
  });

  test("flags severe attendance deficit (<60%) with max weight 30 and general visibility", () => {
    const result = calculateRiskScore({
      attendancePct: 52,
    });

    expect(result.score).toBe(30);
    expect(result.band).toBe("medium");
    expect(result.reasons.length).toBe(1);
    expect(result.reasons[0].factor).toBe("attendance");
    expect(result.reasons[0].visibility).toBe("general");
    expect(result.reasons[0].detail).toContain("52%");
  });

  test("tags fee overdue reasons strictly with visibility: 'finance'", () => {
    const result = calculateRiskScore({
      attendancePct: 95,
      feeOverdueDays: 65,
    });

    expect(result.score).toBe(15);
    expect(result.band).toBe("low");
    const feeReason = result.reasons.find((r) => r.factor === "fees");
    expect(feeReason).toBeDefined();
    expect(feeReason.visibility).toBe("finance");
  });

  test("correctly scores high risk band (>= 60) across multiple compounding factors", () => {
    const result = calculateRiskScore({
      attendancePct: 55, // +30 (critical attendance)
      marksTrend: { currentPct: 35, previousPct: 60, dropPct: 25 }, // +15 (critical marks) +15 (severe drop) = +30
      feeOverdueDays: 70, // +15 (critical fees)
      leaveFrequency: 7, // +10 (critical leaves)
      openIncidents: 3, // +15 (critical incidents)
    });

    // Sum is 100, clamped at 100
    expect(result.score).toBe(100);
    expect(result.band).toBe("high");
    expect(result.reasons.length).toBe(6);

    const financeReasons = result.reasons.filter((r) => r.visibility === "finance");
    const generalReasons = result.reasons.filter((r) => r.visibility === "general");
    expect(financeReasons.length).toBe(1);
    expect(generalReasons.length).toBe(5);
  });

  test("computes medium risk band for borderline students", () => {
    const result = calculateRiskScore({
      attendancePct: 70, // +15 (moderate attendance)
      marksTrend: { currentPct: 45 }, // +8 (borderline marks)
      openIncidents: 1, // +8 (moderate incident)
    });

    // 15 + 8 + 8 = 31
    expect(result.score).toBe(31);
    expect(result.band).toBe("medium");
  });

  test("handles empty and default parameters gracefully without throwing", () => {
    const result = calculateRiskScore();
    expect(result.score).toBe(0);
    expect(result.band).toBe("low");
    expect(Array.isArray(result.reasons)).toBe(true);
  });
});
