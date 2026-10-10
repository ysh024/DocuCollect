"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  Link2,
  MessageSquare,
  Clock,
  User,
  Laptop,
  RefreshCw,
} from "lucide-react";
import { getFullAuditLogsAction } from "@/app/actions/portal";
import { Pagination } from "@/components/ui/Pagination";

let globalAuditLogsCache: any[] | null = null;

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<any[]>(globalAuditLogsCache || []);
  const [loading, setLoading] = useState(!globalAuditLogsCache);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadLogs = async (force = false) => {
    if (!globalAuditLogsCache || force) {
      setLoading(true);
    }
    try {
      const data = await getFullAuditLogsAction();
      if (data) {
        globalAuditLogsCache = data;
        setLogs(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(!globalAuditLogsCache);
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesAction =
      actionFilter === "all" ||
      (actionFilter === "upload" && (log.action.includes("upload") || log.action === "uploaded_document")) ||
      (actionFilter === "review" && (log.action.includes("review") || log.action.includes("approved") || log.action.includes("rejected"))) ||
      (actionFilter === "query" && log.action === "client_query") ||
      (actionFilter === "link" && log.action.includes("link"));

    const metaStr = typeof log.metadata === "string" ? log.metadata : JSON.stringify(log.metadata || {});
    const matchesSearch =
      searchQuery === "" ||
      log.case_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.reference_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      metaStr.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesAction && matchesSearch;
  });

  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = ["Timestamp", "Action", "Actor Type", "Case", "Reference Number", "Client", "Details"];
    const rows = filteredLogs.map((log) => {
      const meta = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata || {};
      const details = meta.file_name || meta.message || meta.reason || meta.status || "";
      return [
        new Date(log.created_at).toISOString(),
        log.action,
        log.actor_type,
        `"${(log.case_title || "").replace(/"/g, '""')}"`,
        `"${(log.reference_number || "").replace(/"/g, '""')}"`,
        `"${(log.client_name || "").replace(/"/g, '""')}"`,
        `"${String(details).replace(/"/g, '""')}"`,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `docucollect_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action: string) => {
    if (action.includes("upload")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <FileText className="w-3 h-3" /> Upload
        </span>
      );
    }
    if (action.includes("approved")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle className="w-3 h-3" /> Approved
        </span>
      );
    }
    if (action.includes("rejected")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3" /> Rejected
        </span>
      );
    }
    if (action.includes("query")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <MessageSquare className="w-3 h-3" /> Message
        </span>
      );
    }
    if (action.includes("link")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Link2 className="w-3 h-3" /> Link Generated
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
        {action.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[48px]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">Audit Trail & Compliance</h1>
            <span className="text-[11px] font-semibold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full border border-neutral-200">
              Immutable Log
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Complete tamper-evident log of document uploads, CA reviews, link shares, and access events.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadLogs(true)}
            disabled={loading}
            className="p-2 border border-neutral-200 rounded-lg hover:bg-neutral-50 text-neutral-700 transition"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={exportCsv}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by client, case, reference, or details..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
          />
        </div>

        <div>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
          >
            <option value="all">All Events</option>
            <option value="upload">Document Uploads</option>
            <option value="review">Reviews (Approved / Rejected)</option>
            <option value="query">Client Messages</option>
            <option value="link">Upload Links</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Event</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Case / Client</th>
                <th className="px-5 py-3.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-neutral-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-neutral-900 border-t-transparent mb-2" />
                    <p className="text-sm">Loading audit records...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-neutral-500">
                    <ShieldCheck className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                    <p className="font-semibold text-neutral-700">No audit records found</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {logs.length === 0
                        ? "Activity will appear here as soon as documents are uploaded or reviewed."
                        : "No logs match your filter criteria."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const meta = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata || {};
                  const createdDate = new Date(log.created_at);

                  return (
                    <tr key={log.id} className="hover:bg-neutral-50/70 transition">
                      <td className="px-5 py-3.5 text-xs text-neutral-500 whitespace-nowrap">
                        <div className="font-medium text-neutral-800">
                          {createdDate.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {createdDate.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700 capitalize">
                          {log.actor_type === "client" ? (
                            <>
                              <User className="w-3.5 h-3.5 text-blue-500" /> Client
                            </>
                          ) : log.actor_type === "user" ? (
                            <>
                              <Laptop className="w-3.5 h-3.5 text-emerald-500" /> Firm Member
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" /> System
                            </>
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-medium text-neutral-900 text-xs">
                          {log.case_title || "General Workspace"}
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          {log.client_name ? `${log.client_name} • ` : ""}
                          <span className="font-mono text-neutral-400">{log.reference_number || "—"}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-xs text-neutral-600 max-w-xs truncate">
                        {meta.file_name && (
                          <span className="font-mono text-neutral-800">{meta.file_name}</span>
                        )}
                        {meta.requirement_name && (
                          <span className="text-neutral-500 block text-[11px]">Item: {meta.requirement_name}</span>
                        )}
                        {meta.message && (
                          <span className="italic text-neutral-700 block text-[11px] truncate">"{meta.message}"</span>
                        )}
                        {meta.reason && (
                          <span className="text-rose-600 block text-[11px]">Reason: {meta.reason}</span>
                        )}
                        {!meta.file_name && !meta.requirement_name && !meta.message && !meta.reason && (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalItems > 0 && (
          <div className="border-t border-neutral-200 px-4 py-3 bg-neutral-50/50">
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
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
