"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { CaseWithDetails } from "@/types";
import {
  MessageSquare,
  X,
  ExternalLink,
  Copy,
  CheckCircle,
  Sparkles,
  Clock,
  AlertCircle,
  FileCheck2,
  FileWarning,
  Hourglass,
  Share2,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface WhatsAppReminderModalProps {
  caseData: CaseWithDetails;
  isOpen: boolean;
  onClose: () => void;
}

type ReminderTone = "pending" | "urgent" | "rejected" | "under_review" | "completed";

export function WhatsAppReminderModal({
  caseData,
  isOpen,
  onClose,
}: WhatsAppReminderModalProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Smart Auto-Detection based on real case & document statuses
  const autoDetectedTone = useMemo<ReminderTone>(() => {
    const hasRejections = caseData.requirements.some((r) => r.status === "rejected");
    if (hasRejections) return "rejected";

    if (caseData.status === "completed") return "completed";

    if (caseData.status === "under_review") return "under_review";

    const allUploaded =
      caseData.requirements.length > 0 &&
      caseData.requirements.every((r) => r.status !== "not_uploaded");
    if (allUploaded) return "under_review";

    if (caseData.due_date) {
      const dueTime = new Date(caseData.due_date).getTime();
      const diffDays = (dueTime - Date.now()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 3) return "urgent";
    }

    return "pending";
  }, [caseData]);

  const [tone, setTone] = useState<ReminderTone>(autoDetectedTone);

  // Sync auto-detected tone when caseData changes
  useEffect(() => {
    setTone(autoDetectedTone);
  }, [autoDetectedTone]);

  if (!isOpen || !mounted) return null;

  const token = caseData.upload_link?.token || caseData.upload_link?.token_hash || "";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const uploadUrl = token ? `${baseUrl}/upload/${token}` : "";
  const orgName = (caseData as any).organization_name || "Advisory Services";

  const pendingReqs = caseData.requirements.filter((r) => r.status === "not_uploaded");
  const rejectedReqs = caseData.requirements.filter((r) => r.status === "rejected");
  const approvedCount = caseData.requirements.filter((r) => r.status === "approved").length;
  const totalCount = caseData.requirements.length;

  // Formatted requirement bullet points
  const pendingListStr =
    pendingReqs
      .map((r, i) => `  ${i + 1}. ${r.name}${r.is_required ? " *(Required)*" : ""}`)
      .join("\n") || "  • Remaining checklist documents";

  const rejectedListStr =
    rejectedReqs
      .map((r, i) => {
        const rejectedDoc = r.documents?.find((d) => d.status === "rejected" || d.rejection_reason);
        const reason = rejectedDoc?.rejection_reason
          ? ` *(Reason: ${rejectedDoc.rejection_reason})*`
          : " *(Requires re-upload)*";
        return `  ${i + 1}. ${r.name}${reason}`;
      })
      .join("\n") || "  • Document revision required";

  const dueDateFormatted = caseData.due_date
    ? new Date(caseData.due_date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  // 100% Ready-to-Send, Zero Editing Required Message Templates
  let message = "";

  switch (tone) {
    case "rejected":
      message = `Dear ${caseData.client.name},\n\nWe reviewed your submitted documents for *${caseData.title}* (Ref: ${caseData.reference_number}). Some file(s) require correction or re-upload:\n\n${rejectedListStr}\n\nPlease review the advisor feedback and upload the updated documents using this secure portal link:\n🔗 ${uploadUrl}\n\nPlease let us know if you need any clarification!\n\nBest regards,\n${orgName}`;
      break;

    case "urgent":
      message = `⚠️ *URGENT REMINDER: Action Required*\n\nDear ${caseData.client.name},\n\nThe filing deadline${dueDateFormatted ? ` (*${dueDateFormatted}*)` : ""} for your *${caseData.title}* (Ref: ${caseData.reference_number}) is approaching.\n\nTo avoid late filing fees or compliance delays, kindly upload your remaining documents today:\n\n${pendingListStr}\n\n🔗 Upload immediately here:\n${uploadUrl}\n\nThank you for your prompt cooperation!\n\n${orgName}`;
      break;

    case "under_review":
      message = `Hello ${caseData.client.name},\n\nWe have received your uploaded documents for *${caseData.title}* (Ref: ${caseData.reference_number}).\n\nOur team is currently reviewing and verifying the files. We will notify you as soon as the verification is complete or if any additional information is needed.\n\nYou can check case progress anytime here:\n🔗 ${uploadUrl}\n\nBest regards,\n${orgName}`;
      break;

    case "completed":
      message = `🎉 *Case Completed & Verified*\n\nDear ${caseData.client.name},\n\nAll required documents (${approvedCount} of ${totalCount}) for your *${caseData.title}* (Ref: ${caseData.reference_number}) have been successfully reviewed and approved.\n\nYour case is now marked as *Completed*. You can access your verified case file here:\n🔗 ${uploadUrl}\n\nThank you for choosing ${orgName}!\n\nBest regards,\n${orgName}`;
      break;

    case "pending":
    default:
      message = `Hi ${caseData.client.name},\n\nGentle follow-up regarding your *${caseData.title}* (Ref: ${caseData.reference_number}).\n\nWe are currently waiting on the following document(s) to proceed:\n\n${pendingListStr}\n\nPlease upload them directly using your secure client portal (no login needed):\n🔗 ${uploadUrl}\n\nLet us know if you have any questions!\n\nBest regards,\n${orgName}`;
      break;
  }

  const cleanPhone = caseData.client.phone.replace(/[^0-9]/g, "");
  const directWhatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  const pickerWhatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast({ title: "Message copied", description: "WhatsApp reminder text copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const toneOptions: {
    id: ReminderTone;
    label: string;
    sub: string;
    icon: any;
    color: string;
    activeClass: string;
  }[] = [
    {
      id: "pending",
      label: "Pending Checklist",
      sub: `${pendingReqs.length} items missing`,
      icon: Sparkles,
      color: "text-neutral-700 dark:text-neutral-300",
      activeClass: "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 shadow-xs",
    },
    {
      id: "urgent",
      label: "Urgent Due Date",
      sub: dueDateFormatted ? `Due ${dueDateFormatted}` : "High priority",
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      activeClass: "bg-amber-600 text-white border-amber-600 shadow-xs",
    },
    {
      id: "rejected",
      label: "Re-upload Needed",
      sub: `${rejectedReqs.length} rejected files`,
      icon: FileWarning,
      color: "text-rose-600 dark:text-rose-400",
      activeClass: "bg-rose-600 text-white border-rose-600 shadow-xs",
    },
    {
      id: "under_review",
      label: "Under Review",
      sub: "Files received",
      icon: Hourglass,
      color: "text-purple-600 dark:text-purple-400",
      activeClass: "bg-purple-600 text-white border-purple-600 shadow-xs",
    },
    {
      id: "completed",
      label: "Case Completed",
      sub: "100% approved",
      icon: FileCheck2,
      color: "text-emerald-600 dark:text-emerald-400",
      activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-xs",
    },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-xl w-full shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[92vh] transition-all">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-emerald-50/70 dark:bg-emerald-950/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900 dark:text-white truncate">
                  Smart WhatsApp Reminder
                </h3>
                <span className="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 shrink-0">
                  {caseData.reference_number}
                </span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 truncate">
                {caseData.client.name} · <span className="font-mono">{caseData.client.phone}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Tone & Status Preset Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-neutral-900 dark:text-white">
                Template Preset
              </label>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Auto-selected based on case status</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {toneOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = tone === opt.id;
                const isAuto = autoDetectedTone === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTone(opt.id)}
                    className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer relative ${
                      isSelected
                        ? opt.activeClass
                        : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-current" : opt.color}`} />
                      {isAuto && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                          isSelected ? "bg-white/20 text-white" : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                        }`}>
                          Auto
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold leading-tight">{opt.label}</p>
                    <p className={`text-[10px] mt-0.5 truncate ${isSelected ? "opacity-90" : "text-neutral-400"}`}>
                      {opt.sub}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 100% Ready-to-Send Message Content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-neutral-900 dark:text-white">
                Formatted Message (Ready to Send · No Edit Required)
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy Text"}</span>
              </button>
            </div>
            <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap font-sans max-h-56 overflow-y-auto leading-relaxed selection:bg-emerald-200">
              {message}
            </div>
          </div>
        </div>

        {/* Modal Footer with 1-Click WhatsApp Send */}
        <div className="px-5 sm:px-6 py-4 bg-neutral-50 dark:bg-neutral-800/80 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0">
          <a
            href={pickerWhatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              toast({ title: "WhatsApp picker opened", description: "Choose any contact or group to send." });
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition cursor-pointer"
            title="Pick another contact in WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Choose Contact / Group</span>
            <span className="sm:hidden">Picker</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 bg-neutral-100 dark:bg-neutral-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <a
              href={directWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                toast({ title: "WhatsApp launched", description: "Opened client chat with ready-to-send reminder." });
                onClose();
              }}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition-all cursor-pointer hover:shadow"
            >
              <MessageSquare className="w-4 h-4" />
              <span>1-Click Send to {caseData.client.name.split(" ")[0]}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
