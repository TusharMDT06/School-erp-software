import axiosInstance from "./axiosInstance";

// ── Teacher Quiz APIs ──────────────────────────────────────────────────────

/**
 * Fetch quizzes with optional classId, subject, status filters
 */
export const getQuizzesApi = (params) => {
  return axiosInstance.get("/quizzes", { params });
};

/**
 * Fetch quiz details by ID (including questions with correct answers for teacher)
 */
export const getQuizByIdApi = (id) => {
  return axiosInstance.get(`/quizzes/${id}`);
};

/**
 * Create a new quiz (draft)
 */
export const createQuizApi = (data) => {
  return axiosInstance.post("/quizzes", data);
};

/**
 * Update quiz (drafts editable; published can only be closed)
 */
export const updateQuizApi = (id, data) => {
  return axiosInstance.put(`/quizzes/${id}`, data);
};

/**
 * Delete quiz (only if no attempts exist)
 */
export const deleteQuizApi = (id) => {
  return axiosInstance.delete(`/quizzes/${id}`);
};

/**
 * Publish quiz and notify class
 */
export const publishQuizApi = (id) => {
  return axiosInstance.post(`/quizzes/${id}/publish`);
};

/**
 * Fetch all student attempts for a quiz
 */
export const getQuizAttemptsApi = (id) => {
  return axiosInstance.get(`/quizzes/${id}/attempts`);
};

/**
 * Fetch quiz analysis (per-question percent correct, hardest questions, avg time)
 */
export const getQuizAnalysisApi = (id) => {
  return axiosInstance.get(`/quizzes/${id}/analysis`);
};

/**
 * Download quiz attempts & results Excel export
 */
export const exportQuizExcelApi = (id) => {
  return axiosInstance.get(`/quizzes/${id}/export`, {
    responseType: "blob",
  });
};

/**
 * Generate MCQs with Gemini AI (Rate limited 20/day)
 */
export const generateAiQuestionsApi = (data) => {
  return axiosInstance.post("/quizzes/ai-questions", data);
};

// ── Student Quiz APIs ──────────────────────────────────────────────────────

/**
 * Get available, upcoming, completed quizzes for student
 */
export const getStudentQuizzesApi = () => {
  return axiosInstance.get("/student/quizzes");
};

/**
 * Start quiz session (server-side startedAt, safe questions without answers)
 */
export const startQuizApi = (id) => {
  return axiosInstance.post(`/student/quizzes/${id}/start`);
};

/**
 * Autosave student answers every 15s
 */
export const autosaveQuizApi = (id, data) => {
  return axiosInstance.put(`/student/quizzes/${id}/autosave`, data);
};

/**
 * Submit quiz answers
 */
export const submitQuizApi = (id, data) => {
  return axiosInstance.post(`/student/quizzes/${id}/submit`, data);
};

/**
 * Get quiz result & full solution (respects showResults timing)
 */
export const getQuizResultApi = (id) => {
  return axiosInstance.get(`/student/quizzes/${id}/result`);
};
