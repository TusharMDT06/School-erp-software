import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getClassesApi,
  createClassApi,
  updateClassApi,
  deleteClassApi,
} from "../../api/classApi";

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const fetchClasses = createAsyncThunk(
  "class/fetchClasses",
  async (params, { rejectWithValue }) => {
    try {
      const res = await getClassesApi(params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to fetch classes.");
    }
  }
);

export const createClass = createAsyncThunk(
  "class/createClass",
  async (data, { rejectWithValue }) => {
    try {
      const res = await createClassApi(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create class.");
    }
  }
);

export const updateClass = createAsyncThunk(
  "class/updateClass",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await updateClassApi(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update class.");
    }
  }
);

export const deleteClass = createAsyncThunk(
  "class/deleteClass",
  async (id, { rejectWithValue }) => {
    try {
      await deleteClassApi(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete class.");
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const classSlice = createSlice({
  name: "class",
  initialState: {
    classes: [],
    page: 1,
    totalPages: 1,
    totalCount: 0,
    loading: false,
    error: null,
  },
  reducers: {
    clearClassError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    // Fetch
    builder
      .addCase(fetchClasses.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchClasses.fulfilled, (state, action) => {
        state.loading = false;
        state.classes = action.payload.data;
        state.page = action.payload.page;
        state.totalPages = action.payload.totalPages;
        state.totalCount = action.payload.totalCount;
      })
      .addCase(fetchClasses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create
    builder
      .addCase(createClass.fulfilled, (state, action) => {
        state.classes.unshift(action.payload);
        state.totalCount += 1;
      });

    // Update
    builder
      .addCase(updateClass.fulfilled, (state, action) => {
        const idx = state.classes.findIndex((c) => c._id === action.payload._id);
        if (idx !== -1) state.classes[idx] = action.payload;
      });

    // Delete
    builder
      .addCase(deleteClass.fulfilled, (state, action) => {
        state.classes = state.classes.filter((c) => c._id !== action.payload);
        state.totalCount -= 1;
      });
  },
});

export const { clearClassError } = classSlice.actions;
export default classSlice.reducer;
