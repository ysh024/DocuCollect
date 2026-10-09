import { Metadata } from "next";
import { OtpAuthView } from "@/components/auth/OtpAuthView";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your DocuCollect account with secure passwordless email OTP verification.",
};

export default function LoginPage() {
  return <OtpAuthView initialMode="sign-in" />;
}
