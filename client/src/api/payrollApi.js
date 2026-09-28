import axiosInstance from "./axiosInstance";

// ─── Salary Structures ───────────────────────────────────────────────────────
export const getSalaryStructuresApi = async (params = {}) =>
  (await axiosInstance.get("/salary-structures", { params })).data;

export const getEligibleStaffUsersApi = async () =>
  (await axiosInstance.get("/salary-structures/staff-users")).data;

export const getSalaryStructureByIdApi = async (id) =>
  (await axiosInstance.get(`/salary-structures/${id}`)).data;

export const createSalaryStructureApi = async (data) =>
  (await axiosInstance.post("/salary-structures", data)).data;

export const updateSalaryStructureApi = async (id, data) =>
  (await axiosInstance.put(`/salary-structures/${id}`, data)).data;

export const deactivateSalaryStructureApi = async (id) =>
  (await axiosInstance.delete(`/salary-structures/${id}`)).data;

// ─── Payroll Runs & Payslips ─────────────────────────────────────────────────
export const createPayrollRunApi = async (data) =>
  (await axiosInstance.post("/payroll/runs", data)).data;

export const getPayrollRunsApi = async () =>
  (await axiosInstance.get("/payroll/runs")).data;

export const getPayrollRunByIdApi = async (id) =>
  (await axiosInstance.get(`/payroll/runs/${id}`)).data;

export const updatePayslipApi = async (id, data) =>
  (await axiosInstance.put(`/payroll/payslips/${id}`, data)).data;

export const approvePayrollRunApi = async (id) =>
  (await axiosInstance.put(`/payroll/runs/${id}/approve`)).data;

export const payPayrollRunApi = async (id, data) =>
  (await axiosInstance.put(`/payroll/runs/${id}/pay`, data)).data;

export const exportPayrollRunApi = async (id, format = "excel") => {
  const response = await axiosInstance.get(`/payroll/runs/${id}/export`, {
    params: { format },
    responseType: "blob",
  });
  return response;
};

// ─── Staff Self-Service ──────────────────────────────────────────────────────
export const getMyPayslipsApi = async () =>
  (await axiosInstance.get("/payroll/my-payslips")).data;

export const getPayslipPdfBlobApi = async (id) => {
  const response = await axiosInstance.get(`/payroll/payslips/${id}/pdf`, {
    responseType: "blob",
  });
  return response;
};
