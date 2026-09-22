import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getTeachersApi,
  createTeacherApi,
  updateTeacherApi,
  deleteTeacherApi,
} from "../../api/teacherApi";

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const fetchTeachers = createAsyncThunk(
  "teacher/fetchTeachers",
  async (params, { rejectWithValue }) => {
    try {
      const res = await getTeachersApi(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch teachers.");
    }
  }
);

export const createTeacher = createAsyncThunk(
  "teacher/createTeacher",
  async (data, { rejectWithValue }) => {
    try {
      const res = await createTeacherApi(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create teacher.");
    }
  }
);

export const updateTeacher = createAsyncThunk(
  "teacher/updateTeacher",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await updateTeacherApi(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update teacher.");
    }
  }
);

export const deleteTeacher = createAsyncThunk(
  "teacher/deleteTeacher",
  async (id, { rejectWithValue }) => {
    try {
      await deleteTeacherApi(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to deactivate teacher.");
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const teacherSlice = createSlice({
  name: "teacher",
  initialState: {
    teachers: [],
    page: 1,
    totalPages: 1,
    totalCount: 0,
    loading: false,
    error: null,
  },
  reducers: {
    clearTeacherError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeachers.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTeachers.fulfilled, (state, action) => {
        state.loading = false;
        state.teachers = action.payload.data;
        state.page = action.payload.page;
        state.totalPages = action.payload.totalPages;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchTeachers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder.addCase(createTeacher.fulfilled, (state, action) => {
      state.teachers.unshift(action.payload);
      state.totalCount += 1;
    });

    builder.addCase(updateTeacher.fulfilled, (state, action) => {
      const idx = state.teachers.findIndex((t) => t._id === action.payload._id);
      if (idx !== -1) state.teachers[idx] = action.payload;
    });

    builder.addCase(deleteTeacher.fulfilled, (state, action) => {
      state.teachers = state.teachers.filter((t) => t._id !== action.payload);
      state.totalCount = Math.max(0, state.totalCount - 1);
    });
  },
});

export const { clearTeacherError } = teacherSlice.actions;
export default teacherSlice.reducer;
