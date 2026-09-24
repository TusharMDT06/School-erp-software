import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { loginApi, logoutApi, getMeApi, refreshTokenApi } from "../../api/authApi";

// ─── Initial State ─────────────────────────────────────────────────────────
const initialState = {
  user: null,           // { id, name, email, role, schoolId, profileImage }
  accessToken: null,    // JWT access token (in memory only — NOT localStorage)
  isAuthenticated: false,
  isInitialized: false, // Tracks whether initial auth check has completed
  loading: false,
  error: null,
};

// ══════════════════════════════════════════════════════════════════════════
//  ASYNC THUNKS
// ══════════════════════════════════════════════════════════════════════════

/**
 * loginUser — POST /auth/login
 * Stores access token in Redux memory only (never localStorage).
 */
export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await loginApi(credentials);
      return response.data; // { user, accessToken, redirectTo }
    } catch (error) {
      const message =
        error.response?.data?.message || "Login failed. Please try again.";
      return rejectWithValue(message);
    }
  }
);

/**
 * logoutUser — POST /auth/logout
 * Clears Redux state. The axios call clears the httpOnly cookie server-side.
 */
export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      await logoutApi();
    } catch {
      // Even if the API call fails, clear local state
    }
  }
);

/**
 * fetchCurrentUser — GET /auth/me
 * Used to get the full user profile after login or app mount.
 */
export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getMeApi();
      return response.data; // Full user object
    } catch (error) {
      const message = error.response?.data?.message || "Failed to fetch user.";
      return rejectWithValue(message);
    }
  }
);

/**
 * refreshAccessToken — POST /auth/refresh-token
 * Called on app load and by the axios interceptor on 401.
 * The httpOnly cookie is sent automatically by the browser.
 */
export const refreshAccessToken = createAsyncThunk(
  "auth/refreshAccessToken",
  async (_, { rejectWithValue }) => {
    try {
      const response = await refreshTokenApi();
      return response.data; // { accessToken }
    } catch (error) {
      const message =
        error.response?.data?.message || "Session expired. Please log in.";
      return rejectWithValue(message);
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════
//  SLICE
// ══════════════════════════════════════════════════════════════════════════
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** Manually clear auth state (e.g., after interceptor-triggered logout) */
    clearAuth: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    /** Clear error message (e.g., on form re-submit) */
    clearError: (state) => {
      state.error = null;
    },
    /** Direct credential setter (e.g., student self-signup completion auto-login) */
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.isInitialized = true;
      state.error = null;
      state.loading = false;
    },
    /** Mark initial authentication check as done */
    setInitialized: (state) => {
      state.isInitialized = true;
    },
  },
  extraReducers: (builder) => {
    // ── loginUser ──────────────────────────────────────────────────────
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.isInitialized = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.isInitialized = true;
      });

    // ── logoutUser ─────────────────────────────────────────────────────
    builder
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
        state.error = null;
        state.loading = false;
      });

    // ── fetchCurrentUser ───────────────────────────────────────────────
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isInitialized = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.loading = false;
        state.isInitialized = true;
        // Don't set error here — this is a background check
      });

    // ── refreshAccessToken ─────────────────────────────────────────────
    builder
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        // Refresh failed — clear everything
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
      });
  },
});

export const { clearAuth, clearError, setCredentials, setInitialized } = authSlice.actions;
export default authSlice.reducer;
