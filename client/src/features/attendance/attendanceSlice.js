import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  markAttendanceApi,
  getClassAttendanceByDateApi,
  getClassAttendanceSummaryApi,
  getStudentAttendanceReportApi,
} from "../../api/attendanceApi";

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const markAttendance = createAsyncThunk(
  "attendance/markAttendance",
  async (data, { rejectWithValue }) => {
    try {
      const res = await markAttendanceApi(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to save attendance.");
    }
  }
);

export const fetchClassAttendanceByDate = createAsyncThunk(
  "attendance/fetchClassAttendanceByDate",
  async ({ classId, date }, { rejectWithValue }) => {
    try {
      const res = await getClassAttendanceByDateApi(classId, date);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load class attendance.");
    }
  }
);

export const fetchClassAttendanceSummary = createAsyncThunk(
  "attendance/fetchClassAttendanceSummary",
  async ({ classId, params }, { rejectWithValue }) => {
    try {
      const res = await getClassAttendanceSummaryApi(classId, params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load attendance summary.");
    }
  }
);

export const fetchStudentAttendanceReport = createAsyncThunk(
  "attendance/fetchStudentAttendanceReport",
  async ({ studentId, params }, { rejectWithValue }) => {
    try {
      const res = await getStudentAttendanceReportApi(studentId, params);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load student report.");
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const attendanceSlice = createSlice({
  name: "attendance",
  initialState: {
    dailyRecords: [],
    classSummary: null,
    studentReport: null,
    loading: false,
    marking: false,
    error: null,
  },
  reducers: {
    clearAttendanceError: (state) => {
      state.error = null;
    },
    clearDailyRecords: (state) => {
      state.dailyRecords = [];
    },
  },
  extraReducers: (builder) => {
    // Mark Attendance
    builder
      .addCase(markAttendance.pending, (state) => {
        state.marking = true;
        state.error = null;
      })
      .addCase(markAttendance.fulfilled, (state) => {
        state.marking = false;
      })
      .addCase(markAttendance.rejected, (state, action) => {
        state.marking = false;
        state.error = action.payload;
      });

    // Class Attendance by Date
    builder
      .addCase(fetchClassAttendanceByDate.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClassAttendanceByDate.fulfilled, (state, action) => {
        state.loading = false;
        state.dailyRecords = action.payload;
      })
      .addCase(fetchClassAttendanceByDate.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Class Attendance Summary (Admin Report)
    builder
      .addCase(fetchClassAttendanceSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClassAttendanceSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.classSummary = action.payload;
      })
      .addCase(fetchClassAttendanceSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Student Attendance Report
    builder
      .addCase(fetchStudentAttendanceReport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudentAttendanceReport.fulfilled, (state, action) => {
        state.loading = false;
        state.studentReport = action.payload;
      })
      .addCase(fetchStudentAttendanceReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearAttendanceError, clearDailyRecords } = attendanceSlice.actions;
export default attendanceSlice.reducer;
