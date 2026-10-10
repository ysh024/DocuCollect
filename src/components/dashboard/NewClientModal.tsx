"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  UserPlus,
  FileSpreadsheet,
  Download,
  FileUp,
  AlertCircle,
  CheckCircle,
  Info,
  Trash2,
  Check,
} from "lucide-react";
import { createClientAction, importClientsFromCsvAction, ClientCsvRow } from "@/app/actions/portal";
import { useToast } from "@/components/ui/Toast";
import { useDashboardData } from "@/contexts/DashboardDataContext";

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTab?: "manual" | "csv";
}

interface ParsedClientRow {
  name: string;
  phone: string;
  email: string;
  company: string;
  clientRefId: string;
  address: string;
  notes: string;
  isValid: boolean;
  error?: string;
}

export function NewClientModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab = "manual",
}: NewClientModalProps) {
  const { toast } = useToast();
  const { subscription, clients: existingClients } = useDashboardData();

  // Tab state
  const [activeTab, setActiveTab] = useState<"manual" | "csv">(initialTab);

  // Manual Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [clientRefId, setClientRefId] = useState(`CLI-${Date.now().toString().slice(-4)}`);
  const [alternatePhone, setAlternatePhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  // CSV Import State
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedClientRow[]>([]);
  const [csvLoading, setCsvLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Limits
  const MAX_BATCH_LIMIT = 50;
  const maxAllowed = subscription?.max_clients ? Number(subscription.max_clients) : 10;
  const currentCount = existingClients.length;
  const remainingSlots = Math.max(0, maxAllowed - currentCount);

  // Sync tab when modal opens or initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      // Generate a fresh ref id
      setClientRefId(`CLI-${Date.now().toString().slice(-4)}`);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // Reset CSV state
  const resetCsv = () => {
    setCsvFileName(null);
    setParsedRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 1. Download CSV Template
  const downloadCsvTemplate = () => {
    const headers = "Full Name,Phone,Email,Company,Client ID,Address,Notes";
    const sampleRows = [
      'Ramesh Patel,+91 98765 43210,ramesh@example.com,Patel Logistics LLP,CLI-1001,"Office 402, Trade Tower, Mumbai","Prefers WhatsApp updates"',
      'Pooja Sharma,+91 98111 22334,pooja.sharma@innovate.co,Innovate Ventures,CLI-1002,"Sector 62, Noida","GST filing client"',
      'Anil Kumar,+91 91234 56789,anil.kumar@apex.in,Apex Traders,CLI-1003,"Commercial Market, Bengaluru","Quarterly audit checklist"',
    ];
    // UTF-8 BOM so Excel on Windows recognizes encoding cleanly
    const csvContent = "\uFEFF" + [headers, ...sampleRows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "docucollect_clients_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Template downloaded",
      description: "docucollect_clients_template.csv is ready. Open in Excel or Google Sheets.",
    });
  };

  // 2. Robust CSV Parser
  const parseCsvText = (text: string): string[][] => {
    const lines: string[][] = [];
    let currentRow: string[] = [];
    let currentVal = "";
    let insideQuotes = false;

    // Remove BOM if present
    const cleanText = text.replace(/^\uFEFF/, "");

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentVal += '"';
          i++; // Skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === "," && !insideQuotes) {
        currentRow.push(currentVal.trim());
        currentVal = "";
      } else if ((char === "\r" || char === "\n") && !insideQuotes) {
        if (char === "\r" && nextChar === "\n") {
          i++; // Skip CRLF
        }
        currentRow.push(currentVal.trim());
        if (currentRow.some((col) => col.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentVal = "";
      } else {
        currentVal += char;
      }
    }

    if (currentVal.length > 0 || currentRow.length > 0) {
      currentRow.push(currentVal.trim());
      if (currentRow.some((col) => col.length > 0)) {
        lines.push(currentRow);
      }
    }

    return lines;
  };

  // Match header to column key
  const matchHeader = (header: string): string | null => {
    const h = header.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (h.includes("fullname") || h === "name" || h.includes("clientname") || h.includes("contactname")) {
      return "name";
    }
    if (h.includes("phone") || h.includes("mobile") || h.includes("whatsapp") || h.includes("contact")) {
      return "phone";
    }
    if (h.includes("email") || h.includes("mail")) {
      return "email";
    }
    if (h.includes("company") || h.includes("firm") || h.includes("entity") || h.includes("business")) {
      return "company";
    }
    if (h.includes("clientid") || h.includes("refid") || h.includes("reference") || h === "id") {
      return "clientRefId";
    }
    if (h.includes("address") || h.includes("location") || h.includes("city")) {
      return "address";
    }
    if (h.includes("notes") || h.includes("note") || h.includes("remark") || h.includes("remarks")) {
      return "notes";
    }
    return null;
  };

  // Process selected file
  const handleFileProcess = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      toast({
        title: "Invalid file type",
        description: "Please upload a valid .csv file.",
        type: "error",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || !text.trim()) {
          toast({
            title: "Empty file",
            description: "The uploaded CSV file contains no content.",
            type: "error",
          });
          return;
        }

        const rawRows = parseCsvText(text);
        if (rawRows.length < 2) {
          toast({
            title: "No client records found",
            description: "CSV must contain a header row and at least one client data row.",
            type: "error",
          });
          return;
        }

        const headers = rawRows[0];
        const colMap: Record<string, number> = {};
        headers.forEach((h, idx) => {
          const matched = matchHeader(h);
          if (matched && colMap[matched] === undefined) {
            colMap[matched] = idx;
          }
        });

        if (colMap["name"] === undefined || colMap["phone"] === undefined) {
          toast({
            title: "Missing required columns",
            description: "CSV must include 'Full Name' and 'Phone' columns. Download the template to view format.",
            type: "error",
          });
          return;
        }

        const dataRows = rawRows.slice(1);
        const parsed: ParsedClientRow[] = dataRows.map((row, idx) => {
          const nameVal = (colMap["name"] !== undefined ? row[colMap["name"]] : "")?.trim() || "";
          const phoneVal = (colMap["phone"] !== undefined ? row[colMap["phone"]] : "")?.trim() || "";
          const emailVal = (colMap["email"] !== undefined ? row[colMap["email"]] : "")?.trim() || "";
          const companyVal = (colMap["company"] !== undefined ? row[colMap["company"]] : "")?.trim() || "";
          const clientRefIdVal = (colMap["clientRefId"] !== undefined ? row[colMap["clientRefId"]] : "")?.trim() || "";
          const addressVal = (colMap["address"] !== undefined ? row[colMap["address"]] : "")?.trim() || "";
          const notesVal = (colMap["notes"] !== undefined ? row[colMap["notes"]] : "")?.trim() || "";

          let isValid = true;
          let error = "";

          if (!nameVal) {
            isValid = false;
            error = "Missing Name";
          } else if (!phoneVal) {
            isValid = false;
            error = "Missing Phone";
          }

          return {
            name: nameVal,
            phone: phoneVal,
            email: emailVal,
            company: companyVal,
            clientRefId: clientRefIdVal || `CLI-${Date.now().toString().slice(-4)}-${idx + 1}`,
            address: addressVal,
            notes: notesVal,
            isValid,
            error,
          };
        });

        setCsvFileName(file.name);
        setParsedRows(parsed);
      } catch (err: any) {
        console.error("Error parsing CSV:", err);
        toast({
          title: "Failed to parse CSV",
          description: err.message || "Could not read the CSV file structure.",
          type: "error",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  // Valid rows filtered
  const validRows = parsedRows.filter((r) => r.isValid);
  const invalidRowsCount = parsedRows.length - validRows.length;

  // Batch limit & quota calculations
  const effectiveBatchLimit = Math.min(MAX_BATCH_LIMIT, remainingSlots);
  const isOverBatchLimit = validRows.length > MAX_BATCH_LIMIT;
  const isOverQuota = validRows.length > remainingSlots;
  const rowsToImport = validRows.slice(0, effectiveBatchLimit);

  // 3. Handle Manual Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast({
        title: "Required fields missing",
        description: "Name and phone are required.",
        type: "error",
      });
      return;
    }

    if (remainingSlots <= 0) {
      toast({
        title: "Client limit reached",
        description: `You have reached the maximum of ${maxAllowed} clients on your current plan. Please upgrade to add more.`,
        type: "error",
      });
      return;
    }

    setManualLoading(true);
    try {
      await createClientAction({
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
        title: "Client added!",
        description: `${name} has been added to your roster.`,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Failed to save client",
        description: err.message || "An error occurred while saving client.",
        type: "error",
      });
    } finally {
      setManualLoading(false);
    }
  };

  // 4. Handle CSV Import Submit
  const handleCsvImportSubmit = async () => {
    if (rowsToImport.length === 0) {
      toast({
        title: "No valid clients to import",
        description: "Please check your CSV file for valid records with Name and Phone.",
        type: "error",
      });
      return;
    }

    if (remainingSlots <= 0) {
      toast({
        title: "Plan quota reached",
        description: `Your plan allows up to ${maxAllowed} clients. Please upgrade your plan in Billing to import more clients.`,
        type: "error",
      });
      return;
    }

    setCsvLoading(true);
    try {
      const payload: ClientCsvRow[] = rowsToImport.map((r) => ({
        name: r.name,
        phone: r.phone,
        email: r.email || null,
        company: r.company || null,
        client_ref_id: r.clientRefId || null,
        address: r.address || null,
        notes: r.notes || null,
      }));

      const res = await importClientsFromCsvAction(payload);
      toast({
        title: "Import complete!",
        description: `Successfully imported ${res.count} client${res.count > 1 ? "s" : ""} to your roster.`,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Import failed",
        description: err.message || "An error occurred while importing clients.",
        type: "error",
      });
    } finally {
      setCsvLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 dark:bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#15181e] rounded-2xl max-w-2xl w-full shadow-2xl border border-neutral-200/90 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/60 dark:bg-neutral-900/60">
          <div className="flex items-center gap-3 text-neutral-900 dark:text-neutral-100">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 dark:bg-neutral-800 text-white flex items-center justify-center shadow-xs">
              {activeTab === "manual" ? (
                <UserPlus className="w-4 h-4" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {activeTab === "manual" ? "Add New Client" : "Bulk Import Clients via CSV"}
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {activeTab === "manual"
                  ? "Enter client details for upload links, reminders & document vault"
                  : "Upload a CSV file to add multiple clients at once"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 pb-2 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-[#15181e] flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100/80 dark:bg-neutral-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "manual"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Manual Entry</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("csv")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "csv"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Import via CSV</span>
            </button>
          </div>

          {/* Quota indicator */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-neutral-500 dark:text-neutral-400 font-medium">Plan Quota:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-md ${
                remainingSlots <= 2
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
              }`}
            >
              {currentCount} / {maxAllowed} Used ({remainingSlots} remaining)
            </span>
          </div>
        </div>

        {/* Tab 1: Manual Entry */}
        {activeTab === "manual" && (
          <form onSubmit={handleManualSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
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
                    className="w-full text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    WhatsApp / Mobile <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-400"
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
                    className="w-full text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Company / Firm Name
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Patel Logistics LLP"
                    className="w-full text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                    Client Reference ID
                  </label>
                  <input
                    type="text"
                    value={clientRefId}
                    onChange={(e) => setClientRefId(e.target.value)}
                    placeholder="e.g. CLI-2024"
                    className="w-full text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-400"
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
                    placeholder="Optional backup number"
                    className="w-full text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-400"
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
                  className="w-full text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-400"
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
                  placeholder="GSTIN, PAN numbers, communication preferences, remarks..."
                  className="w-full text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-400"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-neutral-50/60 dark:bg-neutral-900/60 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                Fields marked with <span className="text-rose-500">*</span> are mandatory
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualLoading || remainingSlots <= 0}
                  className="px-4 py-1.5 text-xs font-semibold text-white dark:text-neutral-900 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {manualLoading ? "Saving Client..." : "Save Client"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Bulk CSV Import */}
        {activeTab === "csv" && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Step 1: Template Download Banner */}
              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Follow the CSV Template</h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      Download our pre-structured template containing standard columns: <code className="text-neutral-800 dark:text-neutral-200 bg-neutral-200/60 dark:bg-neutral-800 px-1 py-0.5 rounded text-[10px]">Full Name</code>, <code className="text-neutral-800 dark:text-neutral-200 bg-neutral-200/60 dark:bg-neutral-800 px-1 py-0.5 rounded text-[10px]">Phone</code>, <code className="text-neutral-800 dark:text-neutral-200 bg-neutral-200/60 dark:bg-neutral-800 px-1 py-0.5 rounded text-[10px]">Email</code>, <code className="text-neutral-800 dark:text-neutral-200 bg-neutral-200/60 dark:bg-neutral-800 px-1 py-0.5 rounded text-[10px]">Company</code>, <code className="text-neutral-800 dark:text-neutral-200 bg-neutral-200/60 dark:bg-neutral-800 px-1 py-0.5 rounded text-[10px]">Client ID</code>, etc.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-2xs transition-colors shrink-0 cursor-pointer self-start sm:self-center"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Step 2: File Upload Box */}
              {!csvFileName ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-neutral-900 dark:border-neutral-400 bg-neutral-50 dark:bg-neutral-800/50"
                      : "border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 bg-white dark:bg-neutral-900/40"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileProcess(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 flex items-center justify-center mx-auto mb-2.5">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                    Click to browse or drag & drop your client CSV here
                  </p>
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                    Batch limit: Up to 50 contacts per upload
                  </p>
                </div>
              ) : (
                /* Selected File Header */
                <div className="p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <span>{csvFileName}</span>
                        <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                          {validRows.length} valid contact{validRows.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                        {parsedRows.length} total rows parsed
                        {invalidRowsCount > 0 && ` (${invalidRowsCount} skipped due to missing name/phone)`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={resetCsv}
                    className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-white dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Alerts & Limits Notice */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  {isOverBatchLimit && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200/80 dark:border-amber-800/60 flex items-start gap-2 text-amber-900 dark:text-amber-200 text-[11px]">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Batch Limit Reached:</strong> A maximum of 50 contacts can be imported per batch. We will import the first 50 valid contacts.
                      </span>
                    </div>
                  )}

                  {isOverQuota && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200/80 dark:border-rose-800/60 flex items-start gap-2 text-rose-900 dark:text-rose-200 text-[11px]">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Plan Limit Notice:</strong> Your subscription has {remainingSlots} client slot(s) remaining. We will import the first {Math.min(remainingSlots, MAX_BATCH_LIMIT)} contacts. Please upgrade your plan in Billing to add more.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Preview Table */}
              {parsedRows.length > 0 && (
                <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
                  <div className="bg-neutral-50 dark:bg-neutral-900 px-3.5 py-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    <span>CSV Preview ({validRows.length} Ready to Import)</span>
                    <span className="text-neutral-400 dark:text-neutral-500 font-normal text-[10px]">
                      Showing preview of parsed rows
                    </span>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800 text-xs">
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <div
                        key={idx}
                        className={`px-3.5 py-2 flex items-center justify-between gap-3 ${
                          !row.isValid ? "bg-rose-50/40 dark:bg-rose-950/20 opacity-70" : "hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-mono w-5">
                            #{idx + 1}
                          </span>
                          <div className="truncate">
                            <div className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                              {row.name || <span className="text-rose-500 italic">Empty Name</span>}
                            </div>
                            <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                              {row.phone || <span className="text-rose-500 italic">Empty Phone</span>}
                              {row.company && ` • ${row.company}`}
                              {row.email && ` • ${row.email}`}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                              <Check className="w-3 h-3" />
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/60">
                              <AlertCircle className="w-3 h-3" />
                              {row.error}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-neutral-50/60 dark:bg-neutral-900/60 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {parsedRows.length > 0 ? (
                  <span>
                    Will import <strong>{rowsToImport.length}</strong> contact{rowsToImport.length !== 1 ? "s" : ""}
                  </span>
                ) : (
                  <span>Select a CSV file to proceed</span>
                )}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCsvImportSubmit}
                  disabled={csvLoading || rowsToImport.length === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white dark:text-neutral-900 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {csvLoading ? (
                    <span>Importing Contacts...</span>
                  ) : (
                    <>
                      <FileUp className="w-3.5 h-3.5" />
                      <span>
                        Import {rowsToImport.length > 0 ? `${rowsToImport.length} Clients` : "CSV"}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
