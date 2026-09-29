import axiosInstance from "./axiosInstance";

/**
 * Fetch children linked to the parent account.
 */
export const getParentChildrenApi = async () => {
  const response = await axiosInstance.get("/students", { params: { limit: 50 } });
  return response.data;
};

/**
 * Fetch remarks shared with parents for a child.
 */
export const getChildRemarksApi = async (studentId) => {
  const response = await axiosInstance.get(`/parent/children/${studentId}/remarks`);
  return response.data;
};
