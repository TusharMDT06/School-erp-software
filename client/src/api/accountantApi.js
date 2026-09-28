import axiosInstance from "./axiosInstance";

/** GET /accountant/students/search?q= */
export const searchStudentsApi = async (q) =>
  (await axiosInstance.get("/accountant/students/search", { params: { q } })).data;

/** GET /accountant/students/:studentId/dues */
export const getStudentDuesApi = async (studentId) =>
  (await axiosInstance.get(`/accountant/students/${studentId}/dues`)).data;

/** POST /accountant/collect */
export const collectFeeApi = async (data) =>
  (await axiosInstance.post("/accountant/collect", data)).data;

/** GET /accountant/receipts/:transactionId — PDF (blob) */
export const getReceiptBlobApi = async (transactionId) =>
  (await axiosInstance.get(`/accountant/receipts/${transactionId}`, { responseType: "blob" })).data;

/** POST /accountant/receipts/:transactionId/resend */
export const resendReceiptApi = async (transactionId) =>
  (await axiosInstance.post(`/accountant/receipts/${transactionId}/resend`)).data;

/** POST /accountant/receipts/:transactionId/reverse */
export const reverseReceiptApi = async (transactionId, reason) =>
  (await axiosInstance.post(`/accountant/receipts/${transactionId}/reverse`, { reason })).data;

/** PUT /accountant/cheques/:paymentId/clear */
export const clearChequeApi = async (paymentId) =>
  (await axiosInstance.put(`/accountant/cheques/${paymentId}/clear`)).data;

/** PUT /accountant/cheques/:paymentId/bounce */
export const bounceChequeApi = async (paymentId) =>
  (await axiosInstance.put(`/accountant/cheques/${paymentId}/bounce`)).data;

/** GET /accountant/upi-qr?amount=&note= */
export const getUpiQrApi = async (amount, note) =>
  (await axiosInstance.get("/accountant/upi-qr", { params: { amount, note } })).data;

/** GET /accountant/dashboard-summary */
export const getAccountantDashboardApi = async () =>
  (await axiosInstance.get("/accountant/dashboard-summary")).data;

// ── Finance Settings ───────────────────────────────────────────────────────
/** GET /finance-settings */
export const getFinanceSettingsApi = async () =>
  (await axiosInstance.get("/finance-settings")).data;

/** PUT /finance-settings */
export const updateFinanceSettingsApi = async (data) =>
  (await axiosInstance.put("/finance-settings", data)).data;

// ── Concessions ────────────────────────────────────────────────────────────
export const createConcessionApi = async (data) =>
  (await axiosInstance.post("/concessions", data)).data;

export const getConcessionListApi = async (params = {}) =>
  (await axiosInstance.get("/concessions", { params })).data;

export const decideConcessionApi = async (id, body) =>
  (await axiosInstance.put(`/concessions/${id}/decide`, body)).data;

// ── Refunds ────────────────────────────────────────────────────────────────
export const createRefundApi = async (data) =>
  (await axiosInstance.post("/refunds", data)).data;

export const getRefundListApi = async (params = {}) =>
  (await axiosInstance.get("/refunds", { params })).data;

export const decideRefundApi = async (id, body) =>
  (await axiosInstance.put(`/refunds/${id}/decide`, body)).data;

export const payRefundApi = async (id) =>
  (await axiosInstance.put(`/refunds/${id}/pay`)).data;

// ── Payment Links ──────────────────────────────────────────────────────────
export const createPaymentLinkApi = async (data) =>
  (await axiosInstance.post("/accountant/payment-link", data)).data;

export const getPaymentLinksApi = async () =>
  (await axiosInstance.get("/accountant/payment-links")).data;

// ── AI Finance Insights ───────────────────────────────────────────────────
export const getFinanceInsightApi = async () =>
  (await axiosInstance.get("/accountant/insights")).data;

export const refreshFinanceInsightApi = async () =>
  (await axiosInstance.post("/accountant/insights/refresh")).data;

