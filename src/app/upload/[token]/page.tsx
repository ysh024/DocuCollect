"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  FileCheck,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Lock,
  MessageSquareShare,
  HelpCircle,
  X,
  Check,
  PartyPopper,
  MessageSquarePlus,
  Send,
  Loader2,
} from "lucide-react";
import { getPortalData, raiseClientQueryAction } from "@/app/actions/portal";
import { ClientPortalData, DocumentRequirement } from "@/types";
import { formatBytes, formatDateTime } from "@/lib/utils";
import { InteractiveFileUpload } from "@/components/client-portal/InteractiveFileUpload";
import { useToast } from "@/components/ui/Toast";

export default function ClientUploadPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const { toast } = useToast();

  const [portalData, setPortalData] = useState<ClientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGuidelines, setShowGuidelines] = useState(false);

  // Client Query Modal State
  const [queryTargetReq, setQueryTargetReq] = useState<DocumentRequirement | null>(null);
  const [queryMessage, setQueryMessage] = useState("");
  const [sendingQuery, setSendingQuery] = useState(false);

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
        <div className="text-center space-y-3">
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
            <AlertTriangle className="w-6 h-6" />
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
  const pendingCount = progress.pending + progress.rejected;

  const handleSendQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryTargetReq || !queryMessage.trim()) return;

    setSendingQuery(true);
    try {
      const res = await raiseClientQueryAction(token, queryTargetReq.id, queryMessage.trim());
      if (res.success) {
        toast({
          title: "Message Sent",
          description: "Your advisor has received your message.",
        });
        setQueryTargetReq(null);
        setQueryMessage("");
      } else {
        toast({ title: "Failed to send message", type: "error" });
      }
    } catch {
      toast({ title: "Failed to send message", type: "error" });
    } finally {
      setSendingQuery(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-neutral-900 pb-16 selection:bg-emerald-600 selection:text-white">
      {/* 1. Clean Top Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold text-neutral-900 leading-tight">{organization.name}</h1>
              <p className="text-[10px] text-neutral-500 flex items-center gap-1 font-medium">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>Secure Document Portal</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuidelines(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1.5 rounded-lg transition"
            >
              <HelpCircle className="w-3 h-3 text-emerald-600" />
              <span>Photo Tips</span>
            </button>
            <div className="text-right pl-2 border-l border-neutral-200">
              <p className="text-xs font-semibold text-neutral-900 truncate max-w-[120px]">{client.name}</p>
              <p className="text-[10px] text-neutral-400 font-mono">#{caseInfo.reference_number}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        {/* 2. Simplified Case Info & Clean Progress Bar */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md mb-1.5">
                {caseInfo.service_type || "Document Collection"}
              </span>
              <h2 className="text-lg font-black text-neutral-900 leading-snug">{caseInfo.title}</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Please upload the documents requested below for verification.
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xl font-black text-neutral-900">{progress.percentage}%</span>
              <p className="text-[10px] text-neutral-400 uppercase font-semibold">Complete</p>
            </div>
          </div>

          {/* Simple Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-neutral-500 font-medium">
              <span>{uploadedCount} of {progress.total} uploaded</span>
              <span>{pendingCount > 0 ? `${pendingCount} remaining` : "All documents uploaded!"}</span>
            </div>
          </div>
        </div>

        {/* 100% Completion Celebration (if done) */}
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
              WhatsApp Advisor
            </a>
          </div>
        )}

        {/* 3. Direct, Simple Document Checklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Required Documents ({requirements.length})
            </h3>
            <span className="text-[11px] text-neutral-400">Tap any item to upload</span>
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
                className={`bg-white rounded-2xl border transition-all p-4 space-y-3 shadow-xs ${
                  isRejected
                    ? "border-rose-300 ring-1 ring-rose-100"
                    : isApproved
                    ? "border-emerald-200"
                    : isUnderReview
                    ? "border-blue-200"
                    : "border-neutral-200"
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {/* Status Circle */}
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
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : isUnderReview ? (
                        <Clock className="w-3 h-3" />
                      ) : isRejected ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-neutral-900 leading-snug">{req.name}</h4>
                        {req.is_required && (
                          <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded">
                            Required
                          </span>
                        )}
                      </div>
                      {req.description && (
                        <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{req.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setQueryTargetReq(req)}
                      className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md hover:bg-neutral-100 transition"
                      title="Ask advisor a question"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                    </button>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
                        : "To Upload"}
                    </span>
                  </div>
                </div>

                {/* State 1: Rejection Message from Advisor */}
                {isRejected && latestDoc?.rejection_reason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-rose-900 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Advisor note:</span>
                    </p>
                    <p className="text-rose-800 pl-4.5 font-medium">{latestDoc.rejection_reason}</p>
                  </div>
                )}

                {/* State 2: Uploaded & In Review */}
                {isUnderReview && latestDoc && (
                  <div className="p-2.5 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-neutral-800 truncate text-[11px]">{latestDoc.file_name}</p>
                        <p className="text-[10px] text-neutral-500">
                          {formatBytes(latestDoc.file_size)} • Awaiting review
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded shrink-0">
                      Uploaded
                    </span>
                  </div>
                )}

                {/* State 3: Approved */}
                {isApproved && (
                  <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-100 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-neutral-800 truncate text-[11px]">
                          {latestDoc?.file_name || "Document Verified"}
                        </p>
                        <p className="text-[10px] text-emerald-700">Verified by advisor</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                      ✓ Done
                    </span>
                  </div>
                )}

                {/* State 4: Upload Dropzone (for Pending or Rejected) */}
                {(isPending || isRejected) && (
                  <div className="pt-1">
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

        {/* 4. Help & WhatsApp Contact Card */}
        <div className="p-4 bg-white rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <MessageSquareShare className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-neutral-900">Have questions about your documents?</p>
              <p className="text-[11px] text-neutral-500">Your advisor is available to help on WhatsApp.</p>
            </div>
          </div>
          <a
            href={`https://wa.me/${advisorPhone}?text=${encodeURIComponent(
              `Hi, I have a question regarding my documents for case ${caseInfo.reference_number}.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shrink-0"
          >
            <MessageSquareShare className="w-3.5 h-3.5" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>

        {/* Confidentiality Footer */}
        <div className="text-center text-[11px] text-neutral-400 space-y-1 pt-2 pb-6">
          <p className="flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Files are encrypted with TLS 1.3 & stored securely.</span>
          </p>
          <p>© {new Date().getFullYear()} {organization.name}.</p>
        </div>
      </main>

      {/* Client Query Modal */}
      {queryTargetReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-neutral-900">Message Advisor</h3>
                <p className="text-[11px] text-neutral-400 truncate max-w-[200px]">Re: {queryTargetReq.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setQueryTargetReq(null)}
                className="w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-neutral-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendQuery} className="space-y-3">
              <div>
                <textarea
                  rows={3}
                  required
                  value={queryMessage}
                  onChange={(e) => setQueryMessage(e.target.value)}
                  placeholder="Type your question or note here..."
                  className="w-full text-xs bg-neutral-50 border border-neutral-300 rounded-xl p-2.5 text-neutral-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={sendingQuery}
                  onClick={() => setQueryTargetReq(null)}
                  className="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingQuery || !queryMessage.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {sendingQuery ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Guidelines Modal */}
      {showGuidelines && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <h3 className="text-xs font-bold text-neutral-900">Tips for Clear Document Photos</h3>
              <button
                type="button"
                onClick={() => setShowGuidelines(false)}
                className="w-6 h-6 flex items-center justify-center text-neutral-400 hover:text-neutral-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-neutral-600">
              <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <p className="font-bold text-neutral-900">💡 Good Lighting</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">Place document on a flat surface in good lighting without casting shadows.</p>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <p className="font-bold text-neutral-900">📐 All 4 Corners Visible</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">Ensure the entire document border is inside the frame.</p>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
                <p className="font-bold text-neutral-900">🔍 Clear Text</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">Make sure names, numbers, and dates are sharp and easily readable.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuidelines(false)}
              className="w-full py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold transition"
            >
              Close Tips
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
