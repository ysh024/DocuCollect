"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  ChevronRight,
  MessageSquareShare,
  Copy,
  Check,
} from "lucide-react";
import { getDashboardData } from "@/app/actions/portal";
import { CaseWithDetails, Client } from "@/types";
import { getCaseStatusBadge, formatDate } from "@/lib/utils";
import { NewCaseModal } from "@/components/dashboard/NewCaseModal";
import { WhatsAppShareModal } from "@/components/dashboard/WhatsAppShareModal";

export default function CasesListPage() {
  const [data, setData] = useState<{
    cases: CaseWithDetails[];
    clients: Client[];
  } | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [selectedCaseForShare, setSelectedCaseForShare] = useState<CaseWithDetails | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadData = async () => {
    const res = await getDashboardData();
    setData(res);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filtered = data.cases.filter((c) => {
    const matchesSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.client.name.toLowerCase().includes(search.toLowerCase()) ||
      c.reference_number.toLowerCase().includes(search.toLowerCase()) ||
      c.service_type.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCopyLink = (c: CaseWithDetails) => {
    const token = c.upload_link?.token_hash || `token-${c.id.slice(0, 8)}`;
    const url = `${window.location.origin}/upload/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cases & Collection Requests</h1>
          <p className="text-xs text-slate-500 mt-1">Manage active client document requests, review cycles, and status.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsNewCaseOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New Case
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by case title, client name, or reference..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((c) => {
          const badge = getCaseStatusBadge(c.status);
          const totalReqs = c.requirements.length;
          const approvedCount = c.requirements.filter((r) => r.status === "approved").length;
          const underReviewCount = c.requirements.filter((r) => r.status === "under_review" || r.status === "uploaded").length;
          const percentage = totalReqs > 0 ? Math.round((approvedCount / totalReqs) * 100) : 0;

          return (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[11px] font-semibold text-slate-500">{c.reference_number}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>

                <Link href={`/dashboard/cases/${c.id}`} className="block mt-2">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">{c.client.name}</p>
                </Link>

                <p className="text-[11px] text-slate-500 mt-1">Service: {c.service_type}</p>
              </div>

              {/* Progress */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-slate-600">{approvedCount} of {totalReqs} approved</span>
                  <span className="font-bold text-slate-800">{percentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${(approvedCount / (totalReqs || 1)) * 100}%` }} />
                  <div className="bg-purple-500 h-full" style={{ width: `${(underReviewCount / (totalReqs || 1)) * 100}%` }} />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedCaseForShare(c)}
                    title="WhatsApp Share"
                    className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <MessageSquareShare className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(c)}
                    title="Copy Link"
                    className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <Link
                  href={`/dashboard/cases/${c.id}`}
                  className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 text-xs"
                >
                  <span>Open Case</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {isNewCaseOpen && (
        <NewCaseModal
          clients={data.clients}
          isOpen={isNewCaseOpen}
          onClose={() => setIsNewCaseOpen(false)}
          onSuccess={() => loadData()}
        />
      )}

      {selectedCaseForShare && (
        <WhatsAppShareModal
          caseData={selectedCaseForShare}
          isOpen={true}
          onClose={() => setSelectedCaseForShare(null)}
          onLinkRenewed={() => loadData()}
        />
      )}
    </div>
  );
}
