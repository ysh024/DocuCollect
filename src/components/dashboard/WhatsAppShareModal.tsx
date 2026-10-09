"use client";

import { useState } from "react";
import { CaseWithDetails } from "@/types";
import { Copy, Check, MessageSquareShare, X, ExternalLink, ShieldCheck, RefreshCw } from "lucide-react";
import { generateUploadLinkAction } from "@/app/actions/portal";

interface WhatsAppShareModalProps {
  caseData: CaseWithDetails;
  isOpen: boolean;
  onClose: () => void;
  onLinkRenewed?: () => void;
}

export function WhatsAppShareModal({
  caseData,
  isOpen,
  onClose,
  onLinkRenewed,
}: WhatsAppShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  if (!isOpen) return null;

  const currentToken = caseData.upload_link?.token_hash || `token-${caseData.id.slice(0, 8)}`;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const clientUploadUrl = `${baseUrl}/upload/${currentToken}`;
  const orgName = (caseData as any).organization_name || "Advisory Services";

  const defaultMessage = `Hello ${caseData.client.name},\n\nPlease upload the required documents for your *${caseData.title}* (Ref: ${caseData.reference_number}) using this secure link:\n\n🔗 ${clientUploadUrl}\n\nThis portal allows you to track document approvals in real-time. Let us know if you need any assistance!\n\nBest regards,\n${orgName}`;

  const cleanPhone = caseData.client.phone.replace(/[^0-9]/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(defaultMessage)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(clientUploadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRenewLink = async () => {
    if (!confirm("Are you sure you want to regenerate this link? Any previously shared link will be revoked.")) return;
    setRegenerating(true);
    try {
      await generateUploadLinkAction(caseData.id);
      if (onLinkRenewed) onLinkRenewed();
    } catch (err) {
      console.error(err);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2 text-emerald-800">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <MessageSquareShare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Share Client Upload Link</h3>
              <p className="text-xs text-slate-500">Fast, secure document collection for {caseData.client.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Link box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Direct Client Upload URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={clientUploadUrl}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-700 select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shrink-0 shadow-sm transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* WhatsApp Preview Message */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Pre-filled WhatsApp Message</label>
              <span className="text-[11px] text-slate-500">Recipient: {caseData.client.phone}</span>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/60 text-xs text-slate-700 whitespace-pre-wrap font-sans max-h-36 overflow-y-auto">
              {defaultMessage}
            </div>
          </div>

          {/* Security details */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Expires in 14 days • Single-client scoped</span>
            </div>
            <button
              type="button"
              disabled={regenerating}
              onClick={handleRenewLink}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className="w-3 h-3" />
              Regenerate
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg"
          >
            Close
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
          >
            <MessageSquareShare className="w-4 h-4" />
            Open in WhatsApp Click-to-Chat
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
