import axiosInstance from "./axiosInstance";

/**
 * POST /results/bulk-entry
 * Upserts marks for a batch of students.
 */
export const bulkEntryResultsApi = async (data) => {
  const response = await axiosInstance.post("/results/bulk-entry", data);
  return response.data;
};

/**
 * GET /results/exam/:examId/all
 * Fetches all student marks recorded for an exam.
 */
export const getResultsByExamApi = async (examId) => {
  const response = await axiosInstance.get(`/results/exam/${examId}/all`);
  return response.data;
};

/**
 * POST /results/:examId/generate-remarks
 * Triggers batch AI report card remarks generation.
 */
export const generateAiRemarksApi = async (examId) => {
  const response = await axiosInstance.post(`/results/${examId}/generate-remarks`);
  return response.data;
};

/**
 * POST /results/:examId/publish
 * Publishes results, generates PDF report cards, and notifies parents.
 */
export const publishResultsApi = async (examId) => {
  const response = await axiosInstance.post(`/results/${examId}/publish`);
  return response.data;
};

/**
 * GET /results/student/:studentId
 * Fetches all published examination results for a student.
 */
export const getStudentResultsApi = async (studentId) => {
  const response = await axiosInstance.get(`/results/student/${studentId}`);
  return response.data;
};

/**
 * GET /results/class/:classId/exam/:examId/analytics
 * Fetches analytics pipeline metrics (averages, toppers, grade distribution).
 */
export const getClassExamAnalyticsApi = async (classId, examId) => {
  const response = await axiosInstance.get(
    `/results/class/${classId}/exam/${examId}/analytics`
  );
  return response.data;
};
