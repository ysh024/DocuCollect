"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import { InfoPopover } from "@/components/ui/InfoPopover";
import { getCaseDetails, reviewDocumentAction } from "@/app/actions/portal";
import { CaseWithDetails, DocumentRequirement, Document } from "@/types";
import { getCaseStatusBadge, getRequirementStatusBadge, formatDate, formatDateTime, formatBytes } from "@/lib/utils";
import { ReviewModal } from "@/components/dashboard/ReviewModal";
import { DocumentPreviewModal } from "@/components/dashboard/DocumentPreviewModal";
import { WhatsAppShareModal } from "@/components/dashboard/WhatsAppShareModal";
import { WhatsAppReminderModal } from "@/components/dashboard/WhatsAppReminderModal";
import { useToast } from "@/components/ui/Toast";
import { useDashboardData } from "@/contexts/DashboardDataContext";

export default function CaseDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const caseId = Array.isArray(rawId) ? rawId[0] : (rawId as string);

  const { toast } = useToast();
  const { data: dashboardData, refresh: refreshDashboard } = useDashboardData();

  // Instant Cache resolution: If case was already loaded on cases/clients list, show it on frame 1 (0ms)
  const cachedCase = dashboardData?.cases?.find((c) => c.id === caseId);

  const [caseData, setCaseData] = useState<CaseWithDetails | null>(cachedCase || null);
  const [loading, setLoading] = useState<boolean>(!cachedCase);
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

  // Sync cache if available
  useEffect(() => {
    if (cachedCase && !caseData) {
      setCaseData(cachedCase);
      setLoading(false);
    }
  }, [cachedCase, caseData]);

  const loadCase = async () => {
    if (!caseId) return;
    try {
      // 1. Primary: Direct REST API to avoid Next.js Server Action hash skew
      const res = await fetch(`/api/cases/${caseId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.caseData) {
          setCaseData(json.caseData);
          setErrorMessage(null);
          setLoading(false);
          return;
        }
      }

      // 2. Secondary fallback: Server Action
      const serverRes = await getCaseDetails(caseId);
      if (serverRes) {
        setCaseData(serverRes);
        setErrorMessage(null);
      } else if (!cachedCase) {
        setErrorMessage("Case not found or access restricted.");
      }
    } catch (err: any) {
      console.warn("Failed to fetch fresh case details:", err);
      if (!caseData && !cachedCase) {
        setErrorMessage(err.message || "Could not load case details.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
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
      const res = await fetch("/api/cases/review", {
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
      await loadCase();
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
      await loadCase();
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
      <div className="flex flex-col items-center justify-center min-h-[55vh] space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Loading case file...</p>
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
            className="inline-flex items-center gap-1 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200 text-xs font-semibold rounded-xl transition"
          >
            ← Back to Cases
          </Link>
        </div>
      </div>
    );
  }

  if (!caseData) return null;

  const token = caseData.upload_link?.token_hash || `token-${caseData.id.slice(0, 8)}`;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const uploadUrl = `${baseUrl}/upload/${token}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(uploadUrl);
    setCopied(true);
    toast({ title: "Link copied", description: "Direct client upload link is ready to share." });
    setTimeout(() => setCopied(false), 2000);
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
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/cases"
            className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center justify-center shadow-subtle transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
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

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {underReviewCount > 0 && (
            <button
              type="button"
              disabled={batchLoading}
              onClick={handleApproveAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{batchLoading ? "Approving..." : `Approve All (${underReviewCount})`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsReminderOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Send Reminder</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-lg text-xs font-medium border border-neutral-200/80 dark:border-neutral-800 shadow-subtle transition-colors cursor-pointer"
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy Link"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsShareOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 dark:bg-emerald-600 hover:bg-neutral-800 dark:hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <MessageSquareShare className="w-3.5 h-3.5 text-emerald-400 dark:text-white" />
            <span>Share WhatsApp</span>
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
        <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider flex items-center gap-1.5">
            <span>Document Checklist ({caseData.requirements.length})</span>
            <InfoPopover text="Quick approve clean scans with 1-click or open dialog to send revision feedback." />
          </h2>
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
                        {req.is_required ? (
                          <span className="text-[10px] font-medium text-rose-600 dark:text-rose-400">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                            Optional
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
                        <span>{latestDoc.status === "under_review" ? "Feedback / Reject" : "Review Document"}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Submissions file info */}
                {latestDoc ? (
                  <div className="ml-7 p-2.5 bg-neutral-50/80 dark:bg-neutral-800/50 rounded-lg border border-neutral-200/60 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-neutral-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-neutral-800 dark:text-neutral-200 text-[11px]">{latestDoc.file_name}</span>
                          <span className="text-[9px] font-medium px-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded">
                            v{latestDoc.version}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                          {formatBytes(latestDoc.file_size)} • Uploaded {formatDateTime(latestDoc.uploaded_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Direct Pop-Up View Document Button */}
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({ req, doc: latestDoc })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-neutral-800 hover:bg-neutral-900 hover:text-white dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-700 rounded-md text-[11px] font-medium shadow-2xs transition-colors cursor-pointer group"
                        title="Direct Pop-Up View"
                      >
                        <Eye className="w-3 h-3 text-emerald-600 group-hover:text-white" />
                        <span>View</span>
                      </button>

                      <a
                        href={`/api/download?file=${encodeURIComponent(latestDoc.storage_path || "")}&name=${encodeURIComponent(latestDoc.file_name)}&id=${latestDoc.id}`}
                        download={latestDoc.file_name}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-700 rounded-md text-[11px] font-medium shadow-2xs transition-colors cursor-pointer"
                        title="Download Document"
                      >
                        <Download className="w-3 h-3 text-emerald-600" />
                        <span>Download</span>
                      </a>

                      {latestDoc.status === "rejected" && latestDoc.rejection_reason && (
                        <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 px-2.5 py-1 rounded-md border border-rose-200/60 dark:border-rose-800 text-[11px]">
                          <span className="font-semibold">Feedback: </span>
                          {latestDoc.rejection_reason}
                        </div>
                      )}
                    </div>
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
            loadCase();
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
            loadCase();
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
            loadCase();
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
    </div>
  );
}
