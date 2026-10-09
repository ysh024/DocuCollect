"use client";

import { OtpAuthView } from "./OtpAuthView";

interface NeonAuthViewProps {
  initialMode?: "sign-in" | "sign-up";
}

/**
 * Re-exports OtpAuthView for seamless backward compatibility.
 * All authentication in DocuCollect is strictly OTP-based.
 */
export function NeonAuthView({ initialMode = "sign-in" }: NeonAuthViewProps) {
  return <OtpAuthView initialMode={initialMode} />;
}
