import api from "./axiosInstance";

// Public submission (no auth token required)
export const submitPublicInquiryApi = (data) => api.post("/public/inquiries", data);

// Admissions CRM endpoints (principal, admin)
export const getInquiriesApi = (params) => api.get("/inquiries", { params });
export const createInquiryApi = (data) => api.post("/inquiries", data);
export const checkDuplicateInquiryApi = (phone) => api.get("/inquiries/duplicate", { params: { phone } });
export const getInquiryByIdApi = (id) => api.get(`/inquiries/${id}`);
export const addFollowUpApi = (id, data) => api.post(`/inquiries/${id}/follow-ups`, data);
export const updateInquiryStatusApi = (id, data) => api.put(`/inquiries/${id}/status`, data);
export const convertInquiryApi = (id, data) => api.post(`/inquiries/${id}/convert`, data);
export const getInquiryFunnelApi = (params) => api.get("/inquiries/funnel", { params });
