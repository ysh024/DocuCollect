import { Database, CaseStatus, RequirementStatus, DocumentStatus } from "./database.types";

export * from "./database.types";

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type UserProfile = Database["public"]["Tables"]["users"]["Row"];
export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Case = Database["public"]["Tables"]["cases"]["Row"];
export type DocumentRequirement = Database["public"]["Tables"]["document_requirements"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type UploadLink = Database["public"]["Tables"]["upload_links"]["Row"];
export type ActivityLog = Database["public"]["Tables"]["activity_logs"]["Row"];

export interface CaseWithDetails extends Case {
  organization_name?: string;
  client: Client;
  requirements: (DocumentRequirement & {
    documents: Document[];
  })[];
  upload_link?: UploadLink | null;
}

export interface ClientPortalData {
  case: {
    id: string;
    title: string;
    service_type: string;
    reference_number: string;
    status: CaseStatus;
    due_date: string | null;
    notes: string | null;
  };
  client: {
    name: string;
    company: string | null;
    email: string | null;
    phone: string;
  };
  organization: {
    name: string;
    logo_url: string | null;
    branding_color: string;
  };
  requirements: (DocumentRequirement & {
    latest_document?: Document | null;
    history?: Document[];
  })[];
  progress: {
    total: number;
    required: number;
    approved: number;
    under_review: number;
    rejected: number;
    pending: number;
    percentage: number;
  };
}

export interface RejectionReasonOption {
  label: string;
  template: string;
}

export const PREDEFINED_REJECTION_REASONS: RejectionReasonOption[] = [
  {
    label: "Blurry / Unreadable Scan",
    template: "The uploaded file is blurry or illegible. Please upload a high-resolution, clear scan or photo.",
  },
  {
    label: "Incomplete / Cut-off Pages",
    template: "The document is missing pages or edges are cropped. Please provide all pages in full.",
  },
  {
    label: "Password Protected File",
    template: "The PDF is password protected. Please upload an unlocked PDF or share the password in the notes.",
  },
  {
    label: "Expired Document",
    template: "The provided document is past its validity date. Please provide a currently valid document.",
  },
  {
    label: "Incorrect Document Type",
    template: "The uploaded file does not match the requested document requirement. Please check and re-upload.",
  },
  {
    label: "Wrong Assessment Year / Period",
    template: "The statement or form is not for the requested financial period/year. Please provide the correct year's document.",
  },
];

export interface TemplateRequirement {
  name: string;
  description: string;
  is_required: boolean;
}

export interface ChecklistTemplate {
  id: string;
  organization_id: string | null;
  name: string;
  service_type: string;
  description?: string | null;
  requirements: TemplateRequirement[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

