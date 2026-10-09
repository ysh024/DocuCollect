"use client";

import { useState, useEffect } from "react";
import {
  X,
  Plus,
  Trash2,
  FileText,
  Sparkles,
  Layers,
  AlertCircle,
  Info,
} from "lucide-react";
import { ChecklistTemplate, TemplateRequirement } from "@/types";
import {
  createChecklistTemplateAction,
  updateChecklistTemplateAction,
} from "@/app/actions/templates";
import { useToast } from "@/components/ui/Toast";

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialTemplate?: ChecklistTemplate | null;
}

const SERVICE_TYPE_OPTIONS = [
  "ITR Filing",
  "GST Registration",
  "GST Annual Return",
  "Home Loan Dossier",
  "Business Loan",
  "Company Incorporation",
  "Statutory Audit",
  "Visa & Immigration",
  "Custom Checklist",
];

export function TemplateEditorModal({
  isOpen,
  onClose,
  onSaved,
  initialTemplate,
}: TemplateEditorModalProps) {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState("Custom Checklist");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState<TemplateRequirement[]>([
    { name: "", description: "", is_required: true },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialTemplate) {
      setName(initialTemplate.name);
      setServiceType(initialTemplate.service_type || "Custom Checklist");
      setDescription(initialTemplate.description || "");
      setRequirements(
        initialTemplate.requirements.length > 0
          ? initialTemplate.requirements
          : [{ name: "", description: "", is_required: true }]
      );
    } else {
      setName("");
      setServiceType("Custom Checklist");
      setDescription("");
      setRequirements([
        { name: "Identity Proof (PAN / Passport)", description: "Clear color scan or PDF.", is_required: true },
        { name: "Address Proof", description: "Utility bill or bank statement under 2 months old.", is_required: true },
      ]);
    }
  }, [initialTemplate, isOpen]);

  if (!isOpen) return null;

  const handleAddRequirement = () => {
    setRequirements((prev) => [
      ...prev,
      { name: "", description: "", is_required: true },
    ]);
  };

  const handleRemoveRequirement = (index: number) => {
    if (requirements.length <= 1) {
      toast({ title: "At least one requirement is needed", type: "error" });
      return;
    }
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRequirementChange = (
    index: number,
    field: keyof TemplateRequirement,
    val: any
  ) => {
    setRequirements((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({ title: "Template name required", type: "error" });
      return;
    }

    const filtered = requirements.filter((r) => r.name.trim().length > 0);
    if (filtered.length === 0) {
      toast({ title: "Please add at least 1 document requirement", type: "error" });
      return;
    }

    setSaving(true);
    try {
      if (initialTemplate && !initialTemplate.is_system) {
        const res = await updateChecklistTemplateAction(initialTemplate.id, {
          name: name.trim(),
          serviceType: serviceType.trim(),
          description: description.trim(),
          requirements: filtered,
        });
        if (res.success) {
          toast({ title: "Template updated", description: "Changes saved to template library." });
          onSaved();
          onClose();
        } else {
          toast({ title: "Error", description: res.error, type: "error" });
        }
      } else {
        const res = await createChecklistTemplateAction({
          name: name.trim(),
          serviceType: serviceType.trim(),
          description: description.trim(),
          requirements: filtered,
        });
        if (res.success) {
          toast({
            title: "Template created",
            description: `"${name}" is now ready to use with any client!`,
          });
          onSaved();
          onClose();
        } else {
          toast({ title: "Error", description: res.error, type: "error" });
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-neutral-200 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900">
                {initialTemplate ? "Edit Checklist Template" : "Create New Checklist Template"}
              </h2>
              <p className="text-[11px] text-neutral-500">
                Create a reusable document checklist to apply to multiple clients in 1 click.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Template Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Template Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Standard GST Refund Dossier"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2.5 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Category / Service Type
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2.5 text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                {SERVICE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Description / Advisor Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Standard checklist for regular monthly export refund filings under LUT"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2.5 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          </div>

          {/* Document Requirements Builder */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-neutral-900">
                  Document Requirements ({requirements.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddRequirement}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Document Item</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {requirements.map((req, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-neutral-50/80 rounded-xl border border-neutral-200/80 space-y-2 transition-all hover:border-neutral-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold text-neutral-500 bg-neutral-200/60 px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={req.is_required}
                        onChange={(e) =>
                          handleRequirementChange(idx, "is_required", e.target.checked)
                        }
                        className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 w-3.5 h-3.5"
                      />
                      <span>Mandatory</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveRequirement(idx)}
                      disabled={requirements.length <= 1}
                      className="text-neutral-400 hover:text-rose-600 p-1 rounded transition-colors disabled:opacity-30"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Document Name (e.g. Form 16, Bank Statement)"
                      value={req.name}
                      onChange={(e) =>
                        handleRequirementChange(idx, "name", e.target.value)
                      }
                      className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />

                    <input
                      type="text"
                      placeholder="Instructions for client (e.g. Signed copy, 12 months)"
                      value={req.description}
                      onChange={(e) =>
                        handleRequirementChange(idx, "description", e.target.value)
                      }
                      className="w-full text-xs bg-white border border-neutral-300 rounded-lg p-2 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
            <p className="text-[10px] text-neutral-400">
              Changes apply to new cases created using this template.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{saving ? "Saving..." : initialTemplate ? "Save Changes" : "Create Template"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
