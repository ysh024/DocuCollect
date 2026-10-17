"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  ChevronRight,
  MessageSquareShare,
  Copy,
  Check,
  Layers,
  Bell,
  Loader2,
  Trash2,
} from "lucide-react";
import { CaseWithDetails, Client } from "@/types";
import { getCaseStatusBadge, formatDate } from "@/lib/utils";
import {
  NewCaseModal,
  WhatsAppShareModal,
  WhatsAppReminderModal,
} from "@/components/dashboard/Modals";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { Pagination } from "@/components/ui";
import { DeleteConfirmationModal } from "@/components/ui";
import { useToast } from "@/components/ui";
import { deleteCaseAction, generateUploadLinkAction } from "@/app/actions";

export default function CasesListPage() {
  const { data, loading, refresh, navigateToTab } = useDashboardData();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const highlightId = searchParams?.get("highlight");
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [selectedCaseForShare, setSelectedCaseForShare] = useState<CaseWithDetails | null>(null);
  const [selectedCaseForReminder, setSelectedCaseForReminder] = useState<CaseWithDetails | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openingCaseId, setOpeningCaseId] = useState<string | null>(null);
  const [caseToDelete, setCaseToDelete] = useState<CaseWithDetails | null>(null);
  const [isDeletingCase, setIsDeletingCase] = useState(false);

  useEffect(() => {
    if (highlightId && data?.cases) {
      setActiveHighlight(highlightId);
      const targetIndex = (data.cases || []).findIndex((c) => c.id === highlightId);
      if (targetIndex >= 0) {
        const pageForCase = Math.floor(targetIndex / pageSize) + 1;
        setCurrentPage(pageForCase);
      }
      setTimeout(() => {
        const el = document.getElementById(`case-card-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 350);
      const timer = setTimeout(() => setActiveHighlight(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [highlightId, data]);

  const filtered = (data?.cases || []).filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.client.name.toLowerCase().includes(search.toLowerCase()) ||
      c.reference_number.toLowerCase().includes(search.toLowerCase()) ||
      c.service_type.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedCases = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCopyLink = async (c: CaseWithDetails) => {
    const token = c.upload_link?.token || c.upload_link?.token_hash;
    if (!token) {
      toast({ title: "Generating link...", description: "Creating secure upload link." });
      try {
        const res = await generateUploadLinkAction(c.id);
        if (res.token) {
          const url = `${window.location.origin}/upload/${res.token}`;
          navigator.clipboard.writeText(url);
          setCopiedId(c.id);
          toast({ title: "Link copied", description: "Direct client upload link is ready to share." });
          setTimeout(() => setCopiedId(null), 2000);
          await refresh();
        }
      } catch (err: any) {
        toast({ title: "Link generation failed", description: err.message, type: "error" });
      }
      return;
    }
    const url = `${window.location.origin}/upload/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(c.id);
    toast({ title: "Link copied", description: "Direct client upload link is ready to share." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleConfirmDeleteCase = async () => {
    if (!caseToDelete) return;
    setIsDeletingCase(true);
    try {
      const res = await deleteCaseAction(caseToDelete.id);
      if (res.success) {
        toast({ title: "Case Deleted", description: res.message });
        setCaseToDelete(null);
        await refresh();
      } else {
        toast({ title: "Delete Failed", description: res.error, type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setIsDeletingCase(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[48px]">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Cases & Collection Requests</h1>
          <p className="text-xs text-neutral-500 mt-0.5">Manage active client document requests, review cycles, and status.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/templates"
            prefetch={true}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                navigateToTab("templates");
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 rounded-xl border border-neutral-300 shadow-2xs transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-neutral-500" />
            <span>Checklist Templates</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsNewCaseOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create New Case
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-neutral-400 dark:text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by case title, client name, or reference..."
            className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg pl-9 pr-4 py-2 text-xs text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-neutral-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="waiting_for_client">Waiting for Client</option>
            <option value="under_review">Under Review</option>
            <option value="completed">Completed</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Cases List */}
      {!data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-3 animate-pulse">
              <div className="w-1/2 h-4 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="w-3/4 h-3 bg-neutral-100 dark:bg-neutral-800/60 rounded" />
              <div className="w-full h-12 bg-neutral-50 dark:bg-neutral-800/40 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="col-span-full py-16 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-8">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">No cases match the selected filter</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">Try switching filters or creating a new case.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedCases.map((c) => {
            const badge = getCaseStatusBadge(c.status);
            const totalReqs = c.requirements.length;
            const approvedCount = c.requirements.filter((r) => r.status === "approved").length;
            const underReviewCount = c.requirements.filter((r) => r.status === "under_review" || r.status === "uploaded").length;
            const percentage = totalReqs > 0 ? Math.round((approvedCount / totalReqs) * 100) : 0;

            return (
              <div
                key={c.id}
                id={`case-card-${c.id}`}
                className={`bg-white dark:bg-neutral-900 rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 group ${
                  activeHighlight === c.id
                    ? "border-emerald-500 ring-2 ring-emerald-500/70 bg-emerald-50/20 dark:bg-emerald-950/30 shadow-md animate-pulse"
                    : "border-neutral-200/80 dark:border-neutral-800 shadow-sm hover:shadow-md"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">{c.reference_number}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  <Link
                    href={`/dashboard/cases/${c.id}`}
                    prefetch={true}
                    onClick={() => setOpeningCaseId(c.id)}
                    className="block mt-2"
                  >
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                      <span>{c.title}</span>
                      {openingCaseId === c.id && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
                      )}
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium mt-0.5">{c.client.name}</p>
                  </Link>

                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">Service: {c.service_type}</p>
                </div>

                {/* Progress */}
                <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-medium text-neutral-600 dark:text-neutral-400">{approvedCount} of {totalReqs} approved</span>
                    <span className="font-bold text-neutral-800 dark:text-neutral-200">{percentage}%</span>
                  </div>
                  <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-1.5 overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${(approvedCount / (totalReqs || 1)) * 100}%` }} />
                    <div className="bg-purple-500 h-full" style={{ width: `${(underReviewCount / (totalReqs || 1)) * 100}%` }} />
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCaseForReminder(c)}
                      title="Send Smart WhatsApp Reminder"
                      className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-900/60 transition-colors cursor-pointer"
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedCaseForShare(c)}
                      title="Share on WhatsApp"
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                    >
                      <MessageSquareShare className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(c)}
                      title="Copy Link"
                      className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                    >
                      {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaseToDelete(c)}
                      title="Delete Case"
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Link
                    href={`/dashboard/cases/${c.id}`}
                    prefetch={true}
                    onClick={() => setOpeningCaseId(c.id)}
                    className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-xs"
                  >
                    {openingCaseId === c.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Opening...</span>
                      </>
                    ) : (
                      <>
                        <span>Open Case</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {totalItems > 0 && (
          <div className="pt-2">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[6, 12, 24, 48]}
            />
          </div>
        )}
      </>
      )}

      {isNewCaseOpen && (
        <NewCaseModal
          clients={data?.clients || []}
          isOpen={isNewCaseOpen}
          onClose={() => setIsNewCaseOpen(false)}
          onSuccess={(newCase) => {
            setIsNewCaseOpen(false);
            refresh();
            if (newCase?.id) {
              setActiveHighlight(newCase.id);
            }
          }}
        />
      )}

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

      {caseToDelete && (
        <DeleteConfirmationModal
          isOpen={true}
          title="Delete Case"
          description={`Are you sure you want to permanently delete case "${caseToDelete.title}"? All uploaded documents and checklist requirements for this case will be deleted permanently.`}
          confirmLabel="Delete Case"
          isLoading={isDeletingCase}
          onClose={() => setCaseToDelete(null)}
          onConfirm={handleConfirmDeleteCase}
        />
      )}
    </div>
  );
}
