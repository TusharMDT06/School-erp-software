import axiosInstance from "./axiosInstance";

/** GET /principal/dashboard */
export const getPrincipalDashboardApi = async () =>
  (await axiosInstance.get("/principal/dashboard")).data;
