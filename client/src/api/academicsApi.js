import axiosInstance from "./axiosInstance";

export const getAcademicsOverviewApi = (params = {}) => {
  return axiosInstance.get("/principal/academics/overview", { params });
};

export const getClassComparisonApi = (params = {}) => {
  return axiosInstance.get("/principal/academics/class-comparison", { params });
};

export const getSubjectAnalysisApi = (params = {}) => {
  return axiosInstance.get("/principal/academics/subject-analysis", { params });
};

export const getAcademicsTrendApi = (params = {}) => {
  return axiosInstance.get("/principal/academics/trend", { params });
};

export const getExamToppersApi = (params = {}) => {
  return axiosInstance.get("/principal/academics/toppers", { params });
};

export const getTeacherContextApi = (params = {}) => {
  return axiosInstance.get("/principal/academics/teacher-context", { params });
};
