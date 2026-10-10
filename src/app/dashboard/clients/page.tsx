"use client";

import { useState, useEffect } from "react";
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
  Copy,
  Check,
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
  const { clients, cases, refresh } = useDashboardData();
  const [search, setSearch] = useState("");
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"manual" | "csv">("manual");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [vaultClient, setVaultClient] = useState<Client | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ doc: Document; reqName: string; caseId?: string } | null>(null);
  const [selectedClientForCases, setSelectedClientForCases] = useState<Client | null>(null);
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [newCaseClientId, setNewCaseClientId] = useState<string | undefined>(undefined);
  const [copiedCaseId, setCopiedCaseId] = useState<string | null>(null);

  const filtered = clients.filter((c) => {
    return (
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.company && c.company.toLowerCase().includes(search.toLowerCase()))
    );
  });

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
    <div className="space-y-6 w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[48px]">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Clients & Document Storage Vault</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            View client portfolios, access structured document vaults, download files, and track client cases.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={() => {
              setModalTab("csv");
              setIsNewClientOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200/90 rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Import CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setModalTab("manual");
              setIsNewClientOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Client</span>
          </button>
        </div>
      </div>

      {/* Search Toolbar & Case Metrics */}
      <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients by name, phone, PAN, GSTIN, or firm..."
            className="w-full bg-neutral-50/80 border border-neutral-200/80 rounded-lg pl-8 pr-4 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white transition-all"
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-500 font-medium">
          <span>Showing <strong>{filtered.length}</strong> clients</span>
          <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          <span className="flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5 text-neutral-400" />
            <strong>{cases.length}</strong> Total Cases
          </span>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[17%]" />
              <col className="w-[18%]" />
              <col className="w-[16%]" />
              <col className="w-[10%]" />
              <col className="w-[15%]" />
            </colgroup>
            <thead className="bg-neutral-50/80 border-b border-neutral-100 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-6 truncate">Client Name & Ref ID</th>
                <th className="py-3.5 px-4 truncate">Contact & WhatsApp</th>
                <th className="py-3.5 px-4 truncate">Email</th>
                <th className="py-3.5 px-4 truncate">Entity / Company</th>
                <th className="py-3.5 px-4 truncate">Cases Count</th>
                <th className="py-3.5 px-6 text-right truncate">Document Vault & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((client) => {
                const clientCases = cases.filter((c) => c.client_id === client.id);
                const clientDocs = getClientDocuments(client.id);
                const cleanPhone = client.phone.replace(/[^0-9]/g, "");

                return (
                  <tr key={client.id} className="hover:bg-neutral-50/60 transition-colors">
                    {/* Clickable Client Name to view related cases */}
                    <td className="py-4 px-6 min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedClientForCases(client)}
                        className="text-left group/client cursor-pointer focus:outline-none w-full"
                        title={`Click to view all ${clientCases.length} related cases for ${client.name}`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="font-semibold text-neutral-900 group-hover/client:text-emerald-600 dark:group-hover/client:text-emerald-400 group-hover/client:underline text-xs truncate transition-colors">
                            {client.name}
                          </p>
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-neutral-100 group-hover/client:bg-emerald-50 text-neutral-600 group-hover/client:text-emerald-700 border border-neutral-200/80 group-hover/client:border-emerald-300 shrink-0 transition-colors">
                            <Briefcase className="w-2.5 h-2.5 text-neutral-400 group-hover/client:text-emerald-600" />
                            {clientCases.length}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-neutral-400 truncate block mt-0.5">
                          {client.client_ref_id || client.id}
                        </span>
                      </button>
                    </td>

                    <td className="py-4 px-4 text-neutral-700 font-medium truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{client.phone}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-neutral-600 truncate">
                      {client.email ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">No email</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-neutral-700 font-medium truncate">
                      {client.company ? (
                        <div className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <span className="truncate">{client.company}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">—</span>
                      )}
                    </td>

                    {/* Clickable Cases Count Badge */}
                    <td className="py-4 px-4">
                      <button
                        type="button"
                        onClick={() => setSelectedClientForCases(client)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 hover:bg-emerald-50 text-neutral-700 hover:text-emerald-700 font-semibold text-[10px] border border-neutral-200 hover:border-emerald-300 transition-colors cursor-pointer shrink-0 group shadow-2xs"
                        title={`View all ${clientCases.length} cases for ${client.name}`}
                      >
                        <Briefcase className="w-3 h-3 text-neutral-500 group-hover:text-emerald-600 transition-colors" />
                        <span>{clientCases.length} {clientCases.length === 1 ? "Case" : "Cases"}</span>
                      </button>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-nowrap shrink-0">
                        {/* Edit Client Details */}
                        <button
                          type="button"
                          onClick={() => setEditingClient(client)}
                          title="Edit client details"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 text-xs font-semibold transition-colors cursor-pointer shrink-0"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {/* Open Document Vault */}
                        <button
                          type="button"
                          onClick={() => setVaultClient(client)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer shrink-0"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Vault ({clientDocs.length})</span>
                        </button>

                        {/* WhatsApp Link */}
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-colors shrink-0"
                        >
                          <MessageSquareShare className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Document Storage Vault Modal */}
      {vaultClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-neutral-200/90 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">{vaultClient.name} — Document Vault</h3>
                  <p className="text-[11px] text-neutral-500">{vaultClient.company || "Individual Portfolio"} • {vaultClient.phone}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVaultClient(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content / Files List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {getClientDocuments(vaultClient.id).length === 0 ? (
                <div className="text-center py-12 space-y-2">
                  <FileText className="w-10 h-10 text-neutral-300 mx-auto" />
                  <p className="text-xs font-semibold text-neutral-700">No documents in vault yet</p>
                  <p className="text-[11px] text-neutral-400">Documents uploaded by the client in active cases will automatically appear here.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 uppercase tracking-wider px-1">
                    <span>Uploaded Files ({getClientDocuments(vaultClient.id).length})</span>
                    <span>Status & Actions</span>
                  </div>

                  {getClientDocuments(vaultClient.id).map(({ doc, caseTitle, caseId, reqName }) => {
                    const downloadUrl = `/api/download?file=${encodeURIComponent(doc.storage_path || "")}&name=${encodeURIComponent(doc.file_name)}`;

                    return (
                      <div
                        key={doc.id}
                        className="p-3.5 bg-neutral-50/80 hover:bg-neutral-50 rounded-xl border border-neutral-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-neutral-200 text-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-neutral-900 truncate">{doc.file_name}</p>
                            <p className="text-[10px] text-neutral-500 mt-0.5">
                              {reqName} • <strong className="text-neutral-700">{caseTitle}</strong> • {formatBytes(doc.file_size)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {/* Verification Badge */}
                          {doc.status === "approved" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle className="w-3 h-3" />
                              Approved
                            </span>
                          )}
                          {doc.status === "under_review" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              Under Review
                            </span>
                          )}
                          {doc.status === "rejected" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-3 h-3" />
                              Rejected
                            </span>
                          )}

                          {/* Direct Pop-Up View Button */}
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({ doc, reqName, caseId })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-neutral-900 hover:text-white text-neutral-800 border border-neutral-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer group"
                            title="Direct Pop-Up View"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
                            <span>View</span>
                          </button>

                          {/* Download Button */}
                          <a
                            href={`/api/download?file=${encodeURIComponent(doc.storage_path || "")}&name=${encodeURIComponent(doc.file_name)}&id=${doc.id}`}
                            download={doc.file_name}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-300 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-400">Client files stored in secure encrypted cloud vault</span>
              <button
                type="button"
                onClick={() => setVaultClient(null)}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Close Vault
              </button>
            </div>
          </div>
        </div>
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

      {/* Client Related Cases Modal Window */}
      {selectedClientForCases && (() => {
        const relatedCases = cases.filter((c) => c.client_id === selectedClientForCases.id);
        const relatedDocs = getClientDocuments(selectedClientForCases.id);
        const waitingCount = relatedCases.filter((c) => c.status === "waiting_for_client").length;
        const inReviewCount = relatedCases.filter((c) => c.status === "under_review").length;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-neutral-200/90 overflow-hidden flex flex-col max-h-[85vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-neutral-900">{selectedClientForCases.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200">
                        {relatedCases.length} {relatedCases.length === 1 ? "Case" : "Cases"}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      {selectedClientForCases.company || "Individual Portfolio"} • {selectedClientForCases.phone} {selectedClientForCases.email ? `• ${selectedClientForCases.email}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewCaseClientId(selectedClientForCases.id);
                      setIsNewCaseOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Case</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedClientForCases(null)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-bar: Overview Metrics */}
              <div className="px-6 py-2.5 bg-neutral-50/40 border-b border-neutral-100 grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-1.5 rounded-lg bg-white border border-neutral-100 shadow-2xs">
                  <p className="text-[10px] text-neutral-400 font-medium">Total Cases</p>
                  <p className="font-bold text-neutral-900 text-sm">{relatedCases.length}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-white border border-neutral-100 shadow-2xs">
                  <p className="text-[10px] text-amber-600 font-medium">Waiting for Client</p>
                  <p className="font-bold text-neutral-900 text-sm">{waitingCount}</p>
                </div>
                <div className="p-1.5 rounded-lg bg-white border border-neutral-100 shadow-2xs">
                  <p className="text-[10px] text-indigo-600 font-medium">Under Review</p>
                  <p className="font-bold text-neutral-900 text-sm">{inReviewCount}</p>
                </div>
              </div>

              {/* Cases List */}
              <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
                {relatedCases.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-800">No cases found for this client</p>
                      <p className="text-[11px] text-neutral-400 max-w-sm mx-auto mt-0.5">
                        Create a document collection request case with customized checklist templates to get started.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCaseClientId(selectedClientForCases.id);
                        setIsNewCaseOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create First Case for {selectedClientForCases.name}</span>
                    </button>
                  </div>
                ) : (
                  relatedCases.map((c) => {
                    const badge = getCaseStatusBadge(c.status);
                    const totalReqs = c.requirements?.length || 0;
                    const approvedCount = c.requirements?.filter((r) => r.status === "approved").length || 0;
                    const underReviewCount = c.requirements?.filter((r) => r.status === "under_review" || r.status === "uploaded").length || 0;
                    const percentage = totalReqs > 0 ? Math.round((approvedCount / totalReqs) * 100) : 0;
                    const cleanPhone = selectedClientForCases.phone.replace(/[^0-9]/g, "");
                    const token = c.upload_link?.token_hash || `token-${c.id.slice(0, 8)}`;
                    const uploadUrl = typeof window !== "undefined" ? `${window.location.origin}/upload/${token}` : "";
                    const waText = encodeURIComponent(
                      `Hello ${selectedClientForCases.name}, please upload your documents for ${c.title} (${c.reference_number}) using this secure portal link:\n${uploadUrl}\n\nThank you!`
                    );

                    return (
                      <div
                        key={c.id}
                        className="p-4 bg-white rounded-xl border border-neutral-200/80 shadow-2xs hover:shadow-xs hover:border-neutral-300 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200/60">
                                {c.reference_number}
                              </span>
                              <span className="text-[10px] font-semibold text-neutral-600 bg-neutral-50 px-2 py-0.5 rounded-full border border-neutral-100">
                                {c.service_type}
                              </span>
                            </div>
                            <Link
                              href={`/dashboard/cases/${c.id}`}
                              className="text-sm font-bold text-neutral-900 hover:text-emerald-600 transition-colors mt-1 block"
                            >
                              {c.title}
                            </Link>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-medium text-neutral-600">
                              {approvedCount} of {totalReqs} requirements approved
                            </span>
                            <span className="font-bold text-neutral-800">{percentage}%</span>
                          </div>
                          <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden flex">
                            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${totalReqs > 0 ? (approvedCount / totalReqs) * 100 : 0}%` }} />
                            <div className="bg-amber-500 h-full transition-all" style={{ width: `${totalReqs > 0 ? (underReviewCount / totalReqs) * 100 : 0}%` }} />
                          </div>
                        </div>

                        {/* Footer & Actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-neutral-100 text-xs">
                          <div className="text-[10px] text-neutral-400">
                            Created {formatDate(c.created_at)}
                            {c.due_date && <span> • Due {formatDate(c.due_date)}</span>}
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-center">
                            {/* Copy Link */}
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(uploadUrl);
                                setCopiedCaseId(c.id);
                                toast({ title: "Upload Link Copied!", description: `Direct link for ${c.title} copied.` });
                                setTimeout(() => setCopiedCaseId(null), 2000);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-medium transition-colors cursor-pointer"
                              title="Copy client upload portal link"
                            >
                              {copiedCaseId === c.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-[11px] font-semibold text-emerald-700">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-neutral-500" />
                                  <span className="text-[11px]">Copy Link</span>
                                </>
                              )}
                            </button>

                            {/* WhatsApp Share */}
                            <a
                              href={`https://wa.me/${cleanPhone}?text=${waText}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-medium transition-colors"
                              title="Share checklist link on WhatsApp"
                            >
                              <MessageSquareShare className="w-3 h-3" />
                              <span className="text-[11px]">WhatsApp</span>
                            </a>

                            {/* Open Checklist Link */}
                            <Link
                              href={`/dashboard/cases/${c.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-2xs transition-colors"
                            >
                              <span>Open Case</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const cl = selectedClientForCases;
                    setSelectedClientForCases(null);
                    setVaultClient(cl);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>View Document Vault ({relatedDocs.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedClientForCases(null)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
