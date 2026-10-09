"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Crown,
  Shield,
  Zap,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  Building,
  QrCode,
  MessageSquare,
  KeyRound,
  Users,
  HardDrive,
  Calendar,
  Lock,
} from "lucide-react";
import {
  getSubscriptionAction,
  getAllPlansAction,
  activateSubscriptionAction,
} from "@/app/actions/portal";
import { useToast } from "@/components/ui/Toast";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@docucollect.in";
const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE || "+919876543210";
const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || "docucollect@upi";
const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME || "State Bank of India";
const BANK_HOLDER = process.env.NEXT_PUBLIC_BANK_HOLDER || "DocuCollect Technologies";
const BANK_ACCOUNT = process.env.NEXT_PUBLIC_BANK_ACCOUNT || "3982001100234";
const BANK_IFSC = process.env.NEXT_PUBLIC_BANK_IFSC || "SBIN0001234";

export default function BillingPage() {
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Admin / Secret activation state
  const [showAdminActivation, setShowAdminActivation] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [adminTargetEmail, setAdminTargetEmail] = useState("");
  const [adminSelectedPlan, setAdminSelectedPlan] = useState("starter");
  const [adminPeriod, setAdminPeriod] = useState<"monthly" | "yearly">("monthly");
  const [activating, setActivating] = useState(false);

  const loadData = async () => {
    const [sub, pl] = await Promise.all([
      getSubscriptionAction(),
      getAllPlansAction(),
    ]);
    if (sub) setSubscription(sub);
    if (pl) setPlans(pl);
  };

  useEffect(() => {
    loadData();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast({ title: `${label} copied!`, description: text });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAdminActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSecret.trim()) {
      toast({ title: "Error", description: "Please enter the admin activation secret." });
      return;
    }

    setActivating(true);
    try {
      const res = await activateSubscriptionAction({
        adminSecret: adminSecret.trim(),
        userEmail: adminTargetEmail.trim() || undefined,
        planName: adminSelectedPlan,
        period: adminPeriod,
        paymentMethod: "bank_or_upi",
        paymentNotes: "Activated via dashboard activation tool",
      });

      if (res.success) {
        toast({ title: "Plan Activated!", description: res.message });
        setAdminSecret("");
        setAdminTargetEmail("");
        setShowAdminActivation(false);
        await loadData();
      } else {
        toast({ title: "Activation Failed", description: res.error || "Invalid code" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to activate plan" });
    } finally {
      setActivating(false);
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
    `Hello DocuCollect Admin, I would like to activate the ${subscription?.plan_display_name || "Starter"} plan for my account. My registered email is ${subscription?.organization_id ? "DocuCollect Account" : ""}. Please find my payment details attached.`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${waMessage}`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Billing & Subscriptions</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your subscription tier, track storage quotas, and upgrade your firm's limits.
          </p>
        </div>
        <button
          onClick={() => setShowAdminActivation(!showAdminActivation)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition shadow-xs self-start"
        >
          <KeyRound className="w-3.5 h-3.5 text-neutral-500" />
          <span>{showAdminActivation ? "Hide Activation" : "Redeem / Admin Activation"}</span>
        </button>
      </div>

      {/* Admin / Secret Activation Panel */}
      {showAdminActivation && (
        <div className="p-5 bg-neutral-900 text-white rounded-2xl shadow-xl space-y-4 border border-neutral-800 transition-all">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold">Manual Plan Activation Tool</span>
            </div>
            <span className="text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded font-mono">
              Admin & Direct Mode
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Received payment via Bank or QR? Enter the admin activation key below to upgrade your firm's account or a client's account instantly.
          </p>

          <form onSubmit={handleAdminActivation} className="grid sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                Admin Secret Key *
              </label>
              <input
                type="password"
                required
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder="Enter admin secret..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                Target User Email (Optional)
              </label>
              <input
                type="email"
                value={adminTargetEmail}
                onChange={(e) => setAdminTargetEmail(e.target.value)}
                placeholder="Leave blank for your own account"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                Select Plan
              </label>
              <select
                value={adminSelectedPlan}
                onChange={(e) => setAdminSelectedPlan(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="starter">Starter Plan (25 clients, 30-day retention)</option>
                <option value="pro">Professional Plan (Unlimited clients, 90-day retention)</option>
                <option value="free_trial">Free Trial Reset (10 clients, 7-day retention)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                Billing Cycle
              </label>
              <select
                value={adminPeriod}
                onChange={(e) => setAdminPeriod(e.target.value as any)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="monthly">Monthly (30 Days)</option>
                <option value="yearly">Yearly (365 Days)</option>
              </select>
            </div>

            <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAdminActivation(false)}
                className="px-3 py-2 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={activating}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-lg transition disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{activating ? "Activating..." : "Activate Plan Instantly"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Current Plan Card */}
      <div className="p-5 bg-white rounded-xl border border-neutral-200 shadow-sm space-y-4">
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
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-900">Your trial expires in {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""}</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Upgrade today to maintain uninterrupted client link access and secure document storage.
            </p>
          </div>
        </div>
      )}

      {/* Payment Methods (Bank Transfer & UPI QR) */}
      <div className="p-5 bg-white rounded-xl border border-neutral-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            Payment & Activation Details
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Pay directly via UPI or Net Banking. Once paid, notify us for activation within a few hours.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* UPI & QR Code Box */}
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  UPI / QR Payment
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">
                  Instant Verification
                </span>
              </div>
              <p className="text-xs text-neutral-500 mb-3">
                Scan using any UPI app (Google Pay, PhonePe, Paytm, BHIM):
              </p>

              {/* UPI ID Row */}
              <div className="p-2.5 bg-white rounded-lg border border-neutral-200 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase font-semibold">UPI ID</p>
                  <code className="text-xs font-mono font-bold text-neutral-800">{UPI_ID}</code>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(UPI_ID, "UPI ID")}
                  className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition flex items-center gap-1"
                >
                  {copiedKey === "UPI ID" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === "UPI ID" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-200/70 text-[11px] text-neutral-500">
              💡 Mention your registered email address in the UPI payment note/remarks.
            </div>
          </div>

          {/* Direct Bank Transfer (NEFT/IMPS) Box */}
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-neutral-700" />
                  Direct Bank Transfer (NEFT / IMPS)
                </span>
                <span className="text-[10px] bg-neutral-200 text-neutral-700 font-semibold px-2 py-0.5 rounded">
                  Bank Account
                </span>
              </div>
              <p className="text-xs text-neutral-500 mb-3">
                Transfer directly to our official bank account:
              </p>

              <div className="space-y-1.5 text-xs bg-white p-3 rounded-lg border border-neutral-200">
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
                      className="text-neutral-400 hover:text-neutral-700"
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
                      className="text-neutral-400 hover:text-neutral-700"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-200/70 text-[11px] text-neutral-500">
              💡 Supports NEFT, RTGS, and IMPS from all Indian banks.
            </div>
          </div>
        </div>

        {/* WhatsApp & Email Instant Notification */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-900">Notify Admin for Fast Activation</p>
              <p className="text-[11px] text-neutral-600">
                Send payment screenshot on WhatsApp or email for activation within 15–30 minutes.
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
              href={`mailto:${CONTACT_EMAIL}?subject=DocuCollect Plan Activation&body=Hi, I have completed the payment. Please activate my plan.`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition"
            >
              <span>Email Proof</span>
            </a>
          </div>
        </div>
      </div>

      {/* Available Plans Grid */}
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
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
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
