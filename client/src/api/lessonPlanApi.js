import axiosInstance from "./axiosInstance";

/**
 * Fetch lesson plans (filtered by classId, subject, from, to date range)
 */
export const getLessonPlansApi = (params) => {
  return axiosInstance.get("/lesson-plans", { params });
};

/**
 * Fetch single lesson plan by ID
 */
export const getLessonPlanByIdApi = (id) => {
  return axiosInstance.get(`/lesson-plans/${id}`);
};

/**
 * Create a new lesson plan
 */
export const createLessonPlanApi = (data) => {
  return axiosInstance.post("/lesson-plans", data);
};

/**
 * Update an existing lesson plan
 */
export const updateLessonPlanApi = (id, data) => {
  return axiosInstance.put(`/lesson-plans/${id}`, data);
};

/**
 * Delete a lesson plan
 */
export const deleteLessonPlanApi = (id) => {
  return axiosInstance.delete(`/lesson-plans/${id}`);
};

/**
 * Generate an editable lesson plan draft with Gemini AI (Rate limited 20/day)
 */
export const draftLessonPlanAiApi = (data) => {
  return axiosInstance.post("/lesson-plans/ai-draft", data);
};
