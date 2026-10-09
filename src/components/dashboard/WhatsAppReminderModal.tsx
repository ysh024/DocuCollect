"use client";

import { useState } from "react";
import { CaseWithDetails } from "@/types";
import { MessageSquare, X, ExternalLink, Copy, Check, Sparkles, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface WhatsAppReminderModalProps {
  caseData: CaseWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppReminderModal({
  caseData,
  isOpen,
  onClose,
}: WhatsAppReminderModalProps) {
  const { toast } = useToast();
  const [tone, setTone] = useState<"gentle" | "urgent" | "rejection">("gentle");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const token = caseData.upload_link?.token_hash || `token-${caseData.id.slice(0, 8)}`;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const uploadUrl = `${baseUrl}/upload/${token}`;
  const orgName = (caseData as any).organization_name || "Advisory Services";

  const pendingReqs = caseData.requirements.filter((r) => r.status === "not_uploaded");
  const rejectedReqs = caseData.requirements.filter((r) => r.status === "rejected");
  const underReviewReqs = caseData.requirements.filter((r) => r.status === "under_review" || r.status === "uploaded");

  const pendingListStr = pendingReqs.map((r, i) => `  ${i + 1}. ${r.name}`).join("\n");
  const rejectedListStr = rejectedReqs.map((r, i) => `  ${i + 1}. ${r.name}`).join("\n");

  let message = "";

  if (tone === "gentle") {
    message = `Hi ${caseData.client.name},\n\nHope you're doing well! Just a quick follow-up regarding your *${caseData.title}*.\n\nWe are currently waiting on the following documents:\n${pendingListStr || "  - Pending checklist items"}\n\nYou can upload them directly here:\n🔗 ${uploadUrl}\n\nPlease let us know if you have any questions!\n\nBest regards,\n${orgName}`;
  } else if (tone === "urgent") {
    message = `⚠️ *URGENT REMINDER: Action Required*\n\nDear ${caseData.client.name},\n\nThe submission deadline for your *${caseData.title}* (Ref: ${caseData.reference_number}) is approaching.\n\nTo avoid penalties or filing delays, please upload your remaining documents today:\n${pendingListStr || "  - Pending checklist items"}\n\n🔗 Secure Upload Portal:\n${uploadUrl}\n\nThank you for your prompt cooperation!\n\n${orgName} Team`;
  } else {
    message = `Dear ${caseData.client.name},\n\nWe reviewed your submitted documents for *${caseData.title}*. Some files require revision/re-upload:\n${rejectedListStr || "  - Document revision required"}\n\nPlease check the advisor feedback and upload the updated copies using this link:\n🔗 ${uploadUrl}\n\nBest regards,\n${orgName}`;
  }

  const cleanPhone = caseData.client.phone.replace(/[^0-9]/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast({ title: "Message copied", description: "WhatsApp reminder text copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-neutral-200/90 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2 text-neutral-900">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-900">Smart WhatsApp Reminder</h3>
              <p className="text-[10px] text-neutral-400">Recipient: {caseData.client.name} ({caseData.client.phone})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Tone Selector */}
          <div>
            <label className="block text-[11px] font-medium text-neutral-500 mb-1.5">
              Choose Reminder Tone & Template
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTone("gentle")}
                className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                  tone === "gentle"
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                    : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 mx-auto mb-1 opacity-70" />
                Gentle Nudge
              </button>

              <button
                type="button"
                onClick={() => setTone("urgent")}
                className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                  tone === "urgent"
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                    : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <Clock className="w-3.5 h-3.5 mx-auto mb-1 opacity-70" />
                Urgent Due Date
              </button>

              <button
                type="button"
                onClick={() => setTone("rejection")}
                className={`p-2 rounded-lg text-xs font-medium border text-center transition-all ${
                  tone === "rejection"
                    ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                    : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 mx-auto mb-1 opacity-70" />
                Re-upload Request
              </button>
            </div>
          </div>

          {/* Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-neutral-500">Message Content</label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-medium text-neutral-600 hover:text-neutral-900 flex items-center gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy Text"}
              </button>
            </div>
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/80 text-xs text-neutral-700 font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
              {message}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900"
          >
            Cancel
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              toast({ title: "WhatsApp launched", description: "Opened chat with pre-filled message." });
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Send via WhatsApp
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        </div>
      </div>
    </div>
  );
}
