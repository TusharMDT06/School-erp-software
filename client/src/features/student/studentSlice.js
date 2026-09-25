import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getStudentsApi,
  createStudentApi,
  updateStudentApi,
  deleteStudentApi,
} from "../../api/studentApi";

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const fetchStudents = createAsyncThunk(
  "student/fetchStudents",
  async (params, { rejectWithValue }) => {
    try {
      const res = await getStudentsApi(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch students.");
    }
  }
);

export const createStudent = createAsyncThunk(
  "student/createStudent",
  async (data, { rejectWithValue }) => {
    try {
      const res = await createStudentApi(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create student.");
    }
  }
);

export const updateStudent = createAsyncThunk(
  "student/updateStudent",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await updateStudentApi(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update student.");
    }
  }
);

export const deleteStudent = createAsyncThunk(
  "student/deleteStudent",
  async (id, { rejectWithValue }) => {
    try {
      await deleteStudentApi(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to deactivate student.");
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const studentSlice = createSlice({
  name: "student",
  initialState: {
    students: [],
    page: 1,
    totalPages: 1,
    totalCount: 0,
    loading: false,
    error: null,
  },
  reducers: {
    clearStudentError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudents.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchStudents.fulfilled, (state, action) => {
        state.loading = false;
        state.students = action.payload.data;
        state.page = action.payload.page;
        state.totalPages = action.payload.totalPages;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchStudents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder.addCase(createStudent.fulfilled, (state, action) => {
      state.students.unshift(action.payload);
      state.totalCount += 1;
    });

    builder.addCase(updateStudent.fulfilled, (state, action) => {
      const idx = state.students.findIndex((s) => s._id === action.payload._id);
      if (idx !== -1) state.students[idx] = action.payload;
    });

    builder.addCase(deleteStudent.fulfilled, (state, action) => {
      state.students = state.students.filter((s) => s._id !== action.payload);
      state.totalCount = Math.max(0, state.totalCount - 1);
    });
  },
});

export const { clearStudentError } = studentSlice.actions;
export default studentSlice.reducer;
