"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  CreditCard,
  MessageSquare,
  KeyRound,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  Mail,
} from "lucide-react";
import { getSubscriptionAction, redeemLicenseKeyAction } from "@/app/actions/portal";
import { useToast } from "@/components/ui/Toast";

import { useDashboardData } from "@/contexts/DashboardDataContext";

export function TrialExpiryGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { toast } = useToast();
  const { subscription: contextSub, user, refresh } = useDashboardData();
  const [localSub, setLocalSub] = useState<any>(null);
  const subscription = localSub || contextSub;

  // License key activation
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);

  const handleQuickActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;

    setActivating(true);
    try {
      const res = await redeemLicenseKeyAction({
        code: licenseKey.trim(),
      });

      if (res.success) {
        toast({ title: "Account Upgraded!", description: res.message });
        setLicenseKey("");
        setShowCodeInput(false);
        await refresh();
      } else {
        toast({ title: "Redemption Failed", description: res.error || "Invalid license key" });
      }
    } finally {
      setActivating(false);
    }
  };

  // 1. Account Deactivation Guard (Highest Priority)
  if (user?.isDeactivated) {
    const adminPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE || "+919718871979";
    const cleanPhone = adminPhone.replace(/[^0-9]/g, "");
    const adminEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@docucollect.in";
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
      `Hello! My account (${user?.email || ""}) has been deactivated. Please assist with reactivation.`
    )}`;
    const mailtoUrl = `mailto:${adminEmail}?subject=${encodeURIComponent(
      `Account Reactivation Request - ${user?.email || ""}`
    )}&body=${encodeURIComponent(
      `Hello DocuCollect Admin,\n\nMy account (${user?.email || ""}) is currently deactivated. Please assist me in reactivating my account.\n\nThank you.`
    )}`;

    return (
      <div className="py-12 max-w-xl mx-auto space-y-6 px-4">
        <div className="bg-white dark:bg-neutral-900 border-2 border-rose-300 dark:border-rose-900/60 rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              Account Suspended
            </span>
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white mt-2">
              Your Account Has Been Deactivated
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
              An administrator has deactivated this workspace account. Access to cases, client vaults, and document uploads has been temporarily paused. Please contact us to reactivate your account.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition group cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Direct Chat</p>
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">WhatsApp Support</p>
              </div>
              <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </a>

            <a
              href={mailtoUrl}
              className="flex items-center justify-between p-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition group cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Email Admin</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">{adminEmail}</p>
              </div>
              <Mail className="w-5 h-5 text-neutral-600 dark:text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>

          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition cursor-pointer"
            >
              Sign out of this account →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return <>{children}</>;
  }

  const now = new Date();
  const isTrial = subscription.status === "trial";
  const isExpiredStatus = subscription.status === "expired";
  const trialExpired = isTrial && subscription.trial_ends_at && new Date(subscription.trial_ends_at) < now;
  const planExpired = subscription.status === "active" && subscription.current_period_end && new Date(subscription.current_period_end) < now;

  const isBlocked = isExpiredStatus || trialExpired || planExpired;

  // Always allow the user to view the Billing page to see payment instructions or enter the secret code
  const isBillingPage = pathname === "/dashboard/billing";

  if (isBlocked && !isBillingPage) {
    const adminPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE || "+919718871979";
    const cleanPhone = adminPhone.replace(/[^0-9]/g, "");
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
      "Hello! My trial for DocuCollect has ended and I would like to renew my subscription plan."
    )}`;

    return (
      <div className="py-8 max-w-2xl mx-auto space-y-6">
        <div className="bg-white border-2 border-amber-300 rounded-2xl p-8 sm:p-10 shadow-lg text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
              Subscription Required
            </span>
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 mt-2">
              Your Free Trial Has Ended
            </h2>
            <p className="text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
              We hope DocuCollect helped your firm streamline client document collection! To continue creating cases, adding clients, and sharing secure upload links, please upgrade your subscription.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
            <Link
              href="/dashboard/billing"
              className="flex items-center justify-between p-4 rounded-xl border-2 border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 transition group"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Step 1</p>
                <p className="text-sm font-bold text-white mt-0.5">Pay via UPI / Bank</p>
              </div>
              <CreditCard className="w-5 h-5 text-neutral-300 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 transition group"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Step 2</p>
                <p className="text-sm font-bold text-emerald-900 mt-0.5">Contact on WhatsApp</p>
              </div>
              <MessageSquare className="w-5 h-5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>

          <div className="border-t border-neutral-200 pt-5 text-center">
            <button
              onClick={() => setShowCodeInput(!showCodeInput)}
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1.5 transition"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {showCodeInput ? "Hide license key input" : "Have a one-time license key or voucher?"}
            </button>

            {showCodeInput && (
              <form onSubmit={handleQuickActivate} className="mt-4 max-w-sm mx-auto flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. DOCU-PRO-YR-..."
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <button
                  type="submit"
                  disabled={activating || !licenseKey.trim()}
                  className="px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-lg hover:bg-neutral-800 transition disabled:opacity-50"
                >
                  {activating ? "Redeeming..." : "Redeem"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Active Trial Days Left Notification Banner
  const trialDaysLeft = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const showTrialBanner = isTrial && !isBlocked && trialDaysLeft !== null;

  return (
    <>
      {showTrialBanner && (
        <div className="mb-6 p-3 sm:p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 dark:from-amber-950/40 dark:via-amber-900/30 dark:to-amber-950/40 border border-amber-300/80 dark:border-amber-800/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
            <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-xs">
              ⏳
            </div>
            <div>
              <span className="font-bold">{trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} left</span> in your Free Trial. Upgrade anytime to keep links active and unlock premium limits.
            </div>
          </div>
          <Link
            href="/dashboard/billing"
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition shrink-0 flex items-center gap-1.5"
          >
            <span>Upgrade Plan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
      {children}
    </>
  );
}
