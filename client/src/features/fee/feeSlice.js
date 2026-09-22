import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  createFeeStructureApi,
  getFeeStructuresByClassApi,
  getStudentFeeTransactionsApi,
  getFeeDefaultersApi,
  triggerManualReminderApi,
} from "../../api/feeApi";

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const createFeeStructure = createAsyncThunk(
  "fee/createFeeStructure",
  async (data, { rejectWithValue }) => {
    try {
      const res = await createFeeStructureApi(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create fee structure.");
    }
  }
);

export const fetchFeeStructuresByClass = createAsyncThunk(
  "fee/fetchFeeStructuresByClass",
  async (classId, { rejectWithValue }) => {
    try {
      const res = await getFeeStructuresByClassApi(classId);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load fee structures.");
    }
  }
);

export const fetchStudentFeeTransactions = createAsyncThunk(
  "fee/fetchStudentFeeTransactions",
  async (studentId, { rejectWithValue }) => {
    try {
      const res = await getStudentFeeTransactionsApi(studentId);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load student fee records.");
    }
  }
);

export const fetchFeeDefaulters = createAsyncThunk(
  "fee/fetchFeeDefaulters",
  async (params, { rejectWithValue }) => {
    try {
      const res = await getFeeDefaultersApi(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load fee defaulters.");
    }
  }
);

export const sendFeeReminderManual = createAsyncThunk(
  "fee/sendFeeReminderManual",
  async (studentId, { rejectWithValue }) => {
    try {
      const res = await triggerManualReminderApi(studentId);
      return { studentId, message: res.message };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to send fee reminder.");
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const feeSlice = createSlice({
  name: "fee",
  initialState: {
    structures: [],
    studentFees: null,
    defaulters: [],
    loading: false,
    submitting: false,
    error: null,
  },
  reducers: {
    clearFeeError: (state) => {
      state.error = null;
    },
    updateTransactionStatusLocally: (state, action) => {
      const { transactionId, status, amountPaid, receiptUrl } = action.payload;
      if (state.studentFees?.transactions) {
        const tx = state.studentFees.transactions.find((t) => t._id === transactionId);
        if (tx) {
          tx.status = status;
          tx.amountPaid = amountPaid;
          tx.receiptUrl = receiptUrl;
          tx.paidOn = new Date().toISOString();
        }
      }
    },
  },
  extraReducers: (builder) => {
    // Create Structure
    builder
      .addCase(createFeeStructure.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createFeeStructure.fulfilled, (state, action) => {
        state.submitting = false;
        if (action.payload?.feeStructure) {
          state.structures.unshift(action.payload.feeStructure);
        }
      })
      .addCase(createFeeStructure.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      });

    // Structures by Class
    builder
      .addCase(fetchFeeStructuresByClass.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeeStructuresByClass.fulfilled, (state, action) => {
        state.loading = false;
        state.structures = action.payload;
      })
      .addCase(fetchFeeStructuresByClass.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Student Fees
    builder
      .addCase(fetchStudentFeeTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudentFeeTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.studentFees = action.payload;
      })
      .addCase(fetchStudentFeeTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Defaulters
    builder
      .addCase(fetchFeeDefaulters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFeeDefaulters.fulfilled, (state, action) => {
        state.loading = false;
        state.defaulters = action.payload;
      })
      .addCase(fetchFeeDefaulters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearFeeError, updateTransactionStatusLocally } = feeSlice.actions;
export default feeSlice.reducer;
