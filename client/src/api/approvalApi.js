import axiosInstance from "./axiosInstance";

/** GET /approvals */
export const getApprovalsApi = async (params = {}) =>
  (await axiosInstance.get("/approvals", { params })).data;

/** GET /approvals/counts */
export const getApprovalCountsApi = async () =>
  (await axiosInstance.get("/approvals/counts")).data;

/** POST /approvals/decide */
export const decideApprovalApi = async (data) =>
  (await axiosInstance.post("/approvals/decide", data)).data;

/** POST /approvals/bulk-decide */
export const bulkDecideApprovalsApi = async (data) =>
  (await axiosInstance.post("/approvals/bulk-decide", data)).data;
