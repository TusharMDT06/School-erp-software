import axios from "axios";
import { store } from "../app/store";
import { refreshAccessToken, logoutUser } from "../features/auth/authSlice";

/**
 * Axios instance pre-configured with:
 *  - Base URL from .env (VITE_API_URL)
 *  - withCredentials: true → sends the httpOnly refreshToken cookie
 *  - Request interceptor: attaches accessToken as Bearer header
 *  - Response interceptor: on 401, silently refreshes token and retries once
 */
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  withCredentials: true, // Required for httpOnly cookie-based refresh tokens
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request Interceptor ────────────────────────────────────────────────────
// Attach the current access token from Redux store to every outgoing request
axiosInstance.interceptors.request.use(
  (config) => {
    const state = store.getState();
    const accessToken = state.auth.accessToken;
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor ───────────────────────────────────────────────────
// On 401 (expired access token):
//   1. Attempt a silent refresh via the /refresh-token endpoint (cookie sent automatically)
//   2. If successful, update Redux state and retry the original request
//   3. If refresh fails, dispatch logout and redirect to /login
let isRefreshing = false;
let failedQueue = []; // Queue of requests waiting for token refresh

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loop on refresh-token endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/refresh-token")
    ) {
      if (isRefreshing) {
        // Queue this request until the ongoing refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt silent token refresh
        const result = await store.dispatch(refreshAccessToken());

        if (refreshAccessToken.fulfilled.match(result)) {
          const newToken = result.payload.accessToken;
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        } else {
          // Refresh failed — logout user
          processQueue(new Error("Token refresh failed"), null);
          store.dispatch(logoutUser());
          window.location.href = "/login";
          return Promise.reject(error);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        store.dispatch(logoutUser());
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
