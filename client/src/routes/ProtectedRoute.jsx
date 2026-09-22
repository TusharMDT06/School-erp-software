import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";

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
 *   1. Not authenticated   → redirect to /login
 *   2. Wrong role          → redirect to /unauthorized
 *   3. Authenticated + correct role → render <Outlet /> (children)
 */
const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

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
