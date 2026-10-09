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
} from "lucide-react";
import { getSubscriptionAction, redeemLicenseKeyAction } from "@/app/actions/portal";
import { useToast } from "@/components/ui/Toast";

import { useDashboardData } from "@/contexts/DashboardDataContext";

export function TrialExpiryGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { toast } = useToast();
  const { subscription: contextSub, refresh } = useDashboardData();
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
    const adminPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE || "+919876543210";
    const cleanPhone = adminPhone.replace(/[^0-9]/g, "");
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
      "Hello! My 30-day trial for DocuCollect has ended and I would like to renew my subscription plan."
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
              Your 30-Day Free Trial Has Ended
            </h2>
            <p className="text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
              We hope DocuCollect helped your firm streamline client document collection! To continue creating cases, adding clients, and sharing secure upload links, please renew your subscription.
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

  return <>{children}</>;
}
