import axiosInstance from "./axiosInstance";

/**
 * GET /leaves
 * Fetch leave applications with optional status and role filters.
 */
export const getLeaveRequestsApi = async (params = {}) => {
  const response = await axiosInstance.get("/leaves", { params });
  return response.data;
};

/**
 * PATCH /leaves/:id/decide
 * Approve or reject a leave application.
 */
export const decideLeaveRequestApi = async (id, data) => {
  const response = await axiosInstance.patch(`/leaves/${id}/decide`, data);
  return response.data;
};

/**
 * POST /leaves
 * Submit a new leave request.
 */
export const createLeaveRequestApi = async (data) => {
  const response = await axiosInstance.post("/leaves", data);
  return response.data;
};
