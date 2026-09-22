import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  createExamApi,
  getExamsByClassApi,
  getExamByIdApi,
  updateExamApi,
  deleteExamApi,
} from "../../api/examApi";
import {
  bulkEntryResultsApi,
  getResultsByExamApi,
  generateAiRemarksApi,
  publishResultsApi,
  getStudentResultsApi,
  getClassExamAnalyticsApi,
} from "../../api/resultApi";

// ─── Async Thunks ────────────────────────────────────────────────────────────

export const fetchExamsByClass = createAsyncThunk(
  "exam/fetchExamsByClass",
  async (classId, { rejectWithValue }) => {
    try {
      const res = await getExamsByClassApi(classId);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load exams.");
    }
  }
);

export const createExam = createAsyncThunk(
  "exam/createExam",
  async (data, { rejectWithValue }) => {
    try {
      const res = await createExamApi(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to create exam.");
    }
  }
);

export const updateExam = createAsyncThunk(
  "exam/updateExam",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await updateExamApi(id, data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update exam.");
    }
  }
);

export const deleteExam = createAsyncThunk(
  "exam/deleteExam",
  async (id, { rejectWithValue }) => {
    try {
      await deleteExamApi(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to delete exam.");
    }
  }
);

export const fetchResultsByExam = createAsyncThunk(
  "exam/fetchResultsByExam",
  async (examId, { rejectWithValue }) => {
    try {
      const res = await getResultsByExamApi(examId);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load exam marks.");
    }
  }
);

export const saveBulkMarks = createAsyncThunk(
  "exam/saveBulkMarks",
  async (data, { rejectWithValue }) => {
    try {
      const res = await bulkEntryResultsApi(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to record student marks.");
    }
  }
);

export const generateAiRemarks = createAsyncThunk(
  "exam/generateAiRemarks",
  async (examId, { rejectWithValue }) => {
    try {
      const res = await generateAiRemarksApi(examId);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to generate AI remarks.");
    }
  }
);

export const publishExamResults = createAsyncThunk(
  "exam/publishExamResults",
  async (examId, { rejectWithValue }) => {
    try {
      const res = await publishResultsApi(examId);
      return { examId, ...res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to publish exam results.");
    }
  }
);

export const fetchStudentResults = createAsyncThunk(
  "exam/fetchStudentResults",
  async (studentId, { rejectWithValue }) => {
    try {
      const res = await getStudentResultsApi(studentId);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load student results.");
    }
  }
);

export const fetchExamAnalytics = createAsyncThunk(
  "exam/fetchExamAnalytics",
  async ({ classId, examId }, { rejectWithValue }) => {
    try {
      const res = await getClassExamAnalyticsApi(classId, examId);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to load exam analytics.");
    }
  }
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const examSlice = createSlice({
  name: "exam",
  initialState: {
    exams: [],
    currentExam: null,
    examResults: [],
    studentResults: null,
    analytics: null,
    loading: false,
    submitting: false,
    generatingRemarks: false,
    publishing: false,
    error: null,
  },
  reducers: {
    clearExamError: (state) => {
      state.error = null;
    },
    setCurrentExam: (state, action) => {
      state.currentExam = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Exams by Class
    builder
      .addCase(fetchExamsByClass.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExamsByClass.fulfilled, (state, action) => {
        state.loading = false;
        state.exams = action.payload;
      })
      .addCase(fetchExamsByClass.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create Exam
    builder
      .addCase(createExam.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createExam.fulfilled, (state, action) => {
        state.submitting = false;
        state.exams.unshift(action.payload);
      })
      .addCase(createExam.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      });

    // Update Exam
    builder
      .addCase(updateExam.fulfilled, (state, action) => {
        const idx = state.exams.findIndex((e) => e._id === action.payload._id);
        if (idx !== -1) state.exams[idx] = action.payload;
      });

    // Delete Exam
    builder
      .addCase(deleteExam.fulfilled, (state, action) => {
        state.exams = state.exams.filter((e) => e._id !== action.payload);
      });

    // Results by Exam
    builder
      .addCase(fetchResultsByExam.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResultsByExam.fulfilled, (state, action) => {
        state.loading = false;
        state.examResults = action.payload;
      })
      .addCase(fetchResultsByExam.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Save Bulk Marks
    builder
      .addCase(saveBulkMarks.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(saveBulkMarks.fulfilled, (state) => {
        state.submitting = false;
      })
      .addCase(saveBulkMarks.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      });

    // Generate AI Remarks
    builder
      .addCase(generateAiRemarks.pending, (state) => {
        state.generatingRemarks = true;
        state.error = null;
      })
      .addCase(generateAiRemarks.fulfilled, (state) => {
        state.generatingRemarks = false;
      })
      .addCase(generateAiRemarks.rejected, (state, action) => {
        state.generatingRemarks = false;
        state.error = action.payload;
      });

    // Publish Results
    builder
      .addCase(publishExamResults.pending, (state) => {
        state.publishing = true;
        state.error = null;
      })
      .addCase(publishExamResults.fulfilled, (state, action) => {
        state.publishing = false;
        const exam = state.exams.find((e) => e._id === action.payload.examId);
        if (exam) exam.resultPublished = true;
      })
      .addCase(publishExamResults.rejected, (state, action) => {
        state.publishing = false;
        state.error = action.payload;
      });

    // Student Results
    builder
      .addCase(fetchStudentResults.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudentResults.fulfilled, (state, action) => {
        state.loading = false;
        state.studentResults = action.payload;
      })
      .addCase(fetchStudentResults.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Exam Analytics
    builder
      .addCase(fetchExamAnalytics.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExamAnalytics.fulfilled, (state, action) => {
        state.loading = false;
        state.analytics = action.payload;
      })
      .addCase(fetchExamAnalytics.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearExamError, setCurrentExam } = examSlice.actions;
export default examSlice.reducer;
