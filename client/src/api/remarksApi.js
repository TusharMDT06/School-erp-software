import axiosInstance from "./axiosInstance";

export const createRemarkApi = (data) => {
  return axiosInstance.post("/remarks", data);
};

export const updateRemarkApi = (id, data) => {
  return axiosInstance.put(`/remarks/${id}`, data);
};

export const getStudentRemarksApi = (studentId) => {
  return axiosInstance.get(`/remarks/student/${studentId}`);
};

export const getParentRemarksApi = (studentId) => {
  return axiosInstance.get(`/parent/children/${studentId}/remarks`);
};

export const appreciateRemarkApi = (id) => {
  return axiosInstance.post(`/remarks/${id}/appreciate`);
};

export const escalateRemarkApi = (id, data = {}) => {
  return axiosInstance.post(`/remarks/${id}/escalate`, data);
};
