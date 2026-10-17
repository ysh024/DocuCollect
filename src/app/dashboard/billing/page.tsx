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
  Key,
} from "lucide-react";
import { RedeemVoucherModal } from "@/components/shared/Navigation";
import { InfoPopover } from "@/components/ui";
import {
  getSubscriptionAction,
  getAllPlansAction,
  getPublicPaymentSettingsAction,
  type PublicPaymentSettings,
} from "@/app/actions";
import { useToast } from "@/components/ui";
import { useDashboardData } from "@/contexts/DashboardDataContext";

let globalSubscriptionCache: any | null = null;
let globalPlansCache: any[] | null = null;
let globalPaymentSettingsCache: PublicPaymentSettings | null = null;

export default function BillingPage() {
  const { toast } = useToast();
  const { subscription: contextSub, refresh } = useDashboardData();
  const [mounted, setMounted] = useState(false);
  const [subscription, setSubscription] = useState<any>(() => contextSub || globalSubscriptionCache || null);
  const [plans, setPlans] = useState<any[]>(() => globalPlansCache || []);
  const [paymentSettings, setPaymentSettings] = useState<PublicPaymentSettings | null>(() => globalPaymentSettingsCache);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Top Redeem Voucher Modal
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = async () => {
    try {
      const sub = await getSubscriptionAction();
      if (sub) {
        globalSubscriptionCache = sub;
        setSubscription(sub);
      }

      const pl = !globalPlansCache ? await getAllPlansAction() : globalPlansCache;
      if (pl) {
        globalPlansCache = pl;
        setPlans(pl);
      }

      const pay = !globalPaymentSettingsCache ? await getPublicPaymentSettingsAction() : globalPaymentSettingsCache;
      if (pay) {
        globalPaymentSettingsCache = pay;
        setPaymentSettings(pay);
      }
    } catch (err) {
      console.warn("Billing data fetch error:", err);
    }
  };

  useEffect(() => {
    if (contextSub) setSubscription(contextSub);
    if (!globalSubscriptionCache || !globalPlansCache || !globalPaymentSettingsCache) {
      loadData();
    }
  }, [contextSub]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast({ title: `${label} copied!`, description: text });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const trialDaysLeft = mounted && subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const isActive = subscription?.status === "active";
  const isTrial = subscription?.status === "trial";
  const isExpired = subscription?.status === "expired" || subscription?.status === "cancelled";

  const planIcons: Record<string, any> = { free_trial: Zap, starter: Shield, pro: Crown, firm: Building };
  const PlanIcon = planIcons[subscription?.plan_name] || Zap;

  const clientsUsed = Number(subscription?.current_clients_count || 0);
  const maxClients = Number(subscription?.max_clients || 10);
  const clientUsagePercent = Math.min(100, Math.round((clientsUsed / maxClients) * 100));

  const contactPhone = paymentSettings?.contact_phone || "+919876543210";
  const upiId = paymentSettings?.upi_id || "docget@upi";
  const bankName = paymentSettings?.bank_name || "State Bank of India";
  const bankHolder = paymentSettings?.bank_holder || "DocGet Technologies";
  const bankAccount = paymentSettings?.bank_account || "3982001100234";
  const bankIfsc = paymentSettings?.bank_ifsc || "SBIN0001234";

  const cleanPhone = contactPhone.replace(/[^0-9]/g, "");
  const accountEmail = subscription?.email || subscription?.account_email || "";
  const emailSnippet = accountEmail ? ` (${accountEmail})` : "";

  const waMessage = encodeURIComponent(
    `Hello DocGet! I have completed payment for subscription upgrade. Please issue my activation key for account${emailSnippet}.`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${waMessage}`;

  const hasAnyPaymentVisible =
    paymentSettings?.show_upi || paymentSettings?.show_bank || paymentSettings?.show_whatsapp;

  return (
    <div className="space-y-6 w-full pb-16">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[48px]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">Billing & Subscriptions</h1>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                !mounted || !subscription
                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700"
                  : isActive
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : isTrial
                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
              }`}
            >
              {!mounted || !subscription ? "Loading..." : (subscription?.plan_display_name || "Free Trial")}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage your subscription tier, track client quotas, and upgrade your account.
          </p>
        </div>

        {/* Top Right: Fast Redeem Activation Key / Voucher Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsRedeemModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold text-xs rounded-xl shadow-xs hover:shadow transition-all cursor-pointer group"
          >
            <Key className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600 transition-transform group-hover:rotate-12" />
            <span>Redeem Key / Voucher</span>
          </button>
        </div>
      </div>

      {/* 2. HERO: Current Active Plan Card */}
      <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Current Subscription</h2>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              !mounted || !subscription
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"
                : isActive
                ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-850"
                : isTrial
                ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-850"
                : "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-850"
            }`}
          >
            {mounted && isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />}
            {!mounted || !subscription
              ? "Checking..."
              : subscription?.status === "trial"
              ? "Free Trial Active"
              : subscription?.status === "active"
              ? "Active Plan"
              : subscription?.status === "cancelled"
              ? "Cancelled"
              : "Expired"}
          </span>
        </div>

        {mounted && subscription ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center shrink-0 border border-neutral-200/80 dark:border-neutral-700">
                <PlanIcon className="w-6 h-6 text-neutral-800 dark:text-neutral-200" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-neutral-900 dark:text-white">
                    You are on the {subscription.plan_display_name || "Free Trial"} Plan
                  </p>
                </div>
                {isTrial && trialDaysLeft !== null && (
                  <p className={`text-xs mt-0.5 ${trialDaysLeft <= 7 ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-neutral-500 dark:text-neutral-400"}`}>
                    {trialDaysLeft > 0 ? `${trialDaysLeft} days remaining in your 30-day trial` : "Trial period ended"}
                  </p>
                )}
                {isActive && subscription.current_period_end && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Valid until:{" "}
                    <strong className="text-neutral-800 dark:text-neutral-200">
                      {new Date(subscription.current_period_end).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </strong>
                  </p>
                )}
                {isExpired && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-0.5">
                    Your plan has expired. Upgrade below to keep collecting documents without interruption.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center border-t sm:border-t-0 sm:border-l border-neutral-100 dark:border-neutral-800 pt-3 sm:pt-0 sm:pl-4 shrink-0">
                <div className="bg-neutral-50 dark:bg-neutral-800/60 p-2 rounded-xl border border-neutral-100 dark:border-neutral-800 min-w-[70px]">
                  <p className="text-sm font-black text-neutral-900 dark:text-white">{subscription.max_clients}</p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Max Clients</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800/60 p-2 rounded-xl border border-neutral-100 dark:border-neutral-800 min-w-[70px]">
                  <p className="text-sm font-black text-neutral-900 dark:text-white">{subscription.file_retention_days}d</p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Retention</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800/60 p-2 rounded-xl border border-neutral-100 dark:border-neutral-800 min-w-[70px]">
                  <p className="text-sm font-black text-neutral-900 dark:text-white">{subscription.max_upload_size_mb || 10}MB</p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Max Upload</p>
                </div>
              </div>
            </div>

            {/* Quota Usage Bar */}
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200/60 dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                  Client Quota Usage
                </span>
                <span className="font-mono text-neutral-600 dark:text-neutral-300 text-[11px]">
                  <strong className="text-neutral-900 dark:text-white">{clientsUsed}</strong> of <strong className="text-neutral-900 dark:text-white">{maxClients}</strong> slots used ({clientUsagePercent}%)
                </span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-2 rounded-full overflow-hidden">
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
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  Client capacity limit reached. Upgrade your plan to onboard additional clients.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="h-20 bg-neutral-50 dark:bg-neutral-800 rounded-xl animate-pulse" />
        )}
      </div>

      {/* Trial Expiry Warning */}
      {mounted && isTrial && trialDaysLeft !== null && trialDaysLeft <= 7 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-850 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Your trial expires in {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}</p>
            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
              Upgrade below to maintain uninterrupted client link access and secure document storage.
            </p>
          </div>
        </div>
      )}

      {/* 3. Available Plans Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Available Plans for Your Practice</h2>
          <Link
            href="/pricing"
            className="text-[11px] text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white font-medium inline-flex items-center gap-1"
          >
            <span>Compare full features</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.length > 0 ? (
            plans.map((plan: any) => {
              const Icon = planIcons[plan.name] || Zap;
              const isCurrent = plan.name === subscription?.plan_name;
              const upgradeWaUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                `Hello DocGet! I would like to upgrade my account${emailSnippet} to the *${plan.display_name}* plan (${plan.price_monthly ? `₹${plan.price_monthly}/month` : "Custom"}). Please share UPI payment details and issue my activation voucher key.`
              )}`;

              return (
                <div
                  key={plan.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    isCurrent
                      ? "border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 dark:border-emerald-700 shadow-xs ring-1 ring-emerald-500/20"
                      : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-2xs"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                        <span className="text-sm font-bold text-neutral-900 dark:text-white">{plan.display_name}</span>
                      </div>
                      {isCurrent ? (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Current
                        </span>
                      ) : plan.name === "firm" ? (
                        <span className="text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold px-2 py-0.5 rounded-full border border-neutral-300 dark:border-neutral-700">
                          Upcoming / Not Available
                        </span>
                      ) : null}
                    </div>

                    <div className="mb-3">
                      <span className="text-xl font-black text-neutral-900 dark:text-white">
                        {plan.price_monthly === 0 ? "Free" : `₹${plan.price_monthly}`}
                      </span>
                      {plan.price_monthly > 0 && <span className="text-xs text-neutral-400 dark:text-neutral-500">/mo</span>}
                      {plan.price_yearly > 0 && (
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          ₹{plan.price_yearly}/yr · save ~17%
                        </p>
                      )}
                    </div>

                    <ul className="space-y-1.5 mb-4">
                      {(plan.features || []).map((f: string) => (
                        <li key={f} className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2">
                    {plan.name === "firm" ? (
                      <div className="w-full text-center py-2.5 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 text-xs font-semibold border border-neutral-200 dark:border-neutral-700">
                        Upcoming Tier (Not Available Right Now)
                      </div>
                    ) : !isCurrent ? (
                      <a
                        href={upgradeWaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-center py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow"
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span>Upgrade via WhatsApp</span>
                        <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-80" />
                      </a>
                    ) : (
                      <div className="w-full text-center py-2.5 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                        Current Active Plan
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-4 h-32 bg-neutral-50 dark:bg-neutral-800 rounded-xl animate-pulse" />
          )}
        </div>
      </div>

      {/* 4. Payment Details (Managed via Admin Panel) */}
      {hasAnyPaymentVisible && (
        <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Payment & Upgrade Channels
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Pay via UPI or Net Banking and share screenshot on WhatsApp to receive your instant activation voucher key.
              </p>
            </div>
            <InfoPopover
              title="Official Payment Gateway"
              text="Payment channels are verified by DocGet administrators. After payment, send confirmation on WhatsApp to immediately obtain your license voucher."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* UPI Payment Box */}
            {paymentSettings?.show_upi && (
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-850 dark:bg-neutral-800/40 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      UPI Payment (First Priority)
                    </span>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                      Instant Approval
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                    Scan or transfer using Google Pay, PhonePe, Paytm, or BHIM:
                  </p>

                  <div className="p-2.5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] text-neutral-400 uppercase font-semibold">UPI ID</p>
                      <code className="text-xs font-mono font-bold text-neutral-900 dark:text-white">{upiId}</code>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(upiId, "UPI ID")}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-md transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "UPI ID" ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "UPI ID" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    💡 Mention your registered email ({accountEmail || "your account"}) in UPI remarks.
                  </div>

                  <a
                    href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                      `Hello DocGet! I have made payment via UPI to ${upiId} for subscription upgrade.\n\nAccount Email: ${accountEmail}\nSending payment screenshot now. Please dispatch my activation voucher key.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                    <span>Send UPI Screenshot on WhatsApp</span>
                    <ExternalLink className="w-3 h-3 opacity-80 shrink-0" />
                  </a>
                </div>
              </div>
            )}

            {/* Direct Bank Transfer Box */}
            {paymentSettings?.show_bank && (
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                      Bank Transfer (NEFT / IMPS)
                    </span>
                    <span className="text-[10px] bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold px-2 py-0.5 rounded border border-neutral-300 dark:border-neutral-700">
                      Bank Transfer
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">Bank:</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{bankName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">Beneficiary:</span>
                      <span className="font-semibold text-neutral-800 dark:text-neutral-200">{bankHolder}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">Account No:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-neutral-900 dark:text-white">{bankAccount}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(bankAccount, "Account Number")}
                          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                          title="Copy account number"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">IFSC Code:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-neutral-900 dark:text-white">{bankIfsc}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(bankIfsc, "IFSC Code")}
                          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white cursor-pointer"
                          title="Copy IFSC code"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  💡 Supports NEFT, RTGS, and IMPS from all Indian banks.
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp Proof Submission */}
          {paymentSettings?.show_whatsapp && (
            <div className="p-4 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-white">Instant Plan Approval on WhatsApp</p>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-300">
                    Send your transfer screenshot on WhatsApp to receive your single-use activation voucher key instantly.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Proof on WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Redeem Voucher / Activation Key Modal Window */}
      <RedeemVoucherModal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
      />
    </div>
  );
}
