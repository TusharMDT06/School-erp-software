import axiosInstance from "./axiosInstance";

export const getStaffOverviewApi = () => {
  return axiosInstance.get("/principal/staff/overview");
};

export const getSubstitutionSuggestionsApi = (params = {}) => {
  return axiosInstance.get("/substitutions/suggestions", { params });
};

export const getPeriodsNeedingCoverApi = (params = {}) => {
  return axiosInstance.get("/substitutions/periods-needing-cover", { params });
};

export const createSubstitutionApi = (data) => {
  return axiosInstance.post("/substitutions", data);
};

export const getSubstitutionsApi = (params = {}) => {
  return axiosInstance.get("/substitutions", { params });
};

export const cancelSubstitutionApi = (id) => {
  return axiosInstance.put(`/substitutions/${id}/cancel`);
};
