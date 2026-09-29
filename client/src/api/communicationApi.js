import axiosInstance from "./axiosInstance";

export const getTeacherPreferenceApi = () => {
  return axiosInstance.get("/communication/preferences");
};

export const updateTeacherPreferenceApi = (data) => {
  return axiosInstance.put("/communication/preferences", data);
};

export const getTeacherOfficeHoursApi = (teacherId) => {
  return axiosInstance.get(`/communication/office-hours/${teacherId}`);
};

export const getNoticeTemplatesApi = () => {
  return axiosInstance.get("/communication/notices/templates");
};

export const createClassNoticeApi = (data) => {
  return axiosInstance.post("/communication/notices", data);
};

export const getMyClassNoticesApi = () => {
  return axiosInstance.get("/communication/notices");
};
