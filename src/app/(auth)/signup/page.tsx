import { Suspense } from "react";
import { Metadata } from "next";
import { OtpAuthView } from "@/components/auth/OtpAuthView";

export const metadata: Metadata = {
  title: "Create Account — Start Free 30-Day Trial",
  description: "Start collecting client documents with DocuCollect. 30-day free trial, no credit card required.",
};

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#0c0e12] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OtpAuthView initialMode="sign-up" />
    </Suspense>
  );
}
