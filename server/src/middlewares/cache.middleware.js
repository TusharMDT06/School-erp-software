const { safeGet, safeSet, clearCachePattern } = require("../config/redis");

/**
 * Express middleware to cache GET API responses in Redis or in-memory fallback.
 *
 * @param {Object|number} [options=120] - Configuration object or TTL in seconds
 * @param {number} [options.ttl=120] - Time to live in seconds
 * @param {string} [options.prefix="api"] - Cache key prefix
 * @param {Function} [options.keyGenerator] - Optional custom key generator fn(req)
 * @returns {import("express").RequestHandler}
 */
const cacheMiddleware = (options = 120) => {
  const config = typeof options === "number" ? { ttl: options } : options;
  const ttl = config.ttl || 120;
  const prefix = config.prefix || "api";
  const customKeyGen = config.keyGenerator;

  return async (req, res, next) => {
    // Only cache idempotent GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Isolate cache by tenant (schoolId) or user, plus path and query params
    const tenantKey = req.user?.schoolId ? `school:${req.user.schoolId}` : (req.user?._id ? `user:${req.user._id}` : "public");
    const queryString = Object.keys(req.query || {})
      .sort()
      .map((k) => `${k}=${req.query[k]}`)
      .join("&");

    const cacheKey = customKeyGen
      ? customKeyGen(req)
      : `${prefix}:${tenantKey}:${req.baseUrl || ""}${req.path}${queryString ? `?${queryString}` : ""}`;

    try {
      const cached = await safeGet(cacheKey);

      if (cached !== null && cached !== undefined) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("X-Cache-Key", cacheKey);
        return res.status(200).json(cached);
      }

      res.setHeader("X-Cache", "MISS");
      res.setHeader("X-Cache-Key", cacheKey);

      // Intercept res.json to capture response body
      const originalJson = res.json.bind(res);

      res.json = (body) => {
        // Cache only successful responses (200-299)
        if (res.statusCode >= 200 && res.statusCode < 300 && body) {
          safeSet(cacheKey, body, ttl).catch((err) => {
            console.warn(`[Cache Middleware Set Warning] key=${cacheKey}:`, err.message);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.warn(`[Cache Middleware Error] key=${cacheKey}:`, err.message);
      next();
    }
  };
};

module.exports = {
  cacheMiddleware,
  clearCachePattern,
};
