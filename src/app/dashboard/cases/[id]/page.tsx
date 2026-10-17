"use client";

import { useState, useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Users,
  CheckCircle,
  FileText,
  MessageSquareShare,
  Copy,
  ExternalLink,
  Shield,
  Eye,
  Sparkles,
  Bell,
  Send,
  Download,
  AlertCircle,
  RefreshCw,
  Loader2,
  Trash2,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { InfoPopover } from "@/components/ui";
import {
  getCaseDetails,
  generateUploadLinkAction,
  reviewDocumentAction,
  advisorDeleteDocumentAction,
  advisorBulkDeleteDocumentsAction,
  deleteCaseAction,
} from "@/app/actions";
import { CaseWithDetails, DocumentRequirement, Document } from "@/types";
import { getCaseStatusBadge, getRequirementStatusBadge, formatDate, formatDateTime, formatBytes } from "@/lib/utils";
import {
  ReviewModal,
  DocumentPreviewModal,
  WhatsAppShareModal,
  WhatsAppReminderModal,
} from "@/components/dashboard/Modals";
import { useToast } from "@/components/ui";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { downloadFileWithFeedback } from "@/lib/utils";
import { DeleteConfirmationModal } from "@/components/ui";

// Tenant-partitioned module-level in-memory cache to stop repeated fetch thrashing
const caseDetailsClientCache = new Map<string, { data: CaseWithDetails; timestamp: number }>();
const CASE_CACHE_TTL = 30000; // 30-second TTL

export default function CaseDetailPage() {
  const params = useParams();
  const pathname = usePathname();
  const pathnameId = pathname?.match(/\/dashboard\/cases\/([^/?#]+)/)?.[1];
  const rawId = params?.id || pathnameId;
  const caseId = Array.isArray(rawId) ? rawId[0] : (rawId as string);

  const { toast } = useToast();
  const { data: dashboardData, user, refresh: refreshDashboard, navigateToTab } = useDashboardData();

  const userOrgId = user?.organization_id || user?.organizationId;
  const cacheKey = `${userOrgId || "anon"}:${caseId}`;

  // Instant Cache resolution: Only resolve from cache if tenant matches active user organization
  const cachedCase = dashboardData?.cases?.find(
    (c) => c.id === caseId && (!userOrgId || c.organization_id === userOrgId)
  );

  const [caseData, setCaseData] = useState<CaseWithDetails | null>(() => {
    const entry = caseDetailsClientCache.get(cacheKey);
    if (entry && (!userOrgId || entry.data.organization_id === userOrgId)) return entry.data;
    return cachedCase || null;
  });
  const [loading, setLoading] = useState<boolean>(!caseData);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [selectedForReview, setSelectedForReview] = useState<{
    req: DocumentRequirement;
    doc: Document;
  } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{
    req: DocumentRequirement;
    doc: Document;
  } | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingDocIds, setDownloadingDocIds] = useState<Set<string>>(new Set());
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [downloadingSelected, setDownloadingSelected] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [docToDelete, setDocToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteCaseModalOpen, setIsDeleteCaseModalOpen] = useState(false);
  const [isDeletingCase, setIsDeletingCase] = useState(false);
  const [expandedReqHistory, setExpandedReqHistory] = useState<Record<string, boolean>>({});

  // Sync cache if available and authorized
  useEffect(() => {
    if (cachedCase && userOrgId && cachedCase.organization_id === userOrgId) {
      if (!caseData || caseData.id !== cachedCase.id) {
        setCaseData(cachedCase);
        setLoading(false);
      }
    }
  }, [cachedCase, userOrgId]);

  const loadCase = async (force = false) => {
    if (!caseId) return;

    // Check tenant-partitioned memory cache
    if (!force && userOrgId) {
      const cached = caseDetailsClientCache.get(cacheKey);
      if (cached && cached.data.organization_id === userOrgId && Date.now() - cached.timestamp < CASE_CACHE_TTL) {
        setCaseData(cached.data);
        setErrorMessage(null);
        setLoading(false);
        return;
      }
    }

    try {
      // 1. Primary: Direct REST API to avoid Next.js Server Action hash skew
      const res = await fetch(`/api/cases/${caseId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.caseData) {
          // Verify that returned case data belongs to the authenticated user's organization
          if (userOrgId && json.caseData.organization_id !== userOrgId) {
            setCaseData(null);
            setErrorMessage("Access denied: You do not have permission to view this case.");
            setLoading(false);
            return;
          }
          caseDetailsClientCache.set(cacheKey, { data: json.caseData, timestamp: Date.now() });
          setCaseData(json.caseData);
          setErrorMessage(null);
          setLoading(false);
          return;
        }
      }

      // 2. Secondary fallback: Server Action
      const serverRes = await getCaseDetails(caseId);
      if (serverRes) {
        if (userOrgId && serverRes.organization_id !== userOrgId) {
          setCaseData(null);
          setErrorMessage("Access denied: You do not have permission to view this case.");
        } else {
          caseDetailsClientCache.set(cacheKey, { data: serverRes, timestamp: Date.now() });
          setCaseData(serverRes);
          setErrorMessage(null);
        }
      } else {
        // Explicitly clear caseData on unauthorized / not found
        setCaseData(null);
        setErrorMessage("Case not found or access restricted.");
      }
    } catch (err: any) {
      console.warn("Failed to fetch fresh case details:", err);
      setCaseData(null);
      setErrorMessage(err.message || "Could not load case details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId) {
      loadCase();
    }
  }, [caseId]);

  // Document Review helper via direct API
  const reviewDoc = async (
    targetCaseId: string,
    reqId: string,
    docId: string,
    action: "approve" | "reject",
    rejectionReason?: string
  ) => {
    try {
      const res = await fetch(`/api/cases/${targetCaseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId: targetCaseId, requirementId: reqId, documentId: docId, action, rejectionReason }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) return json;
      }
    } catch (apiErr) {
      console.warn("Direct review API issue, falling back to server action:", apiErr);
    }
    return await reviewDocumentAction(targetCaseId, reqId, docId, action, rejectionReason);
  };

  // 1-Click Quick Approve single file
  const handleQuickApprove = async (req: DocumentRequirement, doc: Document) => {
    if (!caseData) return;
    try {
      await reviewDoc(caseData.id, req.id, doc.id, "approve");
      toast({ title: "Document approved", description: `${req.name} has been verified.` });
      caseDetailsClientCache.delete(caseData.id);
      await loadCase(true);
      if (refreshDashboard) refreshDashboard();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Failed to approve", description: err.message, type: "error" });
    }
  };

  // 1-Click Batch Approve all under-review documents
  const handleApproveAll = async () => {
    if (!caseData) return;
    const underReviewItems: { req: DocumentRequirement; doc: Document }[] = [];
    caseData.requirements.forEach((req) => {
      if ((req.status === "under_review" || req.status === "uploaded") && req.documents?.length) {
        underReviewItems.push({ req, doc: req.documents[req.documents.length - 1] });
      }
    });

    if (underReviewItems.length === 0) return;

    setBatchLoading(true);
    try {
      for (const item of underReviewItems) {
        await reviewDoc(caseData.id, item.req.id, item.doc.id, "approve");
      }
      toast({
        title: "All documents approved",
        description: `Approved ${underReviewItems.length} documents in batch.`,
      });
      caseDetailsClientCache.delete(caseData.id);
      await loadCase(true);
      if (refreshDashboard) refreshDashboard();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Batch approval issue", description: err.message, type: "error" });
    } finally {
      setBatchLoading(false);
    }
  };

  // Loading State
  if (loading && !caseData) {
    return (
      <div className="space-y-6 w-full pb-12 animate-in fade-in duration-150">
        {/* Back Link Shimmer */}
        <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />

        {/* Case Banner Shimmer */}
        <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-4 w-28 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                <div className="h-5 w-20 bg-neutral-100 dark:bg-neutral-800 rounded-full animate-pulse" />
              </div>
              <div className="h-7 w-64 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-28 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
              <div className="h-9 w-32 bg-neutral-900/20 dark:bg-neutral-700/60 rounded-xl animate-pulse" />
            </div>
          </div>
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-6">
            <div className="h-4 w-36 bg-neutral-100 dark:bg-neutral-800/70 rounded animate-pulse" />
            <div className="h-4 w-28 bg-neutral-100 dark:bg-neutral-800/70 rounded animate-pulse" />
          </div>
        </div>

        {/* Checklist Slots Shimmer */}
        <div className="space-y-3">
          <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 flex items-center justify-between gap-4 shadow-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse shrink-0" />
                  <div className="space-y-1.5 min-w-0">
                    <div className="h-4 w-48 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                    <div className="h-3 w-64 bg-neutral-100 dark:bg-neutral-800/60 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-7 w-20 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (errorMessage && !caseData) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-xl text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">Unable to Open Case</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{errorMessage}</p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setErrorMessage(null);
              loadCase();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-800 text-white text-xs font-semibold rounded-xl cursor-pointer transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
          <Link
            href="/dashboard/cases"
            prefetch={true}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                navigateToTab("cases");
              }
            }}
            className="inline-flex items-center gap-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            ← Back to Cases
          </Link>
        </div>
      </div>
    );
  }

  if (!caseData) return null;

  const token = caseData.upload_link?.token || caseData.upload_link?.token_hash;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const uploadUrl = token ? `${baseUrl}/upload/${token}` : "";

  const handleCopyLink = async () => {
    let effectiveUrl = uploadUrl;
    if (!token) {
      toast({ title: "Generating link...", description: "Creating secure upload link." });
      try {
        const res = await generateUploadLinkAction(caseData.id);
        if (res.token) {
          effectiveUrl = `${baseUrl}/upload/${res.token}`;
          await loadCase(true);
        }
      } catch (err: any) {
        toast({ title: "Link generation failed", description: err.message, type: "error" });
        return;
      }
    }
    if (effectiveUrl) {
      navigator.clipboard.writeText(effectiveUrl);
      setCopied(true);
      toast({ title: "Link copied", description: "Direct client upload link is ready to share." });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadFileToSystem = async (storagePath: string, fileName: string, docId: string) => {
    const url = `/api/download?file=${encodeURIComponent(storagePath || "")}&name=${encodeURIComponent(fileName)}&id=${docId}&download=1`;
    await downloadFileWithFeedback({
      url,
      fileName,
      toast,
      onStart: () => setDownloadingDocIds((prev) => new Set(prev).add(docId)),
      onComplete: () =>
        setDownloadingDocIds((prev) => {
          const next = new Set(prev);
          next.delete(docId);
          return next;
        }),
    });
  };

  const allUploadedValidDocs =
    caseData?.requirements
      ?.flatMap((r) => r.documents || [])
      .filter((d) => Boolean(d.storage_path) && d.status !== "rejected") || [];

  const handleToggleSelectDoc = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleSelectAllDocs = () => {
    if (selectedDocIds.size === allUploadedValidDocs.length && allUploadedValidDocs.length > 0) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(allUploadedValidDocs.map((d) => d.id)));
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedDocIds.size === 0) return;
    const docsToDownload = allUploadedValidDocs.filter((d) => selectedDocIds.has(d.id));
    if (docsToDownload.length === 0) return;

    setDownloadingSelected(true);
    toast({
      title: "Downloading Selected Files",
      description: `Starting download of ${docsToDownload.length} document(s)...`,
    });

    try {
      for (const doc of docsToDownload) {
        await downloadFileToSystem(doc.storage_path || "", doc.file_name, doc.id);
        // Stagger downloads by 300ms to allow browser download manager to trigger cleanly
        await new Promise((r) => setTimeout(r, 300));
      }
    } finally {
      setDownloadingSelected(false);
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!docToDelete || !caseData) return;
    const targetDocId = docToDelete.id;
    setIsDeleting(true);
    try {
      const res = await advisorDeleteDocumentAction(caseData.id, targetDocId);
      if (res.success) {
        toast({ title: "Document deleted", description: `${docToDelete.name} was permanently removed.` });
        setDocToDelete(null);
        // Instant optimistic internal update: remove file in 0ms without waiting for refetch
        setCaseData((prev) => {
          if (!prev) return prev;
          const updatedReqs = prev.requirements.map((r) => {
            const hasDoc = r.documents?.some((d) => d.id === targetDocId);
            if (!hasDoc) return r;
            const remaining = (r.documents || []).filter((d) => d.id !== targetDocId);
            const newStatus = remaining.length > 0 ? remaining[0].status : "not_uploaded";
            return { ...r, status: newStatus as any, documents: remaining };
          });
          return { ...prev, requirements: updatedReqs };
        });
        caseDetailsClientCache.delete(caseData.id);
        await loadCase(true);
        if (refreshDashboard) refreshDashboard();
      } else {
        toast({ title: "Failed to delete", description: res.error || "Unable to delete file", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Deletion error", description: err.message, type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedDocIds.size === 0 || !caseData) return;
    setIsDeleting(true);
    try {
      const ids = Array.from(selectedDocIds);
      const res = await advisorBulkDeleteDocumentsAction(caseData.id, ids);
      if (res.success) {
        toast({
          title: "Documents deleted",
          description: `Successfully deleted ${res.count || ids.length} document(s).`,
        });
        const idsSet = new Set(ids);
        setSelectedDocIds(new Set());
        setIsBulkDeleteOpen(false);
        // Instant optimistic internal update for bulk delete
        setCaseData((prev) => {
          if (!prev) return prev;
          const updatedReqs = prev.requirements.map((r) => {
            const remaining = (r.documents || []).filter((d) => !idsSet.has(d.id));
            const newStatus = remaining.length > 0 ? remaining[0].status : "not_uploaded";
            return { ...r, status: newStatus as any, documents: remaining };
          });
          return { ...prev, requirements: updatedReqs };
        });
        caseDetailsClientCache.delete(caseData.id);
        await loadCase(true);
        if (refreshDashboard) refreshDashboard();
      } else {
        toast({ title: "Bulk deletion failed", description: res.error || "Unable to delete files", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Bulk deletion error", description: err.message, type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCase = async () => {
    if (!caseData) return;
    setIsDeletingCase(true);
    try {
      const res = await deleteCaseAction(caseData.id);
      if (res.success) {
        toast({ title: "Case deleted", description: res.message });
        caseDetailsClientCache.delete(caseData.id);
        if (refreshDashboard) refreshDashboard();
        window.location.href = "/dashboard/cases";
      } else {
        toast({ title: "Delete failed", description: res.error, type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setIsDeletingCase(false);
    }
  };

  const handleDownloadZip = async () => {
    // Download all non-rejected case files
    const validDocs = caseData?.requirements?.flatMap((r) => r.documents || []).filter((d) => d.status !== "rejected" && Boolean(d.storage_path)) || [];
    if (validDocs.length === 0) {
      toast({
        title: "No valid documents",
        description: "No uploaded files found to package. Any rejected documents are excluded.",
        type: "error",
      });
      return;
    }

    setDownloadingAll(true);
    toast({
      title: "Packaging ZIP Archive",
      description: `Bundling ${validDocs.length} valid document(s) for ${caseData.client?.name || "Client"}...`,
    });

    try {
      const res = await fetch(`/api/cases/${caseData.id}/download-zip`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Download failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition") || "";
      let fileName = "case_documents.zip";
      const matches = /filename\*?=['"]?(?:UTF-8'')?([^'";]+)['"]?/i.exec(contentDisposition);
      if (matches && matches[1]) {
        fileName = decodeURIComponent(matches[1]);
      } else {
        const clientNameClean = (caseData.client?.name || "Client").replace(/[^a-zA-Z0-9_-]/g, "_");
        const caseRefClean = (caseData.reference_number || caseData.id.slice(0, 8)).replace(/[^a-zA-Z0-9_-]/g, "_");
        fileName = `${clientNameClean}_${caseRefClean}_case_documents.zip`;
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }, 500);

      toast({
        title: "ZIP Downloaded!",
        description: `Saved ${fileName} containing ${validDocs.length} document(s).`,
      });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err.message || "Could not generate case zip archive.",
        type: "error",
      });
    } finally {
      setDownloadingAll(false);
    }
  };

  const statusBadge = getCaseStatusBadge(caseData.status);
  const totalReqs = caseData.requirements.length;
  const requiredReqs = caseData.requirements.filter((r) => r.is_required);
  const approvedCount = caseData.requirements.filter((r) => r.status === "approved").length;
  const underReviewCount = caseData.requirements.filter((r) => r.status === "under_review" || r.status === "uploaded").length;
  const requiredApprovedCount = requiredReqs.filter((r) => r.status === "approved").length;
  const isComplete = requiredReqs.length > 0 && requiredApprovedCount === requiredReqs.length;
  const progressPercent = totalReqs > 0 ? Math.round((approvedCount / totalReqs) * 100) : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Visual Leaving Feedback Banner */}
      {isLeaving && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-emerald-600 text-white text-[11px] font-semibold py-1.5 px-4 text-center shadow flex items-center justify-center gap-2 animate-in fade-in">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
          <span>Returning to Cases list...</span>
        </div>
      )}

      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/cases"
            prefetch={true}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                setIsLeaving(true);
                navigateToTab("cases");
              }
            }}
            className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:white flex items-center justify-center shadow-subtle transition-colors cursor-pointer"
            title="Back to Cases"
          >
            {isLeaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ArrowLeft className="w-3.5 h-3.5" />
            )}
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-neutral-400 dark:text-neutral-500 font-semibold">{caseData.reference_number}</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusBadge.className}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotColor}`} />
                {statusBadge.label}
              </span>
            </div>
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white mt-0.5">{caseData.title}</h1>
          </div>
        </div>

        {/* Action Buttons Toolbar - Smart hover-expand method for clean UI & enhanced UX */}
        <div className="flex flex-wrap items-center gap-2">
          {underReviewCount > 0 && (
            <button
              type="button"
              disabled={batchLoading}
              onClick={handleApproveAll}
              className="group h-9 px-2.5 hover:px-3.5 focus-visible:px-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white border border-emerald-600 rounded-xl text-xs font-semibold inline-flex items-center justify-center shadow-2xs transition-all duration-300 ease-out cursor-pointer disabled:opacity-50"
              title={`Approve All (${underReviewCount})`}
            >
              <div className="relative shrink-0 flex items-center justify-center">
                {batchLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
                <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-3.5 flex items-center justify-center bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 text-[9px] font-extrabold rounded-full shadow-2xs">
                  {underReviewCount}
                </span>
              </div>
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2 group-focus-visible:max-w-xs group-focus-visible:opacity-100 group-focus-visible:ml-2 transition-all duration-300 ease-out">
                {batchLoading ? "Approving..." : `Approve All (${underReviewCount})`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsReminderOpen(true)}
            className="group h-9 px-2.5 hover:px-3.5 focus-visible:px-3.5 bg-amber-50 hover:bg-amber-100/80 active:scale-[0.98] dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 rounded-xl text-xs font-semibold inline-flex items-center justify-center shadow-2xs transition-all duration-300 ease-out cursor-pointer"
            title="Send Reminder"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-1.5 group-focus-visible:max-w-xs group-focus-visible:opacity-100 group-focus-visible:ml-1.5 transition-all duration-300 ease-out">
              Send Reminder
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="group h-9 px-2.5 hover:px-3.5 focus-visible:px-3.5 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 active:scale-[0.98] text-neutral-700 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-800 rounded-xl text-xs font-semibold inline-flex items-center justify-center shadow-2xs transition-all duration-300 ease-out cursor-pointer"
            title={copied ? "Copied" : "Copy Link"}
          >
            {copied ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
            )}
            <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-1.5 group-focus-visible:max-w-xs group-focus-visible:opacity-100 group-focus-visible:ml-1.5 transition-all duration-300 ease-out">
              {copied ? "Copied" : "Copy Link"}
            </span>
          </button>

          <button
            type="button"
            disabled={downloadingAll}
            onClick={handleDownloadZip}
            className="group h-9 px-2.5 hover:px-3.5 focus-visible:px-3.5 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 active:scale-[0.98] text-neutral-700 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-800 rounded-xl text-xs font-semibold inline-flex items-center justify-center shadow-2xs transition-all duration-300 ease-out cursor-pointer disabled:opacity-50"
            title="Download all case documents (excluding rejected files) in a single ZIP file"
          >
            {downloadingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <Download className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
            )}
            <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-1.5 group-focus-visible:max-w-xs group-focus-visible:opacity-100 group-focus-visible:ml-1.5 transition-all duration-300 ease-out">
              {downloadingAll ? "Zipping..." : "Download ZIP"}
            </span>
          </button>

          {selectedDocIds.size > 0 && (
            <button
              type="button"
              disabled={downloadingSelected}
              onClick={handleDownloadSelected}
              className="group h-9 px-2.5 hover:px-3.5 focus-visible:px-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white border border-emerald-600 rounded-xl text-xs font-semibold inline-flex items-center justify-center shadow-2xs transition-all duration-300 ease-out cursor-pointer disabled:opacity-50"
              title="Download selected files directly to system"
            >
              <div className="relative shrink-0 flex items-center justify-center">
                {downloadingSelected ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-3.5 flex items-center justify-center bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-400 text-[9px] font-extrabold rounded-full shadow-2xs">
                  {selectedDocIds.size}
                </span>
              </div>
              <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2 group-focus-visible:max-w-xs group-focus-visible:opacity-100 group-focus-visible:ml-2 transition-all duration-300 ease-out">
                {downloadingSelected ? "Downloading..." : `Download Selected (${selectedDocIds.size})`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsShareOpen(true)}
            className="group h-9 px-2.5 hover:px-3.5 focus-visible:px-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white border border-emerald-600 rounded-xl text-xs font-semibold inline-flex items-center justify-center shadow-2xs transition-all duration-300 ease-out cursor-pointer"
            title="Share on WhatsApp"
          >
            <MessageSquareShare className="w-3.5 h-3.5 text-white shrink-0" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-1.5 group-focus-visible:max-w-xs group-focus-visible:opacity-100 group-focus-visible:ml-1.5 transition-all duration-300 ease-out">
              Share on WhatsApp
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteCaseModalOpen(true)}
            className="group h-9 px-2.5 hover:px-3.5 focus-visible:px-3.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 active:scale-[0.98] text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold inline-flex items-center justify-center shadow-2xs transition-all duration-300 ease-out cursor-pointer"
            title="Delete this entire case"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-1.5 group-focus-visible:max-w-xs group-focus-visible:opacity-100 group-focus-visible:ml-1.5 transition-all duration-300 ease-out">
              Delete Case
            </span>
          </button>
        </div>
      </div>

      {/* Completion Banner */}
      {isComplete && (
        <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800 rounded-xl flex items-center justify-between shadow-subtle">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">All Required Documents Approved</h3>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Checklist completed. Case is ready for filing/advisory processing.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg text-[11px]">
            Ready
          </span>
        </div>
      )}

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-subtle space-y-2">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Client</span>
            <Users className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-900 dark:text-white">{caseData.client.name}</p>
            {caseData.client.company && (
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">{caseData.client.company}</p>
            )}
          </div>
          <div className="space-y-0.5 text-[11px] text-neutral-600 dark:text-neutral-300">
            <p><span className="text-neutral-400">Phone:</span> {caseData.client.phone}</p>
            {caseData.client.email && <p><span className="text-neutral-400">Email:</span> {caseData.client.email}</p>}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-subtle space-y-2">
          <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Case Info</span>
            <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="space-y-1 text-[11px]">
            <div>
              <span className="text-neutral-400">Service: </span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">{caseData.service_type}</span>
            </div>
            <div>
              <span className="text-neutral-400">Due Date: </span>
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{formatDate(caseData.due_date)}</span>
            </div>
            {caseData.notes && (
              <p className="text-neutral-500 dark:text-neutral-400 text-[11px] truncate">{caseData.notes}</p>
            )}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-subtle space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <span className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Progress</span>
              <span className="text-xs font-bold text-neutral-900 dark:text-white">{progressPercent}%</span>
            </div>
            <div className="mt-2.5 space-y-1">
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                {approvedCount} of {totalReqs} approved ({requiredApprovedCount}/{requiredReqs.length} required)
              </p>
            </div>
          </div>

          <Link
            href={`/upload/${token}`}
            target="_blank"
            className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 bg-neutral-50 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-[11px] font-medium rounded-lg border border-neutral-200/60 dark:border-neutral-700 transition-colors"
          >
            <Eye className="w-3 h-3" />
            <span>Preview Client Portal</span>
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </Link>
        </div>
      </div>

      {/* Checklist Table Card with 1-Click Inline Review */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-subtle overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between flex-wrap gap-2.5">
          <h2 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider flex items-center gap-1.5">
            <span>Document Checklist ({caseData.requirements.length})</span>
            <InfoPopover text="Quick approve clean scans with 1-click or open dialog to send revision feedback." />
          </h2>

          {allUploadedValidDocs.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedDocIds.size === allUploadedValidDocs.length && allUploadedValidDocs.length > 0}
                  onChange={handleSelectAllDocs}
                  className="w-3.5 h-3.5 rounded border-neutral-300 dark:border-neutral-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Select All ({allUploadedValidDocs.length})</span>
              </label>

              {selectedDocIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={downloadingSelected || isDeleting}
                    onClick={handleDownloadSelected}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    title="Download all selected documents"
                  >
                    {downloadingSelected ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Download className="w-3 h-3" />
                    )}
                    <span>Download Selected ({selectedDocIds.size})</span>
                  </button>

                  <button
                    type="button"
                    disabled={downloadingSelected || isDeleting}
                    onClick={() => setIsBulkDeleteOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    title="Permanently delete all selected documents"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete Selected ({selectedDocIds.size})</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {caseData.requirements.map((req, idx) => {
            const reqBadge = getRequirementStatusBadge(req.status);
            const latestDoc = req.documents && req.documents.length > 0 ? req.documents[req.documents.length - 1] : null;

            return (
              <div key={req.id} className="p-4 hover:bg-neutral-50/40 dark:hover:bg-neutral-800/40 transition-colors space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs font-bold text-neutral-900 dark:text-white">{req.name}</h3>
                        {req.is_required && (
                          <span
                            title="Required document"
                            className="text-rose-600 dark:text-rose-400 font-black text-sm leading-none select-none shrink-0"
                          >
                            *
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${reqBadge.className}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${reqBadge.dotColor}`} />
                          {reqBadge.label}
                        </span>
                      </div>
                      {req.description && (
                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">{req.description}</p>
                      )}
                    </div>
                  </div>

                  {/* 1-Click Inline Review Controls */}
                  {latestDoc && (
                    <div className="flex items-center gap-1.5">
                      {latestDoc.status === "under_review" && (
                        <button
                          type="button"
                          onClick={() => handleQuickApprove(req, latestDoc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800 font-semibold rounded-lg transition-colors text-xs cursor-pointer"
                          title="1-Click Quick Approve"
                        >
                          <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Approve</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setPreviewDoc({ req, doc: latestDoc })}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          latestDoc.status === "under_review"
                            ? "bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
                            : "bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/60 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700"
                        }`}
                      >
                        <Eye className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>{latestDoc.status === "under_review" ? "Reject" : "Review Document"}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Submissions file info */}
                {latestDoc ? (
                  <div className="ml-7 mt-2 space-y-1.5">
                    {/* Clickable Document Card */}
                    <div
                      onClick={() => setPreviewDoc({ req, doc: latestDoc })}
                      className="p-2.5 bg-neutral-50/90 dark:bg-neutral-800/60 hover:bg-neutral-100/90 dark:hover:bg-neutral-800/90 rounded-xl border border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between gap-3 text-xs cursor-pointer group transition-all shadow-2xs"
                      title="Click anywhere to open document preview"
                    >
                      {/* Left side: Checkbox + Icon + File name + Version tag + Metadata */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        {latestDoc.status !== "rejected" && Boolean(latestDoc.storage_path) && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelectDoc(latestDoc.id);
                            }}
                            className="p-1 -ml-1 rounded hover:bg-neutral-200/60 dark:hover:bg-neutral-700 cursor-pointer shrink-0"
                            title={selectedDocIds.has(latestDoc.id) ? "Deselect document" : "Select document for download"}
                          >
                            <input
                              type="checkbox"
                              checked={selectedDocIds.has(latestDoc.id)}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 rounded border-neutral-300 dark:border-neutral-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer pointer-events-none"
                            />
                          </div>
                        )}
                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-700/60 border border-neutral-200/80 dark:border-neutral-700 flex items-center justify-center shrink-0 text-neutral-500 dark:text-neutral-300 group-hover:text-emerald-600 group-hover:border-emerald-300 dark:group-hover:border-emerald-700 transition-colors shadow-2xs">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200 text-xs truncate max-w-[200px] sm:max-w-sm md:max-w-md group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {latestDoc.file_name}
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-neutral-200/80 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded shrink-0">
                              v{latestDoc.version}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>{formatBytes(latestDoc.file_size)}</span>
                            <span>•</span>
                            <span>Uploaded {formatDateTime(latestDoc.uploaded_at)}</span>
                            <span>•</span>
                            <span
                              className="inline-flex items-center text-emerald-600 dark:text-emerald-400 p-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                              title="Click to open preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Right side: Download and Delete buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={downloadingDocIds.has(latestDoc.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFileToSystem(latestDoc.storage_path || "", latestDoc.file_name, latestDoc.id);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                          title="Download document into system"
                        >
                          {downloadingDocIds.has(latestDoc.id) ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          )}
                          <span>{downloadingDocIds.has(latestDoc.id) ? "Downloading..." : "Download"}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDocToDelete({ id: latestDoc.id, name: latestDoc.file_name });
                          }}
                          className="p-1.5 bg-white dark:bg-neutral-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 border border-neutral-200/80 dark:border-neutral-700 hover:border-rose-300 dark:hover:border-rose-800 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          title="Delete this document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Dedicated Feedback Alert row below document row (does not distort button alignment) */}
                    {latestDoc.status === "rejected" && latestDoc.rejection_reason && (
                      <div className="p-2.5 bg-rose-50/90 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 rounded-xl border border-rose-200/80 dark:border-rose-900/60 text-xs flex items-start gap-2 shadow-2xs">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Feedback: </span>
                          <span className="font-medium">{latestDoc.rejection_reason}</span>
                        </div>
                      </div>
                    )}

                    {/* Preserved Document Version History under single doc heading */}
                    {req.documents && req.documents.length > 1 && (
                      <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedReqHistory((prev) => ({
                              ...prev,
                              [req.id]: !prev[req.id],
                            }))
                          }
                          className="flex items-center justify-between w-full py-1 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5 text-neutral-400" />
                            <span>
                              Earlier Uploads ({req.documents.length - 1} earlier version{req.documents.length - 1 > 1 ? "s" : ""} preserved)
                            </span>
                          </span>
                          <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                            {expandedReqHistory[req.id] ? "Hide versions" : "View versions"}
                            {expandedReqHistory[req.id] ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </span>
                        </button>

                        {expandedReqHistory[req.id] && (
                          <div className="mt-1.5 space-y-1.5 pl-2 border-l-2 border-neutral-200 dark:border-neutral-800 animate-in fade-in">
                            {req.documents
                              .slice(0, -1)
                              .reverse()
                              .map((prevDoc) => (
                                <div
                                  key={prevDoc.id}
                                  className="p-2 bg-neutral-50/80 dark:bg-neutral-800/40 rounded-lg border border-neutral-200/70 dark:border-neutral-800 flex items-center justify-between gap-2.5 text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-neutral-200/80 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded shrink-0">
                                      v{prevDoc.version}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200 truncate">
                                        {prevDoc.file_name}
                                      </p>
                                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                                        {formatBytes(prevDoc.file_size)} • Uploaded {formatDateTime(prevDoc.uploaded_at)} • Superseded by v{latestDoc.version}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewDoc({ req, doc: prevDoc })}
                                      className="px-2 py-1 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/70 dark:border-neutral-700 rounded text-[11px] font-medium transition cursor-pointer"
                                      title="Preview this earlier version"
                                    >
                                      <Eye className="w-3 h-3 inline mr-1" />
                                      Preview
                                    </button>
                                    <button
                                      type="button"
                                      disabled={downloadingDocIds.has(prevDoc.id)}
                                      onClick={() => downloadFileToSystem(prevDoc.storage_path || "", prevDoc.file_name, prevDoc.id)}
                                      className="px-2 py-1 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/70 dark:border-neutral-700 rounded text-[11px] font-medium transition cursor-pointer"
                                      title="Download this version"
                                    >
                                      <Download className="w-3 h-3 inline mr-1 text-emerald-600" />
                                      Download
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="ml-7 text-[11px] text-neutral-400 dark:text-neutral-500 italic">No file uploaded yet</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Document Preview Pop-up Window Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc.doc}
          requirementName={previewDoc.req.name}
          requirementId={previewDoc.req.id}
          caseId={caseData.id}
          isOpen={true}
          onClose={() => setPreviewDoc(null)}
          onStatusUpdated={() => {
            if (caseData?.id) caseDetailsClientCache.delete(caseData.id);
            loadCase(true);
            if (refreshDashboard) refreshDashboard();
          }}
        />
      )}

      {/* Review Modal */}
      {selectedForReview && (
        <ReviewModal
          caseId={caseData.id}
          requirement={selectedForReview.req}
          document={selectedForReview.doc}
          isOpen={true}
          onClose={() => setSelectedForReview(null)}
          onSuccess={() => {
            if (caseData?.id) caseDetailsClientCache.delete(caseData.id);
            loadCase(true);
            if (refreshDashboard) refreshDashboard();
          }}
        />
      )}


      {/* WhatsApp Share Modal */}
      {isShareOpen && (
        <WhatsAppShareModal
          caseData={caseData}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          onLinkRenewed={() => {
            if (caseData?.id) caseDetailsClientCache.delete(caseData.id);
            loadCase(true);
            if (refreshDashboard) refreshDashboard();
          }}
        />
      )}

      {/* WhatsApp Reminder Modal */}
      {isReminderOpen && (
        <WhatsAppReminderModal
          caseData={caseData}
          isOpen={isReminderOpen}
          onClose={() => setIsReminderOpen(false)}
        />
      )}

      {/* Advisor Single Document Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(docToDelete)}
        onClose={() => setDocToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        title="Delete Document?"
        description="Are you sure you want to delete this document? This will permanently delete the file from storage and reset the checklist requirement status to pending."
        fileName={docToDelete?.name}
        confirmLabel="Yes, Delete Document"
        cancelLabel="Cancel"
        isLoading={isDeleting}
      />

      {/* Advisor Bulk Document Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title={`Delete ${selectedDocIds.size} Selected Document(s)?`}
        description="Are you sure you want to permanently delete all selected documents? The files will be removed from storage and their checklist requirements will be reset to pending. This action cannot be undone."
        count={selectedDocIds.size}
        confirmLabel={`Yes, Delete ${selectedDocIds.size} Document(s)`}
        cancelLabel="Cancel"
        isLoading={isDeleting}
      />

      {/* Advisor Delete Case Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteCaseModalOpen}
        onClose={() => setIsDeleteCaseModalOpen(false)}
        onConfirm={handleDeleteCase}
        title="Delete This Case?"
        description={`Are you sure you want to permanently delete case "${caseData.title}"? All uploaded documents and requirements will be removed from storage and database. This action cannot be undone.`}
        confirmLabel="Yes, Delete Entire Case"
        cancelLabel="Cancel"
        isLoading={isDeletingCase}
      />
    </div>
  );
}
