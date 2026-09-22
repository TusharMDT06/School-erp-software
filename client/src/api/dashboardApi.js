import axiosInstance from "./axiosInstance";

/**
 * Dashboard API
 */

/** GET /dashboard/admin — fetch live aggregated metrics for admin dashboard */
export const getAdminDashboardStatsApi = async () => {
  const response = await axiosInstance.get("/dashboard/admin");
  return response.data;
};

/** GET /dashboard/student — fetch live aggregated metrics for student dashboard */
export const getStudentDashboardStatsApi = async () => {
  const response = await axiosInstance.get("/dashboard/student");
  return response.data;
};
