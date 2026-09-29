import axiosInstance from "./axiosInstance";

/** GET /calendar/events */
export const getEventsApi = async (params = {}) =>
  (await axiosInstance.get("/calendar/events", { params })).data;

/** GET /calendar/events/:id */
export const getEventByIdApi = async (id) =>
  (await axiosInstance.get(`/calendar/events/${id}`)).data;

/** POST /calendar/events */
export const createEventApi = async (data) =>
  (await axiosInstance.post("/calendar/events", data)).data;

/** PUT /calendar/events/:id */
export const updateEventApi = async (id, data) =>
  (await axiosInstance.put(`/calendar/events/${id}`, data)).data;

/** GET /calendar/events/:id/audience-preview */
export const getAudiencePreviewApi = async (id) =>
  (await axiosInstance.get(`/calendar/events/${id}/audience-preview`)).data;

/** PUT /calendar/events/:id/publish */
export const publishEventApi = async (id) =>
  (await axiosInstance.put(`/calendar/events/${id}/publish`)).data;

/** PUT /calendar/events/:id/cancel */
export const cancelEventApi = async (id) =>
  (await axiosInstance.put(`/calendar/events/${id}/cancel`)).data;
