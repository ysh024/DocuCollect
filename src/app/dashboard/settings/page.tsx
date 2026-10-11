"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle,
  Save,
  Database,
  Shield,
  ExternalLink,
  FileText,
  Phone,
  Image as ImageIcon,
  Sparkles,
  Trash2,
  FileUp,
  Clock,
  MessageSquare,
} from "lucide-react";
import { InfoPopover } from "@/components/ui/InfoPopover";
import { useToast } from "@/components/ui/Toast";
import {
  getCurrentUserAction,
  updateFirmSettingsAction,
  removeFirmLogoAction,
} from "@/app/actions/auth";
import { SquareLogoCropperModal } from "@/components/settings/SquareLogoCropperModal";
import { useDashboardData } from "@/contexts/DashboardDataContext";

export default function SettingsPage() {
  const { toast } = useToast();
  const { user: contextUser, subscription, refresh } = useDashboardData();
  const [user, setUser] = useState<any>(contextUser || null);
  const [orgName, setOrgName] = useState(contextUser?.organizationName || "");
  const [phone, setPhone] = useState(contextUser?.phone || "");
  const [email, setEmail] = useState(contextUser?.email || "");
  const [logoUrl, setLogoUrl] = useState<string | null>(contextUser?.logoUrl || null);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (contextUser) {
      setUser(contextUser);
      setOrgName(contextUser.organizationName || "");
      setEmail(contextUser.email || "");
      setPhone(contextUser.phone || "");
      setLogoUrl(contextUser.logoUrl || null);
    } else {
      getCurrentUserAction().then((u) => {
        if (u) {
          setUser(u);
          setOrgName(u.organizationName || "");
          setEmail(u.email || "");
          setPhone(u.phone || "");
          setLogoUrl(u.logoUrl || null);
        }
      });
    }
  }, [contextUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone?.trim()) {
      toast({
        title: "WhatsApp / Phone Required",
        description: "A contact phone number is mandatory so your clients can enquire about required documents.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await updateFirmSettingsAction({ firmName: orgName, email, phone: phone.trim() });
      if (result.success) {
        setSaved(true);
        toast({ title: "Settings saved", description: "Firm profile updated successfully." });
        if (refresh) await refresh(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        toast({ title: "Error saving settings", description: result.error, type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm("Are you sure you want to remove your firm logo?")) return;
    setRemovingLogo(true);
    try {
      const res = await removeFirmLogoAction();
      if (res.success) {
        setLogoUrl(null);
        toast({ title: "Logo removed", description: "Firm logo has been removed." });
        if (refresh) await refresh(true);
      } else {
        toast({ title: "Error", description: res.error || "Failed to remove logo", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setRemovingLogo(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[48px]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">General & Practice Settings</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Configure your firm details, client portal branding, and document policies.
          </p>
        </div>
      </div>

      {/* 1. TOP PRIORITY: General Settings - Firm Profile & Contact */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-sm">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>General Settings & Firm Profile</span>
            </div>
            <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700">
              Primary Practice Info
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                Firm / Organization Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Sharma & Associates CA"
                className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl p-2.5 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                Lead Advisor Name
              </label>
              <input
                type="text"
                value={user?.fullName || ""}
                readOnly
                className="w-full text-xs bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2.5 text-neutral-600 dark:text-neutral-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                <span>Email Address</span>
                <InfoPopover text="Primary login email address. Contact support if you need to transfer your account to another address." />
              </label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full text-xs bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl p-2.5 text-neutral-600 dark:text-neutral-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                <Phone className="w-3 h-3 inline mr-1 text-emerald-600 dark:text-emerald-400" /> WhatsApp / Phone Number <span className="text-rose-500 font-bold">* (Mandatory for Client Enquiries)</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl p-2.5 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition"
              />
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1">
                Mandatory: Your clients use this number to ask questions via WhatsApp directly from their document upload portal.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {saved && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Saved Successfully
              </span>
            )}
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? "Saving..." : "Save Firm Profile"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* 2. Firm Branding & Square Logo Card */}
      <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-sm">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Firm Branding & Square Logo</span>
          </div>
          <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700">
            1:1 Square Ratio · Auto-Compressed WebP
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Square Logo Box */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 dark:bg-neutral-800/60 flex items-center justify-center overflow-hidden shadow-inner p-1">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Firm Logo"
                  className="w-full h-full object-cover rounded-xl shadow-xs"
                />
              ) : (
                <div className="text-center p-2 text-neutral-400 dark:text-neutral-500">
                  <ImageIcon className="w-8 h-8 mx-auto stroke-[1.5] text-neutral-300 dark:text-neutral-600 mb-1" />
                  <span className="text-[10px] font-medium block">No Logo</span>
                </div>
              )}
            </div>
            {logoUrl && (
              <span className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-1 shadow-xs">
                <CheckCircle className="w-3 h-3 stroke-[3]" />
              </span>
            )}
          </div>

          {/* Description & Upload Controls */}
          <div className="space-y-3 flex-1 text-center sm:text-left">
            <div>
              <h3 className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                Custom Firm Logo for Client Portals
                <InfoPopover
                  title="Square Logo Guidelines"
                  text="Square format (1:1). Automatically compressed down to ~30 KB WebP so client portals load instantly while showcasing your brand."
                />
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                Displayed on client upload links (<code className="text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded text-[10px]">/upload/[token]</code>) & advisor dashboard
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 justify-center sm:justify-start pt-1">
              <button
                type="button"
                onClick={() => setIsLogoModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>{logoUrl ? "Change / Re-crop Logo" : "Upload & Crop Square Logo"}</span>
              </button>

              {logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={removingLogo}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl border border-rose-200 dark:border-rose-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{removingLogo ? "Removing..." : "Remove"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Document & Upload Policy */}
      <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-sm">
            <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Document & Portal Policy</span>
          </div>
          <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700">
            Enforced by {subscription?.plan_display_name || "Active"} Plan
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* File Upload Size Limit */}
          <div className="p-3.5 bg-neutral-50/80 dark:bg-neutral-800/50 rounded-xl border border-neutral-200/60 dark:border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <FileUp className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                Max File Upload Limit
              </span>
              <span className="text-xs font-bold text-neutral-900 dark:text-white bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 rounded-md">
                {subscription?.max_upload_size_mb || 10} MB / file
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Client uploads via secure links are strictly verified against your plan ceiling.
            </p>
            {Number(subscription?.max_upload_size_mb || 10) < 50 && (
              <div className="pt-1">
                <Link
                  href="/dashboard/billing"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 hover:text-black dark:hover:text-white underline underline-offset-2"
                >
                  <span>Upgrade to unlock up to 50 MB uploads</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Portal Link Expiry Policy */}
          <div className="p-3.5 bg-neutral-50/80 dark:bg-neutral-800/50 rounded-xl border border-neutral-200/60 dark:border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                Client Portal Link Expiry
              </span>
              <span className="text-xs font-bold text-neutral-900 dark:text-white bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-2 py-0.5 rounded-md">
                30 Days
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Client links expire automatically 30 days after creation or when all checklist items are verified. You can extend any link from the Case Details page.
            </p>
          </div>
        </div>

        {/* Client Enquiries Note */}
        <div className="p-3 bg-neutral-50/50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200/50 dark:border-neutral-800 flex items-start gap-2.5">
          <MessageSquare className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-neutral-600 dark:text-neutral-300 leading-relaxed">
            <strong>Client Enquiries & Communication:</strong> Clients can send queries directly from their upload link. Inbound client remarks trigger real-time notifications in your top navigation bar and log to the audit trail.
          </div>
        </div>
      </div>

      {/* 4. Security & Storage Status (At bottom) */}
      <div className="p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2 text-neutral-900 dark:text-white font-bold text-sm">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Security & Storage Status</span>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Active & Protected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          <div className="p-3.5 bg-neutral-50/80 dark:bg-neutral-800/50 rounded-xl border border-neutral-200/60 dark:border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-[11px] flex items-center gap-1">
                Document Storage Vault
                <InfoPopover text="High-Availability cloud storage with AES-256 encryption and automated retention policy." />
              </span>
              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">Encrypted</span>
            </div>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
              AES-256 cloud encryption with automatic retention management
            </p>
          </div>

          <div className="p-3.5 bg-neutral-50/80 dark:bg-neutral-800/50 rounded-xl border border-neutral-200/60 dark:border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-[11px] flex items-center gap-1">
                Authentication System
                <InfoPopover text="Passwordless OTP verification with cryptographically signed sessions. Zero password breach risk." />
              </span>
              <span className="text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-medium px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">OTP-Only</span>
            </div>
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400">Passwordless One-Time Code verification</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
            <Shield className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
            <span>Account ID: <code className="font-mono text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-[11px]">{user?.organizationId || "—"}</code></span>
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Enterprise-grade compliance ready
          </span>
        </div>
      </div>

      {/* Interactive 1:1 Square Logo Crop & Compression Modal */}
      <SquareLogoCropperModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
        onSuccess={async (newLogoUrl) => {
          setLogoUrl(newLogoUrl);
          if (refresh) await refresh(true);
        }}
      />
    </div>
  );
}
