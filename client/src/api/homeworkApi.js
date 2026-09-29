import axiosInstance from "./axiosInstance";

// ── Teacher Endpoints ──────────────────────────────────────────────────────

export const getMyHomeworkApi = async (params = {}) => {
  const response = await axiosInstance.get("/homework/mine", { params });
  return response.data;
};

export const createHomeworkApi = async (formData) => {
  const response = await axiosInstance.post("/homework", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateHomeworkApi = async (id, formData) => {
  const response = await axiosInstance.put(`/homework/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const closeHomeworkApi = async (id) => {
  const response = await axiosInstance.put(`/homework/${id}/close`);
  return response.data;
};

export const deleteHomeworkApi = async (id) => {
  const response = await axiosInstance.delete(`/homework/${id}`);
  return response.data;
};

export const getHomeworkSubmissionsApi = async (id) => {
  const response = await axiosInstance.get(`/homework/${id}/submissions`);
  return response.data;
};

export const reviewSubmissionApi = async (id, data) => {
  const response = await axiosInstance.put(`/homework/submissions/${id}/review`, data);
  return response.data;
};

export const nudgeHomeworkApi = async (id) => {
  const response = await axiosInstance.post(`/homework/${id}/nudge`);
  return response.data;
};

// ── Student Endpoints ──────────────────────────────────────────────────────

export const getStudentHomeworkApi = async (status) => {
  const params = status ? { status } : {};
  const response = await axiosInstance.get("/student/homework", { params });
  return response.data;
};

export const submitStudentHomeworkApi = async (id, formData) => {
  const response = await axiosInstance.post(`/student/homework/${id}/submit`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

// ── Parent Endpoint ────────────────────────────────────────────────────────

export const getChildHomeworkApi = async (studentId) => {
  const response = await axiosInstance.get(`/parent/children/${studentId}/homework`);
  return response.data;
};
