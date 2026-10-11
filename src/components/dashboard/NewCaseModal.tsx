"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Client, ChecklistTemplate } from "@/types";
import { X, Plus, Trash2, Sparkles, Briefcase, BookmarkPlus, Layers } from "lucide-react";
import { createCaseAction } from "@/app/actions/portal";
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

const FALLBACK_TEMPLATES: Record<
  string,
  { name: string; description: string; is_required: boolean }[]
> = {
  "ITR Filing": [
    { name: "PAN Card", description: "Scanned photo or PDF of PAN card.", is_required: true },
    { name: "Aadhaar Card", description: "Front & back of Aadhaar card.", is_required: true },
    { name: "Form 16 (Part A & B)", description: "Salary TDS certificate issued by employer.", is_required: true },
    { name: "Bank Statements (12 Months)", description: "Bank statement for FY from 1st April to 31st March.", is_required: true },
    { name: "Capital Gains Tax Statement", description: "Annual stock and mutual fund trading statement (if applicable).", is_required: false },
    { name: "Housing Loan Interest Certificate", description: "Interest and principal repayment certificate (if applicable).", is_required: false },
  ],
  "GST Registration": [
    { name: "PAN Card of Business / Proprietor", description: "Clear copy of PAN card.", is_required: true },
    { name: "Aadhaar Card of Promoters", description: "KYC document of authorized signatory.", is_required: true },
    { name: "Electricity Bill of Premises", description: "Recent utility bill (under 2 months old).", is_required: true },
    { name: "Rent Agreement / NOC", description: "Registered rent agreement with owner NOC.", is_required: true },
    { name: "Cancelled Cheque / Bank Statement", description: "Bank proof containing IFSC and account number.", is_required: true },
  ],
  "Home Loan Dossier": [
    { name: "Applicant KYC (PAN & Aadhaar)", description: "Self-attested identity and address proof.", is_required: true },
    { name: "Last 3 Months Salary Slips", description: "Computerized payslips with company seal.", is_required: true },
    { name: "Last 6 Months Bank Statement", description: "Salary credit bank account statement.", is_required: true },
    { name: "Form 16 & 3 Years ITR-V", description: "Tax acknowledgment for past 3 financial years.", is_required: true },
    { name: "Property Title Deeds / Agreement to Sell", description: "Complete chain of title documents.", is_required: true },
  ],
};

export function NewCaseModal({
  clients,
  isOpen,
  onClose,
  onSuccess,
  initialTemplate,
  initialClientId,
}: NewCaseModalProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [clientId, setClientId] = useState<string>(initialClientId || clients[0]?.id || "");

  useEffect(() => {
    setMounted(true);
  }, []);
  const [title, setTitle] = useState<string>("ITR Filing FY 2025-26");
  const [serviceType, setServiceType] = useState<string>("ITR Filing");
  const [referenceNumber, setReferenceNumber] = useState<string>(`CASE-${Date.now().toString().slice(-4)}`);
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [requirements, setRequirements] = useState<
    { name: string; description: string; is_required: boolean }[]
  >(FALLBACK_TEMPLATES["ITR Filing"] || []);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      getChecklistTemplatesAction().then((loaded) => {
        if (loaded && loaded.length > 0) {
          setTemplates(loaded);
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialTemplate) {
      setTitle(`${initialTemplate.name} - ${new Date().getFullYear()}`);
      setServiceType(initialTemplate.service_type || "Custom Checklist");
      setRequirements(initialTemplate.requirements || []);
    }
    if (initialClientId) {
      setClientId(initialClientId);
    }
  }, [initialTemplate, initialClientId]);

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

  if (!isOpen) return null;

  const handleTemplateSelect = (template: ChecklistTemplate) => {
    setServiceType(template.service_type);
    setTitle(`${template.name} - ${new Date().getFullYear()}`);
    setRequirements(template.requirements || []);
    toast({
      title: "Template applied",
      description: `Loaded ${template.requirements.length} document items from "${template.name}".`,
      type: "info",
    });
  };

  const handleFallbackChange = (selectedType: string) => {
    setServiceType(selectedType);
    if (FALLBACK_TEMPLATES[selectedType]) {
      setRequirements(FALLBACK_TEMPLATES[selectedType]);
      setTitle(`${selectedType} - ${new Date().getFullYear()}`);
      toast({
        title: "Template loaded",
        description: `Applied ${FALLBACK_TEMPLATES[selectedType].length} requirements for ${selectedType}.`,
        type: "info",
      });
    }
  };

  const handleAddRequirement = () => {
    setRequirements([
      ...requirements,
      { name: "", description: "", is_required: true },
    ]);
  };

  const handleRemoveRequirement = (idx: number) => {
    setRequirements(requirements.filter((_, i) => i !== idx));
  };

  const handleRequirementChange = (
    idx: number,
    field: "name" | "description" | "is_required",
    val: any
  ) => {
    const updated = [...requirements];
    updated[idx] = { ...updated[idx], [field]: val };
    setRequirements(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast({ title: "Client required", description: "Please select a client for this case.", type: "error" });
      return;
    }
    if (requirements.length === 0 || requirements.some((r) => !r.name.trim())) {
      toast({ title: "Invalid checklist", description: "Please ensure all requirements have a document title.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      await createCaseAction({
        client_id: clientId,
        title,
        service_type: serviceType,
        reference_number: referenceNumber,
        due_date: dueDate,
        notes,
        requirements,
      });

      // If user opted to save this checklist as a reusable template for other clients
      if (saveAsTemplate) {
        const tName = templateName.trim() || title.trim();
        createChecklistTemplateAction({
          name: tName,
          serviceType: serviceType || "Custom Checklist",
          requirements,
        }).then((res) => {
          if (res.success) {
            toast({
              title: "Template saved!",
              description: `"${tName}" is now available in your template library for other clients.`,
            });
          }
        }).catch((err) => console.warn("Auto save template error:", err));
      }

      toast({ title: "Case created!", description: "Client collection link is active and ready." });
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to create case", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-neutral-900 rounded-xl max-w-2xl w-full shadow-2xl border border-neutral-200/90 dark:border-neutral-800 overflow-hidden my-8 transition-colors">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="flex items-center gap-2 text-neutral-900">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-900">New Collection Case</h3>
              <p className="text-[10px] text-neutral-400">1-click template checklist and client portal setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* 1-Click Checklist Template Selector */}
            <div className="bg-neutral-50 rounded-xl p-3.5 border border-neutral-200/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-neutral-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
                  Apply Checklist Template (1-Click Auto Fill):
                </span>
                <span className="text-[10px] text-neutral-400">
                  {templates.length} templates available
                </span>
              </div>

              {/* Template dropdown selector */}
              {templates.length > 0 && (
                <div className="mb-2">
                  <select
                    onChange={(e) => {
                      const selected = templates.find((t) => t.id === e.target.value);
                      if (selected) handleTemplateSelect(selected);
                    }}
                    className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900 font-medium"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      -- Choose from your template library --
                    </option>
                    {templates.filter((t) => !t.is_system).length > 0 && (
                      <optgroup label="🏢 Firm Custom Templates">
                        {templates
                          .filter((t) => !t.is_system)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              ★ {t.name} ({t.requirements.length} docs)
                            </option>
                          ))}
                      </optgroup>
                    )}
                    <optgroup label="📦 Standard Starter Templates">
                      {templates
                        .filter((t) => t.is_system)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.requirements.length} docs)
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>
              )}

              {/* Quick Pills for fastest access */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {templates.length > 0
                  ? templates.slice(0, 6).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleTemplateSelect(t)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                          serviceType === t.service_type || title.startsWith(t.name)
                            ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                            : !t.is_system
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                            : "bg-white text-neutral-700 border-neutral-200/90 hover:bg-neutral-100"
                        }`}
                      >
                        {!t.is_system && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                        <span>{t.name}</span>
                      </button>
                    ))
                  : Object.keys(FALLBACK_TEMPLATES).map((templateKey) => (
                      <button
                        key={templateKey}
                        type="button"
                        onClick={() => handleFallbackChange(templateKey)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                          serviceType === templateKey
                            ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                            : "bg-white text-neutral-700 border-neutral-200/90 hover:bg-neutral-100"
                        }`}
                      >
                        {templateKey}
                      </button>
                    ))}
              </div>
            </div>

            {/* Case Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Select Client <span className="text-rose-500">*</span>
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  required
                >
                  <option value="">-- Choose Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Service Type <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  placeholder="e.g. ITR Filing"
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Case Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. ITR Filing FY 2025-26"
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Reference # <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">Internal Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special client requirements..."
                  className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                <span className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
                  Checklist Items ({requirements.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddRequirement}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Document
                </button>
              </div>

              <div className="space-y-2">
                {requirements.map((req, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200/80 flex items-start gap-2 text-xs"
                  >
                    <span className="w-4 h-4 rounded bg-neutral-200 text-neutral-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-1.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Document Name (e.g. Form 16)"
                        value={req.name}
                        onChange={(e) => handleRequirementChange(idx, "name", e.target.value)}
                        className="text-xs bg-white border border-neutral-300 rounded p-1.5 text-neutral-800"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Help note for client"
                        value={req.description}
                        onChange={(e) => handleRequirementChange(idx, "description", e.target.value)}
                        className="text-xs bg-white border border-neutral-300 rounded p-1.5 text-neutral-800"
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mt-1.5">
                      <label className="flex items-center gap-1 text-[11px] font-medium text-neutral-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={req.is_required}
                          onChange={(e) => handleRequirementChange(idx, "is_required", e.target.checked)}
                          className="rounded text-neutral-900 focus:ring-neutral-900 w-3.5 h-3.5"
                        />
                        Req.
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveRequirement(idx)}
                        className="text-neutral-400 hover:text-rose-600 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Save as Template for other clients toggle */}
              <div className="mt-4 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-emerald-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <BookmarkPlus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Save this checklist as a reusable template for other clients</span>
                </label>

                {saveAsTemplate && (
                  <div className="pt-1 pl-6 animate-in fade-in duration-150">
                    <input
                      type="text"
                      placeholder={`Template Name (default: "${title || "Custom Checklist"}")`}
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      className="w-full text-xs bg-white border border-emerald-200 rounded-lg p-2 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                    <p className="text-[10px] text-emerald-700 mt-1">
                      This checklist will be added to your firm's template library so you can reuse it for any client in 1 click.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg shadow-xs transition-colors"
            >
              {loading ? "Creating..." : "Create Case & Active Link"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
