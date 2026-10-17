"use client";

import { useState, Suspense } from "react";
import { OtpAuthView } from "../AuthForm";

function SignupContent() {
  const [error, setError] = useState<string>("");

  return (
    <div>
      {error && (
        <div className="max-w-md mx-auto pt-4 px-4">
          <div className="text-red-600 text-sm font-medium bg-red-50 dark:bg-red-950/50 p-3 rounded-xl border border-red-200 dark:border-red-900/60">
            {error}
          </div>
        </div>
      )}
      <OtpAuthView
        initialMode="sign-up"
        onError={(err: string) => setError(err)}
      />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#0c0e12] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
