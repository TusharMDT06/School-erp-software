import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { loginApi, logoutApi, getMeApi, refreshTokenApi } from "../../api/authApi";

// ─── Initial State ─────────────────────────────────────────────────────────
const savedUser = (() => {
  try {
    const raw = localStorage.getItem("school_erp_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

const initialState = {
  user: savedUser,      // { id, name, email, role, schoolId, profileImage }
  accessToken: null,    // JWT access token (in memory only — NOT localStorage)
  isAuthenticated: Boolean(savedUser),
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
      if (!response?.data?.accessToken) {
        return rejectWithValue("No active session.");
      }
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
      try {
        localStorage.removeItem("school_erp_session");
        localStorage.removeItem("school_erp_user");
      } catch {}
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
      try {
        localStorage.setItem("school_erp_session", "active");
        localStorage.setItem("school_erp_user", JSON.stringify(action.payload.user));
      } catch {}
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
        try {
          localStorage.setItem("school_erp_session", "active");
          localStorage.setItem("school_erp_user", JSON.stringify(action.payload.user));
        } catch {}
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.isInitialized = true;
        try {
          localStorage.removeItem("school_erp_session");
          localStorage.removeItem("school_erp_user");
        } catch {}
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
        try {
          localStorage.removeItem("school_erp_session");
          localStorage.removeItem("school_erp_user");
        } catch {}
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
        try {
          localStorage.setItem("school_erp_user", JSON.stringify(action.payload));
        } catch {}
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.loading = false;
        state.isInitialized = true;
      });

    // ── refreshAccessToken ─────────────────────────────────────────────
    builder
      .addCase(refreshAccessToken.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.isAuthenticated = true;
        state.isInitialized = true;
        try {
          localStorage.setItem("school_erp_session", "active");
        } catch {}
      })
      .addCase(refreshAccessToken.rejected, (state) => {
        // Refresh failed — clear session
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
        try {
          localStorage.removeItem("school_erp_session");
          localStorage.removeItem("school_erp_user");
        } catch {}
      });
  },
});

export const { clearAuth, clearError, setCredentials, setInitialized } = authSlice.actions;
export default authSlice.reducer;
