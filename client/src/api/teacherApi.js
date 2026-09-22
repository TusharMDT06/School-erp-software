import axiosInstance from "./axiosInstance";

/** GET /teachers — list with optional filters */
export const getTeachersApi = async (params = {}) => {
  const response = await axiosInstance.get("/teachers", { params });
  return response.data;
};

/** POST /teachers — create teacher + user */
export const createTeacherApi = async (data) => {
  const response = await axiosInstance.post("/teachers", data);
  return response.data;
};

/** GET /teachers/:id */
export const getTeacherByIdApi = async (id) => {
  const response = await axiosInstance.get(`/teachers/${id}`);
  return response.data;
};

/** PUT /teachers/:id */
export const updateTeacherApi = async (id, data) => {
  const response = await axiosInstance.put(`/teachers/${id}`, data);
  return response.data;
};

/** DELETE /teachers/:id (soft delete) */
export const deleteTeacherApi = async (id) => {
  const response = await axiosInstance.delete(`/teachers/${id}`);
  return response.data;
};
