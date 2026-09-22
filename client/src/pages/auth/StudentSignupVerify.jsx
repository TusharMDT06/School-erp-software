import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { GraduationCap, Calendar, Hash, ArrowRight, Loader2 } from "lucide-react";
import { verifyStudentSignupApi } from "../../api/authApi";

// ── Validation Schema ───────────────────────────────────────────────────────
const schema = yup.object({
  admissionNumber: yup
    .string()
    .trim()
    .required("Admission number is required"),
  dob: yup
    .string()
    .required("Date of birth is required"),
});

const StudentSignupVerify = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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
      const res = await verifyStudentSignupApi({
        admissionNumber: data.admissionNumber.trim().toUpperCase(),
        dob: data.dob,
      });

      if (res?.data?.signupToken) {
        toast.success(`Welcome, ${res.data.studentName}! Please set up your password.`);
        // Pass signupToken in router state (in memory only, NOT in localStorage)
        navigate("/student-signup/complete", {
          state: {
            signupToken: res.data.signupToken,
            studentName: res.data.studentName,
          },
          replace: true,
        });
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Invalid admission number or date of birth. Please check your credentials.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
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
          <h1 className="text-2xl font-bold text-white tracking-tight">Student Self-Signup</h1>
          <p className="text-blue-200 text-sm mt-1">Step 1 of 2: Verify Admission Details</p>
        </div>

        {/* Card */}
        <div className="auth-card">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">Activate Your Account</h2>
            <p className="text-slate-500 text-sm mt-1">
              Enter your official Admission Number and Date of Birth to verify your identity.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Admission Number */}
            <div>
              <label htmlFor="admissionNumber" className="block text-sm font-medium text-slate-700 mb-1.5">
                Admission Number
              </label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="admissionNumber"
                  type="text"
                  placeholder="e.g. ADM-2026-001"
                  {...register("admissionNumber")}
                  className={`form-input pl-10 uppercase ${
                    errors.admissionNumber ? "form-input-error" : ""
                  }`}
                />
              </div>
              {errors.admissionNumber && (
                <p className="mt-1.5 text-xs text-red-500">{errors.admissionNumber.message}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <label htmlFor="dob" className="block text-sm font-medium text-slate-700 mb-1.5">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="dob"
                  type="date"
                  {...register("dob")}
                  className={`form-input pl-10 ${errors.dob ? "form-input-error" : ""}`}
                />
              </div>
              {errors.dob && (
                <p className="mt-1.5 text-xs text-red-500">{errors.dob.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              id="student-verify-btn"
              type="submit"
              disabled={loading}
              className="btn-primary mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify & Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-2">
            <p className="text-xs text-slate-500">
              Already have an activated account?{" "}
              <Link to="/login" className="text-[#1F4E79] font-medium hover:underline">
                Sign In
              </Link>
            </p>
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

export default StudentSignupVerify;
