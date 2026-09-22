import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { GraduationCap, Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { forgotPasswordApi } from "../../api/authApi";

const schema = yup.object({
  email: yup.string().email("Enter a valid email").required("Email is required"),
});

const ForgotPassword = () => {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(schema) });

  const onSubmit = async ({ email }) => {
    setIsLoading(true);
    try {
      await forgotPasswordApi(email);
      setSubmitted(true);
    } catch (error) {
      const message =
        error.response?.data?.message || "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1F4E79] via-[#2563a8] to-[#1a3d5c] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg shadow-black/20 mb-4">
            <GraduationCap className="w-9 h-9 text-[#1F4E79]" />
          </div>
          <h1 className="text-2xl font-bold text-white">School ERP</h1>
        </div>

        <div className="auth-card">
          {!submitted ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-800">Reset your password</h2>
                <p className="text-slate-500 text-sm mt-1">
                  Enter your registered email. We'll send a reset link if the account exists.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
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
                    <p className="mt-1.5 text-xs text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <button type="submit" disabled={isLoading} className="btn-primary">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-50 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Check your inbox</h3>
              <p className="text-slate-500 text-sm">
                If an account with that email exists, we've sent a password reset link. It expires in 1 hour.
              </p>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm text-[#1F4E79] hover:text-[#163d60] font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
