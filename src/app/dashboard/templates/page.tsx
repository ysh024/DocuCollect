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
} from "lucide-react";
import { ChecklistTemplate, Client } from "@/types";
import {
  getChecklistTemplatesAction,
  deleteChecklistTemplateAction,
  duplicateChecklistTemplateAction,
} from "@/app/actions/templates";
import { getDashboardData } from "@/app/actions/portal";
import { TemplateEditorModal } from "@/components/templates/TemplateEditorModal";
import { NewCaseModal } from "@/components/dashboard/NewCaseModal";
import { useToast } from "@/components/ui/Toast";
import { useDashboardData } from "@/contexts/DashboardDataContext";

let globalTemplatesCache: ChecklistTemplate[] | null = null;

export default function ChecklistTemplatesPage() {
  const { toast } = useToast();
  const { clients } = useDashboardData();

  const [templates, setTemplates] = useState<ChecklistTemplate[]>(globalTemplatesCache || []);
  const [loading, setLoading] = useState(!globalTemplatesCache);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-neutral-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">Checklist Templates</h1>
            <span className="text-[11px] font-semibold bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-full border border-neutral-200">
              {templates.length} Total
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Build standardized document checklists once and reuse them for multiple clients in 1 click.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Template</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white rounded-xl border border-neutral-200/80 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by template name or document item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-neutral-50/80 border border-neutral-200 rounded-lg text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:bg-white"
            />
          </div>

          {/* Type Filter Tabs */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`flex-1 sm:flex-none px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                typeFilter === "all"
                  ? "bg-white text-neutral-900 shadow-2xs font-semibold"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              All ({templates.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("custom")}
              className={`flex-1 sm:flex-none px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                typeFilter === "custom"
                  ? "bg-white text-emerald-800 shadow-2xs font-semibold"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              My Firm ({customCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter("system")}
              className={`flex-1 sm:flex-none px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                typeFilter === "system"
                  ? "bg-white text-neutral-900 shadow-2xs font-semibold"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Standard ({systemCount})
            </button>
          </div>
        </div>

        {/* Categories Chips */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-neutral-100">
            <span className="text-[10px] uppercase font-semibold text-neutral-400 mr-1">
              Category:
            </span>
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                categoryFilter === "all"
                  ? "bg-neutral-900 text-white font-semibold"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  categoryFilter === cat
                    ? "bg-neutral-900 text-white font-semibold"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Templates Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-neutral-200/80 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900">No templates found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {search
              ? "No checklist template matches your search query. Try clearing the filter."
              : "You haven't created any custom templates yet. Create your first template to reuse for clients!"}
          </p>
          <button
            type="button"
            onClick={handleCreateNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors mt-2"
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
                className="bg-white rounded-xl border border-neutral-200/80 hover:border-neutral-300 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between overflow-hidden group"
              >
                {/* Card Top */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-neutral-600 bg-neutral-100 border border-neutral-200/60 px-2 py-0.5 rounded">
                      {tpl.service_type || "General"}
                    </span>

                    {!tpl.is_system ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Firm Custom
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-neutral-400 bg-neutral-50 px-1.5 py-0.5 rounded border border-neutral-100">
                        Standard
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 group-hover:text-neutral-800 leading-snug">
                      {tpl.name}
                    </h3>
                    {tpl.description && (
                      <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                        {tpl.description}
                      </p>
                    )}
                  </div>

                  {/* Document Count Badge */}
                  <div className="flex items-center justify-between text-[11px] text-neutral-600 bg-neutral-50/80 p-2 rounded-lg border border-neutral-200/60">
                    <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-neutral-600" />
                      {tpl.requirements.length} Items
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      {requiredCount} required · {optionalCount} optional
                    </span>
                  </div>

                  {/* Requirements List (Collapsible) */}
                  <div className="space-y-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                      className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 flex items-center justify-between w-full py-1"
                    >
                      <span>{isExpanded ? "Hide checklist" : "Preview checklist"}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="space-y-1.5 pt-1.5 border-t border-neutral-100 max-h-48 overflow-y-auto">
                        {tpl.requirements.map((req, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-[11px] p-1.5 rounded bg-neutral-50/60"
                          >
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-neutral-800 truncate">{req.name}</p>
                              {req.description && (
                                <p className="text-[10px] text-neutral-400 truncate">
                                  {req.description}
                                </p>
                              )}
                            </div>
                            {req.is_required && (
                              <span className="text-[9px] text-rose-600 font-bold bg-rose-50 px-1 py-0.2 rounded border border-rose-200/60 shrink-0">
                                Req
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Bottom Controls */}
                <div className="p-3 bg-neutral-50/60 border-t border-neutral-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    {!tpl.is_system ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleEdit(tpl)}
                          className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-md transition-colors"
                          title="Edit template"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl)}
                          className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDuplicateTemplate(tpl)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 px-2 py-1 hover:bg-neutral-200/60 rounded-md transition-colors"
                        title="Copy to custom templates to edit"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Clone</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleUseTemplate(tpl)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                  >
                    <Briefcase className="w-3 h-3 text-emerald-400" />
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
