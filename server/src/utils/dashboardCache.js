const { safeDel, safeGet } = require("../config/redis");

/**
 * Invalidate cached teacher dashboard data
 * @param {string|ObjectId} [teacherId] - Optional specific teacher ID, or invalidates pattern
 */
const invalidateTeacherDashboardCache = async (teacherId = null) => {
  try {
    if (teacherId) {
      await safeDel(`teacher:dashboard:${teacherId.toString()}`);
    }
  } catch (err) {
    console.warn("[dashboardCache] Failed to invalidate cache:", err.message);
  }
};

module.exports = {
  invalidateTeacherDashboardCache,
};
