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
  Sparkles,
  Ticket,
  Send,
  RefreshCw,
  Ban,
  ShieldCheck,
} from "lucide-react";
import {
  getSubscriptionAction,
  getAllPlansAction,
  redeemLicenseKeyAction,
  generateLicenseKeyAction,
  getLicenseKeysAction,
  revokeLicenseKeyAction,
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

  // Customer-facing License Key Redemption
  const [licenseKeyInput, setLicenseKeyInput] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  // Admin License Management
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminTab, setAdminTab] = useState<"generate" | "keys" | "direct">("generate");

  // Admin Key Generator Form
  const [genPlan, setGenPlan] = useState<"starter" | "pro">("starter");
  const [genPeriod, setGenPeriod] = useState<"monthly" | "yearly">("monthly");
  const [genNotes, setGenNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [lastGeneratedKey, setLastGeneratedKey] = useState<any>(null);

  // Admin Keys List
  const [issuedKeys, setIssuedKeys] = useState<any[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);

  // Admin Direct Activation
  const [directEmail, setDirectEmail] = useState("");
  const [directPlan, setDirectPlan] = useState("starter");
  const [directPeriod, setDirectPeriod] = useState<"monthly" | "yearly">("monthly");
  const [directActivating, setDirectActivating] = useState(false);

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

  // 1. Redeem Single-Use License Key
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

  // 2. Unlock Admin Panel
  const handleAdminUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSecret.trim()) {
      toast({ title: "Error", description: "Please enter the Admin Secret." });
      return;
    }

    setLoadingKeys(true);
    try {
      const res = await getLicenseKeysAction({ adminSecret: adminSecret.trim() });
      if (res.success) {
        setAdminUnlocked(true);
        setIssuedKeys(res.keys || []);
        toast({ title: "Admin Mode Unlocked", description: "Authorized to issue and manage license keys." });
      } else {
        toast({ title: "Access Denied", description: res.error || "Incorrect Admin Secret key" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message });
    } finally {
      setLoadingKeys(false);
    }
  };

  // 3. Generate Single-Use License Key
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await generateLicenseKeyAction({
        adminSecret: adminSecret.trim(),
        planName: genPlan,
        period: genPeriod,
        notes: genNotes.trim(),
      });

      if (res.success) {
        setLastGeneratedKey(res.key);
        setGenNotes("");
        toast({ title: "Single-Use Key Created!", description: res.key.code });
        // Refresh keys list
        const refreshed = await getLicenseKeysAction({ adminSecret: adminSecret.trim() });
        if (refreshed.success) setIssuedKeys(refreshed.keys || []);
      } else {
        toast({ title: "Generation Failed", description: res.error });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message });
    } finally {
      setGenerating(false);
    }
  };

  // 4. Revoke License Key
  const handleRevokeKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to deactivate/revoke this key? It will become permanently invalid.")) return;
    try {
      const res = await revokeLicenseKeyAction({ adminSecret: adminSecret.trim(), keyId });
      if (res.success) {
        toast({ title: "Key Revoked", description: "License key is now deactivated." });
        const refreshed = await getLicenseKeysAction({ adminSecret: adminSecret.trim() });
        if (refreshed.success) setIssuedKeys(refreshed.keys || []);
      } else {
        toast({ title: "Error", description: res.error });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message });
    }
  };

  // 5. Admin Direct Email Upgrade
  const handleDirectActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectActivating(true);
    try {
      const res = await activateSubscriptionAction({
        adminSecret: adminSecret.trim(),
        userEmail: directEmail.trim() || undefined,
        planName: directPlan,
        period: directPeriod,
        paymentMethod: "admin_direct",
        paymentNotes: "Activated via Admin Manual Override",
      });

      if (res.success) {
        toast({ title: "Account Activated!", description: res.message });
        setDirectEmail("");
        await loadData();
      } else {
        toast({ title: "Activation Failed", description: res.error });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message });
    } finally {
      setDirectActivating(false);
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
    `Hello DocuCollect, I have completed the payment for subscription upgrade. Please issue my one-time activation license key. My account email is: `
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${waMessage}`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Billing & Subscriptions</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your subscription tier, track storage quotas, and redeem one-time license keys.
          </p>
        </div>
        <button
          onClick={() => setShowAdminPanel(!showAdminPanel)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-600 transition shadow-xs self-start"
        >
          <Lock className="w-3.5 h-3.5 text-neutral-500" />
          <span>{showAdminPanel ? "Hide Admin Tools" : "Admin Key Manager"}</span>
        </button>
      </div>

      {/* Admin Panel (Secured) */}
      {showAdminPanel && (
        <div className="p-5 bg-neutral-900 text-white rounded-2xl shadow-xl space-y-5 border border-neutral-800 transition-all">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold">Admin License Key Center</span>
            </div>
            <span className="text-[10px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded font-mono">
              Protected Admin Authority
            </span>
          </div>

          {!adminUnlocked ? (
            <form onSubmit={handleAdminUnlock} className="space-y-3 max-w-md">
              <p className="text-xs text-neutral-400">
                Enter your Admin Secret to issue single-use customer keys and track voucher redemptions. Customers do NOT see this secret.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  required
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  placeholder="Enter ADMIN_SECRET..."
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={loadingKeys}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-lg text-xs transition disabled:opacity-50"
                >
                  {loadingKeys ? "Verifying..." : "Unlock"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Navigation Tabs */}
              <div className="flex gap-2 border-b border-neutral-800 pb-2">
                <button
                  type="button"
                  onClick={() => setAdminTab("generate")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    adminTab === "generate" ? "bg-emerald-500 text-neutral-950" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Issue New Key
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab("keys")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    adminTab === "keys" ? "bg-emerald-500 text-neutral-950" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Key Ledger ({issuedKeys.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab("direct")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    adminTab === "direct" ? "bg-emerald-500 text-neutral-950" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Direct Email Upgrade
                </button>
              </div>

              {/* Tab 1: Generate Key */}
              {adminTab === "generate" && (
                <form onSubmit={handleGenerateKey} className="space-y-4">
                  <p className="text-xs text-neutral-400">
                    Generate a unique, single-use license key for a customer after verifying their UPI/Bank payment. Once the customer redeems it, the key is permanently locked and cannot be shared.
                  </p>

                  <div className="grid sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-300 mb-1">Select Plan</label>
                      <select
                        value={genPlan}
                        onChange={(e) => setGenPlan(e.target.value as any)}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="starter">Starter Plan (25 clients, 30d retention)</option>
                        <option value="pro">Professional Plan (100 clients, 90d retention)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-300 mb-1">Billing Period</label>
                      <select
                        value={genPeriod}
                        onChange={(e) => setGenPeriod(e.target.value as any)}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="monthly">Monthly (30 Days)</option>
                        <option value="yearly">Yearly (365 Days)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-300 mb-1">Customer / Payment Ref</label>
                      <input
                        type="text"
                        value={genNotes}
                        onChange={(e) => setGenNotes(e.target.value)}
                        placeholder="e.g. CA Amit - UPI ref 891283"
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="submit"
                      disabled={generating}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-lg text-xs transition disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{generating ? "Generating..." : "Generate Single-Use License Key"}</span>
                    </button>
                  </div>

                  {/* Display Generated Key */}
                  {lastGeneratedKey && (
                    <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl space-y-2 mt-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400">
                          Single-Use Key Generated (Send to Client)
                        </span>
                        <span className="text-[10px] bg-emerald-800/80 text-emerald-200 px-2 py-0.5 rounded font-mono">
                          {lastGeneratedKey.plan_name.toUpperCase()} · {lastGeneratedKey.period.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 font-mono text-sm font-black bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 text-emerald-300 select-all">
                          {lastGeneratedKey.code}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(lastGeneratedKey.code, "License Key")}
                          className="px-3 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedKey === "License Key" ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-neutral-400">
                        Give this code to the customer. When they enter it in the "Redeem License Key" box below, it will unlock their account once and expire.
                      </p>
                    </div>
                  )}
                </form>
              )}

              {/* Tab 2: Keys History Ledger */}
              {adminTab === "keys" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-neutral-400">
                      Audit trail of all generated license keys and who redeemed them.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        const refreshed = await getLicenseKeysAction({ adminSecret: adminSecret.trim() });
                        if (refreshed.success) setIssuedKeys(refreshed.keys || []);
                      }}
                      className="text-xs text-neutral-400 hover:text-white flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Refresh</span>
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-neutral-800 rounded-xl divide-y divide-neutral-800 text-xs">
                    {issuedKeys.length === 0 ? (
                      <p className="p-4 text-center text-neutral-500">No license keys generated yet.</p>
                    ) : (
                      issuedKeys.map((k) => (
                        <div key={k.id} className="p-3 flex items-center justify-between gap-3 hover:bg-neutral-800/40">
                          <div>
                            <div className="flex items-center gap-2">
                              <code className="font-mono font-bold text-white text-xs">{k.code}</code>
                              <span className="text-[10px] bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-300 uppercase">
                                {k.plan_name} ({k.period})
                              </span>
                              {k.status === "active" && (
                                <span className="text-[10px] bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.5 rounded font-medium">
                                  Unredeemed
                                </span>
                              )}
                              {k.status === "redeemed" && (
                                <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-medium">
                                  Redeemed
                                </span>
                              )}
                              {k.status === "revoked" && (
                                <span className="text-[10px] bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded font-medium">
                                  Revoked
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-400 mt-1">
                              {k.notes && <span className="text-neutral-300 mr-2">{k.notes}</span>}
                              {k.status === "redeemed" && k.redeemed_by_email && (
                                <span>Used by: <strong className="text-emerald-400">{k.redeemed_by_email}</strong> on {new Date(k.redeemed_at).toLocaleDateString()}</span>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(k.code, k.code)}
                              className="p-1.5 hover:bg-neutral-700 rounded text-neutral-400 hover:text-white transition"
                              title="Copy code"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {k.status === "active" && (
                              <button
                                type="button"
                                onClick={() => handleRevokeKey(k.id)}
                                className="p-1.5 hover:bg-red-900/50 rounded text-red-400 hover:text-red-300 transition"
                                title="Revoke key"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Direct Manual Upgrade */}
              {adminTab === "direct" && (
                <form onSubmit={handleDirectActivation} className="space-y-4">
                  <p className="text-xs text-neutral-400">
                    Directly upgrade an account by user email without issuing a voucher code.
                  </p>
                  <div className="grid sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-300 mb-1">Target User Email *</label>
                      <input
                        type="email"
                        required
                        value={directEmail}
                        onChange={(e) => setDirectEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-300 mb-1">Select Plan</label>
                      <select
                        value={directPlan}
                        onChange={(e) => setDirectPlan(e.target.value)}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="starter">Starter Plan</option>
                        <option value="pro">Professional Plan</option>
                        <option value="free_trial">Free Trial Reset</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-300 mb-1">Billing Period</label>
                      <select
                        value={directPeriod}
                        onChange={(e) => setDirectPeriod(e.target.value as any)}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="monthly">Monthly (30 Days)</option>
                        <option value="yearly">Yearly (365 Days)</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={directActivating}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-lg text-xs transition disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{directActivating ? "Upgrading..." : "Directly Activate Account"}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Customer License Key Redemption Card */}
      <div className="p-5 bg-gradient-to-br from-emerald-50/70 via-white to-neutral-50 rounded-2xl border-2 border-emerald-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">Redeem License Key / Voucher</h2>
              <p className="text-[11px] text-neutral-500">
                Received a single-use activation code after payment? Enter it here to upgrade immediately.
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
            placeholder="Enter key e.g. DOCU-PRO-YR-A4F1-9E28"
            value={licenseKeyInput}
            onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
            className="flex-1 bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-xs font-mono uppercase font-bold text-neutral-900 placeholder:normal-case placeholder:font-normal placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={redeeming || !licenseKeyInput.trim()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 shrink-0"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{redeeming ? "Verifying..." : "Redeem License Key"}</span>
          </button>
        </form>
        <p className="text-[10px] text-neutral-500 flex items-center gap-1.5">
          <span>🔒 Each license key is uniquely signed and can only be redeemed once. Once redeemed, it cannot be shared or reused by any other account.</span>
        </p>
      </div>

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
            Pay directly via UPI or Net Banking. Once paid, send screenshot on WhatsApp to receive your single-use license key.
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

        {/* WhatsApp & Email Notification for Key Issuance */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-900">Send Payment Proof to Get License Key</p>
              <p className="text-[11px] text-neutral-600">
                Send screenshot on WhatsApp to receive your unique, single-use activation key within 15 minutes.
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
