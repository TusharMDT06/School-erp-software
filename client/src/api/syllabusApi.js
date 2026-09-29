import axiosInstance from "./axiosInstance";

/**
 * Fetch syllabus units with optional filters (classId, subject, academicYear)
 */
export const getSyllabusUnitsApi = (params) => {
  return axiosInstance.get("/syllabus/units", { params });
};

/**
 * Fetch single syllabus unit by ID
 */
export const getSyllabusUnitByIdApi = (id) => {
  return axiosInstance.get(`/syllabus/units/${id}`);
};

/**
 * Create a new syllabus unit
 */
export const createSyllabusUnitApi = (data) => {
  return axiosInstance.post("/syllabus/units", data);
};

/**
 * Update a syllabus unit
 */
export const updateSyllabusUnitApi = (id, data) => {
  return axiosInstance.put(`/syllabus/units/${id}`, data);
};

/**
 * Delete a syllabus unit
 */
export const deleteSyllabusUnitApi = (id) => {
  return axiosInstance.delete(`/syllabus/units/${id}`);
};

/**
 * Update topic status (not_started, in_progress, completed) and note
 */
export const updateTopicStatusApi = (unitId, topicId, data) => {
  return axiosInstance.put(`/syllabus/units/${unitId}/topics/${topicId}`, data);
};

/**
 * Fetch syllabus progress metrics (completion %, behind schedule status)
 */
export const getSyllabusProgressApi = (params) => {
  return axiosInstance.get("/syllabus/progress", { params });
};
