import axiosInstance from "./axiosInstance";

/** GET /notifications */
export const getMyNotificationsApi = async (params = {}) =>
  (await axiosInstance.get("/notifications", { params })).data;

/** PATCH /notifications/:id/read */
export const markNotificationReadApi = async (id) =>
  (await axiosInstance.patch(`/notifications/${id}/read`)).data;

/** PATCH /notifications/read-all */
export const markAllNotificationsReadApi = async () =>
  (await axiosInstance.patch("/notifications/read-all")).data;

/** DELETE /notifications/:id */
export const deleteNotificationApi = async (id) =>
  (await axiosInstance.delete(`/notifications/${id}`)).data;

/** DELETE /notifications/clear-all */
export const clearAllNotificationsApi = async () =>
  (await axiosInstance.delete("/notifications/clear-all")).data;
