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
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { getDashboardData } from "@/app/actions/portal";
import { Client, CaseWithDetails, Document } from "@/types";
import { formatDate, formatBytes } from "@/lib/utils";
import { NewClientModal } from "@/components/dashboard/NewClientModal";
import { DocumentPreviewModal } from "@/components/dashboard/DocumentPreviewModal";
import { useToast } from "@/components/ui/Toast";
import { useDashboardData } from "@/contexts/DashboardDataContext";

export default function ClientsPage() {
  const { toast } = useToast();
  const { clients, cases, refresh } = useDashboardData();
  const [search, setSearch] = useState("");
  const [isNewClientOpen, setIsNewClientOpen] = useState(false);
  const [vaultClient, setVaultClient] = useState<Client | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ doc: Document; reqName: string; caseId?: string } | null>(null);

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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Clients & Document Storage Vault</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            View client portfolios, access structured document vaults, download files, and initiate WhatsApp contact.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsNewClientOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-xs transition-colors cursor-pointer self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Client</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-subtle flex items-center justify-between gap-4">
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
        <div className="text-xs text-neutral-500 font-medium">
          Showing {filtered.length} client portfolios
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 border-b border-neutral-100 text-neutral-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-6">Client Name & Ref ID</th>
                <th className="py-3.5 px-4">Contact & WhatsApp</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Entity / Company</th>
                <th className="py-3.5 px-4">Active Engagements</th>
                <th className="py-3.5 px-6 text-right">Document Vault & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.map((client) => {
                const clientCases = cases.filter((c) => c.client_id === client.id);
                const clientDocs = getClientDocuments(client.id);
                const cleanPhone = client.phone.replace(/[^0-9]/g, "");

                return (
                  <tr key={client.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-semibold text-neutral-900 text-xs">{client.name}</p>
                      <span className="font-mono text-[10px] text-neutral-400">{client.client_ref_id || client.id}</span>
                    </td>

                    <td className="py-4 px-4 text-neutral-700 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-neutral-400" />
                        <span>{client.phone}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-neutral-600">
                      {client.email ? (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="truncate max-w-[160px]">{client.email}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">No email</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-neutral-700 font-medium">
                      {client.company ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="truncate max-w-[140px]">{client.company}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">—</span>
                      )}
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-semibold text-[10px] border border-neutral-200">
                        {clientCases.length} Cases
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Open Document Vault */}
                        <button
                          type="button"
                          onClick={() => setVaultClient(client)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Vault ({clientDocs.length})</span>
                        </button>

                        {/* WhatsApp Link */}
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-colors"
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
        onClose={() => setIsNewClientOpen(false)}
        onSuccess={() => refresh()}
      />
    </div>
  );
}
