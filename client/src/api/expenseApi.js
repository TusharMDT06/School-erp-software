import axiosInstance from "./axiosInstance";

// ─── Vendors ──────────────────────────────────────────────────────────────
export const getVendorsApi = async (params = {}) =>
  (await axiosInstance.get("/vendors", { params })).data;

export const getVendorByIdApi = async (id) =>
  (await axiosInstance.get(`/vendors/${id}`)).data;

export const createVendorApi = async (data) =>
  (await axiosInstance.post("/vendors", data)).data;

export const updateVendorApi = async (id, data) =>
  (await axiosInstance.put(`/vendors/${id}`, data)).data;

export const deleteVendorApi = async (id) =>
  (await axiosInstance.delete(`/vendors/${id}`)).data;

// ─── Categories ───────────────────────────────────────────────────────────
export const getCategoriesApi = async (params = {}) =>
  (await axiosInstance.get("/expense-categories", { params })).data;

export const createCategoryApi = async (data) =>
  (await axiosInstance.post("/expense-categories", data)).data;

export const updateCategoryApi = async (id, data) =>
  (await axiosInstance.put(`/expense-categories/${id}`, data)).data;

export const deleteCategoryApi = async (id) =>
  (await axiosInstance.delete(`/expense-categories/${id}`)).data;

// ─── Expenses ─────────────────────────────────────────────────────────────
export const getExpensesApi = async (params = {}) =>
  (await axiosInstance.get("/expenses", { params })).data;

export const getExpenseByIdApi = async (id) =>
  (await axiosInstance.get(`/expenses/${id}`)).data;

export const createExpenseApi = async (data) => {
  // If data is FormData (has file), let Axios set boundary multipart/form-data
  if (data instanceof FormData) {
    return (
      await axiosInstance.post("/expenses", data, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data;
  }
  return (await axiosInstance.post("/expenses", data)).data;
};

export const decideExpenseApi = async (id, data) =>
  (await axiosInstance.put(`/expenses/${id}/decide`, data)).data;

export const payExpenseApi = async (id) =>
  (await axiosInstance.put(`/expenses/${id}/pay`)).data;

export const cancelExpenseApi = async (id, data = {}) =>
  (await axiosInstance.put(`/expenses/${id}/cancel`, data)).data;

// ─── Budget ───────────────────────────────────────────────────────────────
export const getBudgetsApi = async (params = {}) =>
  (await axiosInstance.get("/budgets", { params })).data;

export const setBudgetApi = async (data) =>
  (await axiosInstance.post("/budgets", data)).data;

export const getBudgetVsActualApi = async (academicYear) =>
  (await axiosInstance.get("/budgets/vs-actual", { params: { academicYear } })).data;

// ─── Ledger ───────────────────────────────────────────────────────────────
export const getLedgerEntriesApi = async (params = {}) =>
  (await axiosInstance.get("/ledger", { params })).data;

export const getDaybookApi = async (date) =>
  (await axiosInstance.get("/ledger/daybook", { params: { date } })).data;

export const getCashbookApi = async (params = {}) =>
  (await axiosInstance.get("/ledger/cashbook", { params })).data;

// ─── Day Close (Cash Closing) ─────────────────────────────────────────────
export const getCashClosingPreviewApi = async (date) =>
  (await axiosInstance.get("/cash-closing/preview", { params: { date } })).data;

export const closeDayApi = async (data) =>
  (await axiosInstance.post("/cash-closing", data)).data;

export const getCashClosingHistoryApi = async (params = {}) =>
  (await axiosInstance.get("/cash-closing", { params })).data;
