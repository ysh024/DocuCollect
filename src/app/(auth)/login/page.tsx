import { Suspense } from "react";
import { Metadata } from "next";
import { OtpAuthView } from "@/components/auth/OtpAuthView";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your DocuCollect account with secure passwordless email OTP verification.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#0c0e12] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OtpAuthView initialMode="sign-in" />
    </Suspense>
  );
}
