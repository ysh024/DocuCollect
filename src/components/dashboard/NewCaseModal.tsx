"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Client, ChecklistTemplate } from "@/types";
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Briefcase,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Check,
  Calendar,
  FileText,
  Hash,
  MessageSquare,
  ShieldCheck,
  Loader2,
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

interface RequirementItem {
  name: string;
  description: string;
  is_required: boolean;
}

const DEFAULT_PRESETS: {
  id: string;
  name: string;
  serviceType: string;
  items: RequirementItem[];
}[] = [
  {
    id: "itr",
    name: "ITR Filing",
    serviceType: "ITR Filing",
    items: [
      { name: "PAN Card", description: "Scanned photo or PDF of PAN card", is_required: true },
      { name: "Aadhaar Card", description: "Front & back of Aadhaar card", is_required: true },
      { name: "Form 16 (Part A & B)", description: "Salary TDS certificate issued by employer", is_required: true },
      { name: "Bank Statement (12 Months)", description: "Bank statement for the financial year", is_required: true },
    ],
  },
  {
    id: "gst",
    name: "GST Registration",
    serviceType: "GST Registration",
    items: [
      { name: "PAN Card of Business / Proprietor", description: "Clear copy of PAN card", is_required: true },
      { name: "Aadhaar Card of Promoters", description: "KYC document of authorized signatory", is_required: true },
      { name: "Electricity Bill of Premises", description: "Recent utility bill (under 2 months old)", is_required: true },
      { name: "Rent Agreement / Ownership Proof", description: "Registered agreement or property tax receipt", is_required: true },
      { name: "Cancelled Cheque", description: "Bank proof with account number and IFSC", is_required: true },
    ],
  },
  {
    id: "loan",
    name: "Loan Dossier",
    serviceType: "Loan Application",
    items: [
      { name: "KYC (PAN & Aadhaar)", description: "Applicant identity and address proof", is_required: true },
      { name: "Last 3 Months Salary Slips", description: "Latest payslips with company seal", is_required: true },
      { name: "Last 6 Months Bank Statement", description: "Salary account bank statement", is_required: true },
      { name: "Form 16 & 2 Years ITR-V", description: "Income tax acknowledgment forms", is_required: true },
    ],
  },
  {
    id: "kyc",
    name: "KYC Verification",
    serviceType: "KYC Compliance",
    items: [
      { name: "PAN Card", description: "Government identity card", is_required: true },
      { name: "Aadhaar Card / Passport", description: "Address & identity verification", is_required: true },
      { name: "Passport Photo", description: "Recent passport size photograph", is_required: true },
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

  // Clients list state (supports dynamically created clients)
  const [clientList, setClientList] = useState<Client[]>(initialClients);
  const [clientId, setClientId] = useState<string>(initialClientId || initialClients[0]?.id || "");

  // Quick Client Creation
  const [isQuickAddClient, setIsQuickAddClient] = useState(false);
  const [quickClientName, setQuickClientName] = useState("");
  const [quickClientPhone, setQuickClientPhone] = useState("");
  const [quickClientEmail, setQuickClientEmail] = useState("");
  const [creatingClient, setCreatingClient] = useState(false);

  // Selected Preset or Template
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);

  // Core Form Fields
  const [serviceType, setServiceType] = useState<string>("ITR Filing");
  const [title, setTitle] = useState<string>("");
  const [customTitleEdited, setCustomTitleEdited] = useState(false);

  // Documents Checklist
  const [requirements, setRequirements] = useState<RequirementItem[]>([]);
  const [newDocInput, setNewDocInput] = useState("");
  const [showItemDetails, setShowItemDetails] = useState(false);

  // Secondary Options Accordion (Folded by default to eliminate visual clutter)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const [loading, setLoading] = useState<boolean>(false);

  // Sync client list from props
  useEffect(() => {
    setClientList(initialClients);
    if (!clientId && initialClients.length > 0) {
      setClientId(initialClients[0].id);
    }
  }, [initialClients]);

  useEffect(() => {
    setMounted(true);
    // Generate clean auto-reference
    setReferenceNumber(`CASE-${Date.now().toString().slice(-4)}`);
  }, []);

  // Fetch templates from DB
  useEffect(() => {
    if (isOpen) {
      getChecklistTemplatesAction()
        .then((loaded) => {
          if (loaded && loaded.length > 0) {
            setTemplates(loaded);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  // Handle Initial Template / Client
  useEffect(() => {
    if (initialTemplate) {
      setSelectedPresetId(`db_${initialTemplate.id}`);
      setServiceType(initialTemplate.service_type || "Custom Checklist");
      setTitle(`${initialTemplate.name} - ${new Date().getFullYear()}`);
      setCustomTitleEdited(true);
      const reqs: RequirementItem[] = (initialTemplate.requirements || []).map((r: any) => ({
        name: typeof r === "string" ? r : r.name || r.title || "Document",
        description: typeof r === "object" ? r.description || "" : "",
        is_required: typeof r === "object" ? r.is_required !== false : true,
      }));
      setRequirements(reqs);
    } else {
      // Clean default: Start with ITR Filing preset applied cleanly
      const defaultPreset = DEFAULT_PRESETS[0];
      setSelectedPresetId(defaultPreset.id);
      setServiceType(defaultPreset.serviceType);
      setRequirements([...defaultPreset.items]);
    }

    if (initialClientId) {
      setClientId(initialClientId);
    }
  }, [initialTemplate, initialClientId]);

  // Auto-generate title if user hasn't explicitly customized it
  const selectedClient = useMemo(
    () => clientList.find((c) => c.id === clientId),
    [clientList, clientId]
  );

  useEffect(() => {
    if (!customTitleEdited) {
      const baseType = serviceType || "Document Collection";
      if (selectedClient?.name) {
        setTitle(`${baseType} - ${selectedClient.name}`);
      } else {
        setTitle(`${baseType} ${new Date().getFullYear()}`);
      }
    }
  }, [serviceType, selectedClient, customTitleEdited]);

  // Close on Escape key
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

  if (!isOpen || !mounted) return null;

  // Apply a Built-in Preset
  const handleApplyPreset = (preset: (typeof DEFAULT_PRESETS)[0]) => {
    setSelectedPresetId(preset.id);
    setServiceType(preset.serviceType);
    setRequirements([...preset.items]);
    if (!customTitleEdited) {
      if (selectedClient?.name) {
        setTitle(`${preset.name} - ${selectedClient.name}`);
      } else {
        setTitle(`${preset.name} ${new Date().getFullYear()}`);
      }
    }
    toast({
      title: `${preset.name} applied`,
      description: `${preset.items.length} document items ready.`,
      type: "info",
    });
  };

  // Apply a Database Template
  const handleApplyDbTemplate = (template: ChecklistTemplate) => {
    setSelectedPresetId(`db_${template.id}`);
    setServiceType(template.service_type || "General");
    const reqs: RequirementItem[] = (template.requirements || []).map((r: any) => ({
      name: typeof r === "string" ? r : r.name || r.title || "Document",
      description: typeof r === "object" ? r.description || "" : "",
      is_required: typeof r === "object" ? r.is_required !== false : true,
    }));
    setRequirements(reqs);
    if (!customTitleEdited) {
      if (selectedClient?.name) {
        setTitle(`${template.name} - ${selectedClient.name}`);
      } else {
        setTitle(`${template.name} ${new Date().getFullYear()}`);
      }
    }
    toast({
      title: `Template "${template.name}" applied`,
      description: `${reqs.length} document items ready.`,
      type: "info",
    });
  };

  // Start with Blank / Custom Checklist
  const handleStartBlank = () => {
    setSelectedPresetId("blank");
    setServiceType("Document Collection");
    setRequirements([]);
    if (!customTitleEdited) {
      setTitle(selectedClient?.name ? `Documents - ${selectedClient.name}` : "Document Collection");
    }
  };

  // Quick Add Document (supports comma separated or single item)
  const handleAddDocumentFromInput = () => {
    const raw = newDocInput.trim();
    if (!raw) return;

    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    const newItems: RequirementItem[] = parts.map((name) => ({
      name,
      description: "",
      is_required: true,
    }));

    setRequirements((prev) => [...prev, ...newItems]);
    setNewDocInput("");
  };

  const handleKeyDownDocInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddDocumentFromInput();
    }
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRequirementChange = (
    index: number,
    field: "name" | "description" | "is_required",
    val: any
  ) => {
    setRequirements((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  // Quick Create Client
  const handleQuickCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickClientName.trim() || !quickClientPhone.trim()) {
      toast({ title: "Name and Phone required", type: "error" });
      return;
    }

    setCreatingClient(true);
    try {
      const res = await createClientAction({
        name: quickClientName.trim(),
        phone: quickClientPhone.trim(),
        email: quickClientEmail.trim() || undefined,
      });

      if (res?.success && res.client) {
        toast({ title: "Client added!", description: `${res.client.name} is selected.` });
        setClientList((prev) => [res.client, ...prev]);
        setClientId(res.client.id);
        setIsQuickAddClient(false);
        setQuickClientName("");
        setQuickClientPhone("");
        setQuickClientEmail("");
      } else {
        toast({ title: "Failed to add client", description: (res as any)?.error || "Error adding client", type: "error" });
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
      toast({ title: "Select Client", description: "Please choose or add a client for this case.", type: "error" });
      return;
    }

    if (requirements.length === 0) {
      toast({
        title: "Checklist is empty",
        description: "Please pick a template or add at least one document to collect.",
        type: "error",
      });
      return;
    }

    const invalidItem = requirements.find((r) => !r.name.trim());
    if (invalidItem) {
      toast({ title: "Incomplete document item", description: "Please ensure all documents have a name.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      await createCaseAction({
        client_id: clientId,
        title: title.trim() || `${serviceType} - ${selectedClient?.name || "Client"}`,
        service_type: serviceType.trim() || "Document Collection",
        reference_number: referenceNumber.trim() || `CASE-${Date.now().toString().slice(-4)}`,
        due_date: dueDate || undefined,
        notes: notes.trim() || undefined,
        requirements,
      });

      // Save template if requested
      if (saveAsTemplate) {
        const tName = templateName.trim() || title.trim();
        createChecklistTemplateAction({
          name: tName,
          serviceType: serviceType || "Custom Checklist",
          requirements,
        }).catch((err) => console.warn("Save template error:", err));
      }

      toast({
        title: "Case Created!",
        description: "Client collection link is active and ready to share.",
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Failed to create case",
        description: err.message || "An error occurred while creating the case.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-xl w-full shadow-2xl border border-neutral-200/90 dark:border-neutral-800 overflow-hidden my-6 transition-all">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between bg-neutral-50/70 dark:bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-xs">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white leading-tight">
                New Collection Case
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Choose a client, pick what to collect, and get an active link in seconds
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* STEP 1: CLIENT SELECTION */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <span>1. Select Client</span>
                  <span className="text-rose-500">*</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsQuickAddClient(!isQuickAddClient)}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>{isQuickAddClient ? "Cancel New Client" : "+ New Client"}</span>
                </button>
              </div>

              {/* Inline Quick Add Client Form */}
              {isQuickAddClient ? (
                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      required
                      placeholder="Client Full Name *"
                      value={quickClientName}
                      onChange={(e) => setQuickClientName(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Phone / WhatsApp *"
                      value={quickClientPhone}
                      onChange={(e) => setQuickClientPhone(e.target.value)}
                      className="w-full text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      placeholder="Email Address (optional)"
                      value={quickClientEmail}
                      onChange={(e) => setQuickClientEmail(e.target.value)}
                      className="flex-1 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleQuickCreateClient}
                      disabled={creatingClient || !quickClientName.trim() || !quickClientPhone.trim()}
                      className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-neutral-950 font-bold text-xs rounded-xl transition cursor-pointer shrink-0 shadow-xs"
                    >
                      {creatingClient ? "Saving..." : "Add & Select"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    required
                    className="w-full text-xs bg-neutral-50 dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 rounded-2xl px-3.5 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition cursor-pointer appearance-none font-medium"
                  >
                    {clientList.length === 0 ? (
                      <option value="">No clients found. Click &quot;+ New Client&quot; above.</option>
                    ) : (
                      clientList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.company ? `(${c.company})` : ""} — {c.phone || c.email || "No contact"}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}

              {/* Selected client quick pill info */}
              {selectedClient && !isQuickAddClient && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100/70 dark:bg-neutral-800/40 rounded-xl text-[11px] text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-800">
                  <span className="font-semibold text-neutral-900 dark:text-white truncate">
                    {selectedClient.name}
                  </span>
                  <span className="text-neutral-400">•</span>
                  <span className="truncate">{selectedClient.phone || selectedClient.email || "No phone"}</span>
                  {selectedClient.company && (
                    <>
                      <span className="text-neutral-400">•</span>
                      <span className="truncate text-neutral-500 dark:text-neutral-400">{selectedClient.company}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* STEP 2: WHAT TO COLLECT (SMART TEMPLATE SELECTION) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>2. What Documents Do You Need?</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                  {requirements.length} {requirements.length === 1 ? "document" : "documents"} selected
                </span>
              </div>

              {/* Quick Template Preset Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {DEFAULT_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                        isSelected
                          ? "bg-emerald-500 text-neutral-950 border-emerald-500 shadow-emerald-500/20"
                          : "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700/80"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      <span>{preset.name}</span>
                    </button>
                  );
                })}

                {/* Blank Option */}
                <button
                  type="button"
                  onClick={handleStartBlank}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    selectedPresetId === "blank"
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 border-neutral-900 dark:border-white shadow-xs"
                      : "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700/80"
                  }`}
                >
                  <span>Start Blank</span>
                </button>
              </div>

              {/* Optional: Dropdown for custom firm templates if any exist */}
              {templates.length > 0 && (
                <div className="pt-0.5">
                  <div className="relative">
                    <select
                      value={selectedPresetId?.startsWith("db_") ? selectedPresetId : ""}
                      onChange={(e) => {
                        const targetId = e.target.value.replace("db_", "");
                        const found = templates.find((t) => t.id === targetId);
                        if (found) handleApplyDbTemplate(found);
                      }}
                      className="w-full text-xs bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-xl px-3 py-1.5 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-emerald-500 transition cursor-pointer appearance-none"
                    >
                      <option value="">📁 Or pick from custom template library...</option>
                      {templates.map((t) => (
                        <option key={t.id} value={`db_${t.id}`}>
                          {t.is_system ? "📦" : "🏢"} {t.name} ({t.requirements?.length || 0} docs)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* DOCUMENT CHIPS CANVAS */}
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl space-y-3">
                {requirements.length === 0 ? (
                  <div className="py-4 text-center text-neutral-400 dark:text-neutral-500 text-xs">
                    No documents selected yet. Click a template above or type a document below.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {requirements.map((req, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 shadow-2xs group"
                      >
                        <span>{req.name}</span>
                        {!req.is_required && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal opacity-75">
                            (opt)
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveRequirement(idx)}
                          className="text-emerald-700 dark:text-emerald-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded transition cursor-pointer"
                          title="Remove document"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Instant Quick-Add Input (Enter to add) */}
                <div className="flex items-center gap-2 pt-1 border-t border-neutral-200/60 dark:border-neutral-700/60">
                  <input
                    type="text"
                    value={newDocInput}
                    onChange={(e) => setNewDocInput(e.target.value)}
                    onKeyDown={handleKeyDownDocInput}
                    placeholder="Type document name & press Enter (e.g. Salary Slip, Passport)..."
                    className="flex-1 text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl px-3 py-2 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddDocumentFromInput}
                    disabled={!newDocInput.trim()}
                    className="px-3.5 py-2 bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-40 text-white dark:text-neutral-900 font-bold text-xs rounded-xl transition cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Optional toggle to customize instructions / notes per document */}
                {requirements.length > 0 && (
                  <div className="pt-0.5 text-right">
                    <button
                      type="button"
                      onClick={() => setShowItemDetails(!showItemDetails)}
                      className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {showItemDetails ? (
                        <>
                          <ChevronUp className="w-3 h-3" />
                          <span>Hide document instruction notes</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          <span>Customize notes & optional requirements ({requirements.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Expandable item details list */}
                {showItemDetails && requirements.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-700/60 max-h-48 overflow-y-auto pr-1">
                    {requirements.map((req, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={req.name}
                            onChange={(e) => handleRequirementChange(idx, "name", e.target.value)}
                            placeholder="Document Name"
                            className="flex-1 font-semibold text-xs bg-transparent border-b border-neutral-200 dark:border-neutral-700 pb-0.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
                          />
                          <label className="flex items-center gap-1 text-[11px] text-neutral-600 dark:text-neutral-400 cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={req.is_required}
                              onChange={(e) => handleRequirementChange(idx, "is_required", e.target.checked)}
                              className="rounded text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5"
                            />
                            <span>Required</span>
                          </label>
                        </div>
                        <input
                          type="text"
                          value={req.description}
                          onChange={(e) => handleRequirementChange(idx, "description", e.target.value)}
                          placeholder="Client instruction (e.g. Must be signed or clear PDF)"
                          className="w-full text-[11px] bg-transparent text-neutral-600 dark:text-neutral-400 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* STEP 3: CASE TITLE PREVIEW & QUICK EDIT */}
            <div className="p-3 bg-neutral-100/60 dark:bg-neutral-800/40 rounded-2xl border border-neutral-200/60 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase font-bold block">
                    Case Title
                  </span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate block">
                    {title || "Untitled Case"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setCustomTitleEdited(true);
                  }}
                  placeholder="Rename title..."
                  className="text-xs bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl px-2.5 py-1 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500 w-44"
                />
              </div>
            </div>

            {/* STEP 4: ADDITIONAL OPTIONS (ACCORDION - FOLDED BY DEFAULT) */}
            <div className="border border-neutral-200/80 dark:border-neutral-800 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="w-full p-3 bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Optional Details (Due Date, Custom Ref #, Notes)</span>
                </span>
                {showAdvancedOptions ? (
                  <ChevronUp className="w-4 h-4 text-neutral-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                )}
              </button>

              {showAdvancedOptions && (
                <div className="p-4 bg-white dark:bg-neutral-900 space-y-3.5 border-t border-neutral-200/80 dark:border-neutral-800 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl p-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                        Custom Reference #
                      </label>
                      <input
                        type="text"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder="e.g. CASE-1029"
                        className="w-full text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl p-2 text-neutral-900 dark:text-neutral-100 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                      Internal Advisor Notes
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Special instructions or reminders..."
                      className="w-full text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl p-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Save as Reusable Template Toggle */}
                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveAsTemplate}
                        onChange={(e) => setSaveAsTemplate(e.target.checked)}
                        className="rounded border-neutral-300 dark:border-neutral-700 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                      />
                      <BookmarkPlus className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Save this checklist as a reusable template for other clients</span>
                    </label>

                    {saveAsTemplate && (
                      <div className="mt-2 pl-6 animate-in fade-in duration-150">
                        <input
                          type="text"
                          placeholder={`Template Name (default: "${title}")`}
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          className="w-full text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-xl p-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-neutral-50/70 dark:bg-neutral-900/80 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-3">
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 hidden sm:inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Generates secure upload link instantly</span>
            </span>

            <div className="flex items-center gap-2.5 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !clientId || requirements.length === 0}
                className="px-5 py-2.5 text-xs font-bold text-neutral-950 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating Case...</span>
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
