"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Client, ChecklistTemplate } from "@/types";
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Briefcase,
  BookmarkPlus,
  Lock,
  Calendar,
  FileText,
  UserPlus,
  Info,
  Loader2,
  Check,
} from "lucide-react";
import { createCaseAction, createClientAction } from "@/app/actions/portal";
import {
  getChecklistTemplatesAction,
  createChecklistTemplateAction,
} from "@/app/actions/templates";
import { useToast } from "@/components/ui/Toast";

interface NewCaseModalProps {
  clients: Client[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTemplate?: ChecklistTemplate | null;
  initialClientId?: string;
}

interface DocItem {
  name: string;
  description: string;
  is_required: boolean;
}

// Built-in smart document suggestion library for instant autocomplete
const SMART_DOCUMENT_SUGGESTIONS = [
  "PAN Card",
  "Aadhaar Card",
  "Form 16 (Part A & B)",
  "Form 26AS / AIS / TIS",
  "Bank Statement (12 Months)",
  "Bank Statement (6 Months)",
  "Salary Slips (Last 3 Months)",
  "ITR-V Acknowledgment",
  "Capital Gains Statement",
  "Housing Loan Interest Certificate",
  "GST Registration Certificate",
  "Electricity Bill of Premises",
  "Rent Agreement / Ownership Proof",
  "Cancelled Cheque",
  "Passport / Voter ID",
  "Passport Size Photograph",
  "Property Title Deed",
  "Audited Balance Sheet & P&L",
  "Partnership Deed / Incorporation Certificate",
  "Board Resolution / Authorization Letter",
];

const QUICK_PRESETS: {
  id: string;
  name: string;
  serviceType: string;
  items: DocItem[];
}[] = [
  {
    id: "itr",
    name: "ITR Filing",
    serviceType: "ITR Filing",
    items: [
      { name: "PAN Card", description: "", is_required: true },
      { name: "Aadhaar Card", description: "", is_required: true },
      { name: "Form 16 (Part A & B)", description: "", is_required: true },
      { name: "Bank Statement (12 Months)", description: "", is_required: true },
    ],
  },
  {
    id: "gst",
    name: "GST Registration",
    serviceType: "GST Registration",
    items: [
      { name: "PAN Card of Business / Proprietor", description: "", is_required: true },
      { name: "Aadhaar Card of Promoters", description: "", is_required: true },
      { name: "Electricity Bill of Premises", description: "", is_required: true },
      { name: "Rent Agreement / Ownership Proof", description: "", is_required: true },
      { name: "Cancelled Cheque", description: "", is_required: true },
    ],
  },
  {
    id: "loan",
    name: "Loan Dossier",
    serviceType: "Loan Application",
    items: [
      { name: "KYC (PAN & Aadhaar)", description: "", is_required: true },
      { name: "Last 3 Months Salary Slips", description: "", is_required: true },
      { name: "Last 6 Months Bank Statement", description: "", is_required: true },
      { name: "Form 16 & 2 Years ITR-V", description: "", is_required: true },
    ],
  },
  {
    id: "kyc",
    name: "KYC Verification",
    serviceType: "KYC Check",
    items: [
      { name: "PAN Card", description: "", is_required: true },
      { name: "Aadhaar Card / Passport", description: "", is_required: true },
      { name: "Passport Photo", description: "", is_required: true },
    ],
  },
];

export function NewCaseModal({
  clients: initialClients,
  isOpen,
  onClose,
  onSuccess,
  initialTemplate,
  initialClientId,
}: NewCaseModalProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  // Clients
  const [clientList, setClientList] = useState<Client[]>(initialClients);
  const [clientId, setClientId] = useState<string>(initialClientId || initialClients[0]?.id || "");
  const [isQuickAddClient, setIsQuickAddClient] = useState(false);
  const [quickClientName, setQuickClientName] = useState("");
  const [quickClientPhone, setQuickClientPhone] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>("itr");

  // Case Basics
  const [title, setTitle] = useState<string>("");
  const [userEditedTitle, setUserEditedTitle] = useState(false);
  const [serviceType, setServiceType] = useState<string>("ITR Filing");
  const [dueDate, setDueDate] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");

  // Documents
  const [requirements, setRequirements] = useState<DocItem[]>([]);
  const [docInputValue, setDocInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save Template
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    setReferenceNumber(`CASE-${Date.now().toString().slice(-4)}`);
  }, []);

  useEffect(() => {
    setClientList(initialClients);
    if (!clientId && initialClients.length > 0) {
      setClientId(initialClients[0].id);
    }
  }, [initialClients]);

  // Load custom templates
  useEffect(() => {
    if (isOpen) {
      getChecklistTemplatesAction()
        .then((res) => {
          if (res) setTemplates(res);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // Setup Initial State
  useEffect(() => {
    if (initialTemplate) {
      setActivePresetId(`db_${initialTemplate.id}`);
      setServiceType(initialTemplate.service_type || "General");
      setTitle(`${initialTemplate.name} - ${new Date().getFullYear()}`);
      setUserEditedTitle(true);
      const items: DocItem[] = (initialTemplate.requirements || []).map((r: any) => ({
        name: typeof r === "string" ? r : r.name || r.title || "Document",
        description: typeof r === "object" ? r.description || "" : "",
        is_required: typeof r === "object" ? r.is_required !== false : true,
      }));
      setRequirements(items);
    } else {
      // Default to ITR
      const defaultPreset = QUICK_PRESETS[0];
      setActivePresetId(defaultPreset.id);
      setServiceType(defaultPreset.serviceType);
      setRequirements([...defaultPreset.items]);
    }

    if (initialClientId) {
      setClientId(initialClientId);
    }
  }, [initialTemplate, initialClientId]);

  // Selected client object
  const selectedClient = useMemo(
    () => clientList.find((c) => c.id === clientId),
    [clientList, clientId]
  );

  // Auto-title update unless user typed custom title
  useEffect(() => {
    if (!userEditedTitle) {
      const type = serviceType || "Documents";
      if (selectedClient?.name) {
        setTitle(`${type} - ${selectedClient.name}`);
      } else {
        setTitle(`${type} ${new Date().getFullYear()}`);
      }
    }
  }, [serviceType, selectedClient, userEditedTitle]);

  // Filter suggestions as user types
  const filteredSuggestions = useMemo(() => {
    const q = docInputValue.trim().toLowerCase();
    if (!q) return [];
    const existingNames = new Set(requirements.map((r) => r.name.toLowerCase()));
    return SMART_DOCUMENT_SUGGESTIONS.filter(
      (item) => item.toLowerCase().includes(q) && !existingNames.has(item.toLowerCase())
    ).slice(0, 5);
  }, [docInputValue, requirements]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  // Add Document
  const handleAddDoc = (docName: string) => {
    const trimmed = docName.trim();
    if (!trimmed) return;
    // Split by comma if user pasted multiple
    const parts = trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    const newItems: DocItem[] = parts.map((name) => ({
      name,
      description: "",
      is_required: true,
    }));
    setRequirements((prev) => [...prev, ...newItems]);
    setDocInputValue("");
    setShowSuggestions(false);
  };

  const handleRemoveDoc = (index: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleRequired = (index: number) => {
    setRequirements((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], is_required: !updated[index].is_required };
      return updated;
    });
  };

  const handleApplyPreset = (preset: (typeof QUICK_PRESETS)[0]) => {
    setActivePresetId(preset.id);
    setServiceType(preset.serviceType);
    setRequirements([...preset.items]);
    if (!userEditedTitle) {
      setTitle(selectedClient?.name ? `${preset.name} - ${selectedClient.name}` : `${preset.name} ${new Date().getFullYear()}`);
    }
  };

  const handleApplyDbTemplate = (template: ChecklistTemplate) => {
    setActivePresetId(`db_${template.id}`);
    setServiceType(template.service_type || "General");
    const items: DocItem[] = (template.requirements || []).map((r: any) => ({
      name: typeof r === "string" ? r : r.name || r.title || "Document",
      description: typeof r === "object" ? r.description || "" : "",
      is_required: typeof r === "object" ? r.is_required !== false : true,
    }));
    setRequirements(items);
    if (!userEditedTitle) {
      setTitle(selectedClient?.name ? `${template.name} - ${selectedClient.name}` : `${template.name} ${new Date().getFullYear()}`);
    }
  };

  const handleClearDocs = () => {
    setActivePresetId(null);
    setRequirements([]);
  };

  // Quick Client Creation
  const handleQuickAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientName.trim() || !quickClientPhone.trim()) return;
    setCreatingClient(true);
    try {
      const res = await createClientAction({
        name: quickClientName.trim(),
        phone: quickClientPhone.trim(),
      });
      if (res?.success && res.client) {
        setClientList((prev) => [res.client, ...prev]);
        setClientId(res.client.id);
        setIsQuickAddClient(false);
        setQuickClientName("");
        setQuickClientPhone("");
        toast({ title: "Client Added", description: `${res.client.name} selected.` });
      } else {
        toast({ title: "Failed to add client", description: (res as any)?.error, type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setCreatingClient(false);
    }
  };

  // Submit Case
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast({ title: "Please select a client", type: "error" });
      return;
    }
    if (requirements.length === 0) {
      toast({ title: "Checklist is empty", description: "Add at least one document to collect.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      await createCaseAction({
        client_id: clientId,
        title: title.trim() || `${serviceType} - ${selectedClient?.name || "Client"}`,
        service_type: serviceType.trim() || "General",
        reference_number: referenceNumber.trim() || `CASE-${Date.now().toString().slice(-4)}`,
        due_date: dueDate || undefined,
        requirements,
      });

      if (isSaveTemplateOpen) {
        const tName = templateName.trim() || title.trim();
        createChecklistTemplateAction({
          name: tName,
          serviceType: serviceType || "General",
          requirements,
        }).catch(console.warn);
      }

      toast({ title: "Case Created!", description: "Client collection link is active and ready." });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ title: "Failed to create case", description: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Spacious, flat modal container with clean scrollbar */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-3xl w-full shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[92vh] transition-colors">
        {/* Header: Clean & uncluttered */}
        <div className="px-6 py-4 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between bg-white dark:bg-neutral-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                New Collection Case
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Locked Reference Tag */}
            <span
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800/80 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700/60"
              title="Automatic Case Reference ID (System Locked)"
            >
              <Lock className="w-3 h-3 text-neutral-400" />
              <span>{referenceNumber}</span>
            </span>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form Body - Open, Flat, No nested box labyrinths */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 space-y-5 overflow-y-auto overflow-x-hidden flex-1 scrollbar-none">
            {/* ROW 1: Client Selection & Case Title & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
              {/* Client Selection (5 cols) */}
              <div className="sm:col-span-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Client <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddClient(!isQuickAddClient)}
                    className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>{isQuickAddClient ? "Pick existing" : "+ New"}</span>
                  </button>
                </div>

                {isQuickAddClient ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Name"
                      required
                      value={quickClientName}
                      onChange={(e) => setQuickClientName(e.target.value)}
                      className="w-1/2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-2.5 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      required
                      value={quickClientPhone}
                      onChange={(e) => setQuickClientPhone(e.target.value)}
                      className="w-1/2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-2.5 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddClient}
                      disabled={creatingClient || !quickClientName.trim() || !quickClientPhone.trim()}
                      className="px-2.5 py-2 bg-emerald-500 text-neutral-950 font-bold text-xs rounded-xl hover:bg-emerald-600 transition shrink-0 cursor-pointer"
                    >
                      {creatingClient ? "..." : "Add"}
                    </button>
                  </div>
                ) : (
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                  >
                    {clientList.length === 0 ? (
                      <option value="">No clients found (+ New above)</option>
                    ) : (
                      clientList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.company ? `(${c.company})` : ""} {c.phone ? `• ${c.phone}` : ""}
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              {/* Case Title (4 cols) */}
              <div className="sm:col-span-4 space-y-1.5">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                  Case Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setUserEditedTitle(true);
                  }}
                  placeholder="e.g. ITR Filing - Client"
                  className="w-full text-xs bg-neutral-50 dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Due Date (3 cols, optional) */}
              <div className="sm:col-span-3 space-y-1.5">
                <div className="flex items-center gap-1">
                  <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Due Date
                  </label>
                  <span className="text-[10px] text-neutral-400 font-normal">(Optional)</span>
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs bg-neutral-50 dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 rounded-xl px-2.5 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* ROW 2: Quick Pick Template Bar */}
            <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Quick Pick
                  </span>
                  <div className="group relative cursor-help">
                    <Info className="w-3.5 h-3.5 text-neutral-400" />
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 hidden group-hover:block bg-neutral-900 text-white text-[10px] px-2 py-1 rounded-md shadow-md whitespace-nowrap z-20">
                      1-click preset checklist items
                    </div>
                  </div>
                </div>

                {/* Dropdown for custom templates */}
                {templates.length > 0 && (
                  <select
                    value={activePresetId?.startsWith("db_") ? activePresetId : ""}
                    onChange={(e) => {
                      const tId = e.target.value.replace("db_", "");
                      const found = templates.find((t) => t.id === tId);
                      if (found) handleApplyDbTemplate(found);
                    }}
                    className="text-xs bg-transparent border-0 text-emerald-600 dark:text-emerald-400 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="">Choose a Template ({templates.length})...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={`db_${t.id}`}>
                        {t.name} ({t.requirements?.length || 0} docs)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Fast Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                {QUICK_PRESETS.map((p) => {
                  const isActive = activePresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${
                        isActive
                          ? "bg-emerald-500 text-neutral-950 border-emerald-500 shadow-xs"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      }`}
                    >
                      {isActive && <Check className="w-3 h-3 stroke-[3]" />}
                      <span>{p.name}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={handleClearDocs}
                  className="px-2.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* ROW 3: Instant Document Add Field with Autocomplete */}
            <div className="space-y-2 pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
              <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center justify-between">
                <span>Add Documents</span>
                <span className="text-[11px] font-normal text-neutral-500 dark:text-neutral-400">
                  {requirements.length} {requirements.length === 1 ? "doc" : "docs"} in checklist
                </span>
              </label>

              {/* Autocomplete Input Container */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={docInputValue}
                    onChange={(e) => {
                      setDocInputValue(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (filteredSuggestions.length > 0 && showSuggestions) {
                          handleAddDoc(filteredSuggestions[0]);
                        } else {
                          handleAddDoc(docInputValue);
                        }
                      }
                    }}
                    placeholder="Type document name (e.g. PAN Card, Form 16) and press Enter..."
                    className="flex-1 text-xs bg-neutral-50 dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3.5 py-2.5 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddDoc(docInputValue)}
                    disabled={!docInputValue.trim()}
                    className="px-4 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs rounded-xl disabled:opacity-40 hover:bg-neutral-800 dark:hover:bg-neutral-100 transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Instant Suggestions Dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute left-0 right-16 top-full mt-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl z-30 py-1 overflow-hidden animate-in fade-in duration-100">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold px-3 py-1 block border-b border-neutral-100 dark:border-neutral-700/60">
                      Suggestions (Click or press Enter to add)
                    </span>
                    {filteredSuggestions.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddDoc(item)}
                        className="w-full text-left px-3.5 py-1.5 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center justify-between transition cursor-pointer"
                      >
                        <span className="font-medium">{item}</span>
                        <span className="text-[10px] text-neutral-400">+ Add</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ROW 4: Open Document List (Clean, visible, fast remove) */}
            <div className="space-y-2">
              {requirements.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400 dark:text-neutral-500 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                  No documents added yet. Click a Quick Pick above or type a name to add.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 scrollbar-none">
                  {requirements.map((req, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800/70 border border-neutral-200 dark:border-neutral-700/80 rounded-xl flex items-center justify-between gap-2 text-xs group hover:border-neutral-300 dark:hover:border-neutral-600 transition"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                          {req.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Required / Optional Toggle Badge */}
                        <button
                          type="button"
                          onClick={() => handleToggleRequired(idx)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md cursor-pointer transition ${
                            req.is_required
                              ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300"
                              : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400"
                          }`}
                          title="Click to toggle Required / Optional"
                        >
                          {req.is_required ? "Req" : "Optional"}
                        </button>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveDoc(idx)}
                          className="p-1 text-neutral-400 hover:text-rose-500 transition cursor-pointer"
                          title="Remove document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Save Template Option */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
              {!isSaveTemplateOpen ? (
                <button
                  type="button"
                  onClick={() => setIsSaveTemplateOpen(true)}
                  className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 inline-flex items-center gap-1 cursor-pointer transition"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Save as Template</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 w-full max-w-sm animate-in fade-in">
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder={`Template Name (default: "${title || "New Template"}")`}
                    className="flex-1 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl px-2.5 py-1.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setIsSaveTemplateOpen(false)}
                    className="text-xs text-neutral-400 hover:text-neutral-600 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer - Clear Action Buttons */}
          <div className="px-6 py-4 bg-white dark:bg-neutral-900 border-t border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-neutral-400 font-mono hidden sm:inline-block">
              {referenceNumber}
            </span>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !clientId || requirements.length === 0}
                className="px-5 py-2.5 text-xs font-bold text-neutral-950 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-xl shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Create Case & Active Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
