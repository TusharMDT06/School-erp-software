import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import toast from "react-hot-toast";
import { Eye, EyeOff, GraduationCap, Loader2, Mail, Lock } from "lucide-react";
import { useState } from "react";
import { loginUser, clearError } from "../../features/auth/authSlice";

// ── Validation schema ──────────────────────────────────────────────────────
const schema = yup.object({
  email: yup.string().email("Enter a valid email").required("Email is required"),
  password: yup.string().min(6, "Minimum 6 characters").required("Password is required"),
});

// ── Role → Dashboard mapping ───────────────────────────────────────────────
const ROLE_REDIRECT = {
  superadmin: "/admin/dashboard",
  admin: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
  parent: "/parent/dashboard",
  accountant: "/accountant/dashboard",
};

// ── Demo Accounts for Recruiter ────────────────────────────────────────────
const DEMO_ACCOUNTS = [
  { label: "Admin", role: "superadmin", email: "demo@school.edu", password: "Password@123" },
  { label: "Principal", role: "admin", email: "principal@school.edu", password: "Admin@123" },
  { label: "Teacher", role: "teacher", email: "vikram.maths@school.edu", password: "Password@123" },
  { label: "Student", role: "student", email: "aarav.student@school.edu", password: "Password@123" },
  { label: "Parent", role: "parent", email: "parent@school.edu", password: "Password@123" },
  { label: "Accountant", role: "accountant", email: "accountant@school.edu", password: "Password@123" },
];

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated, user } = useSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(ROLE_REDIRECT[user.role] || "/admin/dashboard", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Show toast on Redux error
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async (data) => {
    const result = await dispatch(loginUser(data));
    if (loginUser.fulfilled.match(result)) {
      const role = result.payload.user?.role;
      toast.success("Welcome back!");
      navigate(ROLE_REDIRECT[role] || "/admin/dashboard", { replace: true });
    }
  };

  const handleQuickLogin = (acc) => {
    setValue("email", acc.email, { shouldValidate: true });
    setValue("password", acc.password, { shouldValidate: true });
    toast.success(`Signing in as ${acc.label}...`);
    onSubmit({ email: acc.email, password: acc.password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1F4E79] via-[#2563a8] to-[#1a3d5c] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg shadow-black/20 mb-4">
            <GraduationCap className="w-9 h-9 text-[#1F4E79]" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">School ERP</h1>
          <p className="text-blue-200 text-sm mt-1">Unified School Management Platform</p>
        </div>

        {/* Auth Card */}
        <div className="auth-card">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-slate-800">Sign in to your account</h2>
            <p className="text-slate-500 text-sm mt-1">Enter your credentials to access the dashboard</p>
          </div>

          {/* Quick Demo Access for Recruiters & Reviewers */}
          <div className="mb-5 p-3 bg-gradient-to-br from-slate-50 to-blue-50/60 border border-blue-100 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-[#1F4E79]">
                Recruiter Quick Demo Access
              </span>
              <span className="text-[10px] text-blue-700 bg-blue-100/80 font-semibold px-2 py-0.5 rounded-full">
                1-Click Login
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Reviewing this project? Click any role to log in instantly:
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickLogin(acc)}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-blue-50/80 text-slate-700 hover:text-[#1F4E79] border border-slate-200 hover:border-blue-300 rounded-lg shadow-xs transition-all flex items-center justify-center text-center active:scale-95 disabled:opacity-50"
                  title={`Login as ${acc.label} (${acc.email})`}
                >
                  <span className="text-[12px] truncate">{acc.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex py-1 items-center mb-4">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-2 text-[11px] font-medium text-slate-400 uppercase tracking-wider">or sign in with email</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@school.edu"
                  {...register("email")}
                  className={`form-input pl-10 ${errors.email ? "form-input-error" : ""}`}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <a
                  href="/forgot-password"
                  className="text-xs text-[#1F4E79] hover:text-[#163d60] font-medium transition-colors"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password")}
                  className={`form-input pl-10 pr-10 ${errors.password ? "form-input-error" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer & Self-Signup Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-2">
            <p className="text-xs text-slate-600">
              New student?{" "}
              <Link
                to="/student-signup"
                className="text-[#1F4E79] font-semibold hover:underline"
              >
                Create your account
              </Link>
            </p>
            <p className="text-center text-xs text-slate-400 mt-0.5">
              Teachers & staff: Contact your administrator for access.
            </p>
          </div>
        </div>

        {/* Bottom branding */}
        <p className="text-center text-blue-200/60 text-xs mt-6">
          © {new Date().getFullYear()} School ERP. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
