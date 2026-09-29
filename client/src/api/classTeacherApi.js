import axiosInstance from "./axiosInstance";

export const getMyClassApi = (params) => {
  return axiosInstance.get("/teacher/my-class", { params });
};

export const previewAbsenteeMessageApi = (params) => {
  return axiosInstance.get("/teacher/my-class/message-absentees/preview", { params });
};

export const sendAbsenteeMessageApi = (data) => {
  return axiosInstance.post("/teacher/my-class/message-absentees", data);
};

export const draftReportRemarksApi = (data) => {
  return axiosInstance.post("/teacher/report-remarks/draft", data);
};
