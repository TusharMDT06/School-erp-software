import axiosInstance from "./axiosInstance";

/** GET /reconciliation/online?from=&to= */
export const getOnlineReconciliationApi = async (params = {}) =>
  (await axiosInstance.get("/reconciliation/online", { params })).data;

/** POST /reconciliation/flag */
export const flagReconciliationIssueApi = async (data) =>
  (await axiosInstance.post("/reconciliation/flag", data)).data;
