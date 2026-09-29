import axiosInstance from "./axiosInstance";

export const createCorrectionRequestApi = async (data) => {
  const response = await axiosInstance.post("/attendance/corrections", data);
  return response.data;
};

export const getCorrectionRequestsApi = async (params = {}) => {
  const response = await axiosInstance.get("/attendance/corrections", { params });
  return response.data;
};

export const decideCorrectionRequestApi = async (id, data) => {
  const response = await axiosInstance.put(`/attendance/corrections/${id}/decide`, data);
  return response.data;
};
