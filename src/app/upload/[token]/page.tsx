"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  FileCheck,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UploadCloud,
  FileText,
  Lock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Layers,
  LayoutList,
  MessageSquareShare,
  HelpCircle,
  X,
  Check,
  PartyPopper,
  MessageSquarePlus,
  Send,
  Loader2,
  Info,
  Filter,
} from "lucide-react";
import { getPortalData, raiseClientQueryAction } from "@/app/actions/portal";
import { ClientPortalData, DocumentRequirement } from "@/types";
import { getRequirementStatusBadge, formatBytes, formatDateTime } from "@/lib/utils";
import { InteractiveFileUpload } from "@/components/client-portal/InteractiveFileUpload";
import { useToast } from "@/components/ui/Toast";

export default function ClientUploadPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const { toast } = useToast();

  const [portalData, setPortalData] = useState<ClientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"checklist" | "wizard">("checklist");
  const [statusFilter, setStatusFilter] = useState<"all" | "action_needed" | "under_review" | "approved">("all");
  const [wizardStep, setWizardStep] = useState(0);
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
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-neutral-600 font-bold tracking-wide">Opening secure encrypted portal...</p>
        </div>
      </div>
    );
  }

  if (!portalData) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white p-8 rounded-3xl shadow-sm border border-neutral-200 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-neutral-900">Upload Link Inactive</h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            This document upload link has expired or was revoked by your advisory firm. Please reach out to your consultant for a fresh link.
          </p>
        </div>
      </div>
    );
  }

  const { case: caseInfo, client, organization, requirements, progress } = portalData;
  const isAllApproved = progress.percentage === 100;
  const currentReq = requirements[wizardStep] || requirements[0];
  const advisorPhone = client.phone.replace(/[^0-9]/g, "");

  const actionNeededCount = progress.pending + progress.rejected;
  const inReviewCount = progress.under_review;
  const approvedCount = progress.approved;

  // Filtered requirements for checklist view
  const filteredRequirements = requirements.filter((req) => {
    if (statusFilter === "action_needed") {
      return req.status === "not_uploaded" || req.status === "rejected";
    }
    if (statusFilter === "under_review") {
      return req.status === "under_review" || req.status === "uploaded";
    }
    if (statusFilter === "approved") {
      return req.status === "approved";
    }
    return true;
  });

  const handleSendQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryTargetReq || !queryMessage.trim()) return;

    setSendingQuery(true);
    try {
      const res = await raiseClientQueryAction(token, queryTargetReq.id, queryMessage.trim());
      if (res.success) {
        toast({
          title: "Message sent to advisor",
          description: "Your consultant has received your message and will review it.",
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
    <div className="min-h-screen bg-[#f8fafc] text-neutral-900 pb-20 selection:bg-emerald-600 selection:text-white">
      {/* Top Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-neutral-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-700 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-black text-neutral-900 leading-tight">{organization.name}</h1>
              <p className="text-[10px] sm:text-[11px] text-neutral-500 flex items-center gap-1 font-medium">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>Verified Client Document Portal</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowGuidelines(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-700 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Photo Tips</span>
            </button>
            <div className="text-right pl-2 border-l border-neutral-200">
              <p className="text-xs font-bold text-neutral-900 truncate max-w-[120px] sm:max-w-[180px]">{client.name}</p>
              <p className="text-[10px] text-neutral-500 font-mono font-medium">{caseInfo.reference_number}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* Case Info Banner with High-Impact At-a-Glance Summary */}
        <div className="p-5 sm:p-6 bg-white rounded-3xl border border-neutral-200/90 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>{caseInfo.service_type}</span>
                </span>
                <span className="text-[11px] font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                  Ref #{caseInfo.reference_number}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
                {caseInfo.title}
              </h2>
              <p className="text-xs text-neutral-600 leading-relaxed max-w-xl pt-0.5">
                Upload your requested files below. Every upload is end-to-end encrypted and received directly by your advisor at <strong className="text-neutral-900 font-semibold">{organization.name}</strong>.
              </p>
            </div>

            {/* Completion Dial */}
            <div className="flex items-center gap-3.5 self-start bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200 shrink-0">
              <div className="text-center">
                <span className="text-2xl font-black text-emerald-600 tracking-tight">{progress.percentage}%</span>
                <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider">Done</p>
              </div>
              <div className="h-8 w-px bg-neutral-200" />
              <div className="text-left text-xs space-y-0.5">
                <p className="font-semibold text-neutral-700">
                  <strong className="text-emerald-700 font-bold">{progress.approved}</strong> Approved
                </p>
                <p className="text-[11px] font-medium text-neutral-500">
                  {actionNeededCount > 0 ? (
                    <span className="text-amber-800 font-bold">{actionNeededCount} To Upload</span>
                  ) : (
                    <span className="text-emerald-700 font-bold">All Uploaded</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Segmented Color Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-700">Document Completion Status</span>
              <span className="text-[11px] font-medium text-neutral-500">
                {progress.approved} Approved • {inReviewCount} In Review • {actionNeededCount} Pending
              </span>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-3 overflow-hidden flex shadow-inner gap-0.5 p-0.5">
              {progress.approved > 0 && (
                <div
                  title={`${progress.approved} Approved`}
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(progress.approved / (progress.total || 1)) * 100}%` }}
                />
              )}
              {inReviewCount > 0 && (
                <div
                  title={`${inReviewCount} Under Review`}
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(inReviewCount / (progress.total || 1)) * 100}%` }}
                />
              )}
              {progress.rejected > 0 && (
                <div
                  title={`${progress.rejected} Needs Re-upload`}
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(progress.rejected / (progress.total || 1)) * 100}%` }}
                />
              )}
              {progress.pending > 0 && (
                <div
                  title={`${progress.pending} To Upload`}
                  className="bg-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(progress.pending / (progress.total || 1)) * 100}%` }}
                />
              )}
            </div>
          </div>

          {/* Interactive 3-Card Status Dashboard (One-Click Quick Filters) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* 1. Action Needed (Pending + Rejected) */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === "action_needed" ? "all" : "action_needed")}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                statusFilter === "action_needed"
                  ? "border-amber-400 bg-amber-50/80 ring-2 ring-amber-400/30 shadow-xs"
                  : "border-amber-200/90 bg-amber-50/30 hover:bg-amber-50/60 hover:border-amber-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Action Needed
                </span>
                <span className="text-xl font-black text-amber-950">{actionNeededCount}</span>
              </div>
              <p className="text-xs font-bold text-neutral-900">
                {actionNeededCount === 0 ? "All uploaded! 🎉" : `${actionNeededCount} documents to upload`}
              </p>
              <p className="text-[11px] text-amber-800/80 mt-0.5 font-medium">
                {progress.rejected > 0
                  ? `${progress.rejected} need re-upload correction`
                  : "Upload to continue verification"}
              </p>
              {actionNeededCount > 0 && (
                <div className="mt-2.5">
                  <span className="inline-block text-[10px] font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-md">
                    {statusFilter === "action_needed" ? "✓ Filtering Active" : "Tap to focus on these"}
                  </span>
                </div>
              )}
            </button>

            {/* 2. In CA Review */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === "under_review" ? "all" : "under_review")}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                statusFilter === "under_review"
                  ? "border-blue-400 bg-blue-50/80 ring-2 ring-blue-400/30 shadow-xs"
                  : "border-blue-200/90 bg-blue-50/30 hover:bg-blue-50/60 hover:border-blue-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  In Review
                </span>
                <span className="text-xl font-black text-blue-950">{inReviewCount}</span>
              </div>
              <p className="text-xs font-bold text-neutral-900">
                {inReviewCount === 0 ? "None in review" : `${inReviewCount} under advisor check`}
              </p>
              <p className="text-[11px] text-blue-800/80 mt-0.5 font-medium">
                Submitted & awaiting approval
              </p>
              {inReviewCount > 0 && (
                <div className="mt-2.5">
                  <span className="inline-block text-[10px] font-bold text-blue-900 bg-blue-200/70 px-2 py-0.5 rounded-md">
                    {statusFilter === "under_review" ? "✓ Filtering Active" : "Tap to inspect"}
                  </span>
                </div>
              )}
            </button>

            {/* 3. Approved & Verified */}
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === "approved" ? "all" : "approved")}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                statusFilter === "approved"
                  ? "border-emerald-400 bg-emerald-50/80 ring-2 ring-emerald-400/30 shadow-xs"
                  : "border-emerald-200/90 bg-emerald-50/30 hover:bg-emerald-50/60 hover:border-emerald-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Approved
                </span>
                <span className="text-xl font-black text-emerald-950">{approvedCount}</span>
              </div>
              <p className="text-xs font-bold text-neutral-900">
                {approvedCount === 0 ? "None approved yet" : `${approvedCount} verified & done`}
              </p>
              <p className="text-[11px] text-emerald-800/80 mt-0.5 font-medium">
                Accepted by your advisor
              </p>
              {approvedCount > 0 && (
                <div className="mt-2.5">
                  <span className="inline-block text-[10px] font-bold text-emerald-900 bg-emerald-200/70 px-2 py-0.5 rounded-md">
                    {statusFilter === "approved" ? "✓ Filtering Active" : "Tap to view"}
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* Privacy & Auto-Purge Security Callout */}
          <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-start gap-2.5 text-xs text-neutral-600">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong className="text-neutral-900 font-semibold">Strict Confidentiality Guarantee:</strong> Uploaded document scans are securely stored and automatically purged 7 days after consultant verification. Your client portfolio remains permanently active.
            </p>
          </div>
        </div>

        {/* 100% Completion Celebration Banner */}
        {isAllApproved && (
          <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md animate-in fade-in">
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center shrink-0 backdrop-blur-xs">
                <PartyPopper className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">All Required Documents Submitted & Approved!</h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Your advisor at {organization.name} has everything needed to proceed with your case.
                </p>
              </div>
            </div>

            <a
              href={`https://wa.me/${advisorPhone}?text=${encodeURIComponent(
                `Hi, I have completed uploading all required documents for case ${caseInfo.reference_number}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-emerald-900 text-xs font-bold shadow-xs transition-colors shrink-0"
            >
              <MessageSquareShare className="w-4 h-4 text-emerald-700" />
              <span>Message Advisor on WhatsApp</span>
            </a>
          </div>
        )}

        {/* Filter Pills and View Mode Toggle Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === "all"
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              All Documents ({requirements.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("action_needed")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === "action_needed"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Action Needed ({actionNeededCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("under_review")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === "under_review"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-blue-50 text-blue-900 hover:bg-blue-100 border border-blue-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>In Review ({inReviewCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("approved")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === "approved"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Approved ({approvedCount})</span>
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 p-1 bg-white border border-neutral-200 rounded-xl shrink-0 self-start sm:self-auto shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("checklist")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "checklist"
                  ? "bg-neutral-900 text-white shadow-2xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Checklist View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("wizard")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "wizard"
                  ? "bg-neutral-900 text-white shadow-2xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Step-by-Step</span>
            </button>
          </div>
        </div>

        {/* ACTIVE FILTER NOTICE */}
        {statusFilter !== "all" && (
          <div className="flex items-center justify-between p-3 bg-neutral-100/90 rounded-2xl border border-neutral-200 text-xs">
            <span className="font-semibold text-neutral-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-neutral-500" />
              Showing only:{" "}
              <strong className="text-neutral-900 capitalize">
                {statusFilter === "action_needed"
                  ? "Documents Needing Action"
                  : statusFilter === "under_review"
                  ? "Documents In Review"
                  : "Approved Documents"}
              </strong>{" "}
              ({filteredRequirements.length} items)
            </span>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className="text-xs font-bold text-neutral-600 hover:text-neutral-900 underline cursor-pointer"
            >
              Show All
            </button>
          </div>
        )}

        {/* MODE 1: Full Interactive Checklist (DEFAULT) */}
        {viewMode === "checklist" && (
          <div className="space-y-4">
            {filteredRequirements.length === 0 ? (
              <div className="p-8 bg-white rounded-3xl border border-neutral-200 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-sm font-bold text-neutral-900">No documents in this view</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  {statusFilter === "action_needed"
                    ? "Great job! You have no documents pending upload or needing correction."
                    : "There are currently no documents matching the selected filter."}
                </p>
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  View All Documents
                </button>
              </div>
            ) : (
              filteredRequirements.map((req, idx) => {
                const badge = getRequirementStatusBadge(req.status);
                const latestDoc = req.latest_document;
                const isRejected = req.status === "rejected";
                const isApproved = req.status === "approved";
                const isNotUploaded = req.status === "not_uploaded";
                const isUnderReview = req.status === "under_review" || req.status === "uploaded";

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-3xl border transition-all p-5 sm:p-6 space-y-4 shadow-xs relative overflow-hidden ${
                      isRejected
                        ? "border-l-6 border-l-rose-500 border-rose-300 bg-rose-50/15"
                        : isNotUploaded
                        ? "border-l-6 border-l-amber-500 border-amber-300 bg-amber-50/10"
                        : isUnderReview
                        ? "border-l-6 border-l-blue-500 border-blue-300 bg-blue-50/10"
                        : "border-l-6 border-l-emerald-500 border-emerald-300 bg-emerald-50/15"
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span
                          className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                            isRejected
                              ? "bg-rose-100 text-rose-800"
                              : isNotUploaded
                              ? "bg-amber-100 text-amber-800"
                              : isUnderReview
                              ? "bg-blue-100 text-blue-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isApproved ? "✓" : idx + 1}
                        </span>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-neutral-900 leading-tight">{req.name}</h4>
                            {req.is_required ? (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                Required
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                                Optional
                              </span>
                            )}
                          </div>
                          {req.description && (
                            <p className="text-xs text-neutral-600 leading-relaxed pt-0.5">{req.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Right Action & Badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setQueryTargetReq(req)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-700 hover:text-neutral-950 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                          title="Message advisor about this item"
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5 text-emerald-700" />
                          <span className="hidden sm:inline">Message</span>
                        </button>

                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${badge.className}`}>
                          <span className={`w-2 h-2 rounded-full ${badge.dotColor}`} />
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    {/* REJECTION ALERT CALLOUT */}
                    {isRejected && latestDoc?.rejection_reason && (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-1.5">
                        <p className="font-bold flex items-center gap-1.5 text-rose-900">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Advisor Requested Correction:</span>
                        </p>
                        <p className="pl-5.5 text-rose-800 font-medium leading-relaxed">
                          {latestDoc.rejection_reason}
                        </p>
                        <p className="pl-5.5 text-[11px] text-rose-700 font-bold pt-0.5">
                          👉 Please capture a clearer photo or upload a corrected file below:
                        </p>
                      </div>
                    )}

                    {/* IN REVIEW STATUS CALLOUT */}
                    {isUnderReview && latestDoc && (
                      <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200/90 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-neutral-900 truncate">{latestDoc.file_name}</p>
                              <p className="text-[11px] text-neutral-500 font-medium">
                                Submitted on {formatDateTime(latestDoc.uploaded_at)} • {formatBytes(latestDoc.file_size)}
                              </p>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-900 bg-blue-100 px-2.5 py-1 rounded-lg shrink-0 border border-blue-200">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>In CA Review</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-blue-900/90 pl-1 font-medium">
                          ✓ Document received securely. Your advisor is currently verifying this document. You will be notified once reviewed.
                        </p>
                      </div>
                    )}

                    {/* APPROVED STATUS CALLOUT */}
                    {isApproved && (
                      <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/90 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-neutral-900 truncate">
                              {latestDoc?.file_name || "Document Verified"}
                            </p>
                            <p className="text-[11px] text-emerald-800 font-medium">
                              Verified & accepted by your advisor • No action required
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-900 bg-emerald-100 px-2.5 py-1 rounded-lg shrink-0 border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Approved</span>
                        </span>
                      </div>
                    )}

                    {/* UPLOAD ZONE (Only for items needing upload or re-upload) */}
                    {(isNotUploaded || isRejected) && (
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
              })
            )}
          </div>
        )}

        {/* MODE 2: Step-by-Step Guided Wizard */}
        {viewMode === "wizard" && (
          <div className="space-y-4">
            {/* Step Navigation Bar with Distinct Color Indicators */}
            <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-2xs">
              <button
                type="button"
                disabled={wizardStep === 0}
                onClick={() => setWizardStep((s) => Math.max(0, s - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1.5 overflow-x-auto px-2">
                {requirements.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => setWizardStep(i)}
                    className={`w-7 h-7 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      wizardStep === i
                        ? "bg-neutral-900 text-white shadow-xs scale-110 ring-2 ring-neutral-400"
                        : r.status === "approved"
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : r.status === "under_review" || r.status === "uploaded"
                        ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                        : r.status === "rejected"
                        ? "bg-rose-100 text-rose-800 hover:bg-rose-200"
                        : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                    }`}
                    title={r.name}
                  >
                    {r.status === "approved" ? "✓" : i + 1}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={wizardStep === requirements.length - 1}
                onClick={() => setWizardStep((s) => Math.min(requirements.length - 1, s + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Active Wizard Card */}
            {currentReq && (
              <div
                className={`p-6 bg-white rounded-3xl border transition-all space-y-5 shadow-xs relative overflow-hidden ${
                  currentReq.status === "rejected"
                    ? "border-l-6 border-l-rose-500 border-rose-300 bg-rose-50/15"
                    : currentReq.status === "not_uploaded"
                    ? "border-l-6 border-l-amber-500 border-amber-300 bg-amber-50/10"
                    : currentReq.status === "under_review" || currentReq.status === "uploaded"
                    ? "border-l-6 border-l-blue-500 border-blue-300 bg-blue-50/10"
                    : "border-l-6 border-l-emerald-500 border-emerald-300 bg-emerald-50/15"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                        Document {wizardStep + 1} of {requirements.length}
                      </span>
                      {currentReq.is_required ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          Mandatory
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                          Optional
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-neutral-900">{currentReq.name}</h3>
                    {currentReq.description && (
                      <p className="text-xs text-neutral-600 mt-1 leading-relaxed">{currentReq.description}</p>
                    )}
                  </div>

                  <div>
                    {(() => {
                      const badge = getRequirementStatusBadge(currentReq.status);
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${badge.className}`}>
                          <span className={`w-2 h-2 rounded-full ${badge.dotColor}`} />
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Rejection Note if rejected */}
                {currentReq.status === "rejected" && currentReq.latest_document?.rejection_reason && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
                    <div className="flex items-center gap-1.5 text-rose-900 text-xs font-bold">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Correction Requested by Advisor:</span>
                    </div>
                    <p className="text-xs text-rose-800 pl-5.5 leading-relaxed font-medium">
                      {currentReq.latest_document.rejection_reason}
                    </p>
                  </div>
                )}

                {/* Under Review State in Wizard */}
                {(currentReq.status === "under_review" || currentReq.status === "uploaded") && currentReq.latest_document && (
                  <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-neutral-900 truncate">
                            {currentReq.latest_document.file_name}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            Submitted on {formatDateTime(currentReq.latest_document.uploaded_at)} • {formatBytes(currentReq.latest_document.file_size)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setQueryTargetReq(currentReq)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-neutral-700 hover:text-neutral-950 bg-white hover:bg-neutral-100 px-3 py-1.5 rounded-xl border border-neutral-300 transition-colors shadow-2xs cursor-pointer"
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Message</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-blue-900 font-medium pl-1">
                      ✓ Document submitted! Your consultant is currently reviewing this document.
                    </p>
                  </div>
                )}

                {/* Approved State in Wizard */}
                {currentReq.status === "approved" && (
                  <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-neutral-900 truncate">
                          {currentReq.latest_document?.file_name || "Document Verified"}
                        </p>
                        <p className="text-[11px] text-emerald-800 font-medium">
                          Verified & approved by advisor • No further action required
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-900 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Approved</span>
                    </span>
                  </div>
                )}

                {/* Interactive Upload Box */}
                {(currentReq.status === "not_uploaded" || currentReq.status === "rejected") && (
                  <div className="pt-2">
                    <InteractiveFileUpload
                      token={token}
                      requirementId={currentReq.id}
                      requirementName={currentReq.name}
                      isReplacement={currentReq.status === "rejected"}
                      onUploadComplete={() => {
                        loadPortal();
                        if (wizardStep < requirements.length - 1) {
                          setWizardStep((s) => s + 1);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* WhatsApp Quick Help Banner */}
        <div className="p-4 bg-white rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <MessageSquareShare className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-neutral-900">Have questions about your documents?</p>
              <p className="text-[11px] text-neutral-500">Contact your advisor directly on WhatsApp for guidance.</p>
            </div>
          </div>
          <a
            href={`https://wa.me/${advisorPhone}?text=${encodeURIComponent(
              `Hi, I have a question regarding my documents for case ${caseInfo.reference_number}.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
          >
            <MessageSquareShare className="w-4 h-4" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>

        {/* Security & Confidentiality Footer */}
        <div className="text-center text-xs text-neutral-400 space-y-1.5 pt-3">
          <p className="flex items-center justify-center gap-1.5 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted with TLS 1.3 • Zero-Trust Token Authentication Active</span>
          </p>
          <p>© {new Date().getFullYear()} {organization.name}. Powered by Neon Cloud.</p>
        </div>
      </main>

      {/* Client Query Modal */}
      {queryTargetReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <MessageSquarePlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Message Your Advisor</h3>
                  <p className="text-[11px] text-neutral-400">Regarding: {queryTargetReq.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQueryTargetReq(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendQuery} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Type your note or question for the consultant:
                </label>
                <textarea
                  rows={3}
                  required
                  value={queryMessage}
                  onChange={(e) => setQueryMessage(e.target.value)}
                  placeholder="e.g. I have uploaded the updated FY statement. Please confirm if password is required..."
                  className="w-full text-xs bg-neutral-50 border border-neutral-300 rounded-xl p-3 text-neutral-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={sendingQuery}
                  onClick={() => setQueryTargetReq(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingQuery || !queryMessage.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {sendingQuery ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Message to Advisor</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900">Document Photo Guidelines</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuidelines(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-600">
              <div className="flex items-start gap-2.5 p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-950">Good Lighting & Contrast</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">Place document on a dark, flat surface with plenty of even lighting and no shadows.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-950">All 4 Corners Visible</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">Ensure all corners and borders of the document are visible and not cut off.</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-950">High Resolution & Readable Text</p>
                  <p className="text-[11px] text-emerald-800 mt-0.5">Names, PAN/Passport numbers, dates, and amounts must be crisp and clearly legible.</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuidelines(false)}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              Got it, continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
