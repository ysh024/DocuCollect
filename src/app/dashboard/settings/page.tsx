"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  Check,
  Save,
  Database,
  Shield,
  ExternalLink,
  LogOut,
  FileCheck2,
  Phone,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { getCurrentUserAction, updateFirmSettingsAction, handleLogoutAction } from "@/app/actions/auth";

export default function SettingsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [orgName, setOrgName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [maxFileSize, setMaxFileSize] = useState("10");
  const [defaultExpiryDays, setDefaultExpiryDays] = useState("30");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    getCurrentUserAction().then((u) => {
      if (u) {
        setUser(u);
        setOrgName(u.organizationName || "");
        setEmail(u.email || "");
        setPhone(u.phone || "");
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await updateFirmSettingsAction({ firmName: orgName, email, phone });
      if (result.success) {
        setSaved(true);
        toast({ title: "Settings saved", description: "Firm profile updated successfully." });
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

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await handleLogoutAction();
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Settings</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage your firm profile, contact details, and document policies.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={loggingOut}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 transition-colors self-start"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{loggingOut ? "Signing Out..." : "Sign Out"}</span>
        </button>
      </div>

      {/* Security & Infrastructure Status */}
      <div className="p-5 bg-white rounded-xl border border-neutral-200/80 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2 text-neutral-900 font-semibold text-xs">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Security & Storage Status</span>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            Active & Protected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          <div className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-800 text-[11px]">Document Storage Vault</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-medium px-1.5 py-0.5 rounded border border-emerald-200">Encrypted</span>
            </div>
            <p className="text-[11px] text-neutral-600">
              AES-256 cloud encryption with automatic retention management
            </p>
            <p className="text-[10px] text-neutral-500">
              Storage: <strong className="text-neutral-700">High-Availability Cloud</strong> · Auto-purge enabled
            </p>
          </div>

          <div className="p-3.5 bg-neutral-50/80 rounded-xl border border-neutral-200/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-800 text-[11px]">Authentication System</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-medium px-1.5 py-0.5 rounded border border-blue-200">OTP-Only</span>
            </div>
            <p className="text-[11px] text-neutral-600">Passwordless One-Time Code verification</p>
            <p className="text-[10px] text-neutral-500">
              Zero password leak risk · Cryptographically signed sessions
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
            <Shield className="w-3.5 h-3.5 text-neutral-400" />
            <span>Account ID: <code className="font-mono text-neutral-800 bg-neutral-100 px-1.5 py-0.5 rounded text-[11px]">{user?.organizationId || "—"}</code></span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            Enterprise-grade compliance ready
          </span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Firm Profile */}
        <div className="p-5 bg-white rounded-xl border border-neutral-200/80 space-y-4">
          <div className="flex items-center gap-2 text-neutral-900 font-semibold text-xs border-b border-neutral-100 pb-3">
            <Building2 className="w-4 h-4" />
            <span>Firm Profile & Contact</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                Firm / Organization Name
              </label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2.5 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                Lead Consultant Name
              </label>
              <input
                type="text"
                value={user?.fullName || ""}
                readOnly
                className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 text-neutral-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 text-neutral-600 cursor-not-allowed"
              />
              <p className="text-[10px] text-neutral-400 mt-1">Email cannot be changed. Contact support if needed.</p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                <Phone className="w-3 h-3 inline mr-1" /> WhatsApp / Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2.5 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          </div>
        </div>

        {/* Document Policy */}
        <div className="p-5 bg-white rounded-xl border border-neutral-200/80 space-y-4">
          <div className="flex items-center gap-2 text-neutral-900 font-semibold text-xs border-b border-neutral-100 pb-3">
            <FileCheck2 className="w-4 h-4" />
            <span>Document & Upload Policy</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                Client Portal Link Expiry
              </label>
              <select
                value={defaultExpiryDays}
                onChange={(e) => setDefaultExpiryDays(e.target.value)}
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2.5 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                <option value="7">7 Days</option>
                <option value="14">14 Days</option>
                <option value="30">30 Days (Recommended)</option>
                <option value="60">60 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                Max Upload File Size
              </label>
              <select
                value={maxFileSize}
                onChange={(e) => setMaxFileSize(e.target.value)}
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2.5 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                <option value="5">5 MB (Light)</option>
                <option value="10">10 MB (Free plan)</option>
                <option value="25">25 MB (Starter)</option>
                <option value="50">50 MB (Professional)</option>
              </select>
              <p className="text-[10px] text-neutral-400 mt-1">Actual limit depends on your active plan.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <Check className="w-4 h-4" /> Saved
            </span>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{loading ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
