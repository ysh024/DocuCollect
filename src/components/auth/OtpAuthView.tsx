"use client";

import React, { useState } from "react";
import Link from "next/link";
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
import {
  loginWithPasswordAction,
  initiateSignupAction,
  completeSignupWithPasswordAction,
  verifyLoginOtpAction,
  resendVerificationCodeAction,
} from "@/app/actions/auth";

interface OtpAuthViewProps {
  initialMode?: "sign-in" | "sign-up";
}

type AuthStep = "credentials" | "verify-otp";

const NEON_AUTH_URL =
  process.env.NEXT_PUBLIC_NEON_AUTH_URL ||
  "https://ep-wild-snow-azyh1uu4.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth";

export function OtpAuthView({ initialMode = "sign-in" }: OtpAuthViewProps) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">(initialMode);
  const [step, setStep] = useState<AuthStep>("credentials");

  // Form Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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

  const switchMode = (newMode: "sign-in" | "sign-up") => {
    setMode(newMode);
    setStep("credentials");
    setError(null);
    setSuccess(null);
    setOtp("");
  };

  // Google OAuth via Neon Better Auth
  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const callbackURL = `${window.location.origin}/auth/callback`;
      const cleanBase = NEON_AUTH_URL.replace(/\/$/, "");

      const res = await fetch(`${cleanBase}/sign-in/social`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          provider: "google",
          callbackURL,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.message || data.error || "Failed to initiate Google sign-in.");
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error("Google auth error:", err);
      setError(err.message || "Failed to connect to Google authentication.");
      setGoogleLoading(false);
    }
  };

  // Handle Login Form Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const result = await loginWithPasswordAction({ email, password });
      if (!result.success) {
        if (result.requiresVerification) {
          setError(result.error);
          setStep("verify-otp");
          startResendTimer();
        } else {
          setError(result.error || "Invalid email or password.");
        }
        setLoading(false);
        return;
      }

      setSuccess("Authenticated! Redirecting to your dashboard...");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    } catch (err: any) {
      setError(err.message || "Sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  // Handle Sign-Up Form Submit (Step 1)
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const result = await initiateSignupAction({
        email,
        password,
        fullName,
        firmName,
        phone,
      });

      if (!result.success) {
        if ((result as any).alreadyExisted) {
          setMode("sign-in");
          setStep("credentials");
          setSuccess("Account is already registered! Please enter your password to sign in.");
          setError(null);
          setLoading(false);
          return;
        }
        setError(result.error || "Failed to initiate registration.");
        setLoading(false);
        return;
      }

      setSuccess(result.message || `Verification code sent to ${email}`);
      setStep("verify-otp");
      startResendTimer();
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Verification Submit (Step 2)
  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "sign-up") {
        const result = await completeSignupWithPasswordAction({
          email,
          password,
          code: otp.trim(),
          firmName,
          fullName,
          phone,
        });

        if (!result.success) {
          if ((result as any).alreadyExisted) {
            setMode("sign-in");
            setStep("credentials");
            setSuccess("Account is already created and verified! Please enter your password to sign in.");
            setError(null);
            setLoading(false);
            return;
          }
          setError(result.error || "Verification failed. Please check the code.");
          setLoading(false);
          return;
        }

        setSuccess(result.message || "Account activated and verified! Redirecting to your dashboard...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 600);
      } else {
        const result = await verifyLoginOtpAction(email, otp.trim());
        if (!result.success) {
          setError(result.error || "Invalid code. Please try again.");
          setLoading(false);
          return;
        }

        setSuccess("Verified! Redirecting to your dashboard...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
      }
    } catch (err: any) {
      setError(err.message || "Verification failed.");
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setLoading(true);
    try {
      const result = await resendVerificationCodeAction(email, mode === "sign-in" ? "login" : "signup");
      if (result.success) {
        setSuccess("A new 6-digit verification code has been sent.");
        startResendTimer();
      } else {
        setError(result.error || "Failed to resend code.");
      }
    } catch {
      setError("Failed to resend verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
          <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <span className="text-xl">📄</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-neutral-900">DocuCollect</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          {step === "verify-otp"
            ? "Enter Verification Code"
            : mode === "sign-in"
            ? "Sign In to Your Workspace"
            : "Create Your Firm Workspace"}
        </h1>
        <p className="mt-1.5 text-xs text-neutral-500 max-w-sm mx-auto">
          {step === "verify-otp"
            ? `Please enter the 6-digit verification code sent to ${email}`
            : mode === "sign-in"
            ? "Access client documents, checklist tracking, and encrypted vaults."
            : "Start your 30-day Free Trial. Secure multi-factor authentication included."}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-neutral-200/80 sm:rounded-2xl">
          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-xs">Error</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-xs">{success}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 1: CREDENTIALS (LOGIN / SIGNUP)                      */}
          {/* ========================================================= */}
          {step === "credentials" && (
            <div className="space-y-4">
              {/* Google Social Sign-In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full flex justify-center items-center gap-3 py-2.5 px-4 rounded-xl text-sm font-semibold text-neutral-800 bg-white hover:bg-neutral-50 border border-neutral-300 disabled:opacity-50 transition shadow-xs cursor-pointer"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-600" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                <span>{mode === "sign-in" ? "Continue with Google" : "Sign up with Google"}</span>
              </button>

              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-neutral-400 font-medium">
                    Or with email & password
                  </span>
                </div>
              </div>

              {/* Login Form */}
              {mode === "sign-in" && (
                <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@yourfirm.com"
                        className="block w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm placeholder-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600">
                        Password
                      </label>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="block w-full pl-10 pr-10 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl text-sm placeholder-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition shadow-sm mt-3 cursor-pointer"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Signing in...</span></>
                    ) : (
                      <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              )}

              {/* Sign Up Form */}
              {mode === "sign-up" && (
                <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                        Your Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="block w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs placeholder-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                        Firm / Agency Name
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={firmName}
                          onChange={(e) => setFirmName(e.target.value)}
                          placeholder="e.g. Apex Advisory"
                          className="block w-full pl-9 pr-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs placeholder-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                      Official Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@yourfirm.com"
                        className="block w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs placeholder-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                      Set Password (min. 8 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a strong password"
                        className="block w-full pl-10 pr-10 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs placeholder-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                      WhatsApp / Phone (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="block w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs placeholder-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition shadow-sm mt-3 cursor-pointer"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span>Sending verification code...</span></>
                    ) : (
                      <><span>Continue to Verification</span><ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: ENTER VERIFICATION CODE                           */}
          {/* ========================================================= */}
          {step === "verify-otp" && (
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="block w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl text-xl font-mono tracking-[0.5em] text-center placeholder-neutral-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent transition"
                  />
                </div>
                <p className="text-xs text-neutral-400 mt-1.5 text-center">
                  Check your email inbox or spam folder. Valid for 10 minutes.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition shadow-sm cursor-pointer"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Verifying code...</span></>
                ) : (
                  <><span>Verify Code & Enter Dashboard</span><ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setStep("credentials")}
                  className="text-neutral-500 hover:text-neutral-900 font-medium"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || loading}
                  className="text-emerald-700 hover:text-emerald-800 font-semibold disabled:opacity-40 flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}

          {/* Mode Switcher */}
          <div className="mt-6 pt-5 border-t border-neutral-100 text-center">
            {mode === "sign-in" ? (
              <p className="text-xs text-neutral-500">
                Don't have an account yet?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("sign-up")}
                  className="font-semibold text-neutral-900 hover:underline"
                >
                  Start free trial
                </button>
              </p>
            ) : (
              <p className="text-xs text-neutral-500">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("sign-in")}
                  className="font-semibold text-neutral-900 hover:underline"
                >
                  Sign in to workspace
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Security badge footer */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> AES-256 Cloud Vault
          </span>
          <span>•</span>
          <span>Password Protected</span>
          <span>•</span>
          <span>Row-Level Security</span>
        </div>
      </div>
    </div>
  );
}
