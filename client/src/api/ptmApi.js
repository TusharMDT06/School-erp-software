import axiosInstance from "./axiosInstance";

export const getPTMEventsApi = (params) => {
  return axiosInstance.get("/ptm", { params });
};

export const getPTMEventByIdApi = (id) => {
  return axiosInstance.get(`/ptm/${id}`);
};

export const createPTMEventApi = (data) => {
  return axiosInstance.post("/ptm", data);
};

export const getPTMSlotsApi = (ptmId, params) => {
  return axiosInstance.get(`/ptm/${ptmId}/slots`, { params });
};

export const bookPTMSlotApi = (slotId, data) => {
  return axiosInstance.post(`/ptm/slots/${slotId}/book`, data);
};

export const cancelPTMSlotApi = (slotId, data) => {
  return axiosInstance.put(`/ptm/slots/${slotId}/cancel`, data);
};

export const getTeacherPTMAgendaApi = (params) => {
  return axiosInstance.get("/teacher/ptm/agenda", { params });
};

export const completePTMSlotApi = (slotId, data) => {
  return axiosInstance.put(`/ptm/slots/${slotId}/complete`, data);
};
