"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Download,
  FileText,
  CheckCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Clock,
  ExternalLink,
  AlertCircle,
  Loader2,
  XCircle,
  MessageSquare,
  MessageSquareShare,
  Copy,
  Sparkles,
  FileCheck2,
  FileWarning,
  Hourglass,
  Share2,
  RefreshCw,
  Check,
  UserCheck,
  Plus,
  Trash2,
  Briefcase,
  BookmarkPlus,
  Lock,
  Calendar,
  UserPlus,
  Info,
  FileSpreadsheet,
  FileUp,
} from "lucide-react";
import {
  Document,
  DocumentRequirement,
  PREDEFINED_REJECTION_REASONS,
  CaseWithDetails,
  Client,
  ChecklistTemplate,
} from "@/types";
import { formatBytes, formatDateTime, downloadFileWithFeedback } from "@/lib/utils";
import {
  reviewDocumentAction,
  generateUploadLinkAction,
  createCaseAction,
  createClientAction,
  getChecklistTemplatesAction,
  createChecklistTemplateAction,
  importClientsFromCsvAction,
  ClientCsvRow,
} from "@/app/actions";
import { useToast } from "@/components/ui";
import { useDashboardData } from "@/contexts/DashboardDataContext";


/* =========================================================================
   1. DOCUMENT PREVIEW MODAL (Full Viewer + Fast Actions)
   ========================================================================= */

interface DocumentPreviewModalProps {
  document?: Document | null;
  doc?: Document | null;
  requirementName?: string;
  reqName?: string;
  requirementId?: string;
  caseId?: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export function DocumentPreviewModal({
  document: propDoc,
  doc: aliasDoc,
  requirementName: propReqName,
  reqName: aliasReqName,
  requirementId,
  caseId,
  isOpen,
  onClose,
  onStatusUpdated,
}: DocumentPreviewModalProps) {
  const document = propDoc || aliasDoc || null;
  const requirementName = propReqName || aliasReqName || "Document";
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });

  const [loadingAction, setLoadingAction] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [loadingReject, setLoadingReject] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset zoom, pan and rotation when document changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(100);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setIsDragging(false);
      isDraggingRef.current = false;
    }
  }, [isOpen, document?.id]);

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

  // Mouse wheel zoom centered on cursor position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = container.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Coordinates relative to container center
      const mx = e.clientX - rect.left - centerX;
      const my = e.clientY - rect.top - centerY;

      // Wheel delta: zoom in on wheel up, zoom out on wheel down
      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;

      setZoom((currentZoom) => {
        const nextZoom = Math.min(500, Math.max(50, Math.round(currentZoom * zoomFactor)));
        if (nextZoom === currentZoom) return currentZoom;

        const oldScale = currentZoom / 100;
        const newScale = nextZoom / 100;

        setPan((currentPan) => {
          if (nextZoom <= 100) {
            // Center when fully zoomed out
            return { x: 0, y: 0 };
          }
          // Mathematical zoom around cursor:
          // newPan = mx - (mx - pan) * (newScale / oldScale)
          const newX = mx - (mx - currentPan.x) * (newScale / oldScale);
          const newY = my - (my - currentPan.y) * (newScale / oldScale);
          return { x: Math.round(newX), y: Math.round(newY) };
        });

        return nextZoom;
      });
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, [document?.id]);

  // Drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: Math.round(panStartRef.current.x + dx),
      y: Math.round(panStartRef.current.y + dy),
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  const handleResetView = () => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  if (!mounted || !isOpen || !document || typeof window === "undefined" || !window.document?.body) return null;

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
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl w-full max-w-7xl h-[92vh] max-h-[920px] shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 transition-colors">
        
        {/* Top Header Toolbar */}
        <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/90 dark:bg-neutral-800/90 shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 dark:bg-neutral-800 text-white flex items-center justify-center shrink-0 shadow-2xs border border-neutral-800 dark:border-neutral-700">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-[220px] sm:max-w-sm md:max-w-md">
                  {document.file_name}
                </h3>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-neutral-200/80 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 shrink-0 font-mono">
                  v{document.version}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                {requirementName} • {formatBytes(document.file_size)} • Uploaded {formatDateTime(document.uploaded_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 border ${
                document.status === "approved"
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : document.status === "rejected"
                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                  : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
              }`}
            >
              {document.status === "approved" ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : document.status === "rejected" ? (
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              )}
              <span className="capitalize">{document.status.replace("_", " ")}</span>
            </span>

            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open document in new window"
              className="w-8 h-8 rounded-xl bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white border border-neutral-200 dark:border-neutral-700 flex items-center justify-center transition-colors shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="hidden sm:inline">{isDownloading ? "Downloading..." : "Download"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              title="Close modal"
              className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Side-by-Side Main Body */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Pane: Document Viewer Canvas */}
          <div className="flex-1 min-w-0 bg-neutral-950 relative overflow-hidden flex items-center justify-center">
            {isImage ? (
              <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={handleResetView}
                className={`w-full h-full flex items-center justify-center overflow-hidden p-4 select-none ${
                  zoom > 100 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
                }`}
                title="Scroll wheel to zoom at cursor position • Click & drag to pan • Double-click to reset"
              >
                <img
                  src={previewUrl}
                  alt={document.file_name}
                  draggable={false}
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transition: isDragging ? "none" : "transform 0.08s ease-out",
                    transformOrigin: "center center",
                  }}
                  className="max-h-full max-w-full object-contain rounded shadow-lg pointer-events-none select-none"
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

            {/* Floating Image Zoom / Rotate Bar */}
            {isImage && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-neutral-900/90 dark:bg-neutral-800/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-neutral-700 dark:border-neutral-600 flex items-center gap-2 text-white shadow-xl z-10 select-none">
                <button
                  type="button"
                  onClick={() => {
                    setZoom((z) => {
                      const next = Math.max(50, z - 25);
                      if (next <= 100) setPan({ x: 0, y: 0 });
                      return next;
                    });
                  }}
                  title="Zoom Out (or scroll wheel down)"
                  className="p-1 hover:bg-neutral-800 rounded-full text-neutral-300 hover:text-white cursor-pointer transition-colors"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  title="Click to reset zoom & position (100%)"
                  className="text-[11px] font-mono font-medium px-1.5 py-0.5 rounded hover:bg-neutral-800 text-neutral-200 hover:text-white cursor-pointer transition-colors"
                >
                  {zoom}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(500, z + 25))}
                  title="Zoom In (or scroll wheel up at cursor)"
                  className="p-1 hover:bg-neutral-800 rounded-full text-neutral-300 hover:text-white cursor-pointer transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <div className="h-3 w-px bg-neutral-700 mx-1" />
                <button
                  type="button"
                  onClick={handleResetView}
                  title="Reset view (or double-click canvas)"
                  className="p-1 hover:bg-neutral-800 rounded-full text-neutral-300 hover:text-white cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  title="Rotate 90°"
                  className="p-1 hover:bg-neutral-800 rounded-full text-neutral-300 hover:text-white cursor-pointer transition-colors"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-neutral-400 font-normal hidden md:inline ml-1 pl-2 border-l border-neutral-700">
                  Wheel zoom at cursor • Drag to pan
                </span>
              </div>
            )}
          </div>

          {/* Right Pane: Document Feedback & Related Information */}
          <div className="w-full lg:w-96 xl:w-[420px] shrink-0 bg-white dark:bg-neutral-900 border-t lg:border-t-0 lg:border-l border-neutral-200 dark:border-neutral-800 flex flex-col overflow-hidden">
            {/* Right Pane Header */}
            <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                  Review & Feedback
                </h4>
              </div>
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono">
                Audit Panel
              </span>
            </div>

            {/* Right Pane Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {document.status === "rejected" && document.rejection_reason && (
                <div className="p-3 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-rose-800 dark:text-rose-300">
                    Advisor feedback given:
                  </span>
                  <p className="text-[11px] leading-relaxed italic text-rose-950 dark:text-rose-200 bg-white/70 dark:bg-black/30 p-2 rounded-lg border border-rose-200/50 dark:border-rose-900/40">
                    "{document.rejection_reason}"
                  </p>
                </div>
              )}

              {/* Advisor Actions (Approve / Reject) */}
              {caseId && (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={loadingAction}
                      onClick={handleApprove}
                      className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      {loadingAction ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                      <span>{loadingAction ? "Approving..." : "Approve"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsRejecting(!isRejecting);
                        if (!isRejecting && !rejectionReason) {
                          setSelectedTemplate(PREDEFINED_REJECTION_REASONS[0].template);
                          setRejectionReason(PREDEFINED_REJECTION_REASONS[0].template);
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                        isRejecting
                          ? "bg-rose-600 text-white border-rose-600"
                          : "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{isRejecting ? "Close" : "Feedback / Reject"}</span>
                    </button>
                  </div>

                  {/* Feedback Form Drawer */}
                  {isRejecting && (
                    <div className="p-3.5 bg-rose-50/80 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/60 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs text-rose-900 dark:text-rose-200 font-bold">
                        <span className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          <span>Client Feedback & Rejection</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsRejecting(false)}
                          className="text-[11px] text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                          Quick Reason (1-Click Fill):
                        </label>
                        <select
                          value={selectedTemplate}
                          onChange={(e) => {
                            setSelectedTemplate(e.target.value);
                            setRejectionReason(e.target.value);
                          }}
                          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        >
                          <option value="">-- Choose standard template --</option>
                          {PREDEFINED_REJECTION_REASONS.map((r, i) => (
                            <option key={i} value={r.template}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                          Custom Instructions for Client:
                        </label>
                        <textarea
                          rows={3}
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Explain what the client needs to correct (e.g. upload page 2, fix blurry scan)..."
                          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
                        />
                      </div>

                      <button
                        type="button"
                        disabled={loadingReject || !rejectionReason.trim()}
                        onClick={handleReject}
                        className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      >
                        {loadingReject ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{loadingReject ? "Sending..." : "Feedback / Reject"}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Related Information & Metadata Card */}
              <div className="p-3.5 bg-neutral-50/80 dark:bg-neutral-800/50 rounded-xl border border-neutral-200/70 dark:border-neutral-800 space-y-2.5 text-xs">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Document Details & Related Information</span>
                </div>

                <div className="divide-y divide-neutral-200/60 dark:divide-neutral-800 text-[11px]">
                  <div className="py-1.5 flex items-center justify-between gap-2">
                    <span className="text-neutral-500 dark:text-neutral-400">Requirement:</span>
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-right truncate">{requirementName}</span>
                  </div>
                  <div className="py-1.5 flex items-center justify-between gap-2">
                    <span className="text-neutral-500 dark:text-neutral-400">File Name:</span>
                    <span className="font-mono text-neutral-800 dark:text-neutral-200 text-right truncate max-w-[200px]" title={document.file_name}>
                      {document.file_name}
                    </span>
                  </div>
                  <div className="py-1.5 flex items-center justify-between gap-2">
                    <span className="text-neutral-500 dark:text-neutral-400">Version:</span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">v{document.version}</span>
                  </div>
                  <div className="py-1.5 flex items-center justify-between gap-2">
                    <span className="text-neutral-500 dark:text-neutral-400">File Size:</span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-200">{formatBytes(document.file_size)}</span>
                  </div>
                  <div className="py-1.5 flex items-center justify-between gap-2">
                    <span className="text-neutral-500 dark:text-neutral-400">File Type:</span>
                    <span className="font-mono text-[10px] text-neutral-600 dark:text-neutral-300">{document.mime_type || "Document"}</span>
                  </div>
                  <div className="py-1.5 flex items-center justify-between gap-2">
                    <span className="text-neutral-500 dark:text-neutral-400">Uploaded On:</span>
                    <span className="text-neutral-800 dark:text-neutral-200 text-right">{formatDateTime(document.uploaded_at)}</span>
                  </div>
                  {document.auto_delete_at && (
                    <div className="py-1.5 flex items-center justify-between gap-2">
                      <span className="text-neutral-500 dark:text-neutral-400">Auto-Retention Expiry:</span>
                      <span className="text-neutral-800 dark:text-neutral-200 text-right">{formatDateTime(document.auto_delete_at)}</span>
                    </div>
                  )}
                  <div className="py-1.5 flex items-center justify-between gap-2">
                    <span className="text-neutral-500 dark:text-neutral-400">Security:</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Encrypted Storage</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Pane Footer */}
            <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/50 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                Press Esc or click close
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-neutral-200/80 hover:bg-neutral-300/80 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    window.document.body
  );
}

/* =========================================================================
   2. REVIEW MODAL (Fast Inline Checklist Review)
   ========================================================================= */

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
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full shadow-2xl border border-neutral-200/90 dark:border-neutral-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
                Verification & Audit
              </span>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{requirement.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-neutral-900 dark:bg-neutral-800 text-white dark:text-emerald-400 border border-transparent dark:border-neutral-700 flex items-center justify-center shrink-0 shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">{document.file_name}</p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-md">
                    v{document.version}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {formatBytes(document.file_size)} • {document.mime_type || "Document File"} • Uploaded {formatDateTime(document.uploaded_at)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-neutral-200/60 dark:border-neutral-700/60">
              <button
                type="button"
                disabled={isDownloading}
                onClick={() => {
                  downloadFileWithFeedback({
                    url: `${downloadUrl}&download=1`,
                    fileName: document.file_name,
                    toast,
                    onStart: () => setIsDownloading(true),
                    onComplete: () => setIsDownloading(false),
                  });
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>{isDownloading ? "Downloading..." : "Download Document"}</span>
              </button>
            </div>
          </div>

          {isRejecting ? (
            <div className="space-y-3 p-4 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-200/80 dark:border-rose-900/60">
              <div className="flex items-center gap-1.5 text-rose-900 dark:text-rose-300 text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>Specify Rejection Reason for Client</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Common Reasons (1-Click Fill):
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => {
                    setSelectedTemplate(e.target.value);
                    setCustomReason(e.target.value);
                  }}
                  className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <option value="">-- Choose standard template --</option>
                  {PREDEFINED_REJECTION_REASONS.map((r, i) => (
                    <option key={i} value={r.template} className="dark:bg-neutral-800">
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Custom feedback note:
                </label>
                <textarea
                  rows={2}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Explain why this scan was rejected (e.g. blur, cropped corners, wrong year)..."
                  className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setIsRejecting(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
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
                  <span>{loading ? "Sending..." : "Feedback / Reject"}</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Ensure the scanned document is legible, uncropped, and has matching identification before approving for filing or audit.
            </p>
          )}
        </div>

        {!isRejecting && (
          <div className="px-6 py-3.5 bg-neutral-50/70 dark:bg-neutral-800/40 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsRejecting(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200/80 dark:border-rose-900/60 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Feedback / Reject</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleApprove}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{loading ? "Approving..." : "Approve"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   1. WHATSAPP REMINDER MODAL
   ========================================================================= */

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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

  if (!mounted || !isOpen || typeof window === "undefined" || !window.document?.body) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-xl w-full shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[92vh] transition-all">
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

        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
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
              <span>1-Click Send to {(caseData.client?.name || "Client").trim().split(/\s+/)[0]}</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* =========================================================================
   2. WHATSAPP SHARE MODAL
   ========================================================================= */

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || typeof window === "undefined" || !window.document?.body) return null;

  const currentToken = caseData.upload_link?.token || caseData.upload_link?.token_hash || "";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const clientUploadUrl = currentToken ? `${baseUrl}/upload/${currentToken}` : "";
  const orgName = (caseData as any).organization_name || "Advisory Services";

  const reqsBullets =
    (caseData.requirements || [])
      .map((r) => `• ${r.name}${r.is_required ? " (Required)" : ""}`)
      .slice(0, 8)
      .join("\n") || "• View upload portal for full checklist";

  const assignedMessage = `Hello ${caseData.client.name},\n\nPlease upload the required documents for your *${caseData.title}* (Ref: ${caseData.reference_number}) using this secure portal link:\n\n🔗 ${clientUploadUrl}\n\nRequired Documents:\n${reqsBullets}\n\nThis portal allows you to track document approvals in real-time. Let us know if you need any assistance!\n\nBest regards,\n${orgName}`;

  const cleanAssignedPhone = caseData.client.phone.replace(/[^0-9]/g, "");
  const singleWhatsappUrl = `https://wa.me/${cleanAssignedPhone}?text=${encodeURIComponent(assignedMessage)}`;

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
            <span>Assigned Client ({(caseData.client?.name || "Client").trim().split(/\s+/)[0]})</span>
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

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
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
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
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

interface NewCaseModalProps {
  clients: Client[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCase?: any) => void;
  initialTemplate?: ChecklistTemplate | null;
  initialClientId?: string;
}

interface DocItem {
  name: string;
  description: string;
  is_required: boolean;
}

// Built-in smart document suggestion library for instant autocomplete
const SMART_DOCUMENT_SUGGESTIONS = [
  "PAN Card",
  "Aadhaar Card",
  "Form 16 (Part A & B)",
  "Form 26AS & AIS / TIS Summary",
  "Bank Statements (Full FY - 12 Months)",
  "Bank Statement (Last 6 Months)",
  "Salary Slips (Last 3 Months)",
  "ITR-V Acknowledgment",
  "Capital Gains Statement from Broker",
  "Housing Loan Interest Certificate",
  "GST Registration Certificate",
  "GSTR-3B Monthly Return Copies",
  "GSTR-1 vs 3B Sales Reconciliation",
  "Electricity Bill of Premises (< 2 Months)",
  "Rent Agreement & Owner NOC",
  "Cancelled Cheque / Bank Statement with IFSC",
  "Passport (All Pages with Stamps)",
  "Passport Size Photograph",
  "Property Chain Title Deeds / Sale Deed",
  "Audited Balance Sheet & Profit & Loss",
  "CMA Data & Project Report",
  "Digital Signature Certificate (DSC) Form",
  "LLP Agreement (Form 3 Filing)",
  "MSME / Udyam Certificate",
  "Trademark Logo / Wordmark High-Res Image",
  "University Offer Letter & I-20 / CAS",
  "CA Net Worth & Wealth Valuation Report",
  "Trial Balance & Grouping Schedules",
  "Fixed Asset Register with Depreciation",
  "Relieving Letter & Experience Certificates",
];

const QUICK_PRESETS: {
  id: string;
  name: string;
  serviceType: string;
  items: DocItem[];
}[] = [
  {
    id: "itr",
    name: "ITR-1 Salaried",
    serviceType: "Taxation & Returns",
    items: [
      { name: "Form 16 (Part A & B)", description: "Salary TDS certificate", is_required: true },
      { name: "PAN Card", description: "Identity proof", is_required: true },
      { name: "Aadhaar Card", description: "Linked with PAN", is_required: true },
      { name: "Bank Statements (Full FY - 12 Months)", description: "All savings accounts", is_required: true },
      { name: "Form 26AS & AIS / TIS Summary", description: "Tax credit statement", is_required: true },
    ],
  },
  {
    id: "gst",
    name: "GST Registration",
    serviceType: "GST Compliance",
    items: [
      { name: "PAN Card of Business / Proprietor", description: "Entity PAN", is_required: true },
      { name: "Aadhaar Card of Promoters", description: "Signatory Aadhaar", is_required: true },
      { name: "Electricity Bill of Premises (< 2 Months)", description: "Registered address utility bill", is_required: true },
      { name: "Rent Agreement & Owner NOC", description: "Premises consent proof", is_required: true },
      { name: "Cancelled Cheque / Bank Statement with IFSC", description: "Bank proof", is_required: true },
    ],
  },
  {
    id: "loan",
    name: "Home Loan Dossier",
    serviceType: "Banking & Loans",
    items: [
      { name: "Applicant & Co-Applicant KYC (PAN & Aadhaar)", description: "Identity & address", is_required: true },
      { name: "Last 3 Months Computerized Salary Slips", description: "Payslips with seal", is_required: true },
      { name: "Last 6 Months Salary Bank Statement", description: "Salary account statement", is_required: true },
      { name: "Latest Form 16 & 3 Years ITR-V", description: "Tax acknowledgments", is_required: true },
      { name: "Property Chain of Title Deeds & Agreement to Sell", description: "Title documentation", is_required: true },
    ],
  },
  {
    id: "corp",
    name: "Company Incorporation",
    serviceType: "Corporate & Legal",
    items: [
      { name: "PAN & Identity Proof of All Directors", description: "Directors identity proof", is_required: true },
      { name: "Address Proof of Directors (< 2 Months)", description: "Bank statement / utility bill", is_required: true },
      { name: "Registered Office Electricity Bill (< 2 Months)", description: "Office premises utility bill", is_required: true },
      { name: "Owner NOC & Rent Agreement", description: "Landlord consent", is_required: true },
      { name: "Digital Signature Certificate (DSC) Application Form", description: "Class 3 DSC form", is_required: true },
    ],
  },
  {
    id: "visa",
    name: "Student Visa",
    serviceType: "Visa & Immigration",
    items: [
      { name: "Valid Passport (All Pages with Stamps)", description: "Min 12 months validity", is_required: true },
      { name: "University Offer Letter & I-20 / CAS", description: "Admission proof", is_required: true },
      { name: "Academic Marksheets & Degree Certificates", description: "Academic records", is_required: true },
      { name: "CA Net Worth & Wealth Valuation Report", description: "Financial solvency report", is_required: true },
      { name: "Last 6 Months Bank Statement with Branch Stamp", description: "Proof of liquid funds", is_required: true },
    ],
  },
  {
    id: "audit",
    name: "Tax Audit (3CD)",
    serviceType: "Audits & Compliance",
    items: [
      { name: "Final Trial Balance & Grouping Schedules", description: "Closing ledgers", is_required: true },
      { name: "Bank Confirmation Letters & Year-End Bank Statements", description: "Bank balances", is_required: true },
      { name: "Fixed Asset Register with Depreciation Schedule", description: "Asset additions & disposals", is_required: true },
      { name: "Statutory Dues Payment Proofs (PF, ESIC, TDS, GST)", description: "Challans paid on time", is_required: true },
    ],
  },
];

export function NewCaseModal({
  clients: initialClients,
  isOpen,
  onClose,
  onSuccess,
  initialTemplate,
  initialClientId,
}: NewCaseModalProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  // Clients
  const [clientList, setClientList] = useState<Client[]>(initialClients);
  const [clientId, setClientId] = useState<string>(initialClientId || initialClients[0]?.id || "");
  const [isQuickAddClient, setIsQuickAddClient] = useState(false);
  const [quickClientName, setQuickClientName] = useState("");
  const [quickClientPhone, setQuickClientPhone] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>("itr");

  // Case Basics
  const [title, setTitle] = useState<string>("");
  const [userEditedTitle, setUserEditedTitle] = useState(false);
  const [serviceType, setServiceType] = useState<string>("ITR Filing");
  const [dueDate, setDueDate] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");

  // Documents
  const [requirements, setRequirements] = useState<DocItem[]>([]);
  const [docInputValue, setDocInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save Template
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    setReferenceNumber(`CASE-${Date.now().toString().slice(-4)}`);
  }, []);

  useEffect(() => {
    setClientList(initialClients);
    if (!clientId && initialClients.length > 0) {
      setClientId(initialClients[0].id);
    }
  }, [initialClients]);

  // Load custom templates
  useEffect(() => {
    if (isOpen) {
      getChecklistTemplatesAction()
        .then((res) => {
          if (res) setTemplates(res);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // Setup Initial State
  useEffect(() => {
    if (initialTemplate) {
      setActivePresetId(`db_${initialTemplate.id}`);
      setServiceType(initialTemplate.service_type || "General");
      setTitle(`${initialTemplate.name} - ${new Date().getFullYear()}`);
      setUserEditedTitle(true);
      const items: DocItem[] = (initialTemplate.requirements || []).map((r: any) => ({
        name: typeof r === "string" ? r : r.name || r.title || "Document",
        description: typeof r === "object" ? r.description || "" : "",
        is_required: typeof r === "object" ? r.is_required !== false : true,
      }));
      setRequirements(items);
    } else {
      // Default to ITR
      const defaultPreset = QUICK_PRESETS[0];
      setActivePresetId(defaultPreset.id);
      setServiceType(defaultPreset.serviceType);
      setRequirements([...defaultPreset.items]);
    }

    if (initialClientId) {
      setClientId(initialClientId);
    }
  }, [initialTemplate, initialClientId]);

  // Selected client object
  const selectedClient = useMemo(
    () => clientList.find((c) => c.id === clientId),
    [clientList, clientId]
  );

  // Auto-title update unless user typed custom title
  useEffect(() => {
    if (!userEditedTitle) {
      const type = serviceType || "Documents";
      if (selectedClient?.name) {
        setTitle(`${type} - ${selectedClient.name}`);
      } else {
        setTitle(`${type} ${new Date().getFullYear()}`);
      }
    }
  }, [serviceType, selectedClient, userEditedTitle]);

  // Filter suggestions as user types
  const filteredSuggestions = useMemo(() => {
    const q = docInputValue.trim().toLowerCase();
    if (!q) return [];
    const existingNames = new Set(requirements.map((r) => r.name.toLowerCase()));
    return SMART_DOCUMENT_SUGGESTIONS.filter(
      (item) => item.toLowerCase().includes(q) && !existingNames.has(item.toLowerCase())
    ).slice(0, 5);
  }, [docInputValue, requirements]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  // Add Document
  const handleAddDoc = (docName: string) => {
    const trimmed = docName.trim();
    if (!trimmed) return;
    // Split by comma if user pasted multiple
    const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    const newItems: DocItem[] = parts.map((name) => ({
      name,
      description: "",
      is_required: true,
    }));
    setRequirements((prev) => [...prev, ...newItems]);
    setDocInputValue("");
    setShowSuggestions(false);
  };

  const handleRemoveDoc = (index: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleRequired = (index: number) => {
    setRequirements((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], is_required: !updated[index].is_required };
      return updated;
    });
  };

  const handleApplyPreset = (preset: (typeof QUICK_PRESETS)[0]) => {
    setActivePresetId(preset.id);
    setServiceType(preset.serviceType);
    setRequirements([...preset.items]);
    if (!userEditedTitle) {
      setTitle(selectedClient?.name ? `${preset.name} - ${selectedClient.name}` : `${preset.name} ${new Date().getFullYear()}`);
    }
  };

  const handleApplyDbTemplate = (template: ChecklistTemplate) => {
    setActivePresetId(`db_${template.id}`);
    setServiceType(template.service_type || "General");
    const items: DocItem[] = (template.requirements || []).map((r: any) => ({
      name: typeof r === "string" ? r : r.name || r.title || "Document",
      description: typeof r === "object" ? r.description || "" : "",
      is_required: typeof r === "object" ? r.is_required !== false : true,
    }));
    setRequirements(items);
    if (!userEditedTitle) {
      setTitle(selectedClient?.name ? `${template.name} - ${selectedClient.name}` : `${template.name} ${new Date().getFullYear()}`);
    }
  };

  const handleClearDocs = () => {
    setActivePresetId(null);
    setRequirements([]);
  };

  // Quick Client Creation
  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientName.trim() || !quickClientPhone.trim()) return;
    setCreatingClient(true);
    try {
      const res = await createClientAction({
        name: quickClientName.trim(),
        phone: quickClientPhone.trim(),
      });
      if (res?.success && res.client) {
        setClientList((prev) => [res.client, ...prev]);
        setClientId(res.client.id);
        setIsQuickAddClient(false);
        setQuickClientName("");
        setQuickClientPhone("");
        toast({ title: "Client Added", description: `${res.client.name} selected.` });
      } else {
        toast({ title: "Failed to add client", description: (res as any)?.error, type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setCreatingClient(false);
    }
  };

  // Submit Case
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast({ title: "Please select a client", type: "error" });
      return;
    }
    if (requirements.length === 0) {
      toast({ title: "Checklist is empty", description: "Add at least one document to collect.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const res = await createCaseAction({
        client_id: clientId,
        title: title.trim() || `${serviceType} - ${selectedClient?.name || "Client"}`,
        service_type: serviceType.trim() || "General",
        reference_number: referenceNumber.trim() || `CASE-${Date.now().toString().slice(-4)}`,
        due_date: dueDate || undefined,
        requirements,
      });

      if (isSaveTemplateOpen) {
        const tName = templateName.trim() || title.trim();
        createChecklistTemplateAction({
          name: tName,
          serviceType: serviceType || "General",
          requirements,
        }).catch(console.warn);
      }

      toast({ title: "Case Created!", description: "Client collection link is active and ready." });
      onSuccess(res?.case);
      onClose();
    } catch (err: any) {
      toast({ title: "Failed to create case", description: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !isOpen || typeof window === "undefined" || !window.document?.body) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Spacious, flat modal container with clean scrollbar */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-3xl w-full shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Header: Clean & uncluttered */}
        <div className="px-6 py-4 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                New Collection Case
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Locked Reference Tag */}
            <span
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800/80 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700/60"
              title="Automatic Case Reference ID (System Locked)"
            >
              <Lock className="w-3 h-3 text-neutral-400" />
              <span>{referenceNumber}</span>
            </span>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body - Open, Flat, No nested box labyrinths */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto overflow-x-hidden flex-1 scrollbar-none">
            {/* ROW 1: Client Selection & Case Title & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              {/* Client Selection (5 cols) */}
              <div className="sm:col-span-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Client <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddClient(!isQuickAddClient)}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>{isQuickAddClient ? "Pick existing" : "+ New"}</span>
                  </button>
                </div>

                {isQuickAddClient ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Name"
                      required
                      value={quickClientName}
                      onChange={(e) => setQuickClientName(e.target.value)}
                      className="w-1/2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-2.5 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      required
                      value={quickClientPhone}
                      onChange={(e) => setQuickClientPhone(e.target.value)}
                      className="w-1/2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-2.5 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddClient}
                      disabled={creatingClient || !quickClientName.trim() || !quickClientPhone.trim()}
                      className="px-2.5 py-2 bg-emerald-500 text-neutral-950 font-bold text-xs rounded-xl hover:bg-emerald-600 transition shrink-0 cursor-pointer"
                    >
                      {creatingClient ? "..." : "Add"}
                    </button>
                  </div>
                ) : (
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                  >
                    {clientList.length === 0 ? (
                      <option value="">No clients found (+ New above)</option>
                    ) : (
                      clientList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.company ? `(${c.company})` : ""} {c.phone ? `• ${c.phone}` : ""}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Case Title (4 cols) */}
              <div className="sm:col-span-4 space-y-1.5">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                  Case Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setUserEditedTitle(true);
                  }}
                  placeholder="e.g. ITR Filing - Client"
                  className="w-full text-xs bg-neutral-50 dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Due Date (3 cols, optional) */}
              <div className="sm:col-span-3 space-y-1.5">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Due Date
                  </label>
                  <span className="text-[10px] text-neutral-400 font-normal">(Optional)</span>
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs bg-neutral-50 dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 rounded-xl px-2.5 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* ROW 2: Quick Pick Template Bar */}
            <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Quick Pick
                  </span>
                  <div className="group relative cursor-help">
                    <Info className="w-3.5 h-3.5 text-neutral-400" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block bg-neutral-900 text-white text-[10px] px-2 py-1 rounded-md shadow-md whitespace-nowrap z-20">
                      1-click preset checklist items
                    </div>
                  </div>
                </div>

                {/* Dropdown for custom & system templates grouped by category */}
                {templates.length > 0 && (
                  <select
                    value={activePresetId?.startsWith("db_") ? activePresetId : ""}
                    onChange={(e) => {
                      const tId = e.target.value.replace("db_", "");
                      const found = templates.find((t) => t.id === tId);
                      if (found) handleApplyDbTemplate(found);
                    }}
                    className="text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-medium px-2.5 py-1 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="" className="text-neutral-500">
                      Choose a Template ({templates.length})...
                    </option>
                    {Array.from(new Set(templates.map((t) => t.service_type || "General"))).map((cat) => (
                      <optgroup
                        key={cat}
                        label={cat}
                        className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-semibold"
                      >
                        {templates
                          .filter((t) => (t.service_type || "General") === cat)
                          .map((t) => (
                            <option
                              key={t.id}
                              value={`db_${t.id}`}
                              className="font-normal text-neutral-700 dark:text-neutral-300"
                            >
                              {t.name} ({t.requirements?.length || 0} docs)
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>

              {/* Fast Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {QUICK_PRESETS.map((p) => {
                  const isActive = activePresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${
                        isActive
                          ? "bg-emerald-500 text-neutral-950 border-emerald-500 shadow-xs"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      }`}
                    >
                      {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                      <span>{p.name}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={handleClearDocs}
                  className="px-2.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* ROW 3: Instant Document Add Field with Autocomplete */}
            <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                <span>Add Documents</span>
                <span className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
                  {requirements.length} {requirements.length === 1 ? "doc" : "docs"} in checklist
                </span>
              </label>

              {/* Autocomplete Input Container */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={docInputValue}
                    onChange={(e) => {
                      setDocInputValue(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (filteredSuggestions.length > 0 && showSuggestions) {
                          handleAddDoc(filteredSuggestions[0]);
                        } else {
                          handleAddDoc(docInputValue);
                        }
                      }
                    }}
                    placeholder="Type document name (e.g. PAN Card, Form 16) and press Enter..."
                    className="flex-1 text-xs bg-neutral-50 dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddDoc(docInputValue)}
                    disabled={!docInputValue.trim()}
                    className="px-4 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs rounded-xl disabled:opacity-40 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Instant Suggestions Dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute left-0 right-16 top-full mt-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl z-30 py-1 overflow-hidden animate-in fade-in duration-100">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold px-3 py-1 block border-b border-neutral-100 dark:border-neutral-700/60">
                      Suggestions (Click or press Enter to add)
                    </span>
                    {filteredSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddDoc(item)}
                        className="w-full text-left px-3.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="font-medium">{item}</span>
                        <span className="text-[10px] text-neutral-400">+ Add</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ROW 4: Open Document List (Clean, visible, fast remove) */}
            <div className="space-y-2">
              {requirements.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-500 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                  No documents added yet. Click a Quick Pick above or type a name to add.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-none">
                  {requirements.map((req, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700/80 rounded-xl flex items-center justify-between gap-2 text-xs group hover:border-neutral-300 dark:hover:border-neutral-600 transition"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {req.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Required / Optional Toggle Badge */}
                        <button
                          type="button"
                          onClick={() => handleToggleRequired(idx)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md cursor-pointer transition ${
                            req.is_required
                              ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
                              : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
                          }`}
                          title="Click to toggle Required / Optional"
                        >
                          {req.is_required ? "Req" : "Optional"}
                        </button>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(idx)}
                          className="p-1 text-neutral-400 hover:text-rose-500 transition cursor-pointer"
                          title="Remove document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Save Template Option */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
              {!isSaveTemplateOpen ? (
                <button
                  type="button"
                  onClick={() => setIsSaveTemplateOpen(true)}
                  className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 inline-flex items-center gap-1 cursor-pointer transition"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Save as Template</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 w-full max-w-sm animate-in fade-in">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder={`Template Name (default: "${title || "New Template"}")`}
                    className="flex-1 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-2.5 py-1.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsSaveTemplateOpen(false)}
                    className="text-xs text-neutral-400 hover:text-neutral-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer - Clear Action Buttons */}
          <div className="px-6 py-4 bg-white dark:bg-neutral-900 border-t border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-neutral-400 font-mono hidden sm:inline-block">
              {referenceNumber}
            </span>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !clientId || requirements.length === 0}
                className="px-5 py-2.5 text-xs font-bold text-neutral-950 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-xl shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Create Case & Active Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (client?: any) => void;
  initialTab?: "manual" | "csv";
}

interface ParsedClientRow {
  name: string;
  phone: string;
  email: string;
  company: string;
  clientRefId: string;
  address: string;
  notes: string;
  isValid: boolean;
  error?: string;
}

export function NewClientModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab = "manual",
}: NewClientModalProps) {
  const { toast } = useToast();
  const { subscription, clients: existingClients } = useDashboardData();

  // Tab state
  const [activeTab, setActiveTab] = useState<"manual" | "csv">(initialTab);

  // Manual Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [clientRefId, setClientRefId] = useState(`CLI-${Date.now().toString().slice(-4)}`);
  const [alternatePhone, setAlternatePhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [formStatus, setFormStatus] = useState<"idle" | "saving" | "error" | "success">("idle");
  const [formErrorMessage, setFormErrorMessage] = useState("");

  // CSV Import State
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedClientRow[]>([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Limits
  const MAX_BATCH_LIMIT = 50;
  const maxAllowed = subscription?.max_clients ? Number(subscription.max_clients) : 10;
  const currentCount = existingClients.length;
  const remainingSlots = Math.max(0, maxAllowed - currentCount);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync tab when modal opens or initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      // Generate a fresh ref id
      setClientRefId(`CLI-${Date.now().toString().slice(-4)}`);
    }
  }, [isOpen, initialTab]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  // Reset CSV state
  const resetCsv = () => {
    setCsvFileName(null);
    setParsedRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 1. Download CSV Template
  const downloadCsvTemplate = () => {
    const headers = "Full Name,Phone,Email,Company,Client ID,Address,Notes";
    const sampleRows = [
      'Ramesh Patel,+91 98765 43210,ramesh@example.com,Patel Logistics LLP,CLI-1001,"Office 402, Trade Tower, Mumbai","Prefers WhatsApp updates"',
      'Pooja Sharma,+91 98111 22334,pooja.sharma@innovate.co,Innovate Ventures,CLI-1002,"Sector 62, Noida","GST filing client"',
      'Anil Kumar,+91 91234 56789,anil.kumar@apex.in,Apex Traders,CLI-1003,"Commercial Market, Bengaluru","Quarterly audit checklist"',
    ];
    // UTF-8 BOM so Excel on Windows recognizes encoding cleanly
    const csvContent = "\uFEFF" + [headers, ...sampleRows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "docget_clients_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Template downloaded",
      description: "docget_clients_template.csv is ready. Open in Excel or Google Sheets.",
    });
  };

  // 2. Robust CSV Parser
  const parseCsvText = (text: string): string[][] => {
    const lines: string[][] = [];
    let currentRow: string[] = [];
    let currentVal = "";
    let insideQuotes = false;

    // Remove BOM if present
    const cleanText = text.replace(/^\uFEFF/, "");

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentVal += '"';
          i++; // Skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        currentRow.push(currentVal.trim());
        currentVal = "";
      } else if ((char === "\r" || char === "\n") && !insideQuotes) {
        if (char === "\r" && nextChar === "\n") {
          i++; // Skip CRLF
        }
        currentRow.push(currentVal.trim());
        if (currentRow.some((col) => col.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentVal = "";
      } else {
        currentVal += char;
      }
    }

    if (currentVal.length > 0 || currentRow.length > 0) {
      currentRow.push(currentVal.trim());
      if (currentRow.some((col) => col.length > 0)) {
        lines.push(currentRow);
      }
    }

    return lines;
  };

  // Match header to column key
  const matchHeader = (header: string): string | null => {
    const h = header.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (h.includes("fullname") || h === "name" || h.includes("clientname") || h.includes("contactname")) {
      return "name";
    }
    if (h.includes("phone") || h.includes("mobile") || h.includes("whatsapp") || h.includes("contact")) {
      return "phone";
    }
    if (h.includes("email") || h.includes("mail")) {
      return "email";
    }
    if (h.includes("company") || h.includes("firm") || h.includes("entity") || h.includes("business")) {
      return "company";
    }
    if (h.includes("clientid") || h.includes("refid") || h.includes("reference") || h === "id") {
      return "clientRefId";
    }
    if (h.includes("address") || h.includes("location") || h.includes("city")) {
      return "address";
    }
    if (h.includes("notes") || h.includes("note") || h.includes("remark") || h.includes("remarks")) {
      return "notes";
    }
    return null;
  };

  // Process selected file
  const handleFileProcess = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      toast({
        title: "Invalid file type",
        description: "Please upload a valid .csv file.",
        type: "error",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || !text.trim()) {
          toast({
            title: "Empty file",
            description: "The uploaded CSV file contains no content.",
            type: "error",
          });
          return;
        }

        const rawRows = parseCsvText(text);
        if (rawRows.length < 2) {
          toast({
            title: "No client records found",
            description: "CSV must contain a header row and at least one client data row.",
            type: "error",
          });
          return;
        }

        const headers = rawRows[0];
        const colMap: Record<string, number> = {};
        headers.forEach((h, idx) => {
          const matched = matchHeader(h);
          if (matched && colMap[matched] === undefined) {
            colMap[matched] = idx;
          }
        });

        if (colMap["name"] === undefined || colMap["phone"] === undefined) {
          toast({
            title: "Missing required columns",
            description: "CSV must include 'Full Name' and 'Phone' columns. Download the template to view format.",
            type: "error",
          });
          return;
        }

        const dataRows = rawRows.slice(1);
        const parsed: ParsedClientRow[] = dataRows.map((row, idx) => {
          const nameVal = (colMap["name"] !== undefined ? row[colMap["name"]] : "")?.trim() || "";
          const phoneVal = (colMap["phone"] !== undefined ? row[colMap["phone"]] : "")?.trim() || "";
          const emailVal = (colMap["email"] !== undefined ? row[colMap["email"]] : "")?.trim() || "";
          const companyVal = (colMap["company"] !== undefined ? row[colMap["company"]] : "")?.trim() || "";
          const clientRefIdVal = (colMap["clientRefId"] !== undefined ? row[colMap["clientRefId"]] : "")?.trim() || "";
          const addressVal = (colMap["address"] !== undefined ? row[colMap["address"]] : "")?.trim() || "";
          const notesVal = (colMap["notes"] !== undefined ? row[colMap["notes"]] : "")?.trim() || "";

          let isValid = true;
          let error = "";

          if (!nameVal) {
            isValid = false;
            error = "Missing Name";
          } else if (!phoneVal) {
            isValid = false;
            error = "Missing Phone";
          }

          return {
            name: nameVal,
            phone: phoneVal,
            email: emailVal,
            company: companyVal,
            clientRefId: clientRefIdVal || `CLI-${Date.now().toString().slice(-4)}-${idx + 1}`,
            address: addressVal,
            notes: notesVal,
            isValid,
            error,
          };
        });

        setCsvFileName(file.name);
        setParsedRows(parsed);
      } catch (err: any) {
        console.error("Error parsing CSV:", err);
        toast({
          title: "Failed to parse CSV",
          description: err.message || "Could not read the CSV file structure.",
          type: "error",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Valid rows filtered
  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRowsCount = parsedRows.length - validRows.length;

  // Batch limit & quota calculations
  const effectiveBatchLimit = Math.min(MAX_BATCH_LIMIT, remainingSlots);
  const isOverBatchLimit = validRows.length > MAX_BATCH_LIMIT;
  const isOverQuota = validRows.length > remainingSlots;
  const rowsToImport = validRows.slice(0, effectiveBatchLimit);

  // 3. Handle Manual Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setFormStatus("error");
      setFormErrorMessage("Client Name and Mobile Phone are required.");
      toast({
        title: "Required fields missing",
        description: "Name and phone are required.",
        type: "error",
      });
      return;
    }

    if (remainingSlots <= 0) {
      setFormStatus("error");
      setFormErrorMessage(`Client limit reached (${maxAllowed} clients max). Please upgrade to add more.`);
      toast({
        title: "Client limit reached",
        description: `You have reached the maximum of ${maxAllowed} clients on your current plan. Please upgrade to add more.`,
        type: "error",
      });
      return;
    }

    setManualLoading(true);
    setFormStatus("saving");
    setFormErrorMessage("");
    try {
      const res = await createClientAction({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        company: company.trim() || undefined,
        client_ref_id: clientRefId.trim() || undefined,
        alternate_phone: alternatePhone.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (res?.success && res.client) {
        setFormStatus("success");
        toast({
          title: "Client Added Successfully!",
          description: `${name} has been added to your roster.`,
        });
        setTimeout(() => {
          onSuccess(res.client);
          onClose();
        }, 650);
      } else {
        throw new Error((res as any)?.error || "Failed to create client.");
      }
    } catch (err: any) {
      console.error(err);
      setFormStatus("error");
      setFormErrorMessage(err.message || "An error occurred while saving client.");
      toast({
        title: "Failed to save client",
        description: err.message || "An error occurred while saving client.",
        type: "error",
      });
    } finally {
      setManualLoading(false);
    }
  };

  // 4. Handle CSV Import Submit
  const handleCsvImportSubmit = async () => {
    if (rowsToImport.length === 0) {
      toast({
        title: "No valid clients to import",
        description: "Please check your CSV file for valid records with Name and Phone.",
        type: "error",
      });
      return;
    }

    if (remainingSlots <= 0) {
      toast({
        title: "Plan quota reached",
        description: `Your plan allows up to ${maxAllowed} clients. Please upgrade your plan in Billing to import more clients.`,
        type: "error",
      });
      return;
    }

    setCsvLoading(true);
    try {
      const payload: ClientCsvRow[] = rowsToImport.map((r) => ({
        name: r.name,
        phone: r.phone,
        email: r.email || null,
        company: r.company || null,
        client_ref_id: r.clientRefId || null,
        address: r.address || null,
        notes: r.notes || null,
      }));

      const res = await importClientsFromCsvAction(payload);
      toast({
        title: "Import complete!",
        description: `Successfully imported ${res.count} client${res.count > 1 ? "s" : ""} to your roster.`,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Import failed",
        description: err.message || "An error occurred while importing clients.",
        type: "error",
      });
    } finally {
      setCsvLoading(false);
    }
  };

  if (!mounted || !isOpen || typeof window === "undefined" || !window.document?.body) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-[#15181e] rounded-2xl max-w-2xl w-full shadow-2xl border border-neutral-200/90 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/60 dark:bg-neutral-900/60">
          <div className="flex items-center gap-3 text-neutral-900 dark:text-neutral-100">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 dark:bg-neutral-800 text-white flex items-center justify-center shadow-xs">
              {activeTab === "manual" ? (
                <UserPlus className="w-4 h-4" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {activeTab === "manual" ? "Add New Client" : "Bulk Import Clients via CSV"}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {activeTab === "manual"
                  ? "Enter client details for upload links, reminders & document vault"
                  : "Upload a CSV file to add multiple clients at once"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 pb-2 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-[#15181e] flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100/80 dark:bg-neutral-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "manual"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Manual Entry</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("csv")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "csv"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Import via CSV</span>
            </button>
          </div>

          {/* Quota indicator */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-neutral-500 dark:text-neutral-400 font-medium">Plan Quota:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-md ${
                remainingSlots <= 2
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
              }`}
            >
              {currentCount} / {maxAllowed} Used ({remainingSlots} remaining)
            </span>
          </div>
        </div>

        {/* Tab 1: Manual Entry */}
        {activeTab === "manual" && (
          formStatus === "success" ? (
            <div className="p-10 text-center space-y-3.5 my-auto animate-in fade-in zoom-in-95 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Client Added Successfully</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">
                  <strong className="text-neutral-800 dark:text-neutral-200">{name}</strong> has been saved to your client portfolio. Opening client view...
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Redirecting...</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {formStatus === "error" && formErrorMessage && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{formErrorMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      disabled={formStatus === "saving"}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Patel"
                      className="w-full text-xs bg-white dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-60"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      WhatsApp / Mobile <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      disabled={formStatus === "saving"}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full text-xs bg-white dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-60"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      disabled={formStatus === "saving"}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ramesh@example.com"
                      className="w-full text-xs bg-white dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Company / Firm Name
                    </label>
                    <input
                      type="text"
                      value={company}
                      disabled={formStatus === "saving"}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Patel Logistics LLP"
                      className="w-full text-xs bg-white dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Client Reference ID
                    </label>
                    <input
                      type="text"
                      value={clientRefId}
                      disabled={formStatus === "saving"}
                      onChange={(e) => setClientRefId(e.target.value)}
                      placeholder="e.g. CLI-2024"
                      className="w-full text-xs bg-white dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                      Alternate Phone
                    </label>
                    <input
                      type="tel"
                      value={alternatePhone}
                      disabled={formStatus === "saving"}
                      onChange={(e) => setAlternatePhone(e.target.value)}
                      placeholder="Optional backup number"
                      className="w-full text-xs bg-white dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Address</label>
                  <input
                    type="text"
                    value={address}
                    disabled={formStatus === "saving"}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Office or residential address"
                    className="w-full text-xs bg-white dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Internal Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    disabled={formStatus === "saving"}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="GSTIN, PAN numbers, communication preferences, remarks..."
                    className="w-full text-xs bg-white dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-neutral-50/60 dark:bg-neutral-900/60 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                  Fields marked with <span className="text-rose-500">*</span> are mandatory
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={formStatus === "saving"}
                    className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formStatus === "saving" || remainingSlots <= 0}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {formStatus === "saving" ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving Client...</span>
                      </>
                    ) : (
                      <span>Save Client</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )
        )}

        {/* Tab 2: Bulk CSV Import */}
        {activeTab === "csv" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Step 1: Template Download Banner */}
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Follow the CSV Template</h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      Download our pre-structured template containing standard columns: <code className="text-neutral-800 dark:text-neutral-200 bg-neutral-200/60 dark:bg-neutral-800 px-1 py-0.5 rounded text-[10px]">Full Name</code>, <code className="text-neutral-800 dark:text-neutral-200 bg-neutral-200/60 dark:bg-neutral-800 px-1 py-0.5 rounded text-[10px]">Phone</code>, <code className="text-neutral-800 dark:text-neutral-200 bg-neutral-200/60 dark:bg-neutral-800 px-1 py-0.5 rounded text-[10px]">Email</code>, <code className="text-neutral-800 dark:text-neutral-200 bg-neutral-200/60 dark:bg-neutral-800 px-1 py-0.5 rounded text-[10px]">Company</code>, <code className="text-neutral-800 dark:text-neutral-200 bg-neutral-200/60 dark:bg-neutral-800 px-1 py-0.5 rounded text-[10px]">Client ID</code>, etc.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer self-start sm:self-center"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Step 2: File Upload Box */}
              {!csvFileName ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-neutral-900 dark:border-neutral-400 bg-neutral-50 dark:bg-neutral-800/50"
                      : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 bg-white dark:bg-neutral-900/40"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileProcess(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 flex items-center justify-center mx-auto mb-2.5">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Click to browse or drag & drop your client CSV here
                  </p>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                    Batch limit: Up to 50 contacts per upload
                  </p>
                </div>
              ) : (
                /* Selected File Header */
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <span>{csvFileName}</span>
                        <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                          {validRows.length} valid contact{validRows.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        {parsedRows.length} total rows parsed
                        {invalidRowsCount > 0 && ` (${invalidRowsCount} skipped due to missing name/phone)`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetCsv}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-white dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Alerts & Limits Notice */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  {isOverBatchLimit && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-2 text-amber-900 dark:text-amber-200 text-[11px]">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Batch Limit Reached:</strong> A maximum of 50 contacts can be imported per batch. We will import the first 50 valid contacts.
                      </span>
                    </div>
                  )}

                  {isOverQuota && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200/80 dark:border-rose-800/60 flex items-start gap-2 text-rose-900 dark:text-rose-200 text-[11px]">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Plan Limit Notice:</strong> Your subscription has {remainingSlots} client slot(s) remaining. We will import the first {Math.min(remainingSlots, MAX_BATCH_LIMIT)} contacts. Please upgrade your plan in Billing to add more.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Preview Table */}
              {parsedRows.length > 0 && (
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                  <div className="bg-neutral-50 dark:bg-neutral-900 px-3.5 py-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    <span>CSV Preview ({validRows.length} Ready to Import)</span>
                    <span className="text-neutral-400 dark:text-neutral-500 font-normal text-[10px]">
                      Showing preview of parsed rows
                    </span>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <div
                        key={idx}
                        className={`px-3.5 py-2 flex items-center justify-between gap-3 ${
                          !row.isValid ? "bg-rose-50/40 dark:bg-rose-950/20 opacity-70" : "hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono w-5">
                            #{idx + 1}
                          </span>
                          <div className="truncate">
                            <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                              {row.name || <span className="text-rose-500 italic">Empty Name</span>}
                            </div>
                            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                              {row.phone || <span className="text-rose-500 italic">Empty Phone</span>}
                              {row.company && ` • ${row.company}`}
                              {row.email && ` • ${row.email}`}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                              <Check className="w-3 h-3" />
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/60">
                              <AlertCircle className="w-3 h-3" />
                              {row.error}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-neutral-50/60 dark:bg-neutral-900/60 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {parsedRows.length > 0 ? (
                  <span>
                    Will import <strong>{rowsToImport.length}</strong> contact{rowsToImport.length !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span>Select a CSV file to proceed</span>
                )}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCsvImportSubmit}
                  disabled={csvLoading || rowsToImport.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white dark:text-neutral-900 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {csvLoading ? (
                    <span>Importing Contacts...</span>
                  ) : (
                    <>
                      <FileUp className="w-3.5 h-3.5" />
                      <span>
                        Import {rowsToImport.length > 0 ? `${rowsToImport.length} Clients` : "CSV"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}