import axiosInstance from "./axiosInstance";

export const getMyStudyMaterialsApi = async (params = {}) => {
  const response = await axiosInstance.get("/study-materials/mine", { params });
  return response.data;
};

export const createStudyMaterialApi = async (formData) => {
  const response = await axiosInstance.post("/study-materials", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateStudyMaterialApi = async (id, formData) => {
  const response = await axiosInstance.put(`/study-materials/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const togglePublishMaterialApi = async (id) => {
  const response = await axiosInstance.put(`/study-materials/${id}/toggle-publish`);
  return response.data;
};

export const deleteStudyMaterialApi = async (id) => {
  const response = await axiosInstance.delete(`/study-materials/${id}`);
  return response.data;
};

export const getStudentMaterialsApi = async (params = {}) => {
  const response = await axiosInstance.get("/student/materials", { params });
  return response.data;
};
