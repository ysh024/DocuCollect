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
  Key,
} from "lucide-react";
import { RedeemVoucherModal } from "@/components/dashboard/RedeemVoucherModal";
import { InfoPopover } from "@/components/ui/InfoPopover";
import {
  getSubscriptionAction,
  getAllPlansAction,
  redeemLicenseKeyAction,
  getPublicPaymentSettingsAction,
  type PublicPaymentSettings,
} from "@/app/actions/portal";
import { useToast } from "@/components/ui/Toast";
import { useDashboardData } from "@/contexts/DashboardDataContext";

let globalPlansCache: any[] | null = null;
let globalPaymentSettingsCache: PublicPaymentSettings | null = null;

export default function BillingPage() {
  const { toast } = useToast();
  const { subscription: contextSub, refresh } = useDashboardData();
  const [subscription, setSubscription] = useState<any>(contextSub || null);
  const [plans, setPlans] = useState<any[]>(globalPlansCache || []);
  const [paymentSettings, setPaymentSettings] = useState<PublicPaymentSettings | null>(globalPaymentSettingsCache);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // License Key Redemption
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [sub, pl, pay] = await Promise.all([
        getSubscriptionAction(),
        !globalPlansCache ? getAllPlansAction() : Promise.resolve(globalPlansCache),
        !globalPaymentSettingsCache ? getPublicPaymentSettingsAction() : Promise.resolve(globalPaymentSettingsCache),
      ]);
      if (sub) setSubscription(sub);
      if (pl) {
        globalPlansCache = pl;
        setPlans(pl);
      }
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
        if (refresh) await refresh(true);
      } else {
        toast({ title: "Redemption Failed", description: res.error || "Invalid license key", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to redeem license key", type: "error" });
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

  const contactPhone = paymentSettings?.contact_phone || "+919876543210";
  const contactEmail = paymentSettings?.contact_email || "support@docucollect.in";
  const upiId = paymentSettings?.upi_id || "docucollect@upi";
  const bankName = paymentSettings?.bank_name || "State Bank of India";
  const bankHolder = paymentSettings?.bank_holder || "DocuCollect Technologies";
  const bankAccount = paymentSettings?.bank_account || "3982001100234";
  const bankIfsc = paymentSettings?.bank_ifsc || "SBIN0001234";

  const cleanPhone = contactPhone.replace(/[^0-9]/g, "");
  const waMessage = encodeURIComponent(
    `Hello DocuCollect, I have completed payment for subscription upgrade. Please issue my license key for account: ${subscription?.email || ""}`
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
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                isActive
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : isTrial
                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
              }`}
            >
              {subscription?.plan_display_name || "Free Trial"}
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
      <div className="p-5 bg-white rounded-2xl border border-neutral-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-neutral-900">Current Subscription</h2>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              isActive
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                : isTrial
                ? "bg-amber-100 text-amber-800 border border-amber-200"
                : "bg-red-100 text-red-700 border border-red-200"
            }`}
          >
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />}
            {subscription?.status === "trial"
              ? "Free Trial Active"
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
              <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0 border border-neutral-200/80">
                <PlanIcon className="w-6 h-6 text-neutral-800" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-neutral-900">
                    You are on the {subscription.plan_display_name || "Free Trial"} Plan
                  </p>
                </div>
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
                    Your plan has expired. Upgrade below to keep collecting documents without interruption.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center border-t sm:border-t-0 sm:border-l border-neutral-100 pt-3 sm:pt-0 sm:pl-4 shrink-0">
                <div className="bg-neutral-50 p-2 rounded-xl border border-neutral-100 min-w-[70px]">
                  <p className="text-sm font-black text-neutral-900">{subscription.max_clients}</p>
                  <p className="text-[10px] text-neutral-500">Max Clients</p>
                </div>
                <div className="bg-neutral-50 p-2 rounded-xl border border-neutral-100 min-w-[70px]">
                  <p className="text-sm font-black text-neutral-900">{subscription.file_retention_days}d</p>
                  <p className="text-[10px] text-neutral-500">Retention</p>
                </div>
                <div className="bg-neutral-50 p-2 rounded-xl border border-neutral-100 min-w-[70px]">
                  <p className="text-sm font-black text-neutral-900">{subscription.max_upload_size_mb || 10}MB</p>
                  <p className="text-[10px] text-neutral-500">Max Upload</p>
                </div>
              </div>
            </div>

            {/* Quota Usage Bar */}
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-neutral-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-neutral-500" />
                  Client Quota Usage
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
          <div className="h-20 bg-neutral-50 rounded-xl animate-pulse" />
        )}
      </div>

      {/* Trial Expiry Warning */}
      {isTrial && trialDaysLeft !== null && trialDaysLeft <= 7 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">Your trial expires in {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Upgrade below to maintain uninterrupted client link access and secure document storage.
            </p>
          </div>
        </div>
      )}

      {/* 3. Available Plans Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-neutral-900">Available Plans for Your Practice</h2>
          <Link
            href="/pricing"
            className="text-[11px] text-neutral-500 hover:text-neutral-900 font-medium inline-flex items-center gap-1"
          >
            <span>Compare full features</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {plans.length > 0 ? (
            plans.map((plan: any) => {
              const Icon = planIcons[plan.name] || Zap;
              const isCurrent = plan.name === subscription?.plan_name;
              return (
                <div
                  key={plan.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                    isCurrent
                      ? "border-emerald-500 bg-emerald-50/30 shadow-xs ring-1 ring-emerald-500/20"
                      : "border-neutral-200 bg-white hover:border-neutral-300 shadow-2xs"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
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

                    <ul className="space-y-1.5 mb-4">
                      {(plan.features || []).map((f: string) => (
                        <li key={f} className="flex items-center gap-1.5 text-xs text-neutral-600">
                          <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    {!isCurrent ? (
                      <a
                        href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                          `Hello DocuCollect! I would like to upgrade my account (${subscription?.email || ""}) to the *${plan.display_name}* plan (${plan.price_monthly ? `₹${plan.price_monthly}/month` : ""}). Please share UPI payment details and issue my activation voucher key.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-center py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs hover:shadow"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-white" />
                        <span>Upgrade via WhatsApp</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <div className="w-full text-center py-2.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                        Current Active Plan
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 h-32 bg-neutral-50 rounded-xl animate-pulse" />
          )}
        </div>
      </div>

      {/* 4. Payment Details (Managed via Admin Panel) */}
      {hasAnyPaymentVisible && (
        <div className="p-5 bg-white rounded-2xl border border-neutral-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Payment & Upgrade Channels
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Pay via UPI or Net Banking and share screenshot on WhatsApp to receive your instant activation voucher key.
              </p>
            </div>
            <InfoPopover
              title="Official Payment Gateway"
              text="Payment channels are verified by DocuCollect administrators. After payment, send confirmation on WhatsApp to immediately obtain your license voucher."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* UPI Payment Box */}
            {paymentSettings?.show_upi && (
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-emerald-600" />
                      UPI Payment (First Priority)
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                      Instant Approval
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mb-2">
                    Scan or transfer using Google Pay, PhonePe, Paytm, or BHIM:
                  </p>

                  <div className="p-2.5 bg-white rounded-lg border border-neutral-200 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] text-neutral-400 uppercase font-semibold">UPI ID</p>
                      <code className="text-xs font-mono font-bold text-neutral-800">{upiId}</code>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(upiId, "UPI ID")}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === "UPI ID" ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "UPI ID" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] text-neutral-500">
                    💡 Mention your registered email ({subscription?.email || "account"}) in UPI remarks.
                  </div>

                  <a
                    href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                      `Hello DocuCollect! I have made payment via UPI to ${upiId} for subscription upgrade.\n\nAccount Email: ${subscription?.email || ""}\nSending payment screenshot now. Please dispatch my activation voucher key.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Send UPI Screenshot on WhatsApp</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>
              </div>
            )}

            {/* Direct Bank Transfer Box */}
            {paymentSettings?.show_bank && (
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-neutral-700" />
                      Bank Transfer (NEFT / IMPS)
                    </span>
                    <span className="text-[10px] bg-neutral-200 text-neutral-700 font-semibold px-2 py-0.5 rounded">
                      Bank Transfer
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs bg-white p-2.5 rounded-lg border border-neutral-200">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 text-[11px]">Bank:</span>
                      <span className="font-semibold text-neutral-800">{bankName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 text-[11px]">Beneficiary:</span>
                      <span className="font-semibold text-neutral-800">{bankHolder}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 text-[11px]">Account No:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-neutral-900">{bankAccount}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(bankAccount, "Account Number")}
                          className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                          title="Copy account number"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500 text-[11px]">IFSC Code:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-neutral-900">{bankIfsc}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(bankIfsc, "IFSC Code")}
                          className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                          title="Copy IFSC code"
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
            )}
          </div>

          {/* WhatsApp Proof Submission */}
          {paymentSettings?.show_whatsapp && (
            <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900">Instant Plan Approval on WhatsApp</p>
                  <p className="text-[11px] text-neutral-600">
                    Send your UPI transfer screenshot on WhatsApp to receive your single-use activation voucher key instantly.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition"
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

      {/* 5. Redeem License Key Voucher Card */}
      <div className="p-5 bg-neutral-50 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
              <Ticket className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                Redeem Activation Key / Voucher
                <InfoPopover
                  title="Single-Use License Protection"
                  text="Each activation voucher is single-use and permanently binds to your account. Plan benefits activate immediately."
                />
              </h2>
              <p className="text-[11px] text-neutral-500">
                Have an activation voucher? Enter your code below to upgrade immediately.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex text-[10px] font-semibold text-neutral-600 bg-neutral-200/70 border border-neutral-300 px-2 py-0.5 rounded-full">
            Instant Activation
          </span>
        </div>

        <form onSubmit={handleRedeemKey} className="flex flex-col sm:flex-row gap-2 pt-1">
          <input
            type="text"
            required
            placeholder="e.g. DOCU-PRO-YR-A4F1-9E28"
            value={licenseKeyInput}
            onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
            className="flex-1 bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs font-mono uppercase font-bold text-neutral-900 placeholder:normal-case placeholder:font-normal placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 shadow-inner"
          />
          <button
            type="submit"
            disabled={redeeming || !licenseKeyInput.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{redeeming ? "Verifying..." : "Redeem Voucher"}</span>
          </button>
        </form>
      </div>

      {/* Redeem Voucher / Activation Key Modal Window */}
      <RedeemVoucherModal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
      />
    </div>
  );
}
