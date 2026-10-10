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
} from "lucide-react";
import { InfoPopover } from "@/components/ui/InfoPopover";
import { getDashboardData } from "@/app/actions/portal";
import { getCurrentUserAction } from "@/app/actions/auth";
import { CaseWithDetails, Client, Document } from "@/types";
import { getCaseStatusBadge, formatDate, formatBytes, formatDateTime } from "@/lib/utils";
import { WhatsAppShareModal } from "@/components/dashboard/WhatsAppShareModal";
import { WhatsAppReminderModal } from "@/components/dashboard/WhatsAppReminderModal";
import { NewCaseModal } from "@/components/dashboard/NewCaseModal";
import { NewClientModal } from "@/components/dashboard/NewClientModal";
import { DocumentPreviewModal } from "@/components/dashboard/DocumentPreviewModal";
import { useToast } from "@/components/ui/Toast";

import { useDashboardData } from "@/contexts/DashboardDataContext";

export default function DashboardOverviewPage() {
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data, user: userProfile, loading, refresh } = useDashboardData();

  const [filter, setFilter] = useState<"all" | "pending" | "under_review" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCaseForShare, setSelectedCaseForShare] = useState<CaseWithDetails | null>(null);
  const [selectedCaseForReminder, setSelectedCaseForReminder] = useState<CaseWithDetails | null>(null);
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [previewDoc, setPreviewDoc] = useState<{ doc: Document; reqName: string; caseId?: string } | null>(null);

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

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
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
    <div className="space-y-6 w-full pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[48px]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">
              {userProfile ? `Welcome, ${userProfile.fullName}` : "Dashboard Overview"}
            </h1>
            {userProfile && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                {userProfile.organizationName}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Monitor client document uploads, reviews, and collection progress in real time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNewClientOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200/80 rounded-lg shadow-sm transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-neutral-500" />
            Add Client
          </button>
          <button
            type="button"
            onClick={() => setIsNewCaseOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Case
          </button>
        </div>
      </div>

      {/* 4 Minimal Metric Cards with 1-Click filter clickability */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`p-4 bg-white rounded-xl border text-left transition-all ${
            filter === "all" ? "border-neutral-900 ring-1 ring-neutral-900/10 shadow-sm" : "border-neutral-200/80 shadow-subtle hover:border-neutral-300"
          }`}
        >
          <p className="text-[11px] font-medium text-neutral-500">Active Cases</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{data.metrics.activeCases}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-blue-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>In pipeline</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("under_review")}
          className={`p-4 bg-white rounded-xl border text-left transition-all ${
            filter === "under_review" ? "border-indigo-600 ring-1 ring-indigo-600/20 shadow-sm" : "border-neutral-200/80 shadow-subtle hover:border-neutral-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-neutral-500">Awaiting Review</p>
            {data.metrics.documentsAwaitingReview > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                {data.metrics.documentsAwaitingReview} doc{data.metrics.documentsAwaitingReview === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-indigo-700 mt-1">{data.metrics.casesAwaitingReview}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-indigo-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>{data.metrics.casesAwaitingReview === 1 ? "1 case needs review" : `${data.metrics.casesAwaitingReview} cases need review`}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setFilter("pending")}
          className={`p-4 bg-white rounded-xl border text-left transition-all ${
            filter === "pending" ? "border-amber-600 ring-1 ring-amber-600/20 shadow-sm" : "border-neutral-200/80 shadow-subtle hover:border-neutral-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium text-neutral-500">Pending Uploads</p>
            {data.metrics.pendingDocuments > 0 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                {data.metrics.pendingDocuments} doc{data.metrics.pendingDocuments === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-1">{data.metrics.casesPendingUpload}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-amber-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{data.metrics.casesPendingUpload === 1 ? "1 case awaiting client" : `${data.metrics.casesPendingUpload} cases awaiting client`}</span>
          </div>
        </button>

        <div className="p-4 bg-white rounded-xl border border-neutral-200/80 shadow-subtle">
          <p className="text-[11px] font-medium text-neutral-500">Total Clients</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{data.metrics.totalClients}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-neutral-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
            <span>Managed roster</span>
          </div>
        </div>
      </div>

      {/* Live Direct Document Submissions Strip */}
      {allUploadedDocs.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200/80 shadow-subtle p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Eye className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs font-bold text-neutral-900 tracking-tight flex items-center gap-1.5">
                Recent Document Vault Submissions
                <InfoPopover text="Click the View icon on any document to launch instant full-screen preview and inline approval." />
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                {allUploadedDocs.length} Total
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {allUploadedDocs.slice(0, 6).map(({ doc, caseItem, reqName }) => {
              const downloadUrl = `/api/download?file=${encodeURIComponent(doc.storage_path || "")}&name=${encodeURIComponent(doc.file_name)}&id=${doc.id}`;
              return (
                <div
                  key={doc.id}
                  className="p-3 bg-neutral-50/70 hover:bg-neutral-50 rounded-xl border border-neutral-200/70 flex items-center justify-between gap-3 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 text-neutral-700 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-neutral-900 truncate" title={doc.file_name}>
                        {doc.file_name}
                      </p>
                      <p className="text-[10px] text-neutral-500 truncate">
                        {caseItem.client.name} • <span className="text-neutral-700">{reqName}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Direct Pop-Up View Button */}
                    <button
                      type="button"
                      onClick={() => setPreviewDoc({ doc, reqName, caseId: caseItem.id })}
                      title="Direct Pop-Up View"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-neutral-900 hover:text-white text-neutral-800 border border-neutral-200/90 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
                      <span>View</span>
                    </button>

                    {/* Direct Download Button */}
                    <a
                      href={downloadUrl}
                      download={doc.file_name}
                      title="Download File"
                      className="p-1.5 bg-white hover:bg-neutral-100 text-neutral-600 border border-neutral-200 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Table Card with Search & Shortcuts */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-subtle overflow-hidden">
        {/* Table Toolbar */}
        <div className="px-5 py-3.5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cases or client... (press '/' to focus)"
              className="w-full bg-neutral-50/80 border border-neutral-200 rounded-lg pl-8 pr-3 py-1 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-1 bg-neutral-100/80 p-0.5 rounded-lg text-[11px] font-medium text-neutral-600">
            <button
              onClick={() => setFilter("all")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === "all" ? "bg-white text-neutral-900 font-semibold shadow-xs" : "hover:text-neutral-900 font-medium"
              }`}
            >
              All ({data.cases.length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === "pending" ? "bg-white text-neutral-900 font-semibold shadow-xs" : "hover:text-neutral-900 font-medium"
              }`}
            >
              Pending ({data.metrics.casesPendingUpload})
            </button>
            <button
              onClick={() => setFilter("under_review")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === "under_review" ? "bg-white text-neutral-900 font-semibold shadow-xs" : "hover:text-neutral-900 font-medium"
              }`}
            >
              Review ({data.metrics.casesAwaitingReview})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filter === "completed" ? "bg-white text-neutral-900 font-semibold shadow-xs" : "hover:text-neutral-900 font-medium"
              }`}
            >
              Complete ({data.metrics.completedCases})
            </button>
          </div>
        </div>

        {/* Table Content with responsive fluid columns & zero horizontal scroll */}
        <div className="overflow-x-auto min-h-[320px]">
          <table className="w-full text-left text-xs table-fixed">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[18%]" />
              <col className="w-[15%]" />
              <col className="w-[20%]" />
              <col className="w-[19%]" />
            </colgroup>
            <thead className="bg-neutral-50/60 border-b border-neutral-100 text-neutral-400 font-medium text-[11px]">
              <tr>
                <th className="py-3 px-5 truncate">Case & Client</th>
                <th className="py-3 px-4 truncate">Service & Due</th>
                <th className="py-3 px-4 truncate">Status</th>
                <th className="py-3 px-4 truncate">Checklist Progress & Docs</th>
                <th className="py-3 px-5 text-right truncate">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100/80">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
                        <Search className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-semibold text-neutral-800">No cases match this filter</p>
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
                          className="text-xs text-neutral-900 font-semibold hover:underline pt-1 inline-block cursor-pointer"
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

                  // Find latest uploaded document in this case if any
                  const caseDocs: { doc: Document; reqName: string }[] = [];
                  c.requirements.forEach((r) => {
                    r.documents?.forEach((d) => {
                      caseDocs.push({ doc: d, reqName: r.name });
                    });
                  });
                  caseDocs.sort((a, b) => new Date(b.doc.uploaded_at).getTime() - new Date(a.doc.uploaded_at).getTime());
                  const latestCaseDoc = caseDocs[0];

                  return (
                    <tr key={c.id} className="hover:bg-neutral-50/60 transition-colors group">
                      <td className="py-3.5 px-5 min-w-0">
                        <Link href={`/dashboard/cases/${c.id}`} className="block group">
                          <span className="font-semibold text-neutral-900 group-hover:text-neutral-600 transition-colors truncate block">
                            {c.title}
                          </span>
                          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5 truncate">
                            <span className="truncate">{c.client.name}</span>
                            <span className="shrink-0">•</span>
                            <span className="font-mono shrink-0">{c.reference_number}</span>
                          </div>
                        </Link>
                      </td>

                      <td className="py-3.5 px-4 min-w-0">
                        <span className="text-neutral-800 font-medium truncate block">{c.service_type}</span>
                        <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5 truncate">
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">Due {formatDate(c.due_date)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.className}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`} />
                          <span className="truncate">{badge.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="w-full max-w-[210px] space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-neutral-500 font-medium">
                            <span>{approvedReqs}/{totalReqs} approved</span>
                            <span className="font-semibold text-neutral-700">{percentage}%</span>
                          </div>
                          <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden flex">
                            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(approvedReqs / (totalReqs || 1)) * 100}%` }} />
                            <div className="bg-indigo-500 h-full transition-all" style={{ width: `${(underReviewReqs / (totalReqs || 1)) * 100}%` }} />
                          </div>

                          {/* Interactive mini doc tag with count */}
                          {caseDocs.length > 0 ? (
                            <div className="flex items-center gap-1 min-w-0">
                              <button
                                type="button"
                                onClick={() => setPreviewDoc({ doc: caseDocs[0].doc, reqName: caseDocs[0].reqName, caseId: c.id })}
                                title={`View ${caseDocs[0].doc.file_name} in Pop-up`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-medium transition-colors cursor-pointer truncate max-w-[140px]"
                              >
                                <Eye className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                <span className="truncate">{caseDocs[0].doc.file_name}</span>
                              </button>
                              {caseDocs.length > 1 && (
                                <span className="text-[10px] text-neutral-400 font-mono font-medium shrink-0">
                                  +{caseDocs.length - 1}
                                </span>
                              )}
                            </div>
                          ) : (
                            <p className="text-[10px] text-neutral-400 italic">Awaiting client files</p>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1 flex-nowrap shrink-0">
                          {/* Direct Pop-Up View Document Icon */}
                          {latestCaseDoc && (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ doc: latestCaseDoc.doc, reqName: latestCaseDoc.reqName, caseId: c.id })}
                              title={`Direct View: ${latestCaseDoc.doc.file_name}`}
                              className="w-7 h-7 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200/60 flex items-center justify-center transition-all cursor-pointer shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Send Smart Reminder */}
                          <button
                            type="button"
                            onClick={() => setSelectedCaseForReminder(c)}
                            title="Send Smart Reminder"
                            className="w-7 h-7 rounded-lg text-neutral-500 hover:text-amber-700 hover:bg-amber-50 border border-transparent hover:border-amber-200/60 flex items-center justify-center transition-all cursor-pointer shrink-0"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>

                          {/* WhatsApp Share */}
                          <button
                            type="button"
                            onClick={() => setSelectedCaseForShare(c)}
                            title="Share via WhatsApp"
                            className="w-7 h-7 rounded-lg text-neutral-500 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200/60 flex items-center justify-center transition-all cursor-pointer shrink-0"
                          >
                            <MessageSquareShare className="w-3.5 h-3.5" />
                          </button>

                          {/* Copy Link */}
                          <button
                            type="button"
                            onClick={() => handleCopyLink(c)}
                            title="Copy Upload Link"
                            className="w-7 h-7 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 border border-transparent hover:border-neutral-200 flex items-center justify-center transition-all cursor-pointer shrink-0"
                          >
                            {copiedId === c.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>

                          {/* Open Review */}
                          <Link
                            href={`/dashboard/cases/${c.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg transition-colors text-[11px] shadow-2xs shrink-0"
                          >
                            <span>Review</span>
                            <ArrowUpRight className="w-3 h-3" />
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
