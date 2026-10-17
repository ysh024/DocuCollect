"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { resolveGoogleSessionAction } from "@/app/actions";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function handleAuth() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token") || urlParams.get("session_token");
        const email = urlParams.get("email");

        // Resolve and verify Google OAuth session directly via Server Action
        const res = await resolveGoogleSessionAction({ token, email });

        if (!res.success) {
          if (!isCancelled) {
            setStatus("error");
            setErrorMessage(res.error || "Could not retrieve verified Google session. Please try logging in again.");
          }
          return;
        }

        if (!isCancelled) {
          setStatus("success");
          const targetRedirect = urlParams.get("redirect");
          const safeDest =
            targetRedirect && targetRedirect.startsWith("/") && !targetRedirect.startsWith("/login")
              ? targetRedirect
              : "/dashboard";
          window.location.href = safeDest;
        }
      } catch (err: any) {
        if (!isCancelled) {
          setStatus("error");
          setErrorMessage(err.message || "An unexpected error occurred during Google authentication.");
        }
      }
    }

    handleAuth();

    return () => {
      isCancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 text-neutral-900">
      <div className="max-w-md w-full bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm text-center space-y-6">
        {status === "loading" && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 text-white flex items-center justify-center mx-auto shadow-sm">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                Completing Google Sign-In
              </h1>
              <p className="text-xs text-neutral-500">
                Verifying your credentials and preparing your DocGet workspace...
              </p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                Authentication Successful
              </h1>
              <p className="text-xs text-neutral-500">
                Redirecting to your dashboard...
              </p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-sm">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                Sign-In Incomplete
              </h1>
              <p className="text-xs text-rose-600 leading-relaxed font-medium">
                {errorMessage}
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 text-white font-semibold text-xs rounded-xl hover:bg-neutral-800 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
