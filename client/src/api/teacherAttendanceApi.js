import axiosInstance from "./axiosInstance";

/** POST /teacher-attendance/mark — bulk mark attendance */
export const markTeacherAttendanceApi = async (data) => {
  const response = await axiosInstance.post("/teacher-attendance/mark", data);
  return response.data;
};

/** GET /teacher-attendance?date=YYYY-MM-DD — get attendance by date */
export const getTeacherAttendanceByDateApi = async (date) => {
  const response = await axiosInstance.get("/teacher-attendance", { params: { date } });
  return response.data;
};

/** GET /teacher-attendance/summary?month=&year= */
export const getTeacherAttendanceSummaryApi = async (params = {}) => {
  const response = await axiosInstance.get("/teacher-attendance/summary", { params });
  return response.data;
};

/** GET /teacher-attendance/salary?month=&year= */
export const getTeacherSalaryApi = async (params = {}) => {
  const response = await axiosInstance.get("/teacher-attendance/salary", { params });
  return response.data;
};
