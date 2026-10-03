/**
 * auditLog.js — Helper to write audit entries (Auth, Security, and Mutations).
 */

const AuditLog = require("../models/AuditLog.model");

/**
 * Accurately parses User-Agent header to determine:
 * - OS: Windows, macOS, Linux, Android, iOS, iPadOS
 * - Browser: Chrome, Firefox, Safari, Edge, Opera
 * - deviceType: desktop, mobile, tablet
 * - device: user-friendly label matching screenshot (e.g. "Windows", "Android Chrome", "macOS")
 */
const parseUserAgent = (ua = "") => {
  if (!ua || typeof ua !== "string") {
    return {
      device: "Windows", // default fallback
      deviceType: "desktop",
      browser: "Unknown",
      os: "Windows",
    };
  }

  let os = "Unknown";
  let deviceType = "desktop";

  if (/Android/i.test(ua)) {
    os = "Android";
    deviceType = /Mobile/i.test(ua) ? "mobile" : "tablet";
  } else if (/iPhone|iPod/i.test(ua)) {
    os = "iOS";
    deviceType = "mobile";
  } else if (/iPad/i.test(ua)) {
    os = "iPadOS";
    deviceType = "tablet";
  } else if (/Windows/i.test(ua)) {
    os = "Windows";
    deviceType = "desktop";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = "macOS";
    deviceType = "desktop";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
    deviceType = "desktop";
  }

  let browser = "Unknown";
  if (/Edg\//i.test(ua)) {
    browser = "Edge";
  } else if (/Chrome\/|CriOS\//i.test(ua)) {
    browser = "Chrome";
  } else if (/Firefox\/|FxiOS\//i.test(ua)) {
    browser = "Firefox";
  } else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) {
    browser = "Safari";
  } else if (/Opera|OPR\//i.test(ua)) {
    browser = "Opera";
  }

  // Format device string matching screenshot:
  // e.g. "Windows", "macOS", "Android Chrome", "iOS Safari"
  let device = os;
  if (os === "Android" || os === "iOS" || os === "iPadOS") {
    device = `${os} ${browser !== "Unknown" ? browser : ""}`.trim();
  } else if (os === "Unknown") {
    device = browser !== "Unknown" ? browser : "Desktop";
  }

  return { device, deviceType, browser, os };
};

/**
 * Extracts real client IP address from express request
 */
const getClientIp = (req) => {
  if (!req) return "127.0.0.1";

  let ip =
    req.headers?.["cf-connecting-ip"] ||
    req.headers?.["x-real-ip"] ||
    (req.headers?.["x-forwarded-for"]
      ? req.headers["x-forwarded-for"].split(",")[0].trim()
      : null) ||
    req.ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "127.0.0.1";

  // Normalize IPv6 mapped IPv4 like "::ffff:127.0.0.1" -> "127.0.0.1"
  if (typeof ip === "string" && ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }

  return ip;
};

/**
 * Helper to record authentication and security events:
 * - LOGIN (SUCCESS or FAILED)
 * - LOGOUT
 * - PASSWORD_RESET
 * - SIGNUP
 */
const recordAuthAuditLog = async ({
  req,
  schoolId,
  userId,
  userName,
  userRole,
  action = "LOGIN",
  status = "SUCCESS",
  details,
  ip: customIp,
  photo,
} = {}) => {
  try {
    if (!AuditLog) return;

    const ua = req?.headers?.["user-agent"] || "";
    const { device, deviceType, browser, os } = parseUserAgent(ua);
    const ip = customIp || getClientIp(req);

    const logEntry = await AuditLog.create({
      schoolId: schoolId || undefined,
      userId: userId || undefined,
      userName: userName || (userRole ? `${userRole} user` : "Unknown"),
      userRole: (userRole || "unknown").toLowerCase(),
      action: action.toUpperCase(),
      status: (status || "SUCCESS").toUpperCase(),
      module: "auth",
      ip,
      device,
      deviceType,
      browser,
      os,
      details: details || (status === "SUCCESS" ? "User authenticated successfully" : "Authentication failed"),
      userAgent: ua,
      photo: photo || null,
    });
    return logEntry;
  } catch (err) {
    // Non-blocking error handler — logging must never crash the request
    console.error("[AuditLog] Failed to record auth audit log:", err.message);
  }
};

/**
 * Standard mutation audit log (Financial, administrative, etc.)
 */
const auditLog = async ({
  schoolId,
  userId,
  userName,
  userRole,
  action,
  status = "SUCCESS",
  module: mod = "general",
  targetId,
  oldValue,
  newValue,
  ip,
  req,
  details,
  photo,
} = {}) => {
  try {
    if (!AuditLog) return;

    let device, deviceType, browser, os, detectedIp, ua;
    if (req) {
      ua = req.headers?.["user-agent"] || "";
      const parsed = parseUserAgent(ua);
      device = parsed.device;
      deviceType = parsed.deviceType;
      browser = parsed.browser;
      os = parsed.os;
      detectedIp = getClientIp(req);
    }

    await AuditLog.create({
      schoolId: schoolId || undefined,
      userId,
      userName,
      userRole,
      action,
      status: (status || "SUCCESS").toUpperCase(),
      module: mod,
      targetId: targetId?.toString?.() ?? targetId,
      oldValue: oldValue !== undefined ? (typeof oldValue === "string" ? oldValue : JSON.stringify(oldValue)) : undefined,
      newValue: newValue !== undefined ? (typeof newValue === "string" ? newValue : JSON.stringify(newValue)) : undefined,
      ip: ip || detectedIp,
      device,
      deviceType,
      browser,
      os,
      details,
      userAgent: ua,
      photo: photo || null,
    });
  } catch (err) {
    console.error("[AuditLog] Failed to write audit entry:", err.message);
  }
};

auditLog.auditLog = auditLog;
auditLog.recordAuthAuditLog = recordAuthAuditLog;
auditLog.parseUserAgent = parseUserAgent;
auditLog.getClientIp = getClientIp;

module.exports = auditLog;

