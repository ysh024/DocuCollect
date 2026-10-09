"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  CheckCircle,
  Crown,
  Shield,
  Zap,
  AlertCircle,
  ExternalLink,
  Copy,
  ChevronRight,
  Building,
  QrCode,
  MessageSquare,
  Users,
  HardDrive,
  Calendar,
  Ticket,
} from "lucide-react";
import { InfoPopover } from "@/components/ui/InfoPopover";
import {
  getSubscriptionAction,
  getAllPlansAction,
  redeemLicenseKeyAction,
} from "@/app/actions/portal";
import { useToast } from "@/components/ui/Toast";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@docucollect.in";
const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || "+919876543210";
const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || "docucollect@upi";
const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME || "State Bank of India";
const BANK_HOLDER = process.env.NEXT_PUBLIC_BANK_HOLDER || "DocuCollect Technologies";
const BANK_ACCOUNT = process.env.NEXT_PUBLIC_BANK_ACCOUNT || "3982001100234";
const BANK_IFSC = process.env.NEXT_PUBLIC_BANK_IFSC || "SBIN0001234";

import { useDashboardData } from "@/contexts/DashboardDataContext";

let globalPlansCache: any[] | null = null;

export default function BillingPage() {
  const { toast } = useToast();
  const { subscription: contextSub, refresh } = useDashboardData();
  const [subscription, setSubscription] = useState<any>(contextSub || null);
  const [plans, setPlans] = useState<any[]>(globalPlansCache || []);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // License Key Redemption
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const loadData = async () => {
    try {
      const [sub, pl] = await Promise.all([
        getSubscriptionAction(),
        !globalPlansCache ? getAllPlansAction() : Promise.resolve(globalPlansCache),
      ]);
      if (sub) setSubscription(sub);
      if (pl) {
        globalPlansCache = pl;
        setPlans(pl);
      }
    } catch (err) {
      console.warn("Billing data fetch error:", err);
    }
  };

  useEffect(() => {
    if (contextSub) setSubscription(contextSub);
    loadData();
  }, [contextSub]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast({ title: `${label} copied!`, description: text });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Redeem Single-Use License Key
  const handleRedeemKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = licenseKeyInput.trim();
    if (!clean) {
      toast({ title: "Error", description: "Please enter your license key." });
      return;
    }

    setRedeeming(true);
    try {
      const res = await redeemLicenseKeyAction({ code: clean });
      if (res.success) {
        toast({ title: "Plan Upgraded!", description: res.message });
        setLicenseKeyInput("");
        await loadData();
      } else {
        toast({ title: "Redemption Failed", description: res.error || "Invalid license key" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to redeem license key" });
    } finally {
      setRedeeming(false);
    }
  };

  const trialDaysLeft = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const isActive = subscription?.status === "active";
  const isTrial = subscription?.status === "trial";
  const isExpired = subscription?.status === "expired" || subscription?.status === "cancelled";

  const planIcons: Record<string, any> = { free_trial: Zap, starter: Shield, pro: Crown };
  const PlanIcon = planIcons[subscription?.plan_name] || Zap;

  const clientsUsed = Number(subscription?.current_clients_count || 0);
  const maxClients = Number(subscription?.max_clients || 10);
  const clientUsagePercent = Math.min(100, Math.round((clientsUsed / maxClients) * 100));

  const cleanPhone = CONTACT_PHONE.replace(/[^0-9]/g, "");
  const waMessage = encodeURIComponent(
    `Hello DocuCollect, I have completed payment for subscription upgrade. Please issue my license key for account: ${subscription?.email || ""}`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${waMessage}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Billing & Subscriptions</h1>
        <p className="text-xs text-neutral-500 mt-0.5">
          Manage your subscription tier, track client slot quotas, and redeem one-time license keys.
        </p>
      </div>

      {/* 1. Customer License Key Redemption Card */}
      <div className="p-5 bg-gradient-to-br from-emerald-50/70 via-white to-neutral-50 rounded-2xl border-2 border-emerald-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                Redeem License Key / Voucher
                <InfoPopover
                  title="License Key Protection"
                  text="Each license key is cryptographically signed and single-use. Once redeemed, it binds permanently to your account and cannot be reused."
                />
              </h2>
              <p className="text-[11px] text-neutral-500">
                Received a single-use activation code after payment? Enter it below to upgrade your plan.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex text-[10px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
            Single-Use Protected
          </span>
        </div>

        <form onSubmit={handleRedeemKey} className="flex flex-col sm:flex-row gap-2 pt-1">
          <input
            type="text"
            required
            placeholder="e.g. DOCU-PRO-YR-A4F1-9E28"
            value={licenseKeyInput}
            onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
            className="flex-1 bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs font-mono uppercase font-bold text-neutral-900 placeholder:normal-case placeholder:font-normal placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={redeeming || !licenseKeyInput.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{redeeming ? "Verifying..." : "Redeem License Key"}</span>
          </button>
        </form>
      </div>

      {/* 2. Current Plan Card */}
      <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-neutral-900">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            Current Active Plan
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isActive
                ? "bg-emerald-100 text-emerald-800"
                : isTrial
                ? "bg-amber-100 text-amber-800"
                : "bg-red-100 text-red-700"
            }`}
          >
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />}
            {subscription?.status === "trial"
              ? "Free Trial"
              : subscription?.status === "active"
              ? "Active Plan"
              : subscription?.status === "cancelled"
              ? "Cancelled"
              : "Active"}
          </span>
        </div>

        {subscription ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                <PlanIcon className="w-6 h-6 text-neutral-700" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-neutral-900">
                  {subscription.plan_display_name || "Free Trial"}
                </p>
                {isTrial && trialDaysLeft !== null && (
                  <p className={`text-xs mt-0.5 ${trialDaysLeft <= 7 ? "text-amber-600 font-semibold" : "text-neutral-500"}`}>
                    {trialDaysLeft > 0 ? `${trialDaysLeft} days remaining in your 30-day trial` : "Trial period ended"}
                  </p>
                )}
                {isActive && subscription.current_period_end && (
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Valid until:{" "}
                    <strong className="text-neutral-800">
                      {new Date(subscription.current_period_end).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </strong>
                  </p>
                )}
                {isExpired && (
                  <p className="text-xs text-red-600 font-semibold mt-0.5">
                    Your plan has expired. Upgrade below to keep collecting documents.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 text-center border-t sm:border-t-0 sm:border-l border-neutral-100 pt-3 sm:pt-0 sm:pl-4">
                <div>
                  <p className="text-base font-black text-neutral-900">{subscription.max_clients}</p>
                  <p className="text-[10px] text-neutral-400">Max Clients</p>
                </div>
                <div>
                  <p className="text-base font-black text-neutral-900">{subscription.file_retention_days}d</p>
                  <p className="text-[10px] text-neutral-400">File Retention</p>
                </div>
                <div>
                  <p className="text-base font-black text-neutral-900">{subscription.max_upload_size_mb || 10}MB</p>
                  <p className="text-[10px] text-neutral-400">Max Upload</p>
                </div>
              </div>
            </div>

            {/* Quota Usage Bar */}
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-neutral-500" />
                  Client Slots Usage
                </span>
                <span className="font-mono text-neutral-600 text-[11px]">
                  <strong>{clientsUsed}</strong> of <strong>{maxClients}</strong> slots used ({clientUsagePercent}%)
                </span>
              </div>
              <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    clientUsagePercent >= 90
                      ? "bg-rose-500"
                      : clientUsagePercent >= 70
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${clientUsagePercent}%` }}
                />
              </div>
              {clientsUsed >= maxClients && (
                <p className="text-[11px] text-rose-600 font-medium">
                  Client capacity limit reached. Upgrade your plan to onboard additional clients.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="h-16 bg-neutral-50 rounded-xl animate-pulse" />
        )}
      </div>

      {/* Trial warning */}
      {isTrial && trialDaysLeft !== null && trialDaysLeft <= 7 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-900">Your trial expires in {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Upgrade today to maintain uninterrupted client link access and secure document storage.
            </p>
          </div>
        </div>
      )}

      {/* 3. Payment Methods (Bank Transfer & UPI QR) */}
      <div className="p-5 bg-white rounded-2xl border border-neutral-200 shadow-xs space-y-5">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            Payment & Upgrade Instructions
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Complete payment via UPI or Net Banking, then message proof on WhatsApp to receive your single-use activation license key.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* UPI & QR Code Box */}
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  UPI Payment
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                  Instant
                </span>
              </div>
              <p className="text-xs text-neutral-500 mb-2.5">
                Scan using Google Pay, PhonePe, Paytm, or BHIM:
              </p>

              <div className="p-2.5 bg-white rounded-lg border border-neutral-200 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase font-semibold">UPI ID</p>
                  <code className="text-xs font-mono font-bold text-neutral-800">{UPI_ID}</code>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(UPI_ID, "UPI ID")}
                  className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === "UPI ID" ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === "UPI ID" ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-neutral-500">
              💡 Mention your registered email address in payment remarks.
            </div>
          </div>

          {/* Direct Bank Transfer Box */}
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-neutral-700" />
                  Bank Transfer (NEFT / IMPS)
                </span>
                <span className="text-[10px] bg-neutral-200 text-neutral-700 font-semibold px-2 py-0.5 rounded">
                  Bank Account
                </span>
              </div>

              <div className="space-y-1.5 text-xs bg-white p-2.5 rounded-lg border border-neutral-200">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 text-[11px]">Bank:</span>
                  <span className="font-semibold text-neutral-800">{BANK_NAME}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 text-[11px]">Account Name:</span>
                  <span className="font-semibold text-neutral-800">{BANK_HOLDER}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 text-[11px]">Account No:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-neutral-900">{BANK_ACCOUNT}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(BANK_ACCOUNT, "Account Number")}
                      className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 text-[11px]">IFSC Code:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-neutral-900">{BANK_IFSC}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(BANK_IFSC, "IFSC Code")}
                      className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-neutral-500">
              💡 Supports NEFT, RTGS, and IMPS from all Indian banks.
            </div>
          </div>
        </div>

        {/* WhatsApp & Email Notification for Key Issuance */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-900">Send Payment Proof to Get License Key</p>
              <p className="text-[11px] text-neutral-600">
                Send screenshot on WhatsApp to receive your unique activation key within 15 minutes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Admin</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=DocuCollect Payment Proof&body=Hi, I have completed the payment. Please issue my one-time license key for email: ${subscription?.email || ""}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition"
            >
              <span>Email Proof</span>
            </a>
          </div>
        </div>
      </div>

      {/* 4. Available Plans Grid */}
      <div>
        <h2 className="text-sm font-bold text-neutral-900 mb-3">Available Plans for Your Practice</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {plans.length > 0 ? (
            plans.map((plan: any) => {
              const Icon = planIcons[plan.name] || Zap;
              const isCurrent = plan.name === subscription?.plan_name;
              return (
                <div
                  key={plan.id}
                  className={`p-4 rounded-xl border flex flex-col transition-all ${
                    isCurrent
                      ? "border-emerald-400 bg-emerald-50/40 shadow-xs"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-neutral-700" />
                      <span className="text-sm font-bold text-neutral-900">{plan.display_name}</span>
                    </div>
                    {isCurrent && (
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="mb-3">
                    <span className="text-xl font-black text-neutral-900">
                      {plan.price_monthly === 0 ? "Free" : `₹${plan.price_monthly}`}
                    </span>
                    {plan.price_monthly > 0 && <span className="text-xs text-neutral-400">/mo</span>}
                    {plan.price_yearly > 0 && (
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        ₹{plan.price_yearly}/yr · save ~17%
                      </p>
                    )}
                  </div>

                  <ul className="space-y-1.5 flex-1 mb-4">
                    {(plan.features || []).map((f: string) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-neutral-600">
                        <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {!isCurrent ? (
                    <a
                      href={`mailto:${CONTACT_EMAIL}?subject=DocuCollect Upgrade - ${plan.display_name}&body=Hi,%0A%0AI would like to upgrade to the ${plan.display_name} plan.%0A%0AAccount Email: ${subscription?.email || ""}%0APeriod: Monthly / Yearly%0APayment will be completed via UPI / Bank Transfer.%0A%0AThanks`}
                      className="w-full text-center py-2 rounded-lg bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 transition flex items-center justify-center gap-1"
                    >
                      <span>Upgrade to {plan.display_name}</span>
                      <ChevronRight className="w-3 h-3" />
                    </a>
                  ) : (
                    <div className="w-full text-center py-2 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold">
                      Active Plan
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-3 h-32 bg-neutral-50 rounded-xl animate-pulse" />
          )}
        </div>
      </div>

      {/* Pricing Comparison link */}
      <div className="text-center pt-2">
        <Link
          href="/pricing"
          className="text-xs text-neutral-600 hover:text-neutral-900 font-semibold inline-flex items-center gap-1"
        >
          <span>View full features & plan breakdown on public pricing page</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
