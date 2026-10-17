"use client";

import { useState, useEffect, useRef } from "react";
import {
  Layers,
  Plus,
  Search,
  Sparkles,
  FileText,
  Trash2,
  Edit2,
  Copy,
  Users,
  Shield,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Briefcase,
  Filter,
  CheckCircle,
  Share2,
  X,
  AlertCircle,
  Info,
} from "lucide-react";
import { ChecklistTemplate, TemplateRequirement } from "@/types";
import {
  getChecklistTemplatesAction,
  deleteChecklistTemplateAction,
  duplicateChecklistTemplateAction,
  getCustomTemplateQuotaAction,
  createChecklistTemplateAction,
  updateChecklistTemplateAction,
} from "@/app/actions";
import { NewCaseModal } from "@/components/dashboard/Modals";
import { useToast, InfoPopover } from "@/components/ui";
import { useDashboardData } from "@/contexts/DashboardDataContext";

let globalTemplatesCache: ChecklistTemplate[] | null = null;

export default function ChecklistTemplatesPage() {
  const { toast } = useToast();
  const { clients } = useDashboardData();

  const [templates, setTemplates] = useState<ChecklistTemplate[]>(globalTemplatesCache || []);
  const [loading, setLoading] = useState(!globalTemplatesCache);
  const [customQuota, setCustomQuota] = useState<{ currentCount: number; maxLimit: number }>({
    currentCount: 0,
    maxLimit: 5,
  });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "custom" | "system">("all");

  // Modal States
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);

  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [selectedTemplateForCase, setSelectedTemplateForCase] = useState<ChecklistTemplate | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = async (silent = false) => {
    if (!silent && !globalTemplatesCache) setLoading(true);
    try {
      const tpls = await getChecklistTemplatesAction();
      globalTemplatesCache = tpls;
      setTemplates(tpls);

      const quota = await getCustomTemplateQuotaAction();
      if (quota) setCustomQuota(quota);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!globalTemplatesCache) {
      loadData(false);
    }
  }, []);

  const handleDeleteTemplate = async (template: ChecklistTemplate) => {
    if (!confirm(`Are you sure you want to delete template "${template.name}"?`)) return;
    try {
      const res = await deleteChecklistTemplateAction(template.id);
      if (res.success) {
        toast({ title: "Template deleted", description: `"${template.name}" removed.` });
        loadData();
      } else {
        toast({ title: "Error", description: res.error, type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    }
  };

  const handleDuplicateTemplate = async (template: ChecklistTemplate) => {
    try {
      const res = await duplicateChecklistTemplateAction(template.id);
      if (res.success) {
        toast({
          title: "Template copied to firm library",
          description: `You can now customize it for your clients.`,
        });
        loadData();
      } else {
        toast({ title: "Error", description: res.error, type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    }
  };

  const handleCopyChecklistText = (template: ChecklistTemplate) => {
    const lines = [
      `📋 Required Checklist: ${template.name}`,
      template.description ? `Note: ${template.description}\n` : "",
      ...template.requirements.map(
        (r, i) =>
          `${i + 1}. ${r.name}${r.is_required ? " [Mandatory]" : " [Optional]"}${
            r.description ? ` - ${r.description}` : ""
          }`
      ),
    ]
      .filter(Boolean)
      .join("\n");

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(lines);
      toast({
        title: "Checklist copied to clipboard",
        description: `Ready to paste on WhatsApp or Email for "${template.name}".`,
      });
    }
  };

  const handleUseTemplate = (template: ChecklistTemplate) => {
    setSelectedTemplateForCase(template);
    setIsNewCaseOpen(true);
  };

  const handleCreateNew = () => {
    if (customQuota.currentCount >= customQuota.maxLimit) {
      toast({
        title: "Custom Template Limit Reached",
        description: `You have used ${customQuota.currentCount} of ${customQuota.maxLimit} custom templates allowed on your plan. Upgrade your plan or delete unused templates.`,
        type: "error",
      });
      return;
    }
    setEditingTemplate(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (template: ChecklistTemplate) => {
    setEditingTemplate(template);
    setIsEditorOpen(true);
  };

  // Filter logic
  const filtered = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.service_type.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
      t.requirements.some((r) => r.name.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      categoryFilter === "all" || t.service_type === categoryFilter;

    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "custom" && !t.is_system) ||
      (typeFilter === "system" && t.is_system);

    return matchesSearch && matchesCategory && matchesType;
  });

  const categories = Array.from(new Set(templates.map((t) => t.service_type))).filter(Boolean);
  const customCount = templates.filter((t) => !t.is_system).length;
  const systemCount = templates.filter((t) => t.is_system).length;

  return (
    <div className="space-y-6 w-full pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[48px]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">Checklist Templates</h1>
            <span className="text-[11px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700">
              {templates.length} Total
            </span>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                customQuota.currentCount >= customQuota.maxLimit
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              }`}
              title={`${customQuota.currentCount} of ${customQuota.maxLimit} custom templates used on your plan`}
            >
              {customQuota.currentCount}/{customQuota.maxLimit} Custom Used
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Standardized document checklists you can reuse for multiple clients in 1 click.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 rounded-xl shadow-xs transition-colors cursor-pointer self-start"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Template</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar - Clean & Compact without overflowing buttons */}
      <div className="p-3.5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by template name or document item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white transition"
            />
          </div>

          {/* Clean Category Select Dropdown (Replaces sprawling multi-line buttons) */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
            <div className="relative w-full sm:w-48">
              <Filter className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full text-xs pl-8 pr-7 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white cursor-pointer appearance-none transition"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Type Filter Tabs */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`flex-1 sm:flex-none px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                typeFilter === "all"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs font-semibold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              All ({templates.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("custom")}
              className={`flex-1 sm:flex-none px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                typeFilter === "custom"
                  ? "bg-white dark:bg-neutral-700 text-emerald-800 dark:text-emerald-300 shadow-2xs font-semibold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Firm ({customCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("system")}
              className={`flex-1 sm:flex-none px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                typeFilter === "system"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-2xs font-semibold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              Standard ({systemCount})
            </button>
          </div>
        </div>

        {/* Category Quick Pills */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                categoryFilter === "all"
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 dark:border-white shadow-2xs"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              All Categories ({templates.length})
            </button>
            {categories.map((cat) => {
              const count = templates.filter((t) => t.service_type === cat).length;
              const isSelected = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer border flex items-center gap-1 ${
                    isSelected
                      ? "bg-emerald-500 text-neutral-950 border-emerald-500 shadow-2xs font-bold"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  }`}
                >
                  <span>{cat}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-3 animate-pulse">
              <div className="w-1/2 h-4 bg-neutral-200 dark:bg-neutral-700 rounded" />
              <div className="w-3/4 h-3 bg-neutral-100 dark:bg-neutral-800 rounded" />
              <div className="w-full h-12 bg-neutral-50 dark:bg-neutral-800/50 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">No templates found</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
            {search
              ? "No checklist template matches your search query. Try clearing the filter."
              : "You haven't created any custom templates yet. Create your first template to reuse for clients!"}
          </p>
          <button
            type="button"
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 rounded-xl transition-colors mt-2 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Custom Template</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tpl) => {
            const isExpanded = expandedId === tpl.id;
            const requiredCount = tpl.requirements.filter((r) => r.is_required).length;
            const optionalCount = tpl.requirements.length - requiredCount;

            const categoryBadgeColor =
              tpl.service_type === "Taxation & Returns"
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/80"
                : tpl.service_type === "GST Compliance"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80"
                : tpl.service_type === "Banking & Loans"
                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/80"
                : tpl.service_type === "Corporate & Legal"
                ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/80"
                : tpl.service_type === "Visa & Immigration"
                ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/80"
                : tpl.service_type === "Audits & Compliance"
                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/80"
                : "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700";

            return (
              <div
                key={tpl.id}
                className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${categoryBadgeColor}`}>
                      <span>{tpl.service_type || "General"}</span>
                    </span>

                    {/* Icon Badges with Tooltips */}
                    {!tpl.is_system ? (
                      <span
                        title="Firm Custom Template"
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span
                        title="Standard Verified Template"
                        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 shadow-2xs"
                      >
                        <Shield className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white leading-snug">
                      {tpl.name}
                    </h3>
                    {tpl.description && (
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                        {tpl.description}
                      </p>
                    )}
                  </div>

                  {/* Document Count Info Bar */}
                  <div className="flex items-center justify-between text-[11px] text-neutral-600 dark:text-neutral-300 bg-neutral-50/80 dark:bg-neutral-800/50 p-2 rounded-xl border border-neutral-200/60 dark:border-neutral-750">
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-neutral-500" />
                      {tpl.requirements.length} Items
                    </span>
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      {requiredCount} required · {optionalCount} optional
                    </span>
                  </div>

                  {/* Requirements List (Collapsible) */}
                  <div className="space-y-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                      className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center justify-between w-full py-1 cursor-pointer transition-colors"
                    >
                      <span>{isExpanded ? "Hide checklist items" : "Preview checklist items"}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="space-y-1.5 pt-1.5 border-t border-neutral-100 dark:border-neutral-800 max-h-48 overflow-y-auto">
                        {tpl.requirements.map((req, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-[11px] p-1.5 rounded-lg bg-neutral-50/60 dark:bg-neutral-800/40"
                          >
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-neutral-800 dark:text-neutral-200 truncate">{req.name}</p>
                              {req.description && (
                                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">
                                  {req.description}
                                </p>
                              )}
                            </div>
                            {req.is_required && (
                              <span
                                title="Mandatory Requirement"
                                className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom Controls */}
                <div className="p-3 bg-neutral-50/60 dark:bg-neutral-850 dark:bg-neutral-800/40 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopyChecklistText(tpl)}
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                      title="Copy checklist as text for WhatsApp / Email"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateTemplate(tpl)}
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                      title="Clone template to firm library"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(tpl)}
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                      title="Edit template"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!tpl.is_system && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(tpl)}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Delete template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUseTemplate(tpl)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Briefcase className="w-3 h-3 text-emerald-400 dark:text-emerald-600" />
                    <span>Use for Client</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Template Editor Modal */}
      <TemplateEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSaved={loadData}
        initialTemplate={editingTemplate}
      />

      {/* New Case Modal pre-populated with template */}
      <NewCaseModal
        clients={clients}
        isOpen={isNewCaseOpen}
        onClose={() => {
          setIsNewCaseOpen(false);
          setSelectedTemplateForCase(null);
        }}
        onSuccess={() => {
          toast({
            title: "Case Created!",
            description: "Client portal link generated using template.",
          });
        }}
        initialTemplate={selectedTemplateForCase}
      />
    </div>
  );
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

function TemplateEditorModal({
  isOpen,
  onClose,
  onSaved,
  initialTemplate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialTemplate?: ChecklistTemplate | null;
}) {
  const { toast } = useToast();
  const requirementsEndRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState("Custom Checklist");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState<TemplateRequirement[]>([
    { name: "", description: "", is_required: true },
  ]);
  const [saving, setSaving] = useState(false);
  const [justAddedIndex, setJustAddedIndex] = useState<number | null>(null);

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

  const handleAddRequirement = () => {
    const newIndex = requirements.length;
    setRequirements((prev) => [
      ...prev,
      { name: "", description: "", is_required: true },
    ]);
    setJustAddedIndex(newIndex);
    setTimeout(() => {
      requirementsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const el = document.getElementById(`req-name-${newIndex}`);
      if (el) (el as HTMLInputElement).focus();
    }, 100);
    setTimeout(() => {
      setJustAddedIndex(null);
    }, 2500);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 dark:bg-black/75 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-2xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col text-neutral-900 dark:text-neutral-100">
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/70 dark:bg-neutral-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-neutral-800 text-white dark:text-emerald-400 border border-transparent dark:border-neutral-700 flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {initialTemplate ? "Edit Checklist Template" : "Create New Checklist Template"}
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Create a reusable document checklist to apply to multiple clients in 1 click.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                Template Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Standard GST Refund Dossier"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs bg-white dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2.5 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-emerald-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                Category / Service Type
              </label>
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full text-xs bg-white dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-emerald-400"
              >
                {SERVICE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="dark:bg-neutral-800 dark:text-neutral-100">
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1">
                Description / Advisor Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Standard checklist for regular monthly export refund filings under LUT"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs bg-white dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2.5 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-emerald-400"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Document Requirements ({requirements.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddRequirement}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Document Item</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {requirements.map((req, idx) => (
                <div
                  key={idx}
                  id={`req-item-${idx}`}
                  className={`p-3 rounded-xl border space-y-2 transition-all duration-300 ${
                    justAddedIndex === idx
                      ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-300/50 dark:ring-emerald-800/50 shadow-sm"
                      : "bg-neutral-50/80 dark:bg-neutral-800/50 border-neutral-200/80 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-neutral-500 dark:text-neutral-400 bg-neutral-200/60 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      {justAddedIndex === idx && (
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.2 rounded animate-pulse">
                          Just added
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={req.is_required}
                          onChange={(e) =>
                            handleRequirementChange(idx, "is_required", e.target.checked)
                          }
                          className="rounded border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                        />
                        <span>Mandatory</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveRequirement(idx)}
                        disabled={requirements.length <= 1}
                        className="text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded transition-colors disabled:opacity-30 cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      id={`req-name-${idx}`}
                      type="text"
                      required
                      placeholder="Document Name (e.g. Form 16, Bank Statement)"
                      value={req.name}
                      onChange={(e) =>
                        handleRequirementChange(idx, "name", e.target.value)
                      }
                      className="w-full text-xs bg-white dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                    />

                    <input
                      type="text"
                      placeholder="Instructions for client (e.g. Signed copy, 12 months)"
                      value={req.description}
                      onChange={(e) =>
                        handleRequirementChange(idx, "description", e.target.value)
                      }
                      className="w-full text-xs bg-white dark:bg-neutral-800/90 border border-neutral-300 dark:border-neutral-700 rounded-lg p-2 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddRequirement}
                className="w-full py-2.5 px-3 border border-dashed border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-500 dark:hover:border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer mt-2"
              >
                <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>+ Add Another Document Item</span>
              </button>

              <div ref={requirementsEndRef} />
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
              Changes apply to new cases created using this template.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
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
