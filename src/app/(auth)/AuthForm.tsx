"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  User,
  Building2,
  Phone,
  KeyRound,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui";
import {
  loginWithPasswordAction,
  requestLoginOtpAction,
  initiateSignupAction,
  completeSignupWithPasswordAction,
  verifyLoginOtpAction,
  resendVerificationCodeAction,
  requestPasswordResetOtpAction,
  resetPasswordWithOtpAction,
} from "@/app/actions";

interface OtpAuthViewProps {
  initialMode?: "sign-in" | "sign-up";
  initialError?: string;
  onError?: (err: string) => void;
}

type AuthStep = "credentials" | "verify-otp";

const NEON_AUTH_URL =
  process.env.NEXT_PUBLIC_NEON_AUTH_URL ||
  "https://ep-wild-snow-azyh1uu4.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth";

export function OtpAuthView({ initialMode = "sign-in", initialError, onError }: OtpAuthViewProps) {
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const targetRedirect =
    rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("/login")
      ? rawRedirect
      : "/dashboard";

  const [mode, setMode] = useState<"sign-in" | "sign-up" | "forgot-password">(initialMode);
  const [step, setStep] = useState<AuthStep>("credentials");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [success, setSuccess] = useState<string | null>(null);

  // Timer for OTP resend (60s countdown)
  const [resendCooldown, setResendCooldown] = useState(0);

  const startResendTimer = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Google OAuth Handler (Direct Neon Auth OAuth Flow)
  const handleGoogleSignIn = () => {
    try {
      setGoogleLoading(true);
      setError(null);
      const callbackURL = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(targetRedirect)}`;
      const googleAuthEndpoint = `/api/auth/oauth/google?redirect_uri=${encodeURIComponent(callbackURL)}`;
      window.location.href = googleAuthEndpoint;
    } catch (err: any) {
      setGoogleLoading(false);
      const msg = err?.message || "Could not initialize Google Authentication.";
      setError(msg);
      onError?.(msg);
    }
  };

  // Handle Login Form Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const emailInput = (document.getElementById("login-email-input") as HTMLInputElement)?.value;
      const passInput = (document.getElementById("login-password-input") as HTMLInputElement)?.value;
      const targetEmail = (emailInput || email).trim();
      const targetPassword = passInput || password;

      if (!targetEmail || !targetPassword) {
        const msg = "Please enter both your email address and password.";
        setError(msg);
        onError?.(msg);
        setLoading(false);
        return;
      }

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });

      const result = await res.json().catch(() => ({ success: false, error: "Failed to parse server response." }));

      if (!result.success) {
        const errorMsg = result.error || "Invalid email or password.";
        if (result.requiresVerification) {
          setError(result.error);
          onError?.(result.error);
          setStep("verify-otp");
          startResendTimer();
        } else {
          setError(errorMsg);
          onError?.(errorMsg);
        }
        setLoading(false);
        return;
      }

      setSuccess("Authenticated! Redirecting to your workspace...");
      setTimeout(() => {
        window.location.href = targetRedirect;
      }, 250);
    } catch (err: any) {
      const msg = err?.message || "Sign-in failed. Please try again.";
      setError(msg);
      onError?.(msg);
      setLoading(false);
    }
  };

  // Handle Sign-Up Form Submit (Step 1)
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (!email.trim() || !fullName.trim() || !orgName.trim() || !password) {
        throw new Error("All fields are required to register your firm.");
      }
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
      }

      const res = await initiateSignupAction({
        email: email.trim(),
        fullName: fullName.trim(),
        firmName: orgName.trim(),
        phone: phone.trim(),
        password,
      });

      if (!res.success) {
        throw new Error(res.error || "Could not initiate registration.");
      }

      setSuccess("Verification code sent to your email! Please enter it below to activate your account.");
      setStep("verify-otp");
      startResendTimer();
    } catch (err: any) {
      const msg = err?.message || "Registration failed. Please check your details.";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (!otpCode || otpCode.trim().length !== 6) {
        throw new Error("Please enter the 6-digit code received on your email.");
      }

      if (mode === "sign-up") {
        const res = await completeSignupWithPasswordAction({
          email: email.trim(),
          code: otpCode.trim(),
          password,
          fullName: fullName.trim(),
          firmName: orgName.trim(),
          phone: phone.trim(),
        });

        if (!res.success) {
          throw new Error(res.error || "Verification failed. Code may be expired.");
        }

        setSuccess("Account activated successfully! Logging you in...");
        setTimeout(() => {
          window.location.href = targetRedirect;
        }, 800);
      } else if (mode === "sign-in") {
        const res = await verifyLoginOtpAction(email.trim(), otpCode.trim());
        if (!res.success) {
          throw new Error(res.error || "Verification failed. Code may be expired.");
        }

        setSuccess("Identity verified! Logging in...");
        setTimeout(() => {
          window.location.href = targetRedirect;
        }, 800);
      } else if (mode === "forgot-password") {
        if (!newPassword || newPassword.length < 8) {
          throw new Error("Please enter a new password of at least 8 characters.");
        }
        const res = await resetPasswordWithOtpAction({
          email: email.trim(),
          code: otpCode.trim(),
          newPassword,
        });
        if (!res.success) {
          throw new Error(res.error || "Password reset failed.");
        }

        setSuccess("Password updated successfully! Logging you in...");
        setTimeout(() => {
          window.location.href = targetRedirect;
        }, 800);
      }
    } catch (err: any) {
      const msg = err?.message || "Verification failed.";
      setError(msg);
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendCode = async () => {
    if (resendCooldown > 0 || !email) return;
    setError(null);
    setLoading(true);
    try {
      let res: { success: boolean; error?: string };
      if (mode === "forgot-password") {
        res = await requestPasswordResetOtpAction(email.trim());
      } else {
        const purpose = mode === "sign-up" ? "signup" : "login";
        res = await resendVerificationCodeAction(email.trim(), purpose);
      }
      if (!res.success) {
        throw new Error(res.error || "Could not resend verification code.");
      }
      setSuccess("A new 6-digit verification code has been dispatched to your email.");
      startResendTimer();
    } catch (err: any) {
      setError(err?.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0c0e12] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-emerald-600 selection:text-white transition-colors duration-150">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-between items-center px-4 sm:px-0 mb-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
              D
            </div>
            <span className="font-bold text-lg tracking-tight text-neutral-900 dark:text-white">
              DocGet
            </span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="text-center px-4 sm:px-0">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            {step === "verify-otp"
              ? "Verify Security Code"
              : mode === "sign-in"
              ? "Sign in to your practice"
              : mode === "sign-up"
              ? "Start 30-Day Free Trial"
              : "Reset Practice Password"}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            {step === "verify-otp"
              ? `Enter the 6-digit code sent to ${email}`
              : mode === "sign-in"
              ? "Secure document collection portal for CAs & Law Firms"
              : mode === "sign-up"
              ? "Zero credit card required • Instant access in 60 seconds"
              : "Enter your account email to receive a recovery code"}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-neutral-900 py-8 px-6 sm:px-10 shadow-sm border border-neutral-200/80 dark:border-neutral-800 rounded-3xl transition-colors">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/60 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {success}
              </p>
            </div>
          )}

          {step === "credentials" && (
            <>
              {mode !== "forgot-password" && (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading || loading}
                    className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-sm font-semibold shadow-xs transition-all disabled:opacity-50"
                  >
                    {googleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>Continue with Google</span>
                  </button>

                  <div className="relative flex items-center justify-center my-4">
                    <div className="border-t border-neutral-200 dark:border-neutral-800 w-full" />
                    <span className="bg-white dark:bg-neutral-900 px-3 text-xs text-neutral-400 font-medium uppercase tracking-wider absolute">
                      or with email
                    </span>
                  </div>
                </div>
              )}

              {mode === "sign-in" && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                      <input
                        id="login-email-input"
                        name="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="advisor@practice.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode("forgot-password");
                          setError(null);
                        }}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                      <input
                        id="login-password-input"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in to Dashboard"}
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-xs text-neutral-500">
                      Don't have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("sign-up");
                          setError(null);
                        }}
                        className="font-bold text-emerald-600 hover:underline"
                      >
                        Start free 30-day trial
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {mode === "sign-up" && (
                <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="CA Rajesh Sharma"
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Firm / Organization Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Sharma & Associates CA"
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="rajesh@sharmaca.in"
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Phone Number (for WhatsApp Alerts)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Password (min 8 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-3 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Free Practice Account"}
                  </button>

                  <div className="text-center pt-2">
                    <p className="text-xs text-neutral-500">
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("sign-in");
                          setError(null);
                        }}
                        className="font-bold text-emerald-600 hover:underline"
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {mode === "forgot-password" && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setError(null);
                    setLoading(true);
                    try {
                      if (!email) throw new Error("Please enter your email address.");
                      const res = await requestPasswordResetOtpAction(email.trim());
                      if (!res.success) throw new Error(res.error || "Could not find account.");
                      setSuccess("Password reset code sent to your email!");
                      setStep("verify-otp");
                      startResendTimer();
                    } catch (err: any) {
                      setError(err?.message || "Failed to request reset.");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Account Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="advisor@practice.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Code"}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("sign-in");
                        setError(null);
                      }}
                      className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {step === "verify-otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 tracking-widest font-mono text-center text-lg rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition"
                  />
                </div>
              </div>

              {mode === "forgot-password" && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Enter New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-600 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Continue"}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep("credentials");
                    setError(null);
                  }}
                  className="font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                >
                  ← Edit email
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || loading}
                  className="font-bold text-emerald-600 hover:underline disabled:opacity-50"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
