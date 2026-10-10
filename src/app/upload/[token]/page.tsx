"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Shield,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Lock,
  MessageSquareShare,
  Info,
  PartyPopper,
} from "lucide-react";
import { getPortalData } from "@/app/actions/portal";
import { ClientPortalData } from "@/types";
import { formatBytes } from "@/lib/utils";
import { InteractiveFileUpload } from "@/components/client-portal/InteractiveFileUpload";
import { RequirementsPopover } from "@/components/ui/InfoPopover";

export default function ClientUploadPortalPage() {
  const params = useParams();
  const token = params.token as string;

  const [portalData, setPortalData] = useState<ClientPortalData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPortal = async () => {
    if (!token) return;
    try {
      const res = await getPortalData(token);
      setPortalData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortal();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="text-center space-y-2.5">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-neutral-500 font-medium">Opening secure upload portal...</p>
        </div>
      </div>
    );
  }

  if (!portalData) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white p-8 rounded-2xl shadow-sm border border-neutral-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-neutral-900">Upload Link Inactive</h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            This upload link has expired or was closed by your advisory firm. Please contact your advisor for an updated link.
          </p>
        </div>
      </div>
    );
  }

  const { case: caseInfo, client, organization, requirements, progress } = portalData;
  const isAllApproved = progress.percentage === 100;
  const advisorPhone = client.phone.replace(/[^0-9]/g, "");
  const uploadedCount = progress.approved + progress.under_review;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-neutral-900 pb-16 selection:bg-emerald-600 selection:text-white">
      {/* 1. Header: Firm Name, Security Badge, Client Ref */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {organization.logo_url ? (
              <div className="w-9 h-9 rounded-xl border border-neutral-200/80 bg-white p-0.5 shadow-xs shrink-0 overflow-hidden flex items-center justify-center">
                <img
                  src={organization.logo_url}
                  alt={organization.name}
                  className="w-full h-full object-cover rounded-[10px]"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                <FileText className="w-4 h-4" />
              </div>
            )}
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-neutral-900 leading-tight">{organization.name}</h1>
              <p className="text-[10px] text-neutral-500 flex items-center gap-1 font-medium">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>Secure Document Portal</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RequirementsPopover buttonLabel="Photo Tips" />
            <div className="text-right pl-2 border-l border-neutral-200">
              <p className="text-xs font-semibold text-neutral-900 truncate max-w-[120px]">{client.name}</p>
              <p className="text-[10px] text-neutral-400 font-mono">#{caseInfo.reference_number}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 pt-5 space-y-4">
        {/* 2. Case Summary & Progress */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-3">
          <div>
            <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded mb-1">
              {caseInfo.service_type || "Document Collection"}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 leading-snug">{caseInfo.title}</h2>
          </div>

          {/* Clean Progress Indicator (No duplicate percentages or dials) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-neutral-600 font-medium">
              <span>{uploadedCount} of {progress.total} uploaded</span>
              <span className="font-bold text-emerald-700">{progress.percentage}% Done</span>
            </div>
            <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* 100% Celebration Banner */}
        {isAllApproved && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <PartyPopper className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-950">All Documents Approved!</p>
                <p className="text-[11px] text-emerald-800">Your advisor has verified all submitted files.</p>
              </div>
            </div>
            <a
              href={`https://wa.me/${advisorPhone}?text=${encodeURIComponent(
                `Hi, all documents for case ${caseInfo.reference_number} are submitted and approved.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 transition"
            >
              WhatsApp
            </a>
          </div>
        )}

        {/* 3. Direct Document Checklist */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Documents to Provide ({requirements.length})
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200/80">
                Max 10 MB / file
              </span>
              <RequirementsPopover
                title="Tips for Clear Document Photos"
                buttonLabel="Photo Tips"
                items={[
                  "Maximum file size is 10 MB per document (PDF, JPG, PNG)",
                  "Place document on a flat surface in good lighting without shadows",
                  "Ensure all 4 corners and borders are inside the frame",
                  "Make sure names, numbers, and dates are sharp and readable",
                ]}
              />
            </div>
          </div>

          {requirements.map((req, idx) => {
            const isApproved = req.status === "approved";
            const isUnderReview = req.status === "under_review" || req.status === "uploaded";
            const isRejected = req.status === "rejected";
            const isPending = req.status === "not_uploaded";
            const latestDoc = req.latest_document;

            return (
              <div
                key={req.id}
                className={`bg-white rounded-2xl border p-4 space-y-2.5 shadow-xs transition-all ${
                  isRejected
                    ? "border-rose-300 ring-1 ring-rose-100"
                    : isApproved
                    ? "border-emerald-200"
                    : isUnderReview
                    ? "border-blue-200"
                    : "border-neutral-200"
                }`}
              >
                {/* Header Row: Status Icon, Title, Single Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {/* Status Circle Icon */}
                    <div
                      className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        isApproved
                          ? "bg-emerald-100 text-emerald-700"
                          : isUnderReview
                          ? "bg-blue-100 text-blue-700"
                          : isRejected
                          ? "bg-rose-100 text-rose-700"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {isApproved ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                      ) : isUnderReview ? (
                        <Clock className="w-3 h-3" />
                      ) : isRejected ? (
                        <AlertCircle className="w-3.5 h-3.5" />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-neutral-900 leading-snug">{req.name}</h4>
                        {req.is_required && (
                          <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                            Required
                          </span>
                        )}
                      </div>
                      {req.description && (
                        <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">{req.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Single Clean Status Pill */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isApproved
                        ? "bg-emerald-100 text-emerald-800"
                        : isUnderReview
                        ? "bg-blue-100 text-blue-800"
                        : isRejected
                        ? "bg-rose-100 text-rose-800"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {isApproved
                      ? "Approved"
                      : isUnderReview
                      ? "In Review"
                      : isRejected
                      ? "Needs Re-upload"
                      : "Pending"}
                  </span>
                </div>

                {/* Body State 1: Rejection Message from Advisor */}
                {isRejected && latestDoc?.rejection_reason && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-0.5">
                    <p className="font-bold text-rose-900">Advisor feedback:</p>
                    <p className="text-rose-800 font-medium">{latestDoc.rejection_reason}</p>
                  </div>
                )}

                {/* Body State 2: Uploaded & In Review (Clean file line without duplicate badges) */}
                {isUnderReview && latestDoc && (
                  <div className="p-2 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <p className="font-medium text-neutral-800 truncate text-[11px]">{latestDoc.file_name}</p>
                    </div>
                    <span className="text-[10px] text-neutral-500 shrink-0">{formatBytes(latestDoc.file_size)}</span>
                  </div>
                )}

                {/* Body State 3: Approved (Clean file line without duplicate badges) */}
                {isApproved && (
                  <div className="p-2 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <p className="font-medium text-neutral-800 truncate text-[11px]">
                        {latestDoc?.file_name || "Verified Document"}
                      </p>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-semibold shrink-0">Verified</span>
                  </div>
                )}

                {/* Body State 4: Direct Upload Trigger (Only for Pending or Rejected items) */}
                {(isPending || isRejected) && (
                  <div className="pt-0.5">
                    <InteractiveFileUpload
                      token={token}
                      requirementId={req.id}
                      requirementName={req.name}
                      isReplacement={isRejected}
                      onUploadComplete={() => loadPortal()}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 4. Help & WhatsApp Support Link (Single point of contact) */}
        <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <MessageSquareShare className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-neutral-700 font-medium">Have questions about any document?</span>
          </div>
          <a
            href={`https://wa.me/${advisorPhone}?text=${encodeURIComponent(
              `Hi, I have a question regarding my documents for case ${caseInfo.reference_number}.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shrink-0"
          >
            <span>WhatsApp</span>
          </a>
        </div>

        {/* 5. Minimal Footer */}
        <div className="text-center text-[11px] text-neutral-400 space-y-1.5 pt-2">
          {organization.logo_url && (
            <div className="flex items-center justify-center gap-1.5 pb-1">
              <img
                src={organization.logo_url}
                alt={organization.name}
                className="w-4 h-4 rounded-sm object-cover"
              />
              <span className="font-semibold text-neutral-600 text-[11px]">{organization.name}</span>
            </div>
          )}
          <p className="flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Encrypted with TLS 1.3 • Confidential Document Collection</span>
          </p>
        </div>
      </main>
    </div>
  );
}
