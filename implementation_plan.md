# School ERP — Phase 1: Authentication & Role Management

## Overview

Full-stack MERN implementation of the Authentication & RBAC module for a School ERP system. This covers all backend API endpoints, Mongoose models, JWT-based auth with refresh tokens, and a complete React + Redux frontend.

## Proposed Changes

---

### Backend (`server/`)

#### [NEW] `server/.env`
Environment variables: `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`, `CLIENT_URL`, `SMTP_*` credentials.

#### [NEW] `server/server.js`
Entry point — connects to MongoDB and starts Express app.

#### [NEW] `server/src/app.js`
Express app setup — helmet, cors (with credentials), cookie-parser, rate limiters applied to `/login` and `/forgot-password`, body parser, routes mounting, error handler.

#### [NEW] `server/src/config/db.js`
Mongoose connect helper with retry logic.

#### [NEW] `server/src/models/User.model.js`
Full schema as specified: name, email, password (hashed), role enum, schoolId ref, phone, profileImage, isActive, refreshToken, reset token fields, timestamps. Pre-save hook for bcrypt hashing.

#### [NEW] `server/src/models/School.model.js`
School schema: name, address, contactEmail, contactPhone, logoUrl, isActive, timestamps.

#### [NEW] `server/src/utils/generateToken.js`
- `generateAccessToken(payload)` → 15m JWT
- `generateRefreshToken(payload)` → 7d JWT

#### [NEW] `server/src/utils/sendEmail.js`
Nodemailer setup with mock/SMTP transporter. `sendEmail({ to, subject, html })`.

#### [NEW] `server/src/utils/apiResponse.js`
Helper classes: `ApiResponse(statusCode, data, message)` and `ApiError(statusCode, message, errors)`.

#### [NEW] `server/src/middlewares/auth.middleware.js`
Bearer token extraction → JWT verify → attach `req.user = { id, role, schoolId }` → 401 on failure.

#### [NEW] `server/src/middlewares/role.middleware.js`
`authorizeRoles(...roles)` factory → 403 if `req.user.role` not in allowed roles.

#### [NEW] `server/src/middlewares/error.middleware.js`
Global error handler: maps ApiError / Mongoose errors to `{ success: false, message, errors? }` JSON.

#### [NEW] `server/src/controllers/auth.controller.js`
All 7 controllers: `register`, `login`, `refreshToken`, `logout`, `forgotPassword`, `resetPassword`, `getMe`. Full Zod validation inline before controller logic.

#### [NEW] `server/src/routes/auth.routes.js`
Route definitions with middleware chain applied per endpoint.

---

### Frontend (`client/`)

Bootstrapped with `npm create vite@latest` (React + JS template), then Tailwind CSS configured.

#### [NEW] `client/src/api/axiosInstance.js`
Axios instance with base URL, request interceptor to attach `accessToken`, response interceptor for 401 → silent refresh → retry → logout fallback.

#### [NEW] `client/src/api/authApi.js`
Functions wrapping axios calls: `loginApi`, `logoutApi`, `getMeApi`, `refreshTokenApi`, `forgotPasswordApi`, `resetPasswordApi`.

#### [NEW] `client/src/features/auth/authSlice.js`
RTK slice with state `{ user, accessToken, isAuthenticated, loading, error }`.
Async thunks: `loginUser`, `logoutUser`, `fetchCurrentUser`, `refreshAccessToken`.

#### [NEW] `client/src/routes/ProtectedRoute.jsx`
Checks `isAuthenticated` + `allowedRoles` prop; redirects to `/login` or `/unauthorized`.

#### [NEW] `client/src/routes/AppRoutes.jsx`
React Router v6 routes: public (`/login`, `/forgot-password`, `/reset-password/:token`) and role-gated dashboard placeholders wrapped with `ProtectedRoute`.

#### [NEW] `client/src/pages/auth/Login.jsx`
Centered card UI, primary `#1F4E79`, React Hook Form + Yup, `react-hot-toast` errors, role-based redirect on success.

#### [NEW] `client/src/pages/auth/ForgotPassword.jsx`
Email form → calls forgot-password API → success message shown.

#### [NEW] `client/src/pages/auth/ResetPassword.jsx`
New password + confirm form → calls reset-password API with `:token` param.

#### [NEW] `client/src/components/layout/DashboardLayout.jsx`
Sidebar layout shell with logout button, user info display, `<Outlet />` for nested routes.

#### [NEW] `client/src/pages/Unauthorized.jsx`
403 page component.

#### [NEW] `client/src/main.jsx` + `client/src/App.jsx`
Redux `<Provider>` wrapping, `<Toaster />`, `AppRoutes`, silent refresh on app mount.

#### [NEW] `client/tailwind.config.js` + `client/src/index.css`
Tailwind setup with custom primary color `#1F4E79`.

---

## Verification Plan

### Automated
- `npm install` in both `server/` and `client/` should complete without errors.
- `npm run dev` in `client/` should serve Vite dev server.
- `node server.js` in `server/` should connect to MongoDB and start.

### Manual
- POST `/api/auth/login` with valid credentials returns `accessToken` + sets `refreshToken` cookie.
- GET `/api/auth/me` with valid Bearer token returns user profile.
- Visiting `/login` in browser shows styled login card.
- Submitting login form redirects based on role.
- Visiting a protected route without auth redirects to `/login`.

## Open Questions

> [!IMPORTANT]
> **MongoDB URI**: The `.env` will be pre-filled with `mongodb://localhost:27017/school_erp`. Update it with your Atlas connection string if needed.

> [!NOTE]
> **Email (SMTP)**: `sendEmail.js` will use a Nodemailer **Ethereal** mock transporter by default (no real emails sent). You can swap in real SMTP credentials via `.env` vars (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`) when ready.

> [!NOTE]
> **Dashboard pages**: Phase 1 only scaffolds dashboard route shells (`/admin/dashboard`, `/teacher/dashboard`, etc.) — actual dashboard content is Phase 2+.
