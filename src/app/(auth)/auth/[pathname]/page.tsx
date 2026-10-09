import { OtpAuthView } from "@/components/auth/OtpAuthView";

export default async function DynamicAuthPage({
  params,
}: {
  params: Promise<{ pathname: string }>;
}) {
  const { pathname } = await params;
  const isSignUp = pathname === "sign-up" || pathname === "signup" || pathname === "register";
  return <OtpAuthView initialMode={isSignUp ? "sign-up" : "sign-in"} />;
}
