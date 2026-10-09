import { z } from "zod";

export const clientSchema = z.object({
  name: z.string().min(2, "Client name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().min(8, "Phone number is required"),
  alternate_phone: z.string().optional().or(z.literal("")),
  company: z.string().optional().or(z.literal("")),
  client_ref_id: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const caseSchema = z.object({
  client_id: z.string().uuid("Valid client ID is required"),
  title: z.string().min(2, "Case title is required"),
  service_type: z.string().min(2, "Service type is required"),
  reference_number: z.string().min(1, "Reference number is required"),
  due_date: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const documentRequirementSchema = z.object({
  case_id: z.string().uuid(),
  name: z.string().min(2, "Document name is required"),
  description: z.string().optional().or(z.literal("")),
  is_required: z.boolean().default(true),
  allowed_types: z.array(z.string()).min(1, "At least one allowed file type required"),
  max_size_mb: z.number().min(1).max(50).default(25),
});

export const reviewDocumentSchema = z.object({
  document_id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  rejection_reason: z.string().optional(),
});
