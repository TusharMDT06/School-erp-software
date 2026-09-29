import axiosInstance from "./axiosInstance";

export const getTeacherSubstitutionsApi = (params) => {
  return axiosInstance.get("/teacher/substitutions", { params });
};

export const acknowledgeSubstitutionApi = (id) => {
  return axiosInstance.put(`/teacher/substitutions/${id}/acknowledge`);
};

export const createSubstituteSuggestionApi = (data) => {
  return axiosInstance.post("/teacher/substitutions/suggestions", data);
};

export const getSubstituteSuggestionsApi = (params) => {
  return axiosInstance.get("/teacher/substitutions/suggestions", { params });
};

export const confirmSubstituteSuggestionApi = (id, data) => {
  return axiosInstance.put(`/teacher/substitutions/suggestions/${id}/confirm`, data);
};
