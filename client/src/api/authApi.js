import axiosInstance from "./axiosInstance";

/**
 * Auth API — wrapper functions for all auth endpoints.
 * Each function returns the `data` field from the Axios response,
 * which matches our ApiResponse shape: { success, data, message }
 */

/** POST /auth/login */
export const loginApi = async (credentials) => {
  const response = await axiosInstance.post("/auth/login", credentials);
  return response.data;
};

/** POST /auth/logout */
export const logoutApi = async () => {
  const response = await axiosInstance.post("/auth/logout");
  return response.data;
};

/** GET /auth/me — fetch current user profile */
export const getMeApi = async () => {
  const response = await axiosInstance.get("/auth/me");
  return response.data;
};

/** POST /auth/refresh-token — exchange cookie for new access token */
export const refreshTokenApi = async () => {
  const response = await axiosInstance.post("/auth/refresh-token");
  return response.data;
};

/** POST /auth/forgot-password */
export const forgotPasswordApi = async (email) => {
  const response = await axiosInstance.post("/auth/forgot-password", { email });
  return response.data;
};

/** POST /auth/reset-password/:token */
export const resetPasswordApi = async (token, newPassword) => {
  const response = await axiosInstance.post(`/auth/reset-password/${token}`, { newPassword });
  return response.data;
};

/** POST /auth/register (admin/superadmin only) */
export const registerUserApi = async (userData) => {
  const response = await axiosInstance.post("/auth/register", userData);
  return response.data;
};

/** POST /auth/student-signup/verify */
export const verifyStudentSignupApi = async (data) => {
  const response = await axiosInstance.post("/auth/student-signup/verify", data);
  return response.data;
};

/** POST /auth/student-signup/complete */
export const completeStudentSignupApi = async (data) => {
  const response = await axiosInstance.post("/auth/student-signup/complete", data);
  return response.data;
};
