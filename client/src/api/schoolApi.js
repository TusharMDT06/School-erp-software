import axiosInstance from "./axiosInstance";

/**
 * School API
 */

/** GET /schools — list all schools */
export const getSchoolsApi = async () => {
  const response = await axiosInstance.get("/schools");
  return response.data;
};

/** GET /schools/:id */
export const getSchoolByIdApi = async (id) => {
  const response = await axiosInstance.get(`/schools/${id}`);
  return response.data;
};

/** POST /schools */
export const createSchoolApi = async (data) => {
  const response = await axiosInstance.post("/schools", data);
  return response.data;
};

/** PUT /schools/:id */
export const updateSchoolApi = async (id, data) => {
  const response = await axiosInstance.put(`/schools/${id}`, data);
  return response.data;
};

/** DELETE /schools/:id */
export const deleteSchoolApi = async (id) => {
  const response = await axiosInstance.delete(`/schools/${id}`);
  return response.data;
};
