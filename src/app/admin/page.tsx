"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  KeyRound,
  Sparkles,
  Copy,
  CheckCircle,
  RefreshCw,
  Ban,
  Users,
  Building2,
  Ticket,
  Lock,
  Mail,
  ArrowRight,
  ExternalLink,
  Search,
  MessageSquare,
  AlertCircle,
  Layers,
  Crown,
  Shield,
  Zap,
  CreditCard,
} from "lucide-react";
import type { PublicPaymentSettings } from "@/app/actions/portal";
import { useToast } from "@/components/ui/Toast";

export default function AdminPortalPage() {
  const { toast } = useToast();

  // Authentication State
  const [adminSecret, setAdminSecret] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"generate" | "ledger" | "direct" | "users" | "payment">("generate");

  // Payment & Billing Settings
  const [paymentSettings, setPaymentSettings] = useState<PublicPaymentSettings>({
    upi_id: "7290964963@kotak811",
    bank_name: "State Bank of India",
    bank_holder: "DocuCollect Technologies",
    bank_account: "3982001100234",
    bank_ifsc: "SBIN0001234",
    contact_email: "support@docucollect.in",
    contact_phone: "+919718871979",
    show_upi: true,
    show_bank: true,
    show_whatsapp: true,
  });
  const [savingPayment, setSavingPayment] = useState(false);

  // Overview Data
  const [stats, setStats] = useState<any>({ totalUsers: 0, totalOrgs: 0, activeKeys: 0, redeemedKeys: 0 });
  const [keysList, setKeysList] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Key Generator Form
  const [genPlan, setGenPlan] = useState<"starter" | "pro">("starter");
  const [genPeriod, setGenPeriod] = useState<"monthly" | "yearly">("monthly");
  const [genNotes, setGenNotes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [lastGeneratedKey, setLastGeneratedKey] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [dispatchPhone, setDispatchPhone] = useState("");

  // Direct Activation Form
  const [directEmail, setDirectEmail] = useState("");
  const [directPlan, setDirectPlan] = useState("starter");
  const [directPeriod, setDirectPeriod] = useState<"monthly" | "yearly">("monthly");
  const [directActivating, setDirectActivating] = useState(false);
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | null>(null);

  // Ledger Search & Filter
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerFilter, setLedgerFilter] = useState<"all" | "active" | "redeemed" | "revoked">("all");

  // Check stored admin session
  useEffect(() => {
    const savedSecret = sessionStorage.getItem("dc_admin_secret");
    const savedEmail = sessionStorage.getItem("dc_admin_email");
    if (savedSecret) {
      setAdminSecret(savedSecret);
      if (savedEmail) setAdminEmail(savedEmail);
      verifyAndLoad(savedSecret, savedEmail || undefined);
    }
  }, []);

  const callAdminAction = async (
    actionType: string,
    payload?: any,
    overrides?: { secret?: string; email?: string }
  ) => {
    const secret =
      overrides?.secret ||
      adminSecret ||
      (typeof window !== "undefined" ? sessionStorage.getItem("dc_admin_secret") : "") ||
      "";
    const email =
      overrides?.email ||
      adminEmail ||
      (typeof window !== "undefined" ? sessionStorage.getItem("dc_admin_email") : "") ||
      "";

    const res = await fetch("/api/admin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionType, adminSecret: secret, adminEmail: email, payload }),
    });
    return await res.json();
  };

  const verifyAndLoad = async (secret: string, email?: string) => {
    setAuthLoading(true);
    try {
      const res = await callAdminAction("overview", undefined, { secret, email });

      if (res?.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem("dc_admin_secret", secret);
        if (email) sessionStorage.setItem("dc_admin_email", email);
        setStats(res.stats);
        setKeysList(res.keys || []);
        setRecentUsers(res.recentUsers || []);

        callAdminAction("get_payment", undefined, { secret, email })
          .then((pRes) => {
            if (pRes?.settings) setPaymentSettings(pRes.settings);
          })
          .catch(console.error);
      } else {
        sessionStorage.removeItem("dc_admin_secret");
        sessionStorage.removeItem("dc_admin_email");
        toast({ title: "Authentication Failed", description: res?.error || "Invalid secret key or email" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to authenticate" });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPayment(true);
    try {
      const res = await callAdminAction("save_payment", { settings: paymentSettings });
      if (res?.success) {
        toast({ title: "Settings Saved!", description: "Public payment information updated in database." });
      } else {
        toast({ title: "Save Failed", description: res?.error || "Could not update payment settings", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setSavingPayment(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSecret.trim() || !adminEmail.trim()) {
      toast({
        title: "Admin Credentials Required",
        description: "Please enter both Admin Secret and authorized Admin Email.",
      });
      return;
    }
    verifyAndLoad(adminSecret.trim(), adminEmail.trim());
  };

  const handleLogout = () => {
    sessionStorage.removeItem("dc_admin_secret");
    sessionStorage.removeItem("dc_admin_email");
    setIsAuthenticated(false);
    setAdminSecret("");
    setAdminEmail("");
    setLastGeneratedKey(null);
  };

  const reloadData = async () => {
    if (!adminSecret) return;
    setLoadingData(true);
    try {
      const res = await callAdminAction("overview");
      if (res?.success) {
        setStats(res.stats);
        setKeysList(res.keys || []);
        setRecentUsers(res.recentUsers || []);
        toast({ title: "Refreshed", description: "Admin data up to date." });
      }
    } finally {
      setLoadingData(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    toast({ title: "Copied!", description: text });
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate Single-Use License Key
  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const payload = {
        planName: genPlan,
        period: genPeriod,
        notes: genNotes.trim(),
      };
      const res = await callAdminAction("generate_key", payload);

      if (res?.success) {
        setLastGeneratedKey(res.key);
        setGenNotes("");
        toast({ title: "Key Created!", description: res.key.code });
        // Refresh keys
        const refreshed = await callAdminAction("keys");
        if (refreshed?.success) setKeysList(refreshed.keys || []);
      } else {
        toast({ title: "Generation Failed", description: res?.error });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message });
    } finally {
      setGenerating(false);
    }
  };

  // Revoke Key
  const handleRevoke = async (keyId: string) => {
    if (!confirm("Are you sure you want to deactivate this license key permanently?")) return;
    try {
      const res = await callAdminAction("revoke_key", { keyId });
      if (res?.success) {
        toast({ title: "Key Revoked", description: "License key is now deactivated." });
        const refreshed = await callAdminAction("keys");
        if (refreshed?.success) setKeysList(refreshed.keys || []);
      } else {
        toast({ title: "Error", description: res?.error });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message });
    }
  };

  // Direct Account Upgrade
  const handleDirectActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectActivating(true);
    try {
      const payload = {
        userEmail: directEmail.trim() || undefined,
        planName: directPlan,
        period: directPeriod,
        paymentMethod: "admin_direct",
        paymentNotes: "Activated via Admin Portal",
      };
      const res = await callAdminAction("activate_subscription", payload);

      if (res?.success) {
        toast({ title: "Account Upgraded!", description: res.message });
        setDirectEmail("");
        await reloadData();
      } else {
        toast({ title: "Activation Failed", description: res?.error });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message });
    } finally {
      setDirectActivating(false);
    }
  };

  // Admin Account Deactivation / Reactivation Handler
  const handleToggleDeactivation = async (userId: string, deactivate: boolean, email: string) => {
    const actionVerb = deactivate ? "deactivate" : "reactivate";
    const confirmed = window.confirm(
      `Are you sure you want to ${actionVerb} the account for ${email}?\n\n${
        deactivate
          ? "This will immediately revoke their access to the dashboard and prevent them from signing in."
          : "This will restore dashboard access and allow the user to sign in normally."
      }`
    );
    if (!confirmed) return;

    setDeactivatingUserId(userId);
    try {
      const res = await callAdminAction("toggle_deactivation", { userId, deactivate });

      if (!res?.success) {
        toast({
          title: "Action Failed",
          description: res?.error || `Failed to ${actionVerb} account.`,
        });
      } else {
        toast({
          title: deactivate ? "Account Deactivated" : "Account Reactivated",
          description: res.message,
        });
        await reloadData();
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || `An error occurred while attempting to ${actionVerb} account.`,
      });
    } finally {
      setDeactivatingUserId(null);
    }
  };

  // Filtered keys
  const filteredKeys = keysList.filter((k) => {
    const matchesFilter =
      ledgerFilter === "all" ||
      (ledgerFilter === "active" && k.status === "active") ||
      (ledgerFilter === "redeemed" && k.status === "redeemed") ||
      (ledgerFilter === "revoked" && k.status === "revoked");

    const matchesSearch =
      !ledgerSearch ||
      k.code.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      (k.notes && k.notes.toLowerCase().includes(ledgerSearch.toLowerCase())) ||
      (k.redeemed_by_email && k.redeemed_by_email.toLowerCase().includes(ledgerSearch.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  // Security Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">DocuCollect Admin Console</h1>
            <p className="text-xs text-neutral-400">
              Restricted administrative authority. Enter your verified admin email and secret key to issue single-use license vouchers and manage accounts.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Authorized Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="e.g. yashveer2024@gmail.com"
                  className="w-full bg-neutral-800/90 border border-neutral-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Admin Secret Key
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  placeholder="Enter ADMIN_SECRET..."
                  className="w-full bg-neutral-800/90 border border-neutral-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading || !adminSecret.trim() || !adminEmail.trim()}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl text-xs transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <span>{authLoading ? "Authenticating..." : "Authorize Access"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2">
            <Link
              href="/dashboard"
              className="text-xs text-neutral-500 hover:text-neutral-300 transition inline-flex items-center gap-1"
            >
              <span>← Back to standard dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-16 overflow-y-scroll [scrollbar-gutter:stable]">
      {/* Top Navbar */}
      <header className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-neutral-950 flex items-center justify-center font-black text-sm shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">DocuCollect</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                  ADMIN CONSOLE
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">License Authority & Account Operations</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {adminEmail && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-lg font-mono" title={`Authorized Admin: ${adminEmail}`}>
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate max-w-[220px]">{adminEmail}</span>
              </div>
            )}

            <button
              type="button"
              onClick={reloadData}
              disabled={loadingData}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? "animate-spin" : ""}`} />
            </button>

            <Link
              href="/dashboard"
              className="text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded-lg transition hidden sm:inline-flex items-center gap-1.5"
            >
              <span>Client Dashboard</span>
              <ExternalLink className="w-3 h-3 text-neutral-500" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 border border-rose-800/60 px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              Lock Console
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-1">
            <span className="text-[11px] text-neutral-400 uppercase font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-neutral-400" />
              Total Users
            </span>
            <p className="text-2xl font-black text-white">{stats.totalUsers}</p>
          </div>

          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-1">
            <span className="text-[11px] text-neutral-400 uppercase font-semibold flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-neutral-400" />
              Organizations
            </span>
            <p className="text-2xl font-black text-white">{stats.totalOrgs}</p>
          </div>

          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-1">
            <span className="text-[11px] text-emerald-400 uppercase font-semibold flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-emerald-400" />
              Unredeemed Keys
            </span>
            <p className="text-2xl font-black text-emerald-400">{stats.activeKeys}</p>
          </div>

          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-1">
            <span className="text-[11px] text-blue-400 uppercase font-semibold flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
              Redeemed Keys
            </span>
            <p className="text-2xl font-black text-blue-400">{stats.redeemedKeys}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab("generate")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "generate"
                ? "bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate License Key</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "ledger"
                ? "bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>Key Ledger ({keysList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("direct")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "direct"
                ? "bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Direct Account Upgrade</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "users"
                ? "bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Registered Users</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("payment")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "payment"
                ? "bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Public Payment Details</span>
          </button>
        </div>

        {/* Tab Workspaces Container with stable minimum height */}
        <div className="min-h-[580px]">
          {/* WORKSPACE 1: Generate License Key */}
          {activeTab === "generate" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                Issue Single-Use License Key
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Generate a unique cryptographic voucher for a paying client. Once redeemed, the key is permanently locked and cannot be shared.
              </p>
            </div>

            <form onSubmit={handleGenerateKey} className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1.5">
                    Plan Tier *
                  </label>
                  <select
                    value={genPlan}
                    onChange={(e) => setGenPlan(e.target.value as any)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="starter">Starter Plan (25 clients, 30d retention)</option>
                    <option value="pro">Professional Plan (100 clients, 90d retention)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1.5">
                    Billing Duration *
                  </label>
                  <select
                    value={genPeriod}
                    onChange={(e) => setGenPeriod(e.target.value as any)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="monthly">Monthly (30 Days)</option>
                    <option value="yearly">Yearly (365 Days)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1.5">
                    Customer Name / UPI Ref (Optional)
                  </label>
                  <input
                    type="text"
                    value={genNotes}
                    onChange={(e) => setGenNotes(e.target.value)}
                    placeholder="e.g. CA Amit Sharma - PhonePe txn #8192"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>{generating ? "Generating Cryptographic Key..." : "Generate Single-Use License Key"}</span>
              </button>
            </form>

            {/* Display Newly Generated Key */}
            {lastGeneratedKey && (
              <div className="p-5 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Key Ready to Dispatch to Customer
                  </span>
                  <span className="text-[10px] bg-emerald-900/80 text-emerald-200 border border-emerald-700/60 px-2 py-0.5 rounded font-mono uppercase font-bold">
                    {lastGeneratedKey.plan_name} · {lastGeneratedKey.period}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <code className="w-full sm:flex-1 font-mono text-base font-black bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-emerald-300 select-all tracking-wide">
                    {lastGeneratedKey.code}
                  </code>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(lastGeneratedKey.code, "Key")}
                    className="w-full sm:w-auto px-4 py-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Copy className="w-4 h-4" />
                    <span>{copiedKey === "Key" ? "Copied!" : "Copy Key"}</span>
                  </button>
                </div>

                <div className="p-3 bg-neutral-900/90 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Send Voucher on WhatsApp (Primary Channel)</span>
                    </label>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="tel"
                      value={dispatchPhone}
                      onChange={(e) => setDispatchPhone(e.target.value)}
                      placeholder="Customer WhatsApp Number (e.g. +91 98765 43210)"
                      className="w-full sm:flex-1 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                    />
                    <a
                      href={`https://wa.me/${dispatchPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                        `Hello! Here is your one-time DocuCollect license voucher key: *${lastGeneratedKey.code}* (${lastGeneratedKey.plan_name.toUpperCase()} - ${lastGeneratedKey.period.toUpperCase()}).\n\nPlease redeem it on your DocuCollect Billing page under "Redeem Key / Voucher" to instantly activate your plan.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Dispatch on WhatsApp</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </a>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-400">
                  💡 Send this key to the customer via WhatsApp. When they enter it under "Redeem Key / Voucher" on their Billing page, their plan activates instantly.
                </p>
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE 2: License Key Ledger */}
        {activeTab === "ledger" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-emerald-400" />
                  License Key Ledger
                </h2>
                <p className="text-xs text-neutral-400">Audit trail of all keys issued and redeemed.</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="Search code, email, notes..."
                    className="bg-neutral-800 border border-neutral-700 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 w-48"
                  />
                </div>

                <select
                  value={ledgerFilter}
                  onChange={(e) => setLedgerFilter(e.target.value as any)}
                  className="bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Keys</option>
                  <option value="active">Active (Unredeemed)</option>
                  <option value="redeemed">Redeemed</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="border border-neutral-800 rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="py-3 px-4">License Code</th>
                    <th className="py-3 px-3">Plan & Period</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4">Redemption Details</th>
                    <th className="py-3 px-4">Notes / Customer Ref</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
                  {filteredKeys.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-500">
                        No license keys match your filter.
                      </td>
                    </tr>
                  ) : (
                    filteredKeys.map((k) => (
                      <tr key={k.id} className="hover:bg-neutral-800/40 transition">
                        <td className="py-3 px-4">
                          <code className="font-mono font-bold text-white text-xs select-all">{k.code}</code>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[11px] text-neutral-300 uppercase font-semibold">
                            {k.plan_name} ({k.period})
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {k.status === "active" && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Unredeemed
                            </span>
                          )}
                          {k.status === "redeemed" && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-neutral-800 text-neutral-300 border border-neutral-700 px-2 py-0.5 rounded-full">
                              Redeemed
                            </span>
                          )}
                          {k.status === "revoked" && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded-full">
                              Revoked
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-neutral-300">
                          {k.status === "redeemed" ? (
                            <div>
                              <p className="font-semibold text-emerald-400 text-xs">{k.redeemed_by_email}</p>
                              <p className="text-[10px] text-neutral-500">
                                {new Date(k.redeemed_at).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          ) : (
                            <span className="text-neutral-500 italic">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-neutral-400 text-[11px]">
                          {k.notes || <span className="text-neutral-600">—</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(k.code, k.code)}
                              className="p-1.5 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition"
                              title="Copy Code"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {k.status === "active" && (
                              <a
                                href={`https://wa.me/?text=${encodeURIComponent(
                                  `Hello! Here is your one-time DocuCollect license voucher key: *${k.code}* (${k.plan_name.toUpperCase()} - ${k.period.toUpperCase()}).\n\nPlease redeem it on your Billing page under "Redeem Key / Voucher" to instantly activate your plan.`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 hover:bg-emerald-950/80 rounded text-emerald-400 hover:text-emerald-300 transition"
                                title="Send Key on WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {k.status === "active" && (
                              <button
                                type="button"
                                onClick={() => handleRevoke(k.id)}
                                className="p-1.5 hover:bg-rose-950/60 rounded text-rose-400 hover:text-rose-300 transition"
                                title="Revoke Key"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* WORKSPACE 3: Direct Manual Upgrade */}
        {activeTab === "direct" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                Direct Account Upgrade (Bypass Voucher)
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Instantly upgrade any registered account by entering their email address. Useful for custom enterprise deals or direct bank confirmations.
              </p>
            </div>

            <form onSubmit={handleDirectActivation} className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1.5">
                    User Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={directEmail}
                    onChange={(e) => setDirectEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1.5">
                    Target Plan *
                  </label>
                  <select
                    value={directPlan}
                    onChange={(e) => setDirectPlan(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="starter">Starter Plan (25 clients, 30d)</option>
                    <option value="pro">Professional Plan (100 clients, 90d)</option>
                    <option value="free_trial">Free Trial Reset (10 clients, 7d)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-300 mb-1.5">
                    Period Duration *
                  </label>
                  <select
                    value={directPeriod}
                    onChange={(e) => setDirectPeriod(e.target.value as any)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="monthly">Monthly (30 Days)</option>
                    <option value="yearly">Yearly (365 Days)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={directActivating || !directEmail.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{directActivating ? "Upgrading Account..." : "Directly Activate Account"}</span>
              </button>
            </form>
          </div>
        )}

        {/* WORKSPACE 4: Registered Users */}
        {activeTab === "users" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Recent User Accounts
              </h2>
              <p className="text-xs text-neutral-400">View recent registered users and their current subscription tier.</p>
            </div>

            <div className="border border-neutral-800 rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-950 border-b border-neutral-800 text-neutral-400 uppercase text-[10px] font-semibold">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-3">Organization</th>
                    <th className="py-3 px-3">Active Plan</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4">Valid Until</th>
                    <th className="py-3 px-4 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
                  {recentUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-500">
                        No registered users found.
                      </td>
                    </tr>
                  ) : (
                    recentUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-neutral-800/40 transition">
                        <td className="py-3 px-4">
                          <p className="font-bold text-white text-xs">{u.full_name}</p>
                          <p className="text-[11px] text-neutral-400 font-mono">{u.email}</p>
                        </td>
                        <td className="py-3 px-3 text-neutral-300">{u.org_name || "—"}</td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-emerald-400">{u.plan_name || "Free Trial"}</span>
                        </td>
                        <td className="py-3 px-3">
                          {u.is_deactivated ? (
                            <span className="text-[10px] bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded text-rose-300 font-bold uppercase inline-flex items-center gap-1">
                              <Ban className="w-2.5 h-2.5 text-rose-400" />
                              Deactivated
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded text-emerald-300 font-semibold uppercase inline-flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                              {u.sub_status || "Active"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-neutral-400">
                          {u.current_period_end
                            ? new Date(u.current_period_end).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            {u.is_deactivated ? (
                              <button
                                type="button"
                                disabled={deactivatingUserId === u.id}
                                onClick={() => handleToggleDeactivation(u.id, false, u.email)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-950/80 border border-emerald-700 hover:bg-emerald-900 text-emerald-300 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <RefreshCw className={`w-3 h-3 text-emerald-400 ${deactivatingUserId === u.id ? "animate-spin" : ""}`} />
                                <span>Reactivate</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={deactivatingUserId === u.id}
                                onClick={() => handleToggleDeactivation(u.id, true, u.email)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-950/80 border border-rose-800 hover:bg-rose-900 text-rose-300 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <Ban className="w-3 h-3 text-rose-400" />
                                <span>{deactivatingUserId === u.id ? "Deactivating..." : "Deactivate"}</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setDirectEmail(u.email);
                                setActiveTab("direct");
                              }}
                              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                            >
                              Upgrade
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* WORKSPACE 5: Public Payment & Billing Display */}
        {activeTab === "payment" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Live Payment & Public Billing Details
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Customize payment receiver accounts displayed on the user Billing page. Changes save directly to the database without editing .env files.
              </p>
            </div>

            <form onSubmit={handleSavePaymentSettings} className="space-y-5">
              {/* Visibility Toggles */}
              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
                <span className="text-xs font-bold text-neutral-200 block uppercase tracking-wider">
                  Payment Channels Visibility
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer p-2.5 bg-neutral-900 rounded-xl border border-neutral-800">
                    <input
                      type="checkbox"
                      checked={paymentSettings.show_upi}
                      onChange={(e) =>
                        setPaymentSettings({ ...paymentSettings, show_upi: e.target.checked })
                      }
                      className="rounded border-neutral-700 bg-neutral-800 text-emerald-500 w-4 h-4"
                    />
                    <span>Show UPI Payment</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer p-2.5 bg-neutral-900 rounded-xl border border-neutral-800">
                    <input
                      type="checkbox"
                      checked={paymentSettings.show_bank}
                      onChange={(e) =>
                        setPaymentSettings({ ...paymentSettings, show_bank: e.target.checked })
                      }
                      className="rounded border-neutral-700 bg-neutral-800 text-emerald-500 w-4 h-4"
                    />
                    <span>Show Bank Transfer</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer p-2.5 bg-neutral-900 rounded-xl border border-neutral-800">
                    <input
                      type="checkbox"
                      checked={paymentSettings.show_whatsapp}
                      onChange={(e) =>
                        setPaymentSettings({ ...paymentSettings, show_whatsapp: e.target.checked })
                      }
                      className="rounded border-neutral-700 bg-neutral-800 text-emerald-500 w-4 h-4"
                    />
                    <span>Show WhatsApp Proof</span>
                  </label>
                </div>
              </div>

              {/* UPI & Contact Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    UPI Virtual Payment Address (VPA)
                  </label>
                  <input
                    type="text"
                    required
                    value={paymentSettings.upi_id}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, upi_id: e.target.value.trim() })
                    }
                    placeholder="e.g. yourname@okaxis"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    WhatsApp Support / Key Dispatch Phone
                  </label>
                  <input
                    type="text"
                    required
                    value={paymentSettings.contact_phone}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, contact_phone: e.target.value.trim() })
                    }
                    placeholder="+91 98765 43210"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Support / Proof Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={paymentSettings.contact_email}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, contact_email: e.target.value.trim() })
                    }
                    placeholder="billing@yourfirm.com"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={paymentSettings.bank_name}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, bank_name: e.target.value })
                    }
                    placeholder="e.g. State Bank of India / HDFC"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Account Beneficiary Name
                  </label>
                  <input
                    type="text"
                    value={paymentSettings.bank_holder}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, bank_holder: e.target.value })
                    }
                    placeholder="e.g. DocuCollect Technologies"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={paymentSettings.bank_account}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, bank_account: e.target.value.trim() })
                    }
                    placeholder="e.g. 50200012345678"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                    Bank IFSC Code
                  </label>
                  <input
                    type="text"
                    value={paymentSettings.bank_ifsc}
                    onChange={(e) =>
                      setPaymentSettings({ ...paymentSettings, bank_ifsc: e.target.value.trim().toUpperCase() })
                    }
                    placeholder="e.g. SBIN0001234"
                    className="w-full sm:w-1/2 bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono uppercase placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="submit"
                  disabled={savingPayment}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{savingPayment ? "Saving Changes..." : "Save Payment Details"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
