import { Metadata } from "next";
import { OtpAuthView } from "@/components/auth/OtpAuthView";

export const metadata: Metadata = {
  title: "Create Account — Start Free 30-Day Trial",
  description: "Start collecting client documents with DocuCollect. 30-day free trial, no credit card required.",
};

export default function SignupPage() {
  return <OtpAuthView initialMode="sign-up" />;
}
