import axiosInstance from "./axiosInstance";

/** Helper to trigger browser download of Excel blob */
export const downloadExcel = (blobData, filename = "report.xlsx") => {
  const url = window.URL.createObjectURL(new Blob([blobData]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// 1. Collection Report
export const getCollectionReportApi = async (params = {}) =>
  (await axiosInstance.get("/reports/collection", { params })).data;

export const exportCollectionReportApi = async (params = {}) =>
  (
    await axiosInstance.get("/reports/collection/export", {
      params: { ...params, format: "xlsx" },
      responseType: "blob",
    })
  ).data;

// 2. Outstanding Report
export const getOutstandingReportApi = async (params = {}) =>
  (await axiosInstance.get("/reports/outstanding", { params })).data;

export const exportOutstandingReportApi = async (params = {}) =>
  (
    await axiosInstance.get("/reports/outstanding/export", {
      params: { ...params, format: "xlsx" },
      responseType: "blob",
    })
  ).data;

// 3. Concessions Report
export const getConcessionsReportApi = async (params = {}) =>
  (await axiosInstance.get("/reports/concessions", { params })).data;

export const exportConcessionsReportApi = async (params = {}) =>
  (
    await axiosInstance.get("/reports/concessions/export", {
      params: { ...params, format: "xlsx" },
      responseType: "blob",
    })
  ).data;

// 4. Expenses Report
export const getExpensesReportApi = async (params = {}) =>
  (await axiosInstance.get("/reports/expenses", { params })).data;

export const exportExpensesReportApi = async (params = {}) =>
  (
    await axiosInstance.get("/reports/expenses/export", {
      params: { ...params, format: "xlsx" },
      responseType: "blob",
    })
  ).data;

// 5. Profit & Loss Report
export const getProfitLossReportApi = async (params = {}) =>
  (await axiosInstance.get("/reports/profit-loss", { params })).data;

export const exportProfitLossReportApi = async (params = {}) =>
  (
    await axiosInstance.get("/reports/profit-loss/export", {
      params: { ...params, format: "xlsx" },
      responseType: "blob",
    })
  ).data;

// 6. Budget vs Actual Report
export const getBudgetVsActualReportApi = async (params = {}) =>
  (await axiosInstance.get("/reports/budget-vs-actual", { params })).data;

export const exportBudgetVsActualReportApi = async (params = {}) =>
  (
    await axiosInstance.get("/reports/budget-vs-actual/export", {
      params: { ...params, format: "xlsx" },
      responseType: "blob",
    })
  ).data;

// 7. Collection Efficiency Report
export const getCollectionEfficiencyReportApi = async (params = {}) =>
  (await axiosInstance.get("/reports/collection-efficiency", { params })).data;

export const exportCollectionEfficiencyReportApi = async (params = {}) =>
  (
    await axiosInstance.get("/reports/collection-efficiency/export", {
      params: { ...params, format: "xlsx" },
      responseType: "blob",
    })
  ).data;

// ==========================================
// Phase 8C: Monthly Principal's MIS Report
// ==========================================
export const getMonthlySnapshotApi = (params) =>
  axiosInstance.get("/principal/reports/monthly", { params });

export const generateMonthlyReportApi = (data) =>
  axiosInstance.post("/principal/reports/monthly/generate", data);

export const listReportsApi = () =>
  axiosInstance.get("/principal/reports");

export const downloadReportApi = (id, format = "pdf") =>
  axiosInstance.get(`/principal/reports/${id}/download`, {
    params: { format },
    responseType: "blob",
  });
