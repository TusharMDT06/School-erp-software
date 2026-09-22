import axiosInstance from "./axiosInstance";

/**
 * POST /exams
 * Creates a new examination schedule.
 */
export const createExamApi = async (data) => {
  const response = await axiosInstance.post("/exams", data);
  return response.data;
};

/**
 * GET /exams/class/:classId
 * Fetches all exams scheduled for a class.
 */
export const getExamsByClassApi = async (classId) => {
  const response = await axiosInstance.get(`/exams/class/${classId}`);
  return response.data;
};

/**
 * GET /exams/:id
 * Fetches single exam details.
 */
export const getExamByIdApi = async (id) => {
  const response = await axiosInstance.get(`/exams/${id}`);
  return response.data;
};

/**
 * PUT /exams/:id
 * Updates an exam schedule before results are published.
 */
export const updateExamApi = async (id, data) => {
  const response = await axiosInstance.put(`/exams/${id}`, data);
  return response.data;
};

/**
 * DELETE /exams/:id
 * Deletes an exam schedule (only allowed if no results exist).
 */
export const deleteExamApi = async (id) => {
  const response = await axiosInstance.delete(`/exams/${id}`);
  return response.data;
};
