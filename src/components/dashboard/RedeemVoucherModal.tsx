"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Key, X, Sparkles, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { redeemLicenseKeyAction } from "@/app/actions/portal";
import { useToast } from "@/components/ui/Toast";

interface RedeemVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RedeemVoucherModal({
  isOpen,
  onClose,
  onSuccess,
}: RedeemVoucherModalProps) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ message: string; planName?: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = () => {
    setCode("");
    setError(null);
    setSuccessData(null);
    onClose();
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError("Please enter your activation code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await redeemLicenseKeyAction({ code: cleanCode });
      if (!res.success) {
        setError(res.error || "Failed to redeem activation key.");
      } else {
        setSuccessData({
          message: res.message || "Your plan has been activated successfully!",
          planName: res.planName,
        });
        toast({
          title: "Voucher Redeemed!",
          description: res.message || "Your subscription is now active.",
        });
        if (onSuccess) onSuccess();
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while redeeming voucher.");
    } finally {
      setLoading(false);
    }
  };

  // Render via createPortal onto document.body to escape any parent CSS stacking context / backdrop-filter
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#15181e] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        aria-labelledby="redeem-modal-title"
      >
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-start justify-between gap-3 bg-neutral-50/70 dark:bg-neutral-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-neutral-800 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Key className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 id="redeem-modal-title" className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                Redeem Activation Key / Voucher
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Instant plan activation with zero waiting time
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            title="Close modal"
            className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {successData ? (
            <div className="py-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Plan Activated Successfully!
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  {successData.message}
                </p>
              </div>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 animate-pulse">
                Refreshing your dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="voucher-code"
                  className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
                >
                  Enter License Code
                </label>
                <div className="relative">
                  <input
                    id="voucher-code"
                    type="text"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setError(null);
                    }}
                    placeholder="DOCU-PRO-YR-XXXX-XXXX"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs font-semibold tracking-wider bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-400 transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600 uppercase"
                  />
                </div>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                  Format: <span className="font-mono">DOCU-START-MO-...</span> or <span className="font-mono">DOCU-PRO-YR-...</span>
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in duration-100">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Single-use Cryptographic Voucher</span>
                </div>
                <p className="leading-relaxed text-amber-700 dark:text-amber-400">
                  Once redeemed, the key permanently upgrades your advisory firm account and is locked to prevent reuse.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Redeem Voucher</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
