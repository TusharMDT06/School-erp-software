import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { refreshAccessToken, fetchCurrentUser, setInitialized } from "./features/auth/authSlice";
import AppRoutes from "./routes/AppRoutes";

/**
 * App
 * ────
 * On mount, attempts a silent token refresh using the httpOnly cookie.
 * If successful, also fetches the full user profile.
 * This restores the session after a page refresh without requiring re-login.
 */
const App = () => {
  const dispatch = useDispatch();
  const { accessToken } = useSelector((state) => state.auth);

  useEffect(() => {
    const silentRefresh = async () => {
      try {
        const result = await dispatch(refreshAccessToken());
        if (refreshAccessToken.fulfilled.match(result)) {
          // Token refreshed — now get the full user profile
          await dispatch(fetchCurrentUser());
        }
      } finally {
        dispatch(setInitialized());
      }
    };
    silentRefresh();
  }, [dispatch]); // Run only on mount

  return (
    <BrowserRouter>
      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
            borderRadius: "12px",
            padding: "12px 16px",
          },
          success: {
            iconTheme: { primary: "#1F4E79", secondary: "#fff" },
          },
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  );
};

export default App;
