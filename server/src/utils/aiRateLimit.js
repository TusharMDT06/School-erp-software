const { getRedis } = require("../config/redis");
const { ApiError } = require("./apiResponse");

// In-memory fallback if Redis is unavailable
const memoryRateLimits = new Map();

/**
 * Enforces a daily rate limit of 20 requests/day per teacher.
 *
 * @param {string|ObjectId} teacherId - Teacher ID
 * @param {string} [action="ai_general"] - Feature name e.g. "lesson_plan", "quiz_draft"
 * @param {number} [limit=20] - Maximum requests allowed per day
 * @returns {Promise<{ allowed: boolean, remaining: number, current: number }>}
 * @throws {ApiError} 429 if limit exceeded
 */
const checkAiRateLimit = async (teacherId, action = "ai_general", limit = 20) => {
  const teacherKey = teacherId.toString();
  const today = new Date().toISOString().slice(0, 10);
  const redisKey = `ai:ratelimit:${action}:${teacherKey}:${today}`;

  const redis = getRedis();

  if (redis) {
    try {
      const current = await redis.incr(redisKey);
      if (current === 1) {
        // Set TTL to 24 hours (86400 seconds)
        await redis.expire(redisKey, 86400);
      }

      if (current > limit) {
        throw new ApiError(
          429,
          `Daily AI request limit of ${limit} reached for ${action.replace("_", " ")}. Please try again tomorrow.`
        );
      }

      return { allowed: true, remaining: Math.max(0, limit - current), current };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      console.warn("[aiRateLimit] Redis error, falling back to in-memory:", err.message);
    }
  }

  // Fallback to in-memory tracking
  const memKey = `${action}:${teacherKey}:${today}`;
  const currentMem = (memoryRateLimits.get(memKey) || 0) + 1;
  memoryRateLimits.set(memKey, currentMem);

  if (currentMem > limit) {
    throw new ApiError(
      429,
      `Daily AI request limit of ${limit} reached. Please try again tomorrow.`
    );
  }

  return { allowed: true, remaining: Math.max(0, limit - currentMem), current: currentMem };
};

module.exports = {
  checkAiRateLimit,
};
