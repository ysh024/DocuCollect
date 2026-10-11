"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Users,
  Briefcase,
  Clock,
  CheckCircle,
  FileText,
  AlertCircle,
  Plus,
  MessageSquareShare,
  Copy,
  ArrowUpRight,
  Sparkles,
  Bell,
  Search,
  Eye,
  Download,
  Loader2,
  X,
  Share2,
  Check,
  Phone,
} from "lucide-react";
import { InfoPopover } from "@/components/ui/InfoPopover";
import { CaseWithDetails, Document } from "@/types";
import { getCaseStatusBadge, formatDate } from "@/lib/utils";
import { WhatsAppShareModal } from "@/components/dashboard/WhatsAppShareModal";
import { WhatsAppReminderModal } from "@/components/dashboard/WhatsAppReminderModal";
import { NewCaseModal } from "@/components/dashboard/NewCaseModal";
import { NewClientModal } from "@/components/dashboard/NewClientModal";
import { DocumentPreviewModal } from "@/components/dashboard/DocumentPreviewModal";
import { useToast } from "@/components/ui/Toast";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { downloadFileWithFeedback } from "@/lib/download-client";

export default function DashboardOverviewPage() {
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data, user: userProfile, refresh } = useDashboardData();

  const [filter, setFilter] = useState<"all" | "pending" | "under_review" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCaseForShare, setSelectedCaseForShare] = useState<CaseWithDetails | null>(null);
  const [selectedCaseForReminder, setSelectedCaseForReminder] = useState<CaseWithDetails | null>(null);
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [previewDoc, setPreviewDoc] = useState<{ doc: Document; reqName: string; caseId?: string } | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [openingCaseId, setOpeningCaseId] = useState<string | null>(null);

  useEffect(() => {
    // Keyboard shortcut '/' to focus search
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && data) {
      const dismissed = localStorage.getItem("docucollect_onboarding_dismissed");
      if (!dismissed && data.cases.length === 0) {
        setShowOnboarding(true);
      }
    }
  }, [data]);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("docucollect_onboarding_dismissed", "true");
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Extract all uploaded documents across cases for the live document stream
  const allUploadedDocs: { doc: Document; caseItem: CaseWithDetails; reqName: string }[] = [];
  data.cases.forEach((c) => {
    c.requirements.forEach((r) => {
      r.documents?.forEach((d) => {
        allUploadedDocs.push({
          doc: d,
          caseItem: c,
          reqName: r.name,
        });
      });
    });
  });
  allUploadedDocs.sort((a, b) => new Date(b.doc.uploaded_at).getTime() - new Date(a.doc.uploaded_at).getTime());

  const filteredCases = data.cases.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.service_type.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === "pending") {
      return (
        c.status === "waiting_for_client" ||
        c.status === "draft" ||
        c.requirements.some((r) => (r.status === "not_uploaded" || r.status === "rejected") && r.is_required)
      );
    }
    if (filter === "under_review") {
      return (
        c.status === "under_review" ||
        c.requirements.some((r) => r.status === "under_review" || r.status === "uploaded")
      );
    }
    if (filter === "completed") {
      return c.status === "completed";
    }
    return true;
  });

  const handleCopyLink = (caseItem: CaseWithDetails) => {
    const token = caseItem.upload_link?.token_hash || `token-${caseItem.id.slice(0, 8)}`;
    const url = `${window.location.origin}/upload/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(caseItem.id);
    toast({ title: "Link copied", description: `Upload link for ${caseItem.client.name} copied.` });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[48px]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {userProfile ? `Welcome, ${userProfile.fullName}` : "Dashboard Overview"}
            </h1>
            {userProfile && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                {userProfile.organizationName}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Monitor client document uploads, reviews, and collection progress in real time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNewClientOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 border border-neutral-200/80 dark:border-neutral-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            <span>Add Client</span>
          </button>
          <button
            type="button"
            onClick={() => setIsNewCaseOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Case</span>
          </button>
        </div>
      </div>

      {/* Missing Contact Details Notice (Mandatory for client portal enquiries) */}
      {userProfile && !userProfile.phone && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900 dark:text-amber-200 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Action Needed:</strong> Add your WhatsApp / Contact phone number in Settings so clients can enquire directly from their document upload portal.
            </span>
          </div>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300 hover:underline shrink-0 text-xs"
          >
            <span>Update in Settings →</span>
          </Link>
        </div>
      )}

      {/* Onboarding Quick-Start Guide for Fresh Users */}
      {showOnboarding && (
        <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-neutral-50 dark:from-emerald-950/40 dark:via-neutral-900 dark:to-neutral-900 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl shadow-xs relative">
          <button
            type="button"
            onClick={dismissOnboarding}
            className="absolute top-3.5 right-3.5 p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-white rounded-lg transition"
            title="Dismiss guide"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="p-1 rounded-lg bg-emerald-600 text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              Getting Started with DocuCollect in 3 Simple Steps
            </h2>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 max-w-2xl mb-4">
            Collect verified client documents 10x faster without email clutter or follow-up phone calls.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="p-3 bg-white/90 dark:bg-neutral-800/70 border border-emerald-100 dark:border-neutral-700 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-white">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-[11px]">
                  1
                </span>
                <span>Add Your First Client</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Create a client record with their name and phone number for WhatsApp reminders.
              </p>
              <button
                type="button"
                onClick={() => setIsNewClientOpen(true)}
                className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>+ Add Client</span>
              </button>
            </div>

            <div className="p-3 bg-white/90 dark:bg-neutral-800/70 border border-emerald-100 dark:border-neutral-700 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-white">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-[11px]">
                  2
                </span>
                <span>Select Checklist Template</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Choose standard checklists (GST, ITR, Company, Visa) or build your own custom list.
              </p>
              <button
                type="button"
                onClick={() => setIsNewCaseOpen(true)}
                className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>+ Create Case</span>
              </button>
            </div>

            <div className="p-3 bg-white/90 dark:bg-neutral-800/70 border border-emerald-100 dark:border-neutral-700 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-white">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-[11px]">
                  3
                </span>
                <span>Share 1-Click Upload Link</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Send link to client. They upload from phone/desktop without needing any password!
              </p>
              <button
                type="button"
                onClick={dismissOnboarding}
                className="mt-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
              >
                Got it, dismiss guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 Minimal Metric Cards with 1-Click filter clickability */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`p-4 bg-white dark:bg-neutral-900 rounded-2xl border text-left transition-all cursor-pointer ${
            filter === "all" ? "border-neutral-900 dark:border-white ring-1 ring-neutral-900/10 shadow-xs" : "border-neutral-200 dark:border-neutral-800 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700"
          }`}
        >
          <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Active Cases</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">{data.metrics.activeCases}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>In pipeline</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("under_review")}
          className={`p-4 bg-white dark:bg-neutral-900 rounded-2xl border text-left transition-all cursor-pointer ${
            filter === "under_review" ? "border-indigo-600 ring-1 ring-indigo-600/20 shadow-xs" : "border-neutral-200 dark:border-neutral-800 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Awaiting Review</p>
            {data.metrics.documentsAwaitingReview > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                {data.metrics.documentsAwaitingReview} doc{data.metrics.documentsAwaitingReview === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mt-1">{data.metrics.casesAwaitingReview}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>{data.metrics.casesAwaitingReview === 1 ? "1 case needs review" : `${data.metrics.casesAwaitingReview} cases need review`}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("pending")}
          className={`p-4 bg-white dark:bg-neutral-900 rounded-2xl border text-left transition-all cursor-pointer ${
            filter === "pending" ? "border-amber-600 ring-1 ring-amber-600/20 shadow-xs" : "border-neutral-200 dark:border-neutral-800 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Pending Uploads</p>
            {data.metrics.pendingDocuments > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800">
                {data.metrics.pendingDocuments} doc{data.metrics.pendingDocuments === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">{data.metrics.casesPendingUpload}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{data.metrics.casesPendingUpload === 1 ? "1 case awaiting client" : `${data.metrics.casesPendingUpload} cases awaiting client`}</span>
          </div>
        </button>

        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs">
          <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">Total Clients</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">{data.metrics.totalClients}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
            <span>Managed roster</span>
          </div>
        </div>
      </div>

      {/* Live Direct Document Submissions Strip */}
      {allUploadedDocs.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
                <Eye className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-bold text-neutral-900 dark:text-white tracking-tight flex items-center gap-1.5">
                Recent Document Submissions
                <InfoPopover text="Click directly on any document to open instant preview and verification." />
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                {allUploadedDocs.length} Total
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {allUploadedDocs.slice(0, 6).map(({ doc, caseItem, reqName }) => {
              const downloadUrl = `/api/download?file=${encodeURIComponent(doc.storage_path || "")}&name=${encodeURIComponent(doc.file_name)}&id=${doc.id}&download=1`;
              return (
                <div
                  key={doc.id}
                  onClick={() => setPreviewDoc({ doc, reqName, caseId: caseItem.id })}
                  className="p-3 bg-neutral-50/70 dark:bg-neutral-800/50 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/90 rounded-xl border border-neutral-200/70 dark:border-neutral-700/80 hover:border-emerald-300 dark:hover:border-emerald-700/80 flex items-center justify-between gap-3 transition-all group cursor-pointer shadow-2xs"
                  title={`Click to view ${doc.file_name}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 group-hover:text-emerald-600 group-hover:border-emerald-300 dark:group-hover:border-emerald-700 flex items-center justify-center shrink-0 transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate transition-colors" title={doc.file_name}>
                        {doc.file_name}
                      </p>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                        {caseItem.client.name} • <span className="text-neutral-700 dark:text-neutral-300">{reqName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={downloadingDocId === doc.id}
                      onClick={() => {
                        downloadFileWithFeedback({
                          url: downloadUrl,
                          fileName: doc.file_name,
                          toast,
                          onStart: () => setDownloadingDocId(doc.id),
                          onComplete: () => setDownloadingDocId(null),
                        });
                      }}
                      title="Download File to System"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-200/90 dark:border-neutral-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {downloadingDocId === doc.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      )}
                      <span>{downloadingDocId === doc.id ? "Downloading..." : "Download"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Cases Table - Fixed Columns, Zero Overlap, Clear UI */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cases or client... (press '/' to focus)"
              className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition"
            />
          </div>

          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === "all" ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-semibold shadow-2xs" : "hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              All ({data.cases.length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === "pending" ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-semibold shadow-2xs" : "hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Pending ({data.metrics.casesPendingUpload})
            </button>
            <button
              onClick={() => setFilter("under_review")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === "under_review" ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-semibold shadow-2xs" : "hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Review ({data.metrics.casesAwaitingReview})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                filter === "completed" ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white font-semibold shadow-2xs" : "hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Complete ({data.metrics.completedCases})
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-left text-xs table-fixed">
            <colgroup>
              <col className="w-[32%]" />
              <col className="w-[18%]" />
              <col className="w-[16%]" />
              <col className="w-[18%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead className="bg-neutral-50/70 dark:bg-neutral-850 dark:bg-neutral-800/40 border-b border-neutral-100 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500 font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4 truncate">Case & Client</th>
                <th className="py-3 px-3 truncate">Service & Due</th>
                <th className="py-3 px-3 truncate">Status</th>
                <th className="py-3 px-3 truncate">Progress</th>
                <th className="py-3 px-4 text-right truncate">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
                        <Search className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">No cases match this filter</p>
                      <p className="text-[11px] text-neutral-400">
                        {filter === "under_review"
                          ? "No document submissions are currently awaiting review."
                          : filter === "pending"
                          ? "No cases currently awaiting client document uploads."
                          : "No cases match your search criteria."}
                      </p>
                      {filter !== "all" && (
                        <button
                          type="button"
                          onClick={() => setFilter("all")}
                          className="text-xs text-neutral-900 dark:text-white font-semibold hover:underline pt-1 inline-block cursor-pointer"
                        >
                          View all cases
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => {
                  const badge = getCaseStatusBadge(c.status);
                  const totalReqs = c.requirements.length;
                  const approvedReqs = c.requirements.filter((r) => r.status === "approved").length;
                  const underReviewReqs = c.requirements.filter((r) => r.status === "under_review" || r.status === "uploaded").length;
                  const percentage = totalReqs > 0 ? Math.round((approvedReqs / totalReqs) * 100) : 0;

                  return (
                    <tr key={c.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors group">
                      <td className="py-3.5 px-4 min-w-0">
                        <Link
                          href={`/dashboard/cases/${c.id}`}
                          prefetch={false}
                          onClick={() => setOpeningCaseId(c.id)}
                          className="block group"
                        >
                          <span className="font-bold text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate flex items-center gap-1.5">
                            <span className="truncate">{c.title}</span>
                            {openingCaseId === c.id && (
                              <Loader2 className="w-3 h-3 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
                            )}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                            <span className="truncate">{c.client.name}</span>
                            <span className="shrink-0">•</span>
                            <span className="font-mono text-[10px] shrink-0 text-neutral-400">{c.reference_number}</span>
                          </div>
                        </Link>
                      </td>

                      <td className="py-3.5 px-3 min-w-0">
                        <span className="text-neutral-800 dark:text-neutral-200 font-medium truncate block">{c.service_type}</span>
                        <div className="flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 truncate">
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">Due {formatDate(c.due_date)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
                          <span className="truncate">{badge.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="space-y-1.5 max-w-[140px]">
                          <div className="flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                            <span>{approvedReqs}/{totalReqs} approved</span>
                            <span className="font-bold text-neutral-700 dark:text-neutral-300">{percentage}%</span>
                          </div>
                          <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden flex">
                            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(approvedReqs / (totalReqs || 1)) * 100}%` }} />
                            <div className="bg-indigo-500 h-full transition-all" style={{ width: `${(underReviewReqs / (totalReqs || 1)) * 100}%` }} />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1 shrink-0 whitespace-nowrap">
                          {/* WhatsApp Reminder */}
                          <button
                            type="button"
                            onClick={() => setSelectedCaseForReminder(c)}
                            title="Send Smart Reminder"
                            className="w-7 h-7 rounded-lg text-neutral-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 dark:hover:text-amber-300 border border-transparent hover:border-amber-200/60 dark:hover:border-amber-800 flex items-center justify-center transition-all cursor-pointer shrink-0"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>

                          {/* WhatsApp Share */}
                          <button
                            type="button"
                            onClick={() => setSelectedCaseForShare(c)}
                            title="Share on WhatsApp"
                            className="w-7 h-7 rounded-lg text-neutral-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 border border-transparent hover:border-emerald-200/60 dark:hover:border-emerald-800 flex items-center justify-center transition-all cursor-pointer shrink-0"
                          >
                            <MessageSquareShare className="w-3.5 h-3.5" />
                          </button>

                          {/* Copy Link */}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(c)}
                            title="Copy Upload Link"
                            className="w-7 h-7 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
                          >
                            {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {/* Open Case Details */}
                          <Link
                            href={`/dashboard/cases/${c.id}`}
                            prefetch={false}
                            onClick={() => setOpeningCaseId(c.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold rounded-lg transition-colors text-[11px] shadow-2xs shrink-0 ml-0.5 cursor-pointer"
                          >
                            {openingCaseId === c.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-emerald-400 dark:text-emerald-600" />
                                <span>Opening...</span>
                              </>
                            ) : (
                              <>
                                <span>Open</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </>
                            )}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Preview Pop-up Window Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc.doc}
          requirementName={previewDoc.reqName}
          requirementId={previewDoc.doc.requirement_id}
          caseId={previewDoc.caseId}
          isOpen={true}
          onClose={() => setPreviewDoc(null)}
          onStatusUpdated={() => refresh()}
        />
      )}

      {/* Modals */}
      {selectedCaseForShare && (
        <WhatsAppShareModal
          caseData={selectedCaseForShare}
          isOpen={true}
          onClose={() => setSelectedCaseForShare(null)}
          onLinkRenewed={() => refresh()}
        />
      )}

      {selectedCaseForReminder && (
        <WhatsAppReminderModal
          caseData={selectedCaseForReminder}
          isOpen={true}
          onClose={() => setSelectedCaseForReminder(null)}
        />
      )}

      {isNewCaseOpen && (
        <NewCaseModal
          clients={data.clients}
          isOpen={isNewCaseOpen}
          onClose={() => setIsNewCaseOpen(false)}
          onSuccess={() => refresh()}
        />
      )}

      {isNewClientOpen && (
        <NewClientModal
          isOpen={isNewClientOpen}
          onClose={() => setIsNewClientOpen(false)}
          onSuccess={() => refresh()}
        />
      )}
    </div>
  );
}
