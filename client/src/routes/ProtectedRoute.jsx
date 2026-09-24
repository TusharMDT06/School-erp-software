import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";

/**
 * ProtectedRoute
 * ──────────────
 * Wraps role-gated sections of the app.
 *
 * Props:
 *   allowedRoles {string[]} - Array of roles that can access this route.
 *                             Pass [] or omit to allow any authenticated user.
 *
 * Behaviour:
 *   0. Initial checking    → render clean loading spinner
 *   1. Not authenticated   → redirect to /login
 *   2. Wrong role          → redirect to /unauthorized
 *   3. Authenticated + correct role → render <Outlet /> (children)
 */
const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { isAuthenticated, user, isInitialized } = useSelector((state) => state.auth);

  // ── 0. Initial checking ─────────────────────────────────────────────
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#1F4E79] animate-spin" />
          <p className="text-sm font-medium text-slate-500">Authenticating session...</p>
        </div>
      </div>
    );
  }

  // ── 1. Not authenticated ────────────────────────────────────────────
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // ── 2. Role check (skip if no roles specified) ──────────────────────
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // ── 3. Authorized — render nested routes ───────────────────────────
  return <Outlet />;
};

export default ProtectedRoute;
