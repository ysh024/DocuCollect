"use client";

import { useState, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Users,
  Plus,
  Phone,
  Mail,
  Building2,
  Search,
  MessageSquareShare,
  FolderOpen,
  Download,
  Eye,
  FileText,
  X,
  ExternalLink,
  Clock,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Pencil,
  Briefcase,
  ChevronRight,
  ChevronDown,
  Copy,
  Check,
  Folder,
} from "lucide-react";
import { getDashboardData } from "@/app/actions/portal";
import { Client, CaseWithDetails, Document } from "@/types";
import { formatDate, formatBytes, getCaseStatusBadge } from "@/lib/utils";
import { NewClientModal } from "@/components/dashboard/NewClientModal";
import { EditClientModal } from "@/components/dashboard/EditClientModal";
import { DocumentPreviewModal } from "@/components/dashboard/DocumentPreviewModal";
import { NewCaseModal } from "@/components/dashboard/NewCaseModal";
import { useToast } from "@/components/ui/Toast";
import { useDashboardData } from "@/contexts/DashboardDataContext";

export default function ClientsPage() {
  const { toast } = useToast();
  const { clients, cases, loading, refresh } = useDashboardData();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"manual" | "csv">("manual");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ doc: Document; reqName: string; caseId?: string } | null>(null);
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [newCaseClientId, setNewCaseClientId] = useState<string | undefined>(undefined);
  const [copiedCaseId, setCopiedCaseId] = useState<string | null>(null);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [activeClientTab, setActiveClientTab] = useState<"all" | "cases" | "vault">("all");

  useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = clients.filter((c) => {
    return (
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.company && c.company.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const getClientCases = (clientId: string) => {
    return cases.filter((c) => c.client_id === clientId);
  };

  const getCaseDocuments = (c: CaseWithDetails) => {
    const docs: { doc: Document; reqName: string; requirementId: string }[] = [];
    c.requirements?.forEach((r) => {
      r.documents?.forEach((d) => {
        docs.push({
          doc: d,
          reqName: r.name,
          requirementId: r.id,
        });
      });
    });
    return docs;
  };

  const getClientDocuments = (clientId: string) => {
    const clientCases = cases.filter((c) => c.client_id === clientId);
    const docs: { doc: Document; caseTitle: string; caseId: string; reqName: string }[] = [];
    clientCases.forEach((c) => {
      c.requirements?.forEach((r) => {
        r.documents?.forEach((d) => {
          docs.push({
            doc: d,
            caseTitle: c.title,
            caseId: c.id,
            reqName: r.name,
          });
        });
      });
    });
    return docs;
  };

  return (
    <div className="space-y-6 w-full max-w-full pb-12 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[48px]">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Clients & Document Storage Vault</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            View client portfolios, access structured document vaults, download files, and track client cases.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setModalTab("csv");
              setIsNewClientOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-200/90 dark:border-neutral-800 rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Import CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setModalTab("manual");
              setIsNewClientOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-emerald-600 hover:bg-neutral-800 dark:hover:bg-emerald-500 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Client</span>
          </button>
        </div>
      </div>

      {/* Search Toolbar & Case Metrics */}
      <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by name, phone, PAN, GSTIN, or firm..."
            className="w-full bg-neutral-50/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700 rounded-lg pl-8 pr-4 py-2 text-xs text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-emerald-500 focus:bg-white dark:focus:bg-neutral-800 transition-all"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 font-medium shrink-0 flex-wrap">
          <span>Showing <strong className="text-neutral-900 dark:text-neutral-100">{filtered.length}</strong> clients</span>
          <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          <span className="flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
            <strong className="text-neutral-900 dark:text-neutral-100">{cases.length}</strong> Total Cases
          </span>
        </div>
      </div>

      {/* Clients Table Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-subtle overflow-hidden transition-colors w-full">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs table-auto">
            <thead className="bg-neutral-50/80 dark:bg-neutral-800/70 border-b border-neutral-100 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Client Group & Entity</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Contact & Email</th>
                <th className="py-3.5 px-3 text-center w-24 sm:w-28">Cases</th>
                <th className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">Document Vault & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {loading && clients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Loading client portfolios...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="max-w-sm mx-auto space-y-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 flex items-center justify-center mx-auto">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {search ? "No clients match your search" : "No clients added yet"}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {search ? "Try searching with a different name, phone, or company." : "Click 'Add New Client' to create your first client portfolio."}
                      </p>
                      {!search && (
                        <button
                          type="button"
                          onClick={() => {
                            setModalTab("manual");
                            setIsNewClientOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-900 dark:bg-emerald-600 hover:bg-neutral-800 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer mt-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add First Client</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((client) => {
                  const clientCases = getClientCases(client.id);
                  const clientDocs = getClientDocuments(client.id);
                  const cleanPhone = client.phone.replace(/[^0-9]/g, "");
                  const isExpanded = expandedClientId === client.id;

                  return (
                    <Fragment key={client.id}>
                      <tr className={`hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40 transition-colors ${isExpanded ? "bg-neutral-50/40 dark:bg-neutral-800/20" : ""}`}>
                        {/* Expandable Client Group Toggle & Portfolio */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (isExpanded) {
                                  setExpandedClientId(null);
                                } else {
                                  setExpandedClientId(client.id);
                                  setActiveClientTab("all");
                                }
                              }}
                              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
                              title={isExpanded ? "Collapse client group" : "Expand client cases and uploaded documents in grid"}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isExpanded) {
                                  setExpandedClientId(null);
                                } else {
                                  setExpandedClientId(client.id);
                                  setActiveClientTab("all");
                                }
                              }}
                              className="text-left group/client cursor-pointer focus:outline-none min-w-0 flex-1 block"
                              title={`Click to open ${client.name}'s cases & document vault grid`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover/client:text-emerald-600 dark:group-hover/client:text-emerald-400 group-hover/client:underline text-xs truncate transition-colors">
                                  {client.name}
                                </p>
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 group-hover/client:bg-emerald-50 dark:group-hover/client:bg-emerald-950/40 text-neutral-600 dark:text-neutral-300 group-hover/client:text-emerald-700 dark:group-hover/client:text-emerald-400 border border-neutral-200/80 dark:border-neutral-700 shrink-0 transition-colors">
                                  <Briefcase className="w-2.5 h-2.5 text-neutral-400 group-hover/client:text-emerald-600 dark:group-hover/client:text-emerald-400" />
                                  {clientCases.length}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                                <span className="font-mono">{client.client_ref_id || client.id}</span>
                                {client.company && (
                                  <span className="truncate hidden sm:inline text-neutral-600 dark:text-neutral-400 font-medium">• {client.company}</span>
                                )}
                              </div>
                              {/* Mobile contact info */}
                              <div className="md:hidden flex items-center gap-2 text-[10px] text-neutral-500 mt-0.5">
                                <span>{client.phone}</span>
                                {client.email && <span className="truncate max-w-[120px]">• {client.email}</span>}
                              </div>
                            </button>
                          </div>
                        </td>

                        {/* Contact & Email (Tablet & Desktop) */}
                        <td className="py-4 px-4 hidden md:table-cell text-neutral-700 dark:text-neutral-300 font-medium">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs">
                              <Phone className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" />
                              <span>{client.phone}</span>
                            </div>
                            {client.email ? (
                              <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-[200px]" title={client.email}>
                                <Mail className="w-3 h-3 text-neutral-400 dark:text-neutral-500 shrink-0" />
                                <span className="truncate">{client.email}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-neutral-400 dark:text-neutral-600 italic block">No email</span>
                            )}
                          </div>
                        </td>

                        {/* Clickable Cases Count Badge (Opens Cases in Grid) */}
                        <td className="py-4 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              if (isExpanded && activeClientTab === "cases") {
                                setExpandedClientId(null);
                              } else {
                                setExpandedClientId(client.id);
                                setActiveClientTab("cases");
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold text-[10px] border transition-colors cursor-pointer shrink-0 shadow-2xs ${
                              isExpanded && activeClientTab === "cases"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700"
                                : "bg-neutral-100 hover:bg-emerald-50 dark:bg-neutral-800 dark:hover:bg-emerald-950/40 text-neutral-700 hover:text-emerald-700 dark:text-neutral-300 dark:hover:text-emerald-400 border-neutral-200 hover:border-emerald-300 dark:border-neutral-700 dark:hover:border-emerald-600/50"
                            }`}
                            title={`Open cases grid for ${client.name}`}
                          >
                            <Briefcase className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                            <span>{clientCases.length} {clientCases.length === 1 ? "Case" : "Cases"}</span>
                          </button>
                        </td>

                        {/* Document Vault & Actions (Opens Vault in Grid) */}
                        <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5 shrink-0">
                            {/* Edit Client Details */}
                            <button
                              type="button"
                              onClick={() => setEditingClient(client)}
                              title="Edit client details"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Edit</span>
                            </button>

                            {/* Open Document Vault in Grid */}
                            <button
                              type="button"
                              onClick={() => {
                                if (isExpanded && activeClientTab === "vault") {
                                  setExpandedClientId(null);
                                } else {
                                  setExpandedClientId(client.id);
                                  setActiveClientTab("vault");
                                }
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0 ${
                                isExpanded && activeClientTab === "vault"
                                  ? "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500"
                                  : "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                              }`}
                              title={`Open document vault grid for ${client.name}`}
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-emerald-400 dark:text-white" />
                              <span>Vault ({clientDocs.length})</span>
                            </button>

                            {/* WhatsApp Link */}
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open WhatsApp chat with client"
                              className="inline-flex items-center justify-center p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold transition-colors shrink-0"
                            >
                              <MessageSquareShare className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Client Group Grid: Cases & Document Vault */}
                      {isExpanded && (
                        <tr className="bg-neutral-50/70 dark:bg-neutral-950/40 border-b border-neutral-200/80 dark:border-neutral-800">
                          <td colSpan={4} className="p-3 sm:p-5">
                            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 p-4 sm:p-5 shadow-xs space-y-4 max-w-full overflow-hidden">
                              {/* Header & Segmented Grid Switcher */}
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3.5">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center font-bold text-sm shrink-0">
                                    <Users className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">{client.name} — Client Group Grid</h3>
                                      <span className="font-mono text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200/60 dark:border-neutral-700 shrink-0">
                                        {client.client_ref_id || client.id}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                                      {client.company ? `${client.company} • ` : ""}{client.phone} {client.email ? `• ${client.email}` : ""}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-start md:self-auto flex-wrap shrink-0">
                                  {/* Grid View Selector */}
                                  <div className="inline-flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs font-semibold">
                                    <button
                                      type="button"
                                      onClick={() => setActiveClientTab("all")}
                                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                                        activeClientTab === "all"
                                          ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs"
                                          : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                                      }`}
                                    >
                                      Side-by-Side
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setActiveClientTab("cases")}
                                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                                        activeClientTab === "cases"
                                          ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs"
                                          : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                                      }`}
                                    >
                                      Cases ({clientCases.length})
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setActiveClientTab("vault")}
                                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                                        activeClientTab === "vault"
                                          ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs"
                                          : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200"
                                      }`}
                                    >
                                      Vault ({clientDocs.length})
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setNewCaseClientId(client.id);
                                      setIsNewCaseOpen(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 dark:bg-emerald-600 hover:bg-neutral-800 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>New Case</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setExpandedClientId(null)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                    title="Close client grid"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Main Grid: Cases & Document Vault */}
                              <div className={activeClientTab === "all" ? "grid grid-cols-1 lg:grid-cols-2 gap-4 items-start" : "w-full"}>
                                {/* CASES SECTION */}
                                {(activeClientTab === "all" || activeClientTab === "cases") && (
                                  <div className="space-y-3 bg-neutral-50/60 dark:bg-neutral-800/30 p-3.5 sm:p-4 rounded-xl border border-neutral-200/70 dark:border-neutral-800">
                                    <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/60 dark:border-neutral-700/60">
                                      <div className="flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                                          Client Cases ({clientCases.length})
                                        </h4>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setNewCaseClientId(client.id);
                                          setIsNewCaseOpen(true);
                                        }}
                                        className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Add Case</span>
                                      </button>
                                    </div>

                                    {clientCases.length === 0 ? (
                                      <div className="text-center py-8 space-y-2 bg-white dark:bg-neutral-800/60 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700">
                                        <Briefcase className="w-6 h-6 text-neutral-400 mx-auto" />
                                        <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">No cases found in this client group</p>
                                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">Create a case to start collecting client documents.</p>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setNewCaseClientId(client.id);
                                            setIsNewCaseOpen(true);
                                          }}
                                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-900 dark:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer mt-1"
                                        >
                                          <Plus className="w-3.5 h-3.5" />
                                          <span>Create Case</span>
                                        </button>
                                      </div>
                                    ) : (
                                      <div className={activeClientTab === "cases" ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" : "grid grid-cols-1 gap-3"}>
                                        {clientCases.map((c) => {
                                          const caseDocs = getCaseDocuments(c);
                                          const badge = getCaseStatusBadge(c.status);
                                          const totalReqs = c.requirements?.length || 0;
                                          const approvedCount = c.requirements?.filter((r) => r.status === "approved").length || 0;
                                          const underReviewCount = c.requirements?.filter((r) => r.status === "under_review" || r.status === "uploaded").length || 0;
                                          const percentage = totalReqs > 0 ? Math.round((approvedCount / totalReqs) * 100) : 0;
                                          const token = c.upload_link?.token_hash || `token-${c.id.slice(0, 8)}`;
                                          const uploadUrl = typeof window !== "undefined" ? `${window.location.origin}/upload/${token}` : "";
                                          const waText = encodeURIComponent(
                                            `Hello ${client.name}, please upload your documents for ${c.title} (${c.reference_number}) using this secure portal link:\n${uploadUrl}\n\nThank you!`
                                          );

                                          return (
                                            <div
                                              key={c.id}
                                              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 p-3.5 shadow-2xs space-y-2.5 transition-colors flex flex-col justify-between"
                                            >
                                              <div>
                                                <div className="flex items-center justify-between gap-2">
                                                  <span className="font-mono text-[10px] font-bold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200/60 dark:border-neutral-700 shrink-0">
                                                    {c.reference_number}
                                                  </span>
                                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.className}`}>
                                                    {badge.label}
                                                  </span>
                                                </div>

                                                <Link
                                                  href={`/dashboard/cases/${c.id}`}
                                                  className="text-xs font-bold text-neutral-900 dark:text-neutral-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mt-1.5 block truncate hover:underline"
                                                  title={c.title}
                                                >
                                                  {c.title}
                                                </Link>
                                                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                                                  {c.service_type} • <strong className="text-neutral-700 dark:text-neutral-300">{caseDocs.length}</strong> doc{caseDocs.length !== 1 ? "s" : ""}
                                                </p>
                                              </div>

                                              {/* Progress bar */}
                                              <div className="space-y-1 bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg border border-neutral-100 dark:border-neutral-800">
                                                <div className="flex items-center justify-between text-[10px]">
                                                  <span className="font-medium text-neutral-600 dark:text-neutral-400">
                                                    {approvedCount}/{totalReqs} approved
                                                  </span>
                                                  <span className="font-bold text-neutral-800 dark:text-neutral-200">{percentage}%</span>
                                                </div>
                                                <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden flex">
                                                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${totalReqs > 0 ? (approvedCount / totalReqs) * 100 : 0}%` }} />
                                                  <div className="bg-amber-500 h-full transition-all" style={{ width: `${totalReqs > 0 ? (underReviewCount / totalReqs) * 100 : 0}%` }} />
                                                </div>
                                              </div>

                                              {/* Case Actions */}
                                              <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                                                <div className="flex items-center gap-1">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      navigator.clipboard.writeText(uploadUrl);
                                                      setCopiedCaseId(c.id);
                                                      toast({ title: "Upload Link Copied!", description: `Direct link for ${c.title} copied.` });
                                                      setTimeout(() => setCopiedCaseId(null), 2000);
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[11px] font-medium transition-colors cursor-pointer"
                                                    title="Copy upload link"
                                                  >
                                                    {copiedCaseId === c.id ? (
                                                      <>
                                                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Copied</span>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Copy className="w-3 h-3 text-neutral-400" />
                                                        <span className="text-[10px]">Link</span>
                                                      </>
                                                    )}
                                                  </button>

                                                  <a
                                                    href={`https://wa.me/${cleanPhone}?text=${waText}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium transition-colors"
                                                    title="Share link on WhatsApp"
                                                  >
                                                    <MessageSquareShare className="w-3 h-3" />
                                                    <span className="text-[10px]">WhatsApp</span>
                                                  </a>
                                                </div>

                                                <Link
                                                  href={`/dashboard/cases/${c.id}`}
                                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-900 dark:bg-emerald-600 hover:bg-neutral-800 dark:hover:bg-emerald-500 text-white rounded-md text-[11px] font-semibold transition-colors shrink-0"
                                                >
                                                  <span>Open</span>
                                                  <ChevronRight className="w-3 h-3" />
                                                </Link>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* DOCUMENT VAULT SECTION */}
                                {(activeClientTab === "all" || activeClientTab === "vault") && (
                                  <div className="space-y-3 bg-neutral-50/60 dark:bg-neutral-800/30 p-3.5 sm:p-4 rounded-xl border border-neutral-200/70 dark:border-neutral-800">
                                    <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/60 dark:border-neutral-700/60">
                                      <div className="flex items-center gap-2">
                                        <FolderOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                                          Document Vault ({clientDocs.length} Files)
                                        </h4>
                                      </div>
                                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium">
                                        Encrypted Cloud Vault
                                      </span>
                                    </div>

                                    {clientDocs.length === 0 ? (
                                      <div className="text-center py-8 space-y-2 bg-white dark:bg-neutral-800/60 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700">
                                        <FolderOpen className="w-6 h-6 text-neutral-400 mx-auto" />
                                        <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">No documents in vault yet</p>
                                        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
                                          Files uploaded by this client will appear in this organized grid.
                                        </p>
                                      </div>
                                    ) : (
                                      <div className={activeClientTab === "vault" ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5"}>
                                        {clientDocs.map(({ doc, caseTitle, caseId, reqName }) => (
                                          <div
                                            key={doc.id}
                                            className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors flex flex-col justify-between gap-2.5"
                                          >
                                            <div className="flex items-start gap-2.5 min-w-0">
                                              <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shrink-0 mt-0.5">
                                                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate" title={doc.file_name}>
                                                  {doc.file_name}
                                                </p>
                                                <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                                                  {caseTitle} • {reqName}
                                                </p>
                                                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                                                  {formatBytes(doc.file_size)}
                                                </p>
                                              </div>
                                            </div>

                                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                                              <div>
                                                {doc.status === "approved" && (
                                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200/70 dark:border-emerald-800">
                                                    <CheckCircle className="w-2.5 h-2.5" /> Approved
                                                  </span>
                                                )}
                                                {doc.status === "under_review" && (
                                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200/70 dark:border-amber-800">
                                                    <Clock className="w-2.5 h-2.5" /> In Review
                                                  </span>
                                                )}
                                                {doc.status === "rejected" && (
                                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200/70 dark:border-rose-800">
                                                    <AlertCircle className="w-2.5 h-2.5" /> Rejected
                                                  </span>
                                                )}
                                              </div>

                                              <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={() => setPreviewDoc({ doc, reqName, caseId })}
                                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-neutral-800 hover:bg-neutral-900 dark:hover:bg-neutral-700 hover:text-white dark:hover:text-white text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                                                  title="Direct View"
                                                >
                                                  <Eye className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                                  <span>View</span>
                                                </button>

                                                <a
                                                  href={`/api/download?file=${encodeURIComponent(doc.storage_path || "")}&name=${encodeURIComponent(doc.file_name)}&id=${doc.id}`}
                                                  download={doc.file_name}
                                                  className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-lg text-[11px] font-semibold transition-colors"
                                                  title="Download File"
                                                >
                                                  <Download className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                                                </a>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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

      {/* New Client Modal */}
      <NewClientModal
        isOpen={isNewClientOpen}
        initialTab={modalTab}
        onClose={() => setIsNewClientOpen(false)}
        onSuccess={() => refresh()}
      />

      {/* Edit Client Modal */}
      {editingClient && (
        <EditClientModal
          isOpen={!!editingClient}
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSuccess={() => refresh()}
        />
      )}

      {/* New Case Modal */}
      <NewCaseModal
        clients={clients}
        isOpen={isNewCaseOpen}
        initialClientId={newCaseClientId}
        onClose={() => {
          setIsNewCaseOpen(false);
          setNewCaseClientId(undefined);
        }}
        onSuccess={() => {
          setIsNewCaseOpen(false);
          setNewCaseClientId(undefined);
          refresh();
        }}
      />
    </div>
  );
}
