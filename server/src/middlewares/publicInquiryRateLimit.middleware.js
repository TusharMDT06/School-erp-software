const { getRedis } = require("../config/redis");

const memoryStore = new Map();

// Clean up expired entries in memory store every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (now > record.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * publicInquiryRateLimit — 5 submissions per hour per IP.
 * Uses Redis if available, otherwise falls back to memory store.
 */
const publicInquiryRateLimit = async (req, res, next) => {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown-ip";

  const key = `ratelimit:inquiry:${ip}`;
  const WINDOW_MS = 60 * 60 * 1000; // 1 hour
  const LIMIT = 5;

  const redis = getRedis();
  if (redis) {
    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, 3600); // 1 hour
      }
      if (current > LIMIT) {
        const ttl = await redis.ttl(key);
        return res.status(429).json({
          success: false,
          message: `Too many admission inquiries submitted from this IP. Please try again in ${Math.ceil((ttl || 3600) / 60)} minutes.`,
        });
      }
      return next();
    } catch (err) {
      console.warn("[RateLimit] Redis failed, falling back to memory:", err.message);
    }
  }

  // In-memory fallback
  const now = Date.now();
  const record = memoryStore.get(key) || { count: 0, resetTime: now + WINDOW_MS };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + WINDOW_MS;
  } else {
    record.count += 1;
  }

  memoryStore.set(key, record);

  if (record.count > LIMIT) {
    const remainingMins = Math.ceil((record.resetTime - now) / 60000);
    return res.status(429).json({
      success: false,
      message: `Too many admission inquiries submitted from this IP. Please try again in ${remainingMins} minutes.`,
    });
  }

  next();
};

module.exports = { publicInquiryRateLimit };
