import axiosInstance from "./axiosInstance";

export const getIncidentsApi = (params = {}) => {
  return axiosInstance.get("/incidents", { params });
};

export const createIncidentApi = (data) => {
  return axiosInstance.post("/incidents", data);
};

export const updateIncidentApi = (id, data) => {
  return axiosInstance.put(`/incidents/${id}`, data);
};

export const notifyIncidentParentApi = (id, data) => {
  return axiosInstance.post(`/incidents/${id}/notify-parent`, data);
};
