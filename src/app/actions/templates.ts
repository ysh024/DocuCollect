"use server";

import { getDb } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ChecklistTemplate, TemplateRequirement } from "@/types";

/**
 * Fetch all checklist templates available to the current user:
 * - Built-in verified system templates (available to all advisors)
 * - Custom templates created by their organization
 */
export async function getChecklistTemplatesAction(): Promise<ChecklistTemplate[]> {
  const session = await getSession();
  if (!session?.organizationId) return [];

  const sql = getDb();
  if (!sql) return [];

  try {
    const rows = await sql`
      SELECT id, organization_id, name, service_type, description, requirements, is_system, created_at, updated_at
      FROM public.checklist_templates
      WHERE organization_id = ${session.organizationId} OR is_system = true
      ORDER BY is_system ASC, name ASC;
    `;

    return rows.map((r: any) => ({
      id: r.id,
      organization_id: r.organization_id,
      name: r.name,
      service_type: r.service_type || "General",
      description: r.description || null,
      requirements: Array.isArray(r.requirements)
        ? r.requirements
        : typeof r.requirements === "string"
        ? JSON.parse(r.requirements)
        : [],
      is_system: Boolean(r.is_system),
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  } catch (err) {
    console.error("getChecklistTemplatesAction error:", err);
    return [];
  }
}

/**
 * Create a new custom checklist template for the firm
 */
export async function createChecklistTemplateAction(data: {
  name: string;
  serviceType: string;
  description?: string;
  requirements: TemplateRequirement[];
}): Promise<{ success: boolean; template?: ChecklistTemplate; error?: string }> {
  const session = await getSession();
  if (!session?.organizationId) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  if (!data.name?.trim()) {
    return { success: false, error: "Template name is required." };
  }

  const validReqs = (data.requirements || []).filter((r) => r.name?.trim());
  if (validReqs.length === 0) {
    return { success: false, error: "Please add at least one document requirement." };
  }

  try {
    const rows = await sql`
      INSERT INTO public.checklist_templates (
        organization_id,
        name,
        service_type,
        description,
        requirements,
        is_system
      ) VALUES (
        ${session.organizationId},
        ${data.name.trim()},
        ${data.serviceType?.trim() || "General"},
        ${data.description?.trim() || null},
        ${JSON.stringify(validReqs)}::jsonb,
        false
      )
      RETURNING *;
    `;

    revalidatePath("/dashboard/templates");
    revalidatePath("/dashboard/cases");
    revalidatePath("/dashboard");

    const created = rows[0] as any;
    return {
      success: true,
      template: {
        id: created.id,
        organization_id: created.organization_id,
        name: created.name,
        service_type: created.service_type,
        description: created.description,
        requirements: Array.isArray(created.requirements) ? created.requirements : JSON.parse(created.requirements),
        is_system: false,
        created_at: created.created_at,
        updated_at: created.updated_at,
      },
    };
  } catch (err: any) {
    console.error("createChecklistTemplateAction error:", err);
    return { success: false, error: err.message || "Failed to create template." };
  }
}

/**
 * Update an existing custom template
 */
export async function updateChecklistTemplateAction(
  templateId: string,
  data: {
    name: string;
    serviceType: string;
    description?: string;
    requirements: TemplateRequirement[];
  }
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session?.organizationId) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  if (!data.name?.trim()) {
    return { success: false, error: "Template name is required." };
  }

  const validReqs = (data.requirements || []).filter((r) => r.name?.trim());
  if (validReqs.length === 0) {
    return { success: false, error: "Please add at least one document requirement." };
  }

  try {
    // Ensure only custom templates belonging to current organization can be updated
    const res = await sql`
      UPDATE public.checklist_templates
      SET name = ${data.name.trim()},
          service_type = ${data.serviceType?.trim() || "General"},
          description = ${data.description?.trim() || null},
          requirements = ${JSON.stringify(validReqs)}::jsonb,
          updated_at = now()
      WHERE id = ${templateId}
        AND organization_id = ${session.organizationId}
        AND is_system = false;
    `;

    revalidatePath("/dashboard/templates");
    revalidatePath("/dashboard/cases");

    return { success: true };
  } catch (err: any) {
    console.error("updateChecklistTemplateAction error:", err);
    return { success: false, error: err.message || "Failed to update template." };
  }
}

/**
 * Delete a custom template
 */
export async function deleteChecklistTemplateAction(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session?.organizationId) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  try {
    await sql`
      DELETE FROM public.checklist_templates
      WHERE id = ${templateId}
        AND organization_id = ${session.organizationId}
        AND is_system = false;
    `;

    revalidatePath("/dashboard/templates");
    revalidatePath("/dashboard/cases");

    return { success: true };
  } catch (err: any) {
    console.error("deleteChecklistTemplateAction error:", err);
    return { success: false, error: err.message || "Failed to delete template." };
  }
}

/**
 * Clone/Duplicate any template (including system templates) into a custom template for the firm
 */
export async function duplicateChecklistTemplateAction(
  templateId: string
): Promise<{ success: boolean; newTemplateId?: string; error?: string }> {
  const session = await getSession();
  if (!session?.organizationId) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }

  const sql = getDb();
  if (!sql) return { success: false, error: "Database not connected." };

  try {
    const existing = await sql`
      SELECT name, service_type, description, requirements
      FROM public.checklist_templates
      WHERE id = ${templateId}
        AND (organization_id = ${session.organizationId} OR is_system = true)
      LIMIT 1;
    `;

    if (existing.length === 0) {
      return { success: false, error: "Template not found." };
    }

    const t = existing[0];
    const newName = `${t.name} (Custom Copy)`;

    const inserted = await sql`
      INSERT INTO public.checklist_templates (
        organization_id,
        name,
        service_type,
        description,
        requirements,
        is_system
      ) VALUES (
        ${session.organizationId},
        ${newName},
        ${t.service_type},
        ${t.description},
        ${typeof t.requirements === "string" ? t.requirements : JSON.stringify(t.requirements)}::jsonb,
        false
      )
      RETURNING id;
    `;

    revalidatePath("/dashboard/templates");
    revalidatePath("/dashboard/cases");

    return { success: true, newTemplateId: inserted[0].id };
  } catch (err: any) {
    console.error("duplicateChecklistTemplateAction error:", err);
    return { success: false, error: err.message || "Failed to duplicate template." };
  }
}
