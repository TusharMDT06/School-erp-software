import axiosInstance from "./axiosInstance";

/** GET /classes — list with optional filters */
export const getClassesApi = async (params = {}) => {
  const response = await axiosInstance.get("/classes", { params });
  return response.data;
};

/** POST /classes — create a new class-section */
export const createClassApi = async (data) => {
  const response = await axiosInstance.post("/classes", data);
  return response.data;
};

/** GET /classes/:id */
export const getClassByIdApi = async (id) => {
  const response = await axiosInstance.get(`/classes/${id}`);
  return response.data;
};

/** PUT /classes/:id */
export const updateClassApi = async (id, data) => {
  const response = await axiosInstance.put(`/classes/${id}`, data);
  return response.data;
};

/** DELETE /classes/:id */
export const deleteClassApi = async (id) => {
  const response = await axiosInstance.delete(`/classes/${id}`);
  return response.data;
};
