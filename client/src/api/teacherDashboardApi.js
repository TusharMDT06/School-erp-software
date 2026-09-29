import axiosInstance from "./axiosInstance";

export const getTeacherDashboardApi = async () => {
  const response = await axiosInstance.get("/teacher/dashboard");
  return response.data;
};

export const getTeacherClassesAndSubjectsApi = async () => {
  const response = await axiosInstance.get("/teacher/classes-subjects");
  return response.data;
};
