"use client";

import { useState } from "react";
import {
  X,
  Eye,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Clock,
  ShieldCheck,
  Maximize2,
  ExternalLink,
} from "lucide-react";
import { Document, DocumentRequirement } from "@/types";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { reviewDocumentAction } from "@/app/actions/portal";
import { useToast } from "@/components/ui/Toast";

interface DocumentPreviewModalProps {
  document: Document | null;
  requirementName?: string;
  caseId?: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export function DocumentPreviewModal({
  document,
  requirementName = "Document",
  caseId,
  isOpen,
  onClose,
  onStatusUpdated,
}: DocumentPreviewModalProps) {
  const { toast } = useToast();
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [loadingAction, setLoadingAction] = useState(false);

  if (!isOpen || !document) return null;

  const downloadUrl = `/api/download?file=${encodeURIComponent(document.storage_path || "")}&name=${encodeURIComponent(document.file_name)}&id=${document.id}`;

  const isImage =
    document.mime_type?.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(document.file_name);

  const isPdf =
    document.mime_type === "application/pdf" ||
    /\.pdf$/i.test(document.file_name);

  const handleApprove = async () => {
    if (!caseId) return;
    setLoadingAction(true);
    try {
      await reviewDocumentAction(caseId, document.requirement_id, document.id, "approve");
      toast({ title: "Document verified", description: `${document.file_name} has been approved.` });
      if (onStatusUpdated) onStatusUpdated();
      onClose();
    } catch {
      toast({ title: "Failed to approve document", type: "error" });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] shadow-2xl border border-neutral-200/90 flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Top Header Toolbar */}
        <div className="px-6 py-3.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-neutral-900 truncate max-w-[280px] sm:max-w-md">
                  {document.file_name}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-200/70 text-neutral-700 shrink-0">
                  v{document.version}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                {requirementName} • {formatBytes(document.file_size)} • Uploaded {formatDateTime(document.uploaded_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Button */}
            <a
              href={downloadUrl}
              download={document.file_name}
              title="Download Document"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-100 text-neutral-700 rounded-xl text-xs font-semibold border border-neutral-200 shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Download</span>
            </a>

            {/* External Tab */}
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new window"
              className="w-8 h-8 rounded-xl bg-white hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 border border-neutral-200 flex items-center justify-center transition-colors shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewer Canvas */}
        <div className="flex-1 bg-neutral-900/95 overflow-auto relative flex items-center justify-center min-h-[350px] sm:min-h-[480px] p-4">
          {isImage ? (
            <div
              className="transition-transform duration-200 ease-out flex items-center justify-center"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              }}
            >
              <img
                src={downloadUrl}
                alt={document.file_name}
                className="max-h-[70vh] max-w-full rounded-lg shadow-2xl object-contain"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={`${downloadUrl}#toolbar=0`}
              title={document.file_name}
              className="w-full h-[70vh] rounded-lg border-0 bg-white"
            />
          ) : (
            <div className="text-center text-white space-y-3 p-8">
              <FileText className="w-12 h-12 text-neutral-400 mx-auto" />
              <p className="text-sm font-semibold">{document.file_name}</p>
              <p className="text-xs text-neutral-400">Binary format preview ready for download</p>
              <a
                href={downloadUrl}
                download={document.file_name}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download & Open</span>
              </a>
            </div>
          )}

          {/* Floating Image Controls for Zoom & Rotate */}
          {isImage && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-neutral-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-700 flex items-center gap-2 text-white shadow-xl">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(50, z - 25))}
                title="Zoom Out"
                className="p-1.5 hover:bg-neutral-800 rounded-full text-neutral-300 hover:text-white"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-medium px-1">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(250, z + 25))}
                title="Zoom In"
                className="p-1.5 hover:bg-neutral-800 rounded-full text-neutral-300 hover:text-white"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <div className="h-3 w-px bg-neutral-700 mx-1" />
              <button
                type="button"
                onClick={handleRotate}
                title="Rotate 90°"
                className="p-1.5 hover:bg-neutral-800 rounded-full text-neutral-300 hover:text-white flex items-center gap-1"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-white border-t border-neutral-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px]">Direct encrypted preview • Secure cloud storage</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900"
            >
              Close Window
            </button>

            {caseId && (
              <button
                type="button"
                disabled={loadingAction}
                onClick={handleApprove}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{loadingAction ? "Approving..." : "Verify & Approve"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
