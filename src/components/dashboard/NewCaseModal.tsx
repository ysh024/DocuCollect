"use client";

import { useState } from "react";
import { Client } from "@/types";
import { X, Plus, Trash2, Sparkles, Briefcase } from "lucide-react";
import { createCaseAction } from "@/app/actions/portal";
import { useToast } from "@/components/ui/Toast";

interface NewCaseModalProps {
  clients: Client[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TEMPLATES: Record<
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
  "Company Incorporation": [
    { name: "Director Identity Proof (PAN / Passport)", description: "Self-attested identity documents for all directors.", is_required: true },
    { name: "Director Address Proof (Bank Statement / Utility)", description: "Statement under 2 months old with current address.", is_required: true },
    { name: "Registered Office Proof (Electricity Bill + NOC)", description: "Latest electricity bill and owner consent NOC.", is_required: true },
    { name: "Director Passport Size Photos", description: "Clear studio photographs with white background.", is_required: true },
  ],
  "Visa & Immigration": [
    { name: "Valid Passport (All Pages)", description: "Current passport with at least 6 months remaining validity.", is_required: true },
    { name: "Last 6 Months Bank Statement with Stamp", description: "Original bank statement with branch stamp & seal.", is_required: true },
    { name: "Employment Letter & NOC", description: "Letter from employer detailing role, salary, and leave approval.", is_required: true },
    { name: "3 Years ITR Acknowledgment", description: "ITR-V acknowledgment for past three assessment years.", is_required: true },
    { name: "Travel Itinerary & Hotel Booking", description: "Flight reservation and lodging confirmation.", is_required: false },
  ],
  "Statutory Audit": [
    { name: "Trial Balance & Financial Statements", description: "Full year trial balance with grouping schedules.", is_required: true },
    { name: "Bank Confirmation & Year-end Statements", description: "Bank balance confirmation letters and closing statements.", is_required: true },
    { name: "Fixed Asset Register", description: "Depreciation schedule and additions/deletions during the year.", is_required: true },
    { name: "Statutory Dues Payment Proofs (PF/ESI/GST)", description: "Challans and proof of payment before due date.", is_required: true },
  ],
};

export function NewCaseModal({
  clients,
  isOpen,
  onClose,
  onSuccess,
}: NewCaseModalProps) {
  const { toast } = useToast();
  const [clientId, setClientId] = useState<string>(clients[0]?.id || "");
  const [title, setTitle] = useState<string>("ITR Filing FY 2025-26");
  const [serviceType, setServiceType] = useState<string>("ITR Filing");
  const [referenceNumber, setReferenceNumber] = useState<string>(`CASE-${Date.now().toString().slice(-4)}`);
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [requirements, setRequirements] = useState<
    { name: string; description: string; is_required: boolean }[]
  >(TEMPLATES["ITR Filing"] || []);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleTemplateChange = (selectedType: string) => {
    setServiceType(selectedType);
    if (TEMPLATES[selectedType]) {
      setRequirements(TEMPLATES[selectedType]);
      setTitle(`${selectedType} - ${new Date().getFullYear()}`);
      toast({ title: "Template loaded", description: `Applied ${TEMPLATES[selectedType].length} standard requirements for ${selectedType}.`, type: "info" });
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl border border-neutral-200/90 overflow-hidden my-8">
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
            {/* Quick 1-Click Template Selector */}
            <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-200/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-neutral-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
                  Quick Checklist Templates (1-Click Auto Fill):
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(TEMPLATES).map((templateKey) => (
                  <button
                    key={templateKey}
                    type="button"
                    onClick={() => handleTemplateChange(templateKey)}
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
    </div>
  );
}
