import axiosInstance from "./axiosInstance";

/**
 * POST /attendance/mark
 * Bulk marks or updates attendance for a class on a specific date.
 */
export const markAttendanceApi = async (data) => {
  const response = await axiosInstance.post("/attendance/mark", data);
  return response.data;
};

/**
 * GET /attendance/class/:classId/date/:date
 * Fetches attendance records for a specific class and date to pre-fill the form.
 */
export const getClassAttendanceByDateApi = async (classId, date) => {
  const response = await axiosInstance.get(`/attendance/class/${classId}/date/${date}`);
  return response.data;
};

/**
 * GET /attendance/class/:classId/summary?month=...&year=...
 * Fetches aggregate per-student attendance percentage for reports.
 */
export const getClassAttendanceSummaryApi = async (classId, params = {}) => {
  const response = await axiosInstance.get(`/attendance/class/${classId}/summary`, { params });
  return response.data;
};

/**
 * GET /attendance/student/:studentId/report?fromDate=...&toDate=...
 * Fetches individual attendance report with stat summary and daily records.
 */
export const getStudentAttendanceReportApi = async (studentId, params = {}) => {
  const response = await axiosInstance.get(`/attendance/student/${studentId}/report`, { params });
  return response.data;
};
