import axiosInstance from "./axiosInstance";

/** GET /audit-logs (admin/principal with filters and pagination) */
export const getAuditLogsApi = async (params = {}) =>
  (await axiosInstance.get("/audit-logs", { params })).data;

/** GET /audit-logs/mine (accountant/staff own activity) */
export const getMyAuditLogsApi = async (params = {}) =>
  (await axiosInstance.get("/audit-logs/mine", { params })).data;
