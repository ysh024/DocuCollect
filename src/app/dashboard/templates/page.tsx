"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { ChecklistTemplate } from "@/types";
import {
  getChecklistTemplatesAction,
  deleteChecklistTemplateAction,
  duplicateChecklistTemplateAction,
  getCustomTemplateQuotaAction,
} from "@/app/actions/templates";
import { TemplateEditorModal } from "@/components/templates/TemplateEditorModal";
import { NewCaseModal } from "@/components/dashboard/NewCaseModal";
import { useToast } from "@/components/ui/Toast";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { InfoPopover } from "@/components/ui/InfoPopover";

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
      const [tpls, quota] = await Promise.all([
        getChecklistTemplatesAction(),
        getCustomTemplateQuotaAction(),
      ]);
      globalTemplatesCache = tpls;
      setTemplates(tpls);
      if (quota) setCustomQuota(quota);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(Boolean(globalTemplatesCache));
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

            return (
              <div
                key={tpl.id}
                className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                      <Layers className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                      <span>{tpl.service_type || "General"}</span>
                    </span>

                    {/* Icon Badges with Tooltips instead of bloated text */}
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
                      onClick={() => handleEdit(tpl)}
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                      title="Edit template"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateTemplate(tpl)}
                      className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                      title="Clone template"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tpl)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Delete template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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
