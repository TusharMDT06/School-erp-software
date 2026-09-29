import axiosInstance from "./axiosInstance";

/**
 * Fetch components for class + subject + academicYear
 */
export const getGradebookComponentsApi = (params) => {
  return axiosInstance.get("/gradebook/components", { params });
};

/**
 * Create a new assessment component (max 100% total weightage)
 */
export const createGradebookComponentApi = (data) => {
  return axiosInstance.post("/gradebook/components", data);
};

/**
 * Update an assessment component
 */
export const updateGradebookComponentApi = (id, data) => {
  return axiosInstance.put(`/gradebook/components/${id}`, data);
};

/**
 * Delete an assessment component and its scores
 */
export const deleteGradebookComponentApi = (id) => {
  return axiosInstance.delete(`/gradebook/components/${id}`);
};

/**
 * Bulk save scores for a component in spreadsheet grid
 */
export const saveComponentScoresApi = (componentId, data) => {
  return axiosInstance.put(`/gradebook/components/${componentId}/scores`, data);
};

/**
 * Fetch class gradebook grid with internal weighted totals & trend
 */
export const getClassGradebookApi = (params) => {
  return axiosInstance.get("/gradebook/class", { params });
};

/**
 * Fetch gradebook analytics (distribution, needs support, most improved)
 */
export const getGradebookAnalyticsApi = (params) => {
  return axiosInstance.get("/gradebook/analytics", { params });
};

/**
 * Download gradebook Excel export
 */
export const exportGradebookExcelApi = (params) => {
  return axiosInstance.get("/gradebook/export", {
    params,
    responseType: "blob",
  });
};

/**
 * Student view: get published components & marks
 */
export const getStudentGradebookApi = (params) => {
  return axiosInstance.get("/student/gradebook", { params });
};

/**
 * Parent view: get child published components & marks
 */
export const getParentGradebookApi = (studentId, params) => {
  return axiosInstance.get(`/parent/children/${studentId}/gradebook`, { params });
};
