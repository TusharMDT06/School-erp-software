import axiosInstance from "./axiosInstance";

/** GET /students — paginated list with optional filters */
export const getStudentsApi = async (params = {}) => {
  const response = await axiosInstance.get("/students", { params });
  return response.data;
};

/**
 * GET /students/me — Fetch the logged-in student's own profile.
 * Use this on student-facing pages instead of getStudentsApi (which is admin-only).
 */
export const getMyStudentProfileApi = async () => {
  const response = await axiosInstance.get("/students/me");
  return response.data;
};

/** POST /students — create student + user (transaction) */
export const createStudentApi = async (data) => {
  const response = await axiosInstance.post("/students", data);
  return response.data;
};

/** GET /students/:id */
export const getStudentByIdApi = async (id) => {
  const response = await axiosInstance.get(`/students/${id}`);
  return response.data;
};

/** PUT /students/:id */
export const updateStudentApi = async (id, data) => {
  const response = await axiosInstance.put(`/students/${id}`, data);
  return response.data;
};

/** DELETE /students/:id (soft delete) */
export const deleteStudentApi = async (id) => {
  const response = await axiosInstance.delete(`/students/${id}`);
  return response.data;
};

/** POST /students/:id/documents — upload files (multipart/form-data) */
export const uploadStudentDocumentsApi = async (id, formData) => {
  const response = await axiosInstance.post(`/students/${id}/documents`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
