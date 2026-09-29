import axiosInstance from "./axiosInstance";

export const getAtRiskStudentsApi = (params = {}) => {
  return axiosInstance.get("/welfare/at-risk", { params });
};

export const getStudentWelfareDetailApi = (studentId) => {
  return axiosInstance.get(`/welfare/students/${studentId}`);
};

export const createInterventionApi = (data) => {
  return axiosInstance.post("/welfare/interventions", data);
};

export const updateInterventionApi = (id, data) => {
  return axiosInstance.put(`/welfare/interventions/${id}`, data);
};

export const generateParentTalkingPointsApi = (studentId) => {
  return axiosInstance.post(`/welfare/students/${studentId}/talking-points`);
};
