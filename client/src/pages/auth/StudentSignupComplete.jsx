import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { GraduationCap, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { completeStudentSignupApi } from "../../api/authApi";
import { setCredentials } from "../../features/auth/authSlice";

// ── Validation Schema ───────────────────────────────────────────────────────
const schema = yup.object({
  email: yup
    .string()
    .email("Enter a valid email address")
    .required("Email is required"),
  password: yup
    .string()
    .min(8, "Password must be at least 8 characters")
    .matches(/\d/, "Password must contain at least one number")
    .required("Password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), null], "Passwords must match")
    .required("Please confirm your password"),
});

const StudentSignupComplete = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const signupToken = location.state?.signupToken;
  const studentName = location.state?.studentName || "Student";

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Guard: redirect back to step 1 if accessed directly or without token
  useEffect(() => {
    if (!signupToken) {
      toast.error("Please verify your admission details first.");
      navigate("/student-signup", { replace: true });
    }
  }, [signupToken, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await completeStudentSignupApi({
        signupToken,
        email: data.email.trim().toLowerCase(),
        password: data.password,
      });

      if (res?.data) {
        const { user, accessToken, redirectTo } = res.data;
        // Auto-login into Redux state
        dispatch(setCredentials({ user, accessToken }));
        toast.success(`Account activated! Welcome to School ERP, ${user.name}!`);
        navigate(redirectTo || "/student/dashboard", { replace: true });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Failed to complete account activation. Please try again or start over.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!signupToken) {
    return null;
  }

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
          <h1 className="text-2xl font-bold text-white tracking-tight">Student Self-Signup</h1>
          <p className="text-blue-200 text-sm mt-1">Step 2 of 2: Set Credentials</p>
        </div>

        {/* Card */}
        <div className="auth-card">
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" /> Admission Verified
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              Welcome, {studentName}!
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Choose your login email and set a strong password to finish activating your account.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Your Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  placeholder="student@example.com"
                  {...register("email")}
                  className={`form-input pl-10 ${errors.email ? "form-input-error" : ""}`}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Create Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters, at least 1 number"
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

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  {...register("confirmPassword")}
                  className={`form-input pl-10 pr-10 ${
                    errors.confirmPassword ? "form-input-error" : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="student-complete-btn"
              type="submit"
              disabled={loading}
              className="btn-primary mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Activating Account & Logging In...
                </>
              ) : (
                "Complete Signup & Launch Dashboard"
              )}
            </button>
          </form>

          {/* Start over link */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <Link
              to="/student-signup"
              className="text-xs text-slate-500 hover:text-[#1F4E79] transition-colors"
            >
              ← Back to verification step
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-blue-200/60 text-xs mt-6">
          © {new Date().getFullYear()} School ERP. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default StudentSignupComplete;
