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

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = params.id as string;
  const { toast } = useToast();

  const [caseData, setCaseData] = useState<CaseWithDetails | null>(null);
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

  const loadCase = async () => {
    if (!caseId) return;
    const res = await getCaseDetails(caseId);
    setCaseData(res);
  };

  useEffect(() => {
    loadCase();
  }, [caseId]);

  if (!caseData) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const token = caseData.upload_link?.token_hash || `token-${caseData.id.slice(0, 8)}`;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const uploadUrl = `${baseUrl}/upload/${token}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(uploadUrl);
    setCopied(true);
    toast({ title: "Link copied", description: "Direct client upload link is ready to share." });
    setTimeout(() => setCopied(false), 2000);
  };

  // 1-Click Quick Approve single file
  const handleQuickApprove = async (req: DocumentRequirement, doc: Document) => {
    try {
      await reviewDocumentAction(caseData.id, req.id, doc.id, "approve");
      toast({ title: "Document approved", description: `${req.name} has been verified.` });
      loadCase();
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to approve", type: "error" });
    }
  };

  // 1-Click Batch Approve all under-review documents
  const handleApproveAll = async () => {
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
        await reviewDocumentAction(caseData.id, item.req.id, item.doc.id, "approve");
      }
      toast({
        title: "All documents approved",
        description: `Approved ${underReviewItems.length} documents in batch.`,
      });
      loadCase();
    } catch (err) {
      console.error(err);
    } finally {
      setBatchLoading(false);
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
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-8 h-8 rounded-lg bg-white border border-neutral-200/80 text-neutral-600 hover:text-neutral-900 flex items-center justify-center shadow-subtle transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-neutral-400 font-semibold">{caseData.reference_number}</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusBadge.className}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotColor}`} />
                {statusBadge.label}
              </span>
            </div>
            <h1 className="text-lg font-bold text-neutral-900 mt-0.5">{caseData.title}</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {underReviewCount > 0 && (
            <button
              type="button"
              disabled={batchLoading}
              onClick={handleApproveAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {batchLoading ? "Approving..." : `Approve All (${underReviewCount})`}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsReminderOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/70 rounded-lg text-xs font-medium transition-colors"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600" />
            Send Reminder
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-medium border border-neutral-200/80 shadow-subtle transition-colors"
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy Link"}
          </button>

          <button
            type="button"
            onClick={() => setIsShareOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
          >
            <MessageSquareShare className="w-3.5 h-3.5 text-emerald-400" />
            Share WhatsApp
          </button>
        </div>
      </div>

      {/* Completion Banner */}
      {isComplete && (
        <div className="p-4 bg-emerald-50/80 border border-emerald-200/70 rounded-xl flex items-center justify-between shadow-subtle">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-emerald-900">All Required Documents Approved</h3>
              <p className="text-[11px] text-emerald-700">
                Checklist completed. Case is ready for filing/advisory processing.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-emerald-600 text-white font-medium rounded-lg text-[11px]">
            Ready
          </span>
        </div>
      )}

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-neutral-200/80 shadow-subtle space-y-2">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Client</span>
            <Users className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-900">{caseData.client.name}</p>
            {caseData.client.company && (
              <p className="text-[11px] text-neutral-500">{caseData.client.company}</p>
            )}
          </div>
          <div className="space-y-0.5 text-[11px] text-neutral-600">
            <p><span className="text-neutral-400">Phone:</span> {caseData.client.phone}</p>
            {caseData.client.email && <p><span className="text-neutral-400">Email:</span> {caseData.client.email}</p>}
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-neutral-200/80 shadow-subtle space-y-2">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Case Info</span>
            <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="space-y-1 text-[11px]">
            <div>
              <span className="text-neutral-400">Service: </span>
              <span className="font-semibold text-neutral-800">{caseData.service_type}</span>
            </div>
            <div>
              <span className="text-neutral-400">Due Date: </span>
              <span className="font-medium text-neutral-700">{formatDate(caseData.due_date)}</span>
            </div>
            {caseData.notes && (
              <p className="text-neutral-500 text-[11px] truncate">{caseData.notes}</p>
            )}
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-neutral-200/80 shadow-subtle space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Progress</span>
              <span className="text-xs font-bold text-neutral-900">{progressPercent}%</span>
            </div>
            <div className="mt-2.5 space-y-1">
              <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="text-[10px] text-neutral-400">
                {approvedCount} of {totalReqs} approved ({requiredApprovedCount}/{requiredReqs.length} required)
              </p>
            </div>
          </div>

          <Link
            href={`/upload/${token}`}
            target="_blank"
            className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 text-[11px] font-medium rounded-lg border border-neutral-200/60 transition-colors"
          >
            <Eye className="w-3 h-3" />
            Preview Client Portal
            <ExternalLink className="w-3 h-3 text-neutral-400" />
          </Link>
        </div>
      </div>

      {/* Checklist Table Card with 1-Click Inline Review */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-subtle overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
            Document Checklist ({caseData.requirements.length})
            <InfoPopover text="Quick approve clean scans with 1-click or open dialog to send revision feedback." />
          </h2>
        </div>

        <div className="divide-y divide-neutral-100">
          {caseData.requirements.map((req, idx) => {
            const reqBadge = getRequirementStatusBadge(req.status);
            const latestDoc = req.documents && req.documents.length > 0 ? req.documents[req.documents.length - 1] : null;

            return (
              <div key={req.id} className="p-4 hover:bg-neutral-50/40 transition-colors space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-600 font-semibold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs font-bold text-neutral-900">{req.name}</h3>
                        {req.is_required ? (
                          <span className="text-[10px] font-medium text-rose-600">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-400">
                            Optional
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${reqBadge.className}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${reqBadge.dotColor}`} />
                          {reqBadge.label}
                        </span>
                      </div>
                      {req.description && (
                        <p className="text-[11px] text-neutral-400 mt-0.5">{req.description}</p>
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
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/70 font-medium rounded-lg transition-colors text-xs"
                          title="1-Click Quick Approve"
                        >
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Approve
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedForReview({ req, doc: latestDoc })}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          latestDoc.status === "under_review"
                            ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
                            : "bg-neutral-50 hover:bg-neutral-100 text-neutral-600 border border-neutral-200/60"
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        {latestDoc.status === "under_review" ? "Feedback / Reject" : "Re-evaluate"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Submissions file info */}
                {latestDoc ? (
                  <div className="ml-7 p-2.5 bg-neutral-50/80 rounded-lg border border-neutral-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-neutral-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-neutral-800 text-[11px]">{latestDoc.file_name}</span>
                          <span className="text-[9px] font-medium px-1 bg-neutral-200 text-neutral-600 rounded">
                            v{latestDoc.version}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-400">
                          {formatBytes(latestDoc.file_size)} • Uploaded {formatDateTime(latestDoc.uploaded_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Direct Pop-Up View Document Button */}
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({ req, doc: latestDoc })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-neutral-900 hover:text-white text-neutral-800 border border-neutral-200/80 rounded-md text-[11px] font-medium shadow-2xs transition-colors cursor-pointer group"
                        title="Direct Pop-Up View"
                      >
                        <Eye className="w-3 h-3 text-emerald-600 group-hover:text-white" />
                        <span>View</span>
                      </button>

                      <a
                        href={`/api/download?file=${encodeURIComponent(latestDoc.storage_path || "")}&name=${encodeURIComponent(latestDoc.file_name)}&id=${latestDoc.id}`}
                        download={latestDoc.file_name}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200/80 rounded-md text-[11px] font-medium shadow-2xs transition-colors"
                        title="Download Document"
                      >
                        <Download className="w-3 h-3 text-emerald-600" />
                        <span>Download</span>
                      </a>

                      {latestDoc.status === "rejected" && latestDoc.rejection_reason && (
                        <div className="bg-rose-50 text-rose-800 px-2.5 py-1 rounded-md border border-rose-200/60 text-[11px]">
                          <span className="font-semibold">Feedback: </span>
                          {latestDoc.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="ml-7 text-[11px] text-neutral-400 italic">No file uploaded yet</p>
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
          caseId={caseData.id}
          isOpen={true}
          onClose={() => setPreviewDoc(null)}
          onStatusUpdated={() => loadCase()}
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
          onSuccess={() => loadCase()}
        />
      )}

      {/* WhatsApp Share Modal */}
      {isShareOpen && (
        <WhatsAppShareModal
          caseData={caseData}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          onLinkRenewed={() => loadCase()}
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
