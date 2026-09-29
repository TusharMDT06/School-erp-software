import axiosInstance from "./axiosInstance";

/** GET /circulars */
export const getCircularsApi = async (params = {}) =>
  (await axiosInstance.get("/circulars", { params })).data;

/** GET /circulars/:id */
export const getCircularByIdApi = async (id) =>
  (await axiosInstance.get(`/circulars/${id}`)).data;

/** POST /circulars */
export const createCircularApi = async (data) =>
  (await axiosInstance.post("/circulars", data)).data;

/** PUT /circulars/:id */
export const updateCircularApi = async (id, data) =>
  (await axiosInstance.put(`/circulars/${id}`, data)).data;

/** PUT /circulars/:id/publish */
export const publishCircularApi = async (id) =>
  (await axiosInstance.put(`/circulars/${id}/publish`)).data;

/** GET /circulars/mine */
export const getMyCircularsApi = async (params = {}) =>
  (await axiosInstance.get("/circulars/mine", { params })).data;

/** POST /circulars/:id/read */
export const markCircularReadApi = async (id) =>
  (await axiosInstance.post(`/circulars/${id}/read`)).data;

/** POST /circulars/:id/acknowledge */
export const acknowledgeCircularApi = async (id) =>
  (await axiosInstance.post(`/circulars/${id}/acknowledge`)).data;

/** GET /circulars/:id/stats */
export const getCircularStatsApi = async (id) =>
  (await axiosInstance.get(`/circulars/${id}/stats`)).data;

/** POST /circulars/:id/remind */
export const remindNonRespondersApi = async (id) =>
  (await axiosInstance.post(`/circulars/${id}/remind`)).data;
