"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { syncGoogleUserAction } from "@/app/actions/auth";

const NEON_AUTH_URL =
  process.env.NEXT_PUBLIC_NEON_AUTH_URL ||
  "https://ep-wild-snow-azyh1uu4.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function handleAuth() {
      try {
        const cleanBase = NEON_AUTH_URL.replace(/\/$/, "");

        // 1. Fetch the authenticated session from Neon Better Auth
        // credentials: "include" sends the session cookie that was just set on neonauth
        let user: any = null;

        try {
          const neonRes = await fetch(`${cleanBase}/get-session`, {
            method: "GET",
            headers: { Accept: "application/json" },
            credentials: "include",
          });

          if (neonRes.ok) {
            const data = await neonRes.json();
            if (data?.user) {
              user = data.user;
            }
          }
        } catch (fetchErr) {
          console.warn("Direct Neon get-session fetch note:", fetchErr);
        }

        // 2. Fallback to local proxy /api/auth/get-session if needed
        if (!user) {
          try {
            const localRes = await fetch("/api/auth/get-session", {
              method: "GET",
              headers: { Accept: "application/json" },
              credentials: "include",
            });
            if (localRes.ok) {
              const data = await localRes.json();
              if (data?.user) {
                user = data.user;
              }
            }
          } catch {
            // ignore
          }
        }

        // 3. Fallback: Parse query parameters if returned via URL
        if (!user) {
          const urlParams = new URLSearchParams(window.location.search);
          const emailParam = urlParams.get("email");
          const nameParam = urlParams.get("name");
          if (emailParam) {
            user = { email: emailParam, name: nameParam || emailParam.split("@")[0] };
          }
        }

        if (!user || !user.email) {
          if (!isCancelled) {
            setStatus("error");
            setErrorMessage("Could not retrieve verified Google session. Please try logging in again.");
          }
          return;
        }

        // 4. Synchronize user in our application database & issue session cookie
        const syncRes = await syncGoogleUserAction({
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: true,
        });

        if (!syncRes.success) {
          if (!isCancelled) {
            setStatus("error");
            setErrorMessage(syncRes.error || "Failed to establish workspace session.");
          }
          return;
        }

        if (!isCancelled) {
          setStatus("success");
          // Redirect smoothly into dashboard
          window.location.href = "/dashboard";
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
                Verifying your credentials and preparing your DocuCollect workspace...
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
