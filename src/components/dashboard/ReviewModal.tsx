"use client";

import { useState } from "react";
import { DocumentRequirement, Document, PREDEFINED_REJECTION_REASONS } from "@/types";
import { formatBytes, formatDateTime } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  X,
  ExternalLink,
  Download,
  Eye,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { reviewDocumentAction } from "@/app/actions/portal";
import { useToast } from "@/components/ui/Toast";

interface ReviewModalProps {
  caseId: string;
  requirement: DocumentRequirement;
  document: Document;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewModal({
  caseId,
  requirement,
  document,
  isOpen,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const downloadUrl = `/api/download?file=${encodeURIComponent(document.storage_path || "")}&name=${encodeURIComponent(document.file_name)}`;

  const handleApprove = async () => {
    setLoading(true);
    try {
      await reviewDocumentAction(caseId, requirement.id, document.id, "approve");
      toast({ title: "Document approved", description: `${requirement.name} marked verified.` });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: "Error approving document", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = customReason.trim() || selectedTemplate;
    if (!reason) {
      toast({ title: "Reason required", description: "Please explain what needs correction.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      await reviewDocumentAction(caseId, requirement.id, document.id, "reject", reason);
      toast({ title: "Feedback sent", description: "Client notified to upload replacement document.", type: "info" });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: "Error sending rejection", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-neutral-200/90 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                Verification & Audit
              </span>
              <h3 className="text-sm font-bold text-neutral-900">{requirement.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* File summary & Download / Preview actions */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-neutral-900 truncate">{document.file_name}</p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-neutral-200 text-neutral-800 rounded-md">
                    v{document.version}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {formatBytes(document.file_size)} • {document.mime_type || "Document File"} • Uploaded {formatDateTime(document.uploaded_at)}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons for CA */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-200/60">
              <a
                href={downloadUrl}
                download={document.file_name}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800 hover:text-neutral-950 bg-white hover:bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-300 shadow-2xs transition-all"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Download Document</span>
              </a>

              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-300 shadow-2xs transition-all"
              >
                <Eye className="w-3.5 h-3.5 text-neutral-500" />
                <span>Open Preview</span>
              </a>
            </div>
          </div>

          {/* Rejection Form */}
          {isRejecting ? (
            <div className="space-y-3 p-4 bg-rose-50/60 rounded-xl border border-rose-200/80">
              <div className="flex items-center gap-1.5 text-rose-900 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Specify Rejection Reason for Client</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Common Reasons (1-Click Fill):
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => {
                    setSelectedTemplate(e.target.value);
                    setCustomReason(e.target.value);
                  }}
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <option value="">-- Choose standard template --</option>
                  {PREDEFINED_REJECTION_REASONS.map((r, i) => (
                    <option key={i} value={r.template}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                  Custom feedback note:
                </label>
                <textarea
                  rows={2}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Explain why this scan was rejected (e.g. blur, cropped corners, wrong year)..."
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setIsRejecting(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleReject}
                  className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{loading ? "Sending..." : "Reject & Request Re-upload"}</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-500 leading-relaxed">
              Ensure the scanned document is legible, uncropped, and has matching identification before approving for filing or audit.
            </p>
          )}
        </div>

        {/* Footer */}
        {!isRejecting && (
          <div className="px-6 py-3.5 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsRejecting(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200/80 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Reject & Request Re-upload</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleApprove}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{loading ? "Verifying..." : "Approve & Verify"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
