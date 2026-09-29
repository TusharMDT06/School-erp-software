/**
 * riskScore.js — Pure function to compute early-warning student welfare risk scores.
 *
 * Factors evaluated:
 * 1. Attendance percentage over the last 30 working days.
 * 2. Academic performance (absolute marks and drop between exams).
 * 3. Fee overdue days (visibility: "finance", hidden from teachers).
 * 4. Leave frequency.
 * 5. Open discipline incidents.
 */

const RISK_WEIGHTS = {
  attendance: {
    maxWeight: 30,
    criticalThreshold: 60, // < 60%
    warningThreshold: 75, // < 75%
  },
  academics: {
    maxWeight: 30,
    criticalScore: 40, // < 40%
    warningScore: 50, // < 50%
    dropSignificant: 15, // >= 15% drop
    dropModerate: 8, // >= 8% drop
  },
  fees: {
    maxWeight: 15,
    criticalDays: 60, // >= 60 days
    warningDays: 30, // >= 30 days
  },
  leave: {
    maxWeight: 10,
    criticalCount: 6, // >= 6 days
    warningCount: 3, // >= 3 days
  },
  incidents: {
    maxWeight: 15,
    criticalCount: 3, // >= 3 open incidents
    warningCount: 1, // >= 1 open incident
  },
};

const BANDS = {
  HIGH_MIN: 60,
  MEDIUM_MIN: 30,
};

/**
 * calculateRiskScore
 * @param {Object} input
 * @param {number} input.attendancePct - Attendance percentage (0 - 100)
 * @param {Object} input.marksTrend - { currentPct, previousPct, dropPct }
 * @param {number} input.feeOverdueDays - Days fees are overdue (0 if paid)
 * @param {number} input.leaveFrequency - Number of leave days taken
 * @param {number} input.openIncidents - Number of active/open disciplinary incidents
 * @returns {{ score: number, band: "low" | "medium" | "high", reasons: Array<{ factor: string, detail: string, visibility: "general" | "finance" }> }}
 */
function calculateRiskScore({
  attendancePct = 100,
  marksTrend = {},
  feeOverdueDays = 0,
  leaveFrequency = 0,
  openIncidents = 0,
} = {}) {
  let score = 0;
  const reasons = [];

  // 1. Attendance evaluation (max 30 pts)
  const att = Number(attendancePct);
  if (!isNaN(att)) {
    if (att < RISK_WEIGHTS.attendance.criticalThreshold) {
      score += RISK_WEIGHTS.attendance.maxWeight;
      reasons.push({
        factor: "attendance",
        detail: `Critical attendance rate (${Math.round(att)}%) in the last 30 working days`,
        visibility: "general",
      });
    } else if (att < RISK_WEIGHTS.attendance.warningThreshold) {
      score += Math.round(RISK_WEIGHTS.attendance.maxWeight * 0.5);
      reasons.push({
        factor: "attendance",
        detail: `Below-target attendance rate (${Math.round(att)}%, threshold 75%)`,
        visibility: "general",
      });
    }
  }

  // 2. Academics & Marks Trend evaluation (max 30 pts)
  const currentPct = marksTrend.currentPct != null ? Number(marksTrend.currentPct) : null;
  const previousPct = marksTrend.previousPct != null ? Number(marksTrend.previousPct) : null;
  let dropPct = marksTrend.dropPct != null ? Number(marksTrend.dropPct) : null;

  if (dropPct == null && currentPct != null && previousPct != null) {
    dropPct = Math.max(0, previousPct - currentPct);
  }

  let academicPts = 0;

  // Absolute performance
  if (currentPct != null && !isNaN(currentPct)) {
    if (currentPct < RISK_WEIGHTS.academics.criticalScore) {
      academicPts += 15;
      reasons.push({
        factor: "academics",
        detail: `Critical academic performance (${Math.round(currentPct)}% in latest exam)`,
        visibility: "general",
      });
    } else if (currentPct < RISK_WEIGHTS.academics.warningScore) {
      academicPts += 8;
      reasons.push({
        factor: "academics",
        detail: `Borderline passing score (${Math.round(currentPct)}% in latest exam)`,
        visibility: "general",
      });
    }
  }

  // Downward trend drop
  if (dropPct != null && !isNaN(dropPct)) {
    if (dropPct >= RISK_WEIGHTS.academics.dropSignificant) {
      academicPts += 15;
      reasons.push({
        factor: "academics",
        detail: `Severe academic score drop of ${Math.round(dropPct)}% compared to previous exam`,
        visibility: "general",
      });
    } else if (dropPct >= RISK_WEIGHTS.academics.dropModerate) {
      academicPts += 7;
      reasons.push({
        factor: "academics",
        detail: `Moderate academic score decline of ${Math.round(dropPct)}% between exams`,
        visibility: "general",
      });
    }
  }

  score += Math.min(RISK_WEIGHTS.academics.maxWeight, academicPts);

  // 3. Fee Overdue evaluation (max 15 pts) — ALWAYS tagged with visibility: "finance"
  const feeDays = Number(feeOverdueDays);
  if (!isNaN(feeDays) && feeDays > 0) {
    if (feeDays >= RISK_WEIGHTS.fees.criticalDays) {
      score += RISK_WEIGHTS.fees.maxWeight;
      reasons.push({
        factor: "fees",
        detail: `Fee overdue by ${feeDays} days (exceeds critical 60-day threshold)`,
        visibility: "finance",
      });
    } else if (feeDays >= RISK_WEIGHTS.fees.warningDays) {
      score += Math.round(RISK_WEIGHTS.fees.maxWeight * 0.5);
      reasons.push({
        factor: "fees",
        detail: `Fee overdue by ${feeDays} days (exceeds 30-day threshold)`,
        visibility: "finance",
      });
    }
  }

  // 4. Leave Frequency evaluation (max 10 pts)
  const leaveDays = Number(leaveFrequency);
  if (!isNaN(leaveDays) && leaveDays > 0) {
    if (leaveDays >= RISK_WEIGHTS.leave.criticalCount) {
      score += RISK_WEIGHTS.leave.maxWeight;
      reasons.push({
        factor: "leave",
        detail: `High absence/leave frequency (${leaveDays} days recorded)`,
        visibility: "general",
      });
    } else if (leaveDays >= RISK_WEIGHTS.leave.warningCount) {
      score += Math.round(RISK_WEIGHTS.leave.maxWeight * 0.5);
      reasons.push({
        factor: "leave",
        detail: `Frequent leave pattern (${leaveDays} days recorded)`,
        visibility: "general",
      });
    }
  }

  // 5. Open Incidents evaluation (max 15 pts)
  const incidents = Number(openIncidents);
  if (!isNaN(incidents) && incidents > 0) {
    if (incidents >= RISK_WEIGHTS.incidents.criticalCount) {
      score += RISK_WEIGHTS.incidents.maxWeight;
      reasons.push({
        factor: "discipline",
        detail: `Multiple active incident reports (${incidents} open cases)`,
        visibility: "general",
      });
    } else if (incidents >= RISK_WEIGHTS.incidents.warningCount) {
      score += Math.round(RISK_WEIGHTS.incidents.maxWeight * 0.5);
      reasons.push({
        factor: "discipline",
        detail: `Active disciplinary incident on record (${incidents} open case)`,
        visibility: "general",
      });
    }
  }

  // Clamp score to [0, 100]
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  let band = "low";
  if (finalScore >= BANDS.HIGH_MIN) {
    band = "high";
  } else if (finalScore >= BANDS.MEDIUM_MIN) {
    band = "medium";
  }

  return {
    score: finalScore,
    band,
    reasons,
  };
}

module.exports = {
  RISK_WEIGHTS,
  BANDS,
  calculateRiskScore,
};
