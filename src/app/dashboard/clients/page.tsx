"use client";

import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Copy,
  Check,
  Folder,
  ArrowLeft,
  Trash2,
  Lock,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Client, CaseWithDetails, Document } from "@/types";
import { formatDate, formatBytes, getCaseStatusBadge, downloadFileWithFeedback } from "@/lib/utils";
import {
  NewClientModal,
  DocumentPreviewModal,
  NewCaseModal,
} from "@/components/dashboard/Modals";
import { useToast, Pagination } from "@/components/ui";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { deleteClientAction, updateClientAction } from "@/app/actions";
import { createPortal } from "react-dom";

export default function ClientsPage() {
  const { toast } = useToast();
  const { clients, cases, subscription, loading, refresh } = useDashboardData();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"manual" | "csv">("manual");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ doc: Document; reqName: string; caseId?: string } | null>(null);
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [newCaseClientId, setNewCaseClientId] = useState<string | undefined>(undefined);
  const [copiedCaseId, setCopiedCaseId] = useState<string | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [downloadingZipCaseId, setDownloadingZipCaseId] = useState<string | null>(null);
  const [openingCaseId, setOpeningCaseId] = useState<string | null>(null);

  // Dedicated Client View State (Full-page view, eliminating nested accordion buckets)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientViewTab, setClientViewTab] = useState<"all" | "cases" | "vault">("all");

  // Client Deletion State (Paid Plan Only)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeletingClient, setIsDeletingClient] = useState(false);

  // Pagination State for main client list
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const searchParams = useSearchParams();
  const highlightId = searchParams?.get("highlight");
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    if (highlightId && mounted) {
      setActiveHighlight(highlightId);
      const targetIndex = filtered.findIndex((c) => c.id === highlightId);
      if (targetIndex >= 0) {
        const pageForClient = Math.floor(targetIndex / pageSize) + 1;
        setCurrentPage(pageForClient);
      }
      setTimeout(() => {
        const el = document.getElementById(`client-row-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 350);
      const timer = setTimeout(() => setActiveHighlight(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [highlightId, mounted, clients]);

  // Determine if current workspace has an active paid subscription
  const isPaid = !!(
    subscription?.status === "active" &&
    subscription?.plan_name !== "trial" &&
    subscription?.plan_name !== "free"
  );

  const filtered = clients.filter((c) => {
    return (
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.company && c.company.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedClients = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  // Export client data to Excel (CSV with BOM) - restricted to paid plans
  const handleExportExcel = () => {
    if (!isPaid) {
      toast({
        title: "Paid Feature Only",
        description:
          "Exporting client portfolios to Excel is exclusive to paid subscription plans (Starter, Professional, Firm). Upgrade to unlock data exports.",
        type: "error",
      });
      return;
    }

    if (clients.length === 0) {
      toast({ title: "No Clients", description: "There are no client records to export." });
      return;
    }

    const headers = [
      "Client Name",
      "Reference ID",
      "Phone",
      "Email",
      "Company / Entity",
      "Address",
      "Notes",
      "Total Cases",
      "Total Documents",
      "Created Date",
    ];

    const rows = clients.map((c) => {
      const cCases = cases.filter((cs) => cs.client_id === c.id);
      let docCount = 0;
      cCases.forEach((cs) => {
        cs.requirements?.forEach((r) => {
          docCount += r.documents?.length || 0;
        });
      });

      return [
        `"${(c.name || "").replace(/"/g, '""')}"`,
        `"${(c.client_ref_id || c.id || "").replace(/"/g, '""')}"`,
        `"${(c.phone || "").replace(/"/g, '""')}"`,
        `"${(c.email || "").replace(/"/g, '""')}"`,
        `"${(c.company || "").replace(/"/g, '""')}"`,
        `"${(c.address || "").replace(/"/g, '""')}"`,
        `"${(c.notes || "").replace(/"/g, '""')}"`,
        cCases.length,
        docCount,
        c.created_at ? new Date(c.created_at).toISOString().slice(0, 10) : "",
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `docget_clients_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Export Complete", description: `Exported ${clients.length} client portfolios to Excel format.` });
  };

  // Delete client - restricted to paid plans
  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    if (!isPaid) {
      toast({
        title: "Paid Feature Only",
        description:
          "Deleting clients is only available on paid subscription plans (Starter, Professional, Firm). Free trial accounts cannot delete client portfolios.",
        type: "error",
      });
      setClientToDelete(null);
      return;
    }

    setIsDeletingClient(true);
    try {
      const res = await deleteClientAction(clientToDelete.id);
      if (res?.success) {
        toast({ title: "Client Deleted", description: `${clientToDelete.name} and associated cases were deleted.` });
        if (selectedClientId === clientToDelete.id) {
          setSelectedClientId(null);
        }
        setClientToDelete(null);
        await refresh();
      } else {
        toast({ title: "Delete Failed", description: res?.error || "Could not delete client", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setIsDeletingClient(false);
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  // -------------------------------------------------------------
  // DEDICATED CLIENT FULL-PAGE VIEW
  // -------------------------------------------------------------
  if (selectedClient) {
    const clientCases = getClientCases(selectedClient.id);
    const clientDocs = getClientDocuments(selectedClient.id);
    const cleanPhone = selectedClient.phone.replace(/[^0-9]/g, "");
    const activeCasesCount = clientCases.filter((c) => c.status !== "completed" && c.status !== "archived").length;
    const completedCasesCount = clientCases.filter((c) => c.status === "completed").length;
    const approvedDocsCount = clientDocs.filter((d) => d.doc.status === "approved").length;

    return (
      <div className="space-y-6 w-full max-w-full pb-16 min-w-0">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedClientId(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to All Clients</span>
            </button>
            <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
              <span>Clients</span>
              <span>/</span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">{selectedClient.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => {
                setNewCaseClientId(selectedClient.id);
                setIsNewCaseOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-emerald-600 hover:bg-neutral-800 dark:hover:bg-emerald-500 rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Case</span>
            </button>

            <button
              type="button"
              onClick={() => setEditingClient(selectedClient)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl transition cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Client</span>
            </button>

            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition"
            >
              <MessageSquareShare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={() => {
                if (!isPaid) {
                  toast({
                    title: "Paid Feature Only",
                    description:
                      "Deleting clients is only available on paid subscription plans (Starter, Professional, Firm).",
                    type: "error",
                  });
                  return;
                }
                setClientToDelete(selectedClient);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                isPaid
                  ? "text-rose-600 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100/60 dark:hover:bg-rose-900/40 border-rose-200 dark:border-rose-800/80"
                  : "text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800 cursor-not-allowed"
              }`}
              title={isPaid ? "Delete client" : "Deleting clients requires an active paid plan"}
            >
              {isPaid ? <Trash2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>Delete Client</span>
            </button>
          </div>
        </div>

        {/* Client Header Profile Banner */}
        <div className="sticky top-16 z-20 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl border border-neutral-200/90 dark:border-neutral-800 p-4 sm:p-5 shadow-sm space-y-3 transition-colors">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 border-b border-neutral-100 dark:border-neutral-800 pb-3">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center font-black text-lg shrink-0">
                {selectedClient.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                    {selectedClient.name}
                  </h1>
                  <span className="font-mono text-[11px] text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-700 font-semibold">
                    {selectedClient.client_ref_id || selectedClient.id}
                  </span>
                  {selectedClient.company && (
                    <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-800/60 px-2.5 py-0.5 rounded-full border border-neutral-200/60 dark:border-neutral-700">
                      {selectedClient.company}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-neutral-400" />
                    {selectedClient.phone}
                  </span>
                  {selectedClient.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-neutral-400" />
                      {selectedClient.email}
                    </span>
                  )}
                  {selectedClient.address && (
                    <span className="truncate max-w-xs text-neutral-400">
                      • {selectedClient.address}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
              <div className="bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 rounded-xl p-2.5 sm:px-4">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Cases</span>
                <span className="text-base sm:text-lg font-black text-neutral-900 dark:text-neutral-100">{clientCases.length}</span>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 rounded-xl p-2.5 sm:px-4">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Active</span>
                <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">{activeCasesCount}</span>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 rounded-xl p-2.5 sm:px-4">
                <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Vault Files</span>
                <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">{clientDocs.length}</span>
              </div>
            </div>
          </div>

          {/* Section View Switcher */}
          <div className="flex items-center justify-between gap-4 pt-1 flex-wrap">
            <div className="inline-flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setClientViewTab("all")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  clientViewTab === "all"
                    ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs font-bold"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                Side-by-Side Overview
              </button>
              <button
                type="button"
                onClick={() => setClientViewTab("cases")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  clientViewTab === "cases"
                    ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs font-bold"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                Cases ({clientCases.length})
              </button>
              <button
                type="button"
                onClick={() => setClientViewTab("vault")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  clientViewTab === "vault"
                    ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs font-bold"
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                Vault Documents ({clientDocs.length})
              </button>
            </div>

            {selectedClient.notes && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 italic max-w-md truncate">
                Note: {selectedClient.notes}
              </p>
            )}
          </div>
        </div>

        {/* Dedicated Main Grid: Cases & Vault */}
        <div className={clientViewTab === "all" ? "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start" : "w-full"}>
          {/* SECTION A: CASES & CHECKLISTS */}
          {(clientViewTab === "all" || clientViewTab === "cases") && (
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 p-5 shadow-subtle space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      Cases & Document Checklists
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {clientCases.length} total cases for this client
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setNewCaseClientId(selectedClient.id);
                    setIsNewCaseOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-neutral-900 dark:bg-emerald-600 hover:bg-neutral-800 dark:hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Case</span>
                </button>
              </div>

              {clientCases.length === 0 ? (
                <div className="text-center py-12 space-y-2.5 bg-neutral-50/50 dark:bg-neutral-800/40 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700">
                  <Briefcase className="w-8 h-8 text-neutral-400 mx-auto" />
                  <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">No cases created yet</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                    Create a case to send an encrypted document upload link to {selectedClient.name}.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCaseClientId(selectedClient.id);
                      setIsNewCaseOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 dark:bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer mt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create First Case</span>
                  </button>
                </div>
              ) : (
                <div className={clientViewTab === "cases" ? "grid grid-cols-1 sm:grid-cols-2 gap-3.5" : "space-y-3.5"}>
                  {clientCases.map((c) => {
                    const caseDocs = getCaseDocuments(c);
                    const badge = getCaseStatusBadge(c.status);
                    const totalReqs = c.requirements?.length || 0;
                    const approvedCount = c.requirements?.filter((r) => r.status === "approved").length || 0;
                    const underReviewCount =
                      c.requirements?.filter((r) => r.status === "under_review" || r.status === "uploaded").length ||
                      0;
                    const percentage = totalReqs > 0 ? Math.round((approvedCount / totalReqs) * 100) : 0;
                    const token = c.upload_link?.token || c.upload_link?.token_hash;
                    const uploadUrl = typeof window !== "undefined" && token ? `${window.location.origin}/upload/${token}` : "";
                    const waText = encodeURIComponent(
                      uploadUrl
                        ? `Hello ${selectedClient.name}, please upload your documents for ${c.title} (${c.reference_number}) using this secure portal link:\n${uploadUrl}\n\nThank you!`
                        : `Hello ${selectedClient.name}, please upload your documents for ${c.title} (${c.reference_number}).\n\nThank you!`
                    );

                    return (
                      <div
                        key={c.id}
                        className="bg-neutral-50/70 dark:bg-neutral-800/40 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 p-4 shadow-2xs space-y-3 hover:border-neutral-300 dark:hover:border-neutral-600 transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] font-bold text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700 shrink-0">
                              {c.reference_number}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.className}`}>
                              {badge.label}
                            </span>
                          </div>

                          <Link
                            href={`/dashboard/cases/${c.id}`}
                            prefetch={false}
                            onClick={() => setOpeningCaseId(c.id)}
                            className="text-xs font-bold text-neutral-900 dark:text-neutral-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition mt-2 block truncate hover:underline"
                            title={c.title}
                          >
                            <span className="flex items-center gap-1.5 truncate">
                              <span className="truncate">{c.title}</span>
                              {openingCaseId === c.id && (
                                <Loader2 className="w-3 h-3 animate-spin text-emerald-600 shrink-0" />
                              )}
                            </span>
                          </Link>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                            {c.service_type} • <strong className="text-neutral-700 dark:text-neutral-300">{caseDocs.length}</strong> file{caseDocs.length !== 1 ? "s" : ""}
                          </p>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1 bg-white dark:bg-neutral-900/70 p-2.5 rounded-lg border border-neutral-200/60 dark:border-neutral-700/60">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-neutral-600 dark:text-neutral-400">
                              {approvedCount}/{totalReqs} requirements approved
                            </span>
                            <span className="font-bold text-neutral-900 dark:text-neutral-100">{percentage}%</span>
                          </div>
                          <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-1.5 rounded-full overflow-hidden flex">
                            <div
                              className="bg-emerald-500 h-full transition-all"
                              style={{ width: `${totalReqs > 0 ? (approvedCount / totalReqs) * 100 : 0}%` }}
                            />
                            <div
                              className="bg-amber-500 h-full transition-all"
                              style={{ width: `${totalReqs > 0 ? (underReviewCount / totalReqs) * 100 : 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(uploadUrl);
                                setCopiedCaseId(c.id);
                                toast({ title: "Link Copied!", description: `Upload link for ${c.title} copied.` });
                                setTimeout(() => setCopiedCaseId(null), 2000);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[11px] font-medium border border-neutral-200 dark:border-neutral-700 transition cursor-pointer"
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
                                  <span className="text-[10px]">Copy Link</span>
                                </>
                              )}
                            </button>

                            <a
                              href={`https://wa.me/${cleanPhone}?text=${waText}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-medium transition"
                              title="Share on WhatsApp"
                            >
                              <MessageSquareShare className="w-3 h-3" />
                              <span className="text-[10px]">WhatsApp</span>
                            </a>

                            <button
                              type="button"
                              disabled={downloadingZipCaseId === c.id}
                              onClick={() => {
                                const zipName = `${selectedClient.name.replace(/\s+/g, "_")}_${c.reference_number || c.id.slice(0, 8)}_case_documents.zip`;
                                downloadFileWithFeedback({
                                  url: `/api/cases/${c.id}/download-zip`,
                                  fileName: zipName,
                                  toast,
                                  onStart: () => setDownloadingZipCaseId(c.id),
                                  onComplete: () => setDownloadingZipCaseId(null),
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 text-[11px] font-medium transition cursor-pointer disabled:opacity-60"
                              title="Download ZIP of case documents (excluding rejected files)"
                            >
                              {downloadingZipCaseId === c.id ? (
                                <Loader2 className="w-3 h-3 animate-spin text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Download className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                              )}
                              <span className="text-[10px]">{downloadingZipCaseId === c.id ? "Zipping..." : "ZIP"}</span>
                            </button>
                          </div>

                          <Link
                            href={`/dashboard/cases/${c.id}`}
                            prefetch={false}
                            onClick={() => setOpeningCaseId(c.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-neutral-900 dark:bg-emerald-600 hover:bg-neutral-800 dark:hover:bg-emerald-500 text-white rounded-md text-[11px] font-semibold transition shrink-0 cursor-pointer"
                          >
                            {openingCaseId === c.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Opening...</span>
                              </>
                            ) : (
                              <>
                                <span>Open Case</span>
                                <ChevronRight className="w-3 h-3" />
                              </>
                            )}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION B: DOCUMENT VAULT FOR THIS CLIENT */}
          {(clientViewTab === "all" || clientViewTab === "vault") && (
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/90 dark:border-neutral-800 p-5 shadow-subtle space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      Document Storage Vault
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {clientDocs.length} uploaded files across all cases
                    </p>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-700">
                  {approvedDocsCount} Approved
                </span>
              </div>

              {clientDocs.length === 0 ? (
                <div className="text-center py-12 space-y-2 bg-neutral-50/50 dark:bg-neutral-800/40 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700">
                  <FolderOpen className="w-8 h-8 text-neutral-400 mx-auto" />
                  <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">No documents in vault yet</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
                    Files uploaded by {selectedClient.name} will appear here directly with instant preview and download.
                  </p>
                </div>
              ) : (
                <div className={clientViewTab === "vault" ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"}>
                  {clientDocs.map(({ doc, caseTitle, caseId, reqName }) => (
                    <div
                      key={doc.id}
                      onClick={() => setPreviewDoc({ doc, reqName, caseId })}
                      className="p-3.5 bg-neutral-50/70 dark:bg-neutral-800/40 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xs transition flex flex-col justify-between gap-3 cursor-pointer group"
                      title="Click anywhere on card to open document preview"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0 group-hover:border-emerald-300 dark:group-hover:border-emerald-700 transition">
                          <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition" title={doc.file_name}>
                            {doc.file_name}
                          </p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
                            <span className="font-semibold text-neutral-700 dark:text-neutral-300">{caseTitle}</span> • {reqName}
                          </p>
                          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                            {formatBytes(doc.file_size)} • Uploaded {formatDate(doc.uploaded_at)} • <span className="text-emerald-600 dark:text-emerald-400 font-medium group-hover:underline">Click to view</span>
                          </p>
                        </div>
                      </div>

                      {/* Status and Action Buttons */}
                      <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 text-xs">
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

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={downloadingDocId === doc.id}
                            onClick={() => {
                              downloadFileWithFeedback({
                                url: `/api/download?file=${encodeURIComponent(doc.storage_path || "")}&name=${encodeURIComponent(doc.file_name)}&id=${doc.id}&download=1`,
                                fileName: doc.file_name,
                                toast,
                                onStart: () => setDownloadingDocId(doc.id),
                                onComplete: () => setDownloadingDocId(null),
                              });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 rounded-lg text-[11px] font-semibold transition shadow-2xs cursor-pointer disabled:opacity-60"
                            title="Download File directly to system"
                          >
                            {downloadingDocId === doc.id ? (
                              <Loader2 className="w-3 h-3 animate-spin text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Download className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            )}
                            <span>{downloadingDocId === doc.id ? "Downloading..." : "Download"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal (Paid Only) */}
        {clientToDelete && (
          <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Delete Client Portfolio?
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Are you sure you want to delete <strong className="text-neutral-900 dark:text-neutral-100">{clientToDelete.name}</strong>? This will permanently delete all {getClientCases(clientToDelete.id).length} associated cases and uploaded documents.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClientToDelete(null)}
                  disabled={isDeletingClient}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteClient}
                  disabled={isDeletingClient}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isDeletingClient ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Confirm Delete</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Document Preview Modal */}
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

  // -------------------------------------------------------------
  // MAIN CLIENTS LIST (Clean, Fast, No Nested Accordion Buckets)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 w-full max-w-full pb-12 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[48px]">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Clients Directory</h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Click any client to open their dedicated portfolio with full cases and encrypted document vault.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
          {/* Excel Export Button (Paid Plan Only) */}
          <button
            type="button"
            onClick={handleExportExcel}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border shadow-2xs transition-colors cursor-pointer ${
              isPaid
                ? "text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 border-neutral-200/90 dark:border-neutral-800"
                : "text-neutral-500 dark:text-neutral-400 bg-neutral-100/70 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-800"
            }`}
            title={isPaid ? "Export client directory to Excel" : "Excel export is available on paid plans only"}
          >
            {isPaid ? (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>Export Excel</span>
            {!isPaid && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                Paid
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setModalTab("csv");
              setIsNewClientOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 border border-neutral-200/90 dark:border-neutral-800 rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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

      {/* Clean Flat Clients Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-subtle overflow-hidden transition-colors w-full">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs table-auto">
            <thead className="bg-neutral-50/80 dark:bg-neutral-800/70 border-b border-neutral-100 dark:border-neutral-800 text-neutral-600 dark:text-neutral-300 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Client & Entity</th>
                <th className="py-3.5 px-4 hidden md:table-cell">Contact & Email</th>
                <th className="py-3.5 px-3 text-center w-28">Cases</th>
                <th className="py-3.5 px-3 text-center w-28">Vault Files</th>
                <th className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {loading && clients.length === 0 ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                          <div className="space-y-1.5 min-w-0">
                            <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
                            <div className="h-3 w-20 bg-neutral-100 dark:bg-neutral-800/60 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 hidden md:table-cell">
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-28 bg-neutral-200 dark:bg-neutral-800 rounded" />
                          <div className="h-3 w-36 bg-neutral-100 dark:bg-neutral-800/60 rounded" />
                        </div>
                      </td>
                      <td className="py-4 px-3 text-center">
                        <div className="h-6 w-16 bg-neutral-100 dark:bg-neutral-800 rounded-full mx-auto" />
                      </td>
                      <td className="py-4 px-3 text-center">
                        <div className="h-6 w-16 bg-neutral-100 dark:bg-neutral-800 rounded-full mx-auto" />
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="h-8 w-20 bg-neutral-100 dark:bg-neutral-800 rounded-lg ml-auto" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
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
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-900 dark:bg-emerald-600 hover:bg-neutral-800 dark:hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer mt-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add First Client</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client) => {
                  const clientCases = getClientCases(client.id);
                  const clientDocs = getClientDocuments(client.id);
                  const cleanPhone = client.phone.replace(/[^0-9]/g, "");

                  return (
                    <tr
                      key={client.id}
                      id={`client-row-${client.id}`}
                      onClick={() => {
                        setSelectedClientId(client.id);
                        setClientViewTab("all");
                      }}
                      className={`transition-all duration-300 cursor-pointer group/row ${
                        activeHighlight === client.id
                          ? "bg-emerald-50/80 dark:bg-emerald-950/50 ring-2 ring-emerald-500/70 shadow-sm"
                          : "hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40"
                      }`}
                    >
                      {/* Client Entity & Name */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center font-bold text-xs shrink-0 group-hover/row:scale-105 transition-transform">
                            {client.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-neutral-900 dark:text-neutral-100 group-hover/row:text-emerald-600 dark:group-hover/row:text-emerald-400 text-xs truncate transition-colors">
                              {client.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                              <span className="font-mono">{client.client_ref_id || client.id}</span>
                              {client.company && (
                                <span className="truncate hidden sm:inline text-neutral-600 dark:text-neutral-400 font-medium">
                                  • {client.company}
                                </span>
                              )}
                            </div>
                            <div className="md:hidden flex items-center gap-2 text-[10px] text-neutral-500 mt-0.5">
                              <span>{client.phone}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact & Email */}
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

                      {/* Cases Count Badge */}
                      <td className="py-4 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClientId(client.id);
                            setClientViewTab("cases");
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold text-[10px] bg-neutral-100 dark:bg-neutral-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-neutral-700 dark:text-neutral-300 hover:text-emerald-700 dark:hover:text-emerald-400 border border-neutral-200 dark:border-neutral-700 transition cursor-pointer"
                          title="Open client cases"
                        >
                          <Briefcase className="w-3 h-3 text-neutral-500 dark:text-neutral-400" />
                          <span>{clientCases.length} {clientCases.length === 1 ? "Case" : "Cases"}</span>
                        </button>
                      </td>

                      {/* Vault Count Badge */}
                      <td className="py-4 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClientId(client.id);
                            setClientViewTab("vault");
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/80 dark:border-blue-800/80 transition cursor-pointer"
                          title="Open document vault"
                        >
                          <FolderOpen className="w-3 h-3 text-blue-500" />
                          <span>{clientDocs.length} {clientDocs.length === 1 ? "File" : "Files"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClientId(client.id);
                              setClientViewTab("all");
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-900 dark:bg-emerald-600 hover:bg-neutral-800 dark:hover:bg-emerald-500 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
                          >
                            <span>Open</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingClient(client)}
                            title="Edit client details"
                            className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open WhatsApp chat"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 transition"
                          >
                            <MessageSquareShare className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 25, 50]}
          itemLabel="clients"
        />
      </div>

      {/* New Client Modal */}
      <NewClientModal
        isOpen={isNewClientOpen}
        initialTab={modalTab}
        onClose={() => setIsNewClientOpen(false)}
        onSuccess={(created) => {
          refresh();
          if (created?.id) {
            setActiveHighlight(created.id);
          }
        }}
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

      {/* New Case Modal */}
      {isNewCaseOpen && (
        <NewCaseModal
          clients={clients}
          isOpen={isNewCaseOpen}
          initialClientId={newCaseClientId}
          onClose={() => {
            setIsNewCaseOpen(false);
            setNewCaseClientId(undefined);
          }}
          onSuccess={() => refresh()}
        />
      )}
    </div>
  );
}

function EditClientModal({
  isOpen,
  client,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  client: Client | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();

  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [clientRefId, setClientRefId] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (client) {
      setName(client.name || "");
      setPhone(client.phone || "");
      setEmail(client.email || "");
      setCompany(client.company || "");
      setClientRefId(client.client_ref_id || "");
      setAlternatePhone(client.alternate_phone || "");
      setAddress(client.address || "");
      setNotes(client.notes || "");
    }
  }, [client]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !client || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast({
        title: "Required fields missing",
        description: "Full Name and Phone number are required.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      await updateClientAction(client.id, {
        name,
        phone,
        email,
        company,
        client_ref_id: clientRefId,
        alternate_phone: alternatePhone,
        address,
        notes,
      });

      toast({
        title: "Client updated!",
        description: `${name}'s details have been saved successfully.`,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Failed to update client",
        description: err.message || "An error occurred while updating the client.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || !isOpen || typeof window === "undefined" || !window.document?.body) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full shadow-2xl border border-neutral-200/90 dark:border-neutral-800 overflow-hidden flex flex-col transition-colors">
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/60 dark:bg-neutral-800/80">
          <div className="flex items-center gap-3 text-neutral-900 dark:text-neutral-100">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 dark:bg-neutral-800 text-white flex items-center justify-center shadow-xs border border-transparent dark:border-neutral-700">
              <Pencil className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Edit Client Details</h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Update portfolio information, contact numbers & reference ID
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  WhatsApp / Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@example.com"
                  className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Company / Firm
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Patel Logistics LLP"
                  className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    Client Ref ID (CLI)
                  </label>
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">e.g. CLI-3366</span>
                </div>
                <input
                  type="text"
                  value={clientRefId}
                  onChange={(e) => setClientRefId(e.target.value)}
                  placeholder="e.g. CLI-3366"
                  className="w-full text-xs font-mono bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  placeholder="Optional secondary phone"
                  className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Office or residential address"
                className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Internal Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="PAN, GSTIN, communication preferences, remarks..."
                className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="px-6 py-3.5 bg-neutral-50/60 dark:bg-neutral-800/80 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
              Fields marked with <span className="text-rose-500">*</span> are mandatory
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                {loading ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
