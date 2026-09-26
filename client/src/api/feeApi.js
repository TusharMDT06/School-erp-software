import axiosInstance from "./axiosInstance";

/**
 * POST /fees/structure
 * Creates a fee structure and auto-generates student invoices.
 */
export const createFeeStructureApi = async (data) => {
  const response = await axiosInstance.post("/fees/structure", data);
  return response.data;
};

/**
 * GET /fees/structure/:classId
 * Fetches fee structures for a class.
 */
export const getFeeStructuresByClassApi = async (classId) => {
  const response = await axiosInstance.get(`/fees/structure/${classId}`);
  return response.data;
};

/**
 * GET /fees/student/:studentId
 * Fetches fee transactions and summary for a student.
 */
export const getStudentFeeTransactionsApi = async (studentId) => {
  const response = await axiosInstance.get(`/fees/student/${studentId}`);
  return response.data;
};

/**
 * POST /fees/create-order
 * Creates a Razorpay payment order.
 */
export const createRazorpayOrderApi = async (data) => {
  const response = await axiosInstance.post("/fees/create-order", data);
  return response.data;
};

/**
 * POST /fees/verify-payment
 * Verifies Razorpay payment signature and generates receipt.
 */
export const verifyRazorpayPaymentApi = async (data) => {
  const response = await axiosInstance.post("/fees/verify-payment", data);
  return response.data;
};

/**
 * GET /fees/defaulters
 * Fetches fee defaulters list with optional class filter.
 */
export const getFeeDefaultersApi = async (params = {}) => {
  const response = await axiosInstance.get("/fees/defaulters", { params });
  return response.data;
};

/**
 * POST /fees/reminder/:studentId
 * Triggers a manual fee reminder email for a student.
 */
export const triggerManualReminderApi = async (studentId) => {
  const response = await axiosInstance.post(`/fees/reminder/${studentId}`);
  return response.data;
};

/**
 * POST /fees/trigger-call-alert/:transactionId
 * Triggers an automated voice call alert (with SMS & WhatsApp fallback) for an overdue fee.
 */
export const triggerFeeOverdueCallAlertApi = async (transactionId) => {
  const response = await axiosInstance.post(`/fees/trigger-call-alert/${transactionId}`);
  return response.data;
};
