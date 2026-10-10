"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CaseWithDetails } from "@/types";
import {
  Copy,
  MessageSquareShare,
  X,
  ExternalLink,
  RefreshCw,
  Check,
  Share2,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { generateUploadLinkAction } from "@/app/actions/portal";
import { useToast } from "@/components/ui/Toast";

interface WhatsAppShareModalProps {
  caseData: CaseWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onLinkRenewed?: () => void;
  initialTab?: "single" | "picker";
}

export function WhatsAppShareModal({
  caseData,
  isOpen,
  onClose,
  onLinkRenewed,
  initialTab = "single",
}: WhatsAppShareModalProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  const [activeTab, setActiveTab] = useState<"single" | "picker">(initialTab);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const currentToken = caseData.upload_link?.token_hash || `token-${caseData.id.slice(0, 8)}`;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const clientUploadUrl = `${baseUrl}/upload/${currentToken}`;
  const orgName = (caseData as any).organization_name || "Advisory Services";

  // Document requirements summary bullets
  const reqsBullets =
    (caseData.requirements || [])
      .map((r) => `• ${r.name}${r.is_required ? " (Required)" : ""}`)
      .slice(0, 8)
      .join("\n") || "• View upload portal for full checklist";

  // 1. Assigned client message
  const assignedMessage = `Hello ${caseData.client.name},\n\nPlease upload the required documents for your *${caseData.title}* (Ref: ${caseData.reference_number}) using this secure portal link:\n\n🔗 ${clientUploadUrl}\n\nRequired Documents:\n${reqsBullets}\n\nThis portal allows you to track document approvals in real-time. Let us know if you need any assistance!\n\nBest regards,\n${orgName}`;

  const cleanAssignedPhone = caseData.client.phone.replace(/[^0-9]/g, "");
  const singleWhatsappUrl = `https://wa.me/${cleanAssignedPhone}?text=${encodeURIComponent(assignedMessage)}`;

  // 2. Universal forward message for WhatsApp Picker
  const pickerMessage = `Hello,\n\nPlease review and upload the required documents for *${caseData.title}* (Ref: ${caseData.reference_number}) using this secure portal link:\n\n🔗 ${clientUploadUrl}\n\nDocuments Needed:\n${reqsBullets}\n\nBest regards,\n${orgName}`;

  const pickerWhatsappUrl = `https://wa.me/?text=${encodeURIComponent(pickerMessage)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(clientUploadUrl);
    setCopiedLink(true);
    toast({ title: "Link copied", description: "Direct client upload link is ready to paste." });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMessage = (msg: string) => {
    navigator.clipboard.writeText(msg);
    setCopiedMsg(true);
    toast({ title: "Message copied", description: "WhatsApp checklist message copied to clipboard." });
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  const handleRenewLink = async () => {
    if (!confirm("Are you sure you want to regenerate this link? Any previously shared link will be revoked.")) return;
    setRegenerating(true);
    try {
      await generateUploadLinkAction(caseData.id);
      toast({ title: "Link renewed", description: "New secure upload link generated successfully." });
      if (onLinkRenewed) onLinkRenewed();
    } catch (err: any) {
      toast({ title: "Failed to renew", description: err.message, type: "error" });
    } finally {
      setRegenerating(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-lg w-full shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[92vh] transition-all">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-emerald-50/70 dark:bg-emerald-950/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <MessageSquareShare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Share on WhatsApp</h3>
                <span className="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  {caseData.reference_number}
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 line-clamp-1">
                {caseData.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-900/60 px-5 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("single")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "single"
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Assigned Client ({caseData.client.name.split(" ")[0]})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("picker")}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "picker"
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp Picker</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Direct Upload URL Box */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
              <span>Secure Client Upload URL</span>
              <button
                type="button"
                disabled={regenerating}
                onClick={handleRenewLink}
                className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition"
                title="Regenerate secure token"
              >
                <RefreshCw className={`w-3 h-3 ${regenerating ? "animate-spin" : ""}`} />
                <span>Regenerate Link</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={clientUploadUrl}
                className="w-full text-xs font-mono bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-800 dark:text-neutral-200 select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-xl text-xs font-bold shrink-0 shadow-2xs transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Assigned Client */}
          {activeTab === "single" && (
            <div className="space-y-4">
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">{caseData.client.name}</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono mt-0.5 truncate">
                    {caseData.client.phone || "No phone number available"}
                  </p>
                </div>
                <a
                  href={singleWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
                >
                  <MessageSquareShare className="w-3.5 h-3.5" />
                  <span>Open WhatsApp</span>
                  <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Pre-filled WhatsApp Message
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(assignedMessage)}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedMsg ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedMsg ? "Copied!" : "Copy Text"}</span>
                  </button>
                </div>
                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/70 dark:border-emerald-800 text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto leading-relaxed">
                  {assignedMessage}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Universal WhatsApp Forward Picker */}
          {activeTab === "picker" && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xs">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                    Forward via WhatsApp Picker
                  </h4>
                  <p className="text-[11px] text-neutral-600 dark:text-neutral-300 max-w-sm mx-auto mt-0.5">
                    Click below to open WhatsApp with the pre-filled case checklist link, then pick any contact, broadcast list, or group to forward.
                  </p>
                </div>
                <a
                  href={pickerWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  <MessageSquareShare className="w-4 h-4" />
                  <span>Choose Contacts in WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Universal Checklist Message
                  </label>
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(pickerMessage)}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedMsg ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedMsg ? "Copied!" : "Copy Text"}</span>
                  </button>
                </div>
                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap font-sans max-h-40 overflow-y-auto leading-relaxed">
                  {pickerMessage}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-neutral-50 dark:bg-neutral-800/80 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Encrypted link with auto-expiration tracking</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 bg-neutral-100 dark:bg-neutral-800 rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
