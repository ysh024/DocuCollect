"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  FileText,
  CheckCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Clock,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Document, PREDEFINED_REJECTION_REASONS } from "@/types";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { reviewDocumentAction } from "@/app/actions/portal";
import { useToast } from "@/components/ui/Toast";
import { downloadFileWithFeedback } from "@/lib/download-client";

interface DocumentPreviewModalProps {
  document: Document | null;
  requirementName?: string;
  requirementId?: string;
  caseId?: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export function DocumentPreviewModal({
  document,
  requirementName = "Document",
  requirementId,
  caseId,
  isOpen,
  onClose,
  onStatusUpdated,
}: DocumentPreviewModalProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [loadingAction, setLoadingAction] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [loadingReject, setLoadingReject] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !document || !mounted) return null;

  const effectiveReqId = requirementId || document.requirement_id;
  const previewUrl = `/api/download?file=${encodeURIComponent(document.storage_path || "")}&name=${encodeURIComponent(document.file_name)}&id=${document.id}&inline=1`;
  const downloadUrl = `/api/download?file=${encodeURIComponent(document.storage_path || "")}&name=${encodeURIComponent(document.file_name)}&id=${document.id}&download=1`;

  const isImage =
    document.mime_type?.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(document.file_name);

  const isPdf =
    document.mime_type === "application/pdf" ||
    /\.pdf$/i.test(document.file_name);

  const handleApprove = async () => {
    if (!caseId || !effectiveReqId) {
      toast({ title: "Error", description: "Case or requirement reference missing.", type: "error" });
      return;
    }
    setLoadingAction(true);
    try {
      await reviewDocumentAction(caseId, effectiveReqId, document.id, "approve");
      toast({ title: "Document verified", description: `${document.file_name} has been approved.` });
      if (onStatusUpdated) onStatusUpdated();
      onClose();
    } catch (err: any) {
      toast({ title: "Failed to approve document", description: err.message, type: "error" });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleReject = async () => {
    if (!caseId || !effectiveReqId) {
      toast({ title: "Error", description: "Case or requirement reference missing.", type: "error" });
      return;
    }
    if (!rejectionReason.trim()) {
      toast({ title: "Reason required", description: "Please select or type a rejection reason for the client.", type: "error" });
      return;
    }
    setLoadingReject(true);
    try {
      await reviewDocumentAction(caseId, effectiveReqId, document.id, "reject", rejectionReason.trim());
      toast({ title: "Document rejected", description: "Feedback sent. Client notified to re-upload." });
      if (onStatusUpdated) onStatusUpdated();
      onClose();
    } catch (err: any) {
      toast({ title: "Failed to reject document", description: err.message, type: "error" });
    } finally {
      setLoadingReject(false);
    }
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-5xl h-[92vh] max-h-[880px] shadow-2xl border border-neutral-200/90 dark:border-neutral-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 transition-colors">
        
        {/* Top Header Toolbar */}
        <div className="px-5 py-3 border-b border-neutral-200/90 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/90 dark:bg-neutral-800/90 shrink-0 gap-3">
          {/* File info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-neutral-900 truncate max-w-[220px] sm:max-w-sm md:max-w-md">
                  {document.file_name}
                </h3>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral-200/70 text-neutral-700 shrink-0 font-mono">
                  v{document.version}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 truncate">
                {requirementName} • {formatBytes(document.file_size)}
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Status Pill Aligned Right */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 border ${
                document.status === "approved"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : document.status === "rejected"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {document.status === "approved" ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              ) : document.status === "rejected" ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              )}
              <span className="capitalize">{document.status.replace("_", " ")}</span>
            </span>

            {/* Open in New Window */}
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open document in new window"
              className="w-8 h-8 rounded-xl bg-white hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900 border border-neutral-200 flex items-center justify-center transition-colors shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Download Button */}
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => {
                downloadFileWithFeedback({
                  url: downloadUrl,
                  fileName: document.file_name,
                  toast,
                  onStart: () => setIsDownloading(true),
                  onComplete: () => setIsDownloading(false),
                });
              }}
              title="Download file directly to computer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-700 rounded-xl text-xs font-semibold border border-neutral-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span className="hidden sm:inline">{isDownloading ? "Downloading..." : "Download"}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              title="Close modal"
              className="w-8 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Viewer Canvas (Dynamic flexible height with min-h-0) */}
        <div className="flex-1 min-h-0 bg-neutral-900 relative overflow-hidden flex items-center justify-center">
          {isImage ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
              <img
                src={previewUrl}
                alt={document.file_name}
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                  transition: "transform 0.15s ease-out",
                }}
                className="max-h-full max-w-full object-contain rounded shadow-lg select-none"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={`${previewUrl}#toolbar=0`}
              title={document.file_name}
              className="w-full h-full border-0 bg-white"
            />
          ) : (
            <div className="text-center text-white space-y-3 p-6">
              <FileText className="w-12 h-12 text-neutral-400 mx-auto" />
              <p className="text-sm font-semibold">{document.file_name}</p>
              <p className="text-xs text-neutral-400">Binary format preview ready for download</p>
              <a
                href={downloadUrl}
                download={document.file_name}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </a>
            </div>
          )}

          {/* Floating Controls for Images */}
          {isImage && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-neutral-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-700 flex items-center gap-2 text-white shadow-xl z-10">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(50, z - 25))}
                title="Zoom Out"
                className="p-1 hover:bg-neutral-800 rounded-full text-neutral-300 hover:text-white cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-medium px-1">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(250, z + 25))}
                title="Zoom In"
                className="p-1 hover:bg-neutral-800 rounded-full text-neutral-300 hover:text-white cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="h-3 w-px bg-neutral-700 mx-1" />
              <button
                type="button"
                onClick={handleRotate}
                title="Rotate 90°"
                className="p-1 hover:bg-neutral-800 rounded-full text-neutral-300 hover:text-white cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Action Footer / Rejection Drawer (Always visible) */}
        {isRejecting ? (
          /* Rejection Feedback Panel */
          <div className="px-5 py-3.5 bg-rose-50/90 border-t border-rose-200 space-y-2.5 shrink-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-900 text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Specify Rejection Reason & Instructions for Client</span>
              </div>
              <button
                type="button"
                onClick={() => setIsRejecting(false)}
                className="text-xs text-neutral-500 hover:text-neutral-800 font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <select
                value={selectedTemplate}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value);
                  setRejectionReason(e.target.value);
                }}
                className="sm:col-span-1 text-xs bg-white border border-rose-200 rounded-lg p-2 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="">-- Quick Predefined Reason --</option>
                {PREDEFINED_REJECTION_REASONS.map((r, i) => (
                  <option key={i} value={r.template}>
                    {r.label}
                  </option>
                ))}
              </select>

              <textarea
                rows={2}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain what the client needs to correct..."
                className="sm:col-span-2 text-xs bg-white border border-rose-200 rounded-lg p-2 text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setIsRejecting(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-300 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loadingReject || !rejectionReason.trim()}
                onClick={handleReject}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{loadingReject ? "Sending..." : "Confirm & Send Feedback"}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Normal Action Footer */
          <div className="px-5 py-3 bg-white dark:bg-neutral-900 border-t border-neutral-200/90 dark:border-neutral-800 flex items-center justify-between shrink-0 z-10 transition-colors">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              <span className="hidden sm:inline text-[11px]">
                Uploaded {formatDateTime(document.uploaded_at)} • Direct encrypted preview
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 rounded-xl transition cursor-pointer"
              >
                Close
              </button>

              {caseId && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRejecting(true);
                      setSelectedTemplate(PREDEFINED_REJECTION_REASONS[0].template);
                      setRejectionReason(PREDEFINED_REJECTION_REASONS[0].template);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Reject / Feedback</span>
                  </button>

                  <button
                    type="button"
                    disabled={loadingAction}
                    onClick={handleApprove}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{loadingAction ? "Approving..." : "Verify & Approve"}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    window.document.body
  );
}
