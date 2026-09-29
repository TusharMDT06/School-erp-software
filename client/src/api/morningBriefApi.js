import api from "./axiosInstance";

export const getMorningBriefApi = () => api.get("/principal/morning-brief");
export const refreshMorningBriefApi = () => api.post("/principal/morning-brief/refresh");
