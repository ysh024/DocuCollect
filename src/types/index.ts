export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CaseStatus =
  | "draft"
  | "active"
  | "waiting_for_client"
  | "under_review"
  | "completed"
  | "archived";

export type RequirementStatus =
  | "not_uploaded"
  | "uploaded"
  | "under_review"
  | "approved"
  | "rejected";

export type DocumentStatus = "under_review" | "approved" | "rejected";

export type ActorType = "admin" | "client" | "system";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          logo_url: string | null;
          branding_color: string;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug?: string | null;
          logo_url?: string | null;
          branding_color?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          logo_url?: string | null;
          branding_color?: string;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          organization_id: string;
          full_name: string;
          email: string;
          role: "owner" | "admin" | "staff";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id: string;
          full_name: string;
          email: string;
          role?: "owner" | "admin" | "staff";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          full_name?: string;
          email?: string;
          role?: "owner" | "admin" | "staff";
          created_at?: string;
          updated_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          email: string | null;
          phone: string;
          alternate_phone: string | null;
          company: string | null;
          client_ref_id: string | null;
          address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          email?: string | null;
          phone: string;
          alternate_phone?: string | null;
          company?: string | null;
          client_ref_id?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          email?: string | null;
          phone?: string;
          alternate_phone?: string | null;
          company?: string | null;
          client_ref_id?: string | null;
          address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cases: {
        Row: {
          id: string;
          organization_id: string;
          client_id: string;
          title: string;
          service_type: string;
          reference_number: string;
          status: CaseStatus;
          due_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          client_id: string;
          title: string;
          service_type: string;
          reference_number: string;
          status?: CaseStatus;
          due_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          client_id?: string;
          title?: string;
          service_type?: string;
          reference_number?: string;
          status?: CaseStatus;
          due_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      document_requirements: {
        Row: {
          id: string;
          case_id: string;
          name: string;
          description: string | null;
          is_required: boolean;
          allowed_types: string[];
          max_size_mb: number;
          status: RequirementStatus;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          name: string;
          description?: string | null;
          is_required?: boolean;
          allowed_types?: string[];
          max_size_mb?: number;
          status?: RequirementStatus;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          name?: string;
          description?: string | null;
          is_required?: boolean;
          allowed_types?: string[];
          max_size_mb?: number;
          status?: RequirementStatus;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          requirement_id: string;
          case_id: string;
          client_id: string;
          version: number;
          file_name: string;
          storage_path: string;
          file_size: number;
          mime_type: string;
          status: DocumentStatus;
          rejection_reason: string | null;
          uploaded_by_type: "client" | "admin";
          uploaded_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          auto_delete_at?: string | null;
        };
        Insert: {
          id?: string;
          requirement_id: string;
          case_id: string;
          client_id: string;
          version?: number;
          file_name: string;
          storage_path: string;
          file_size: number;
          mime_type: string;
          status?: DocumentStatus;
          rejection_reason?: string | null;
          uploaded_by_type?: "client" | "admin";
          uploaded_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          auto_delete_at?: string | null;
        };
        Update: {
          id?: string;
          requirement_id?: string;
          case_id?: string;
          client_id?: string;
          version?: number;
          file_name?: string;
          storage_path?: string;
          file_size?: number;
          mime_type?: string;
          status?: DocumentStatus;
          rejection_reason?: string | null;
          uploaded_by_type?: "client" | "admin";
          uploaded_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          auto_delete_at?: string | null;
        };
      };
      upload_links: {
        Row: {
          id: string;
          case_id: string;
          organization_id: string | null;
          token: string | null;
          token_hash: string;
          token_prefix: string;
          expires_at: string | null;
          revoked_at: string | null;
          last_used_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          organization_id?: string | null;
          token?: string | null;
          token_hash: string;
          token_prefix: string;
          expires_at?: string | null;
          revoked_at?: string | null;
          last_used_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          organization_id?: string | null;
          token?: string | null;
          token_hash?: string;
          token_prefix?: string;
          expires_at?: string | null;
          revoked_at?: string | null;
          last_used_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          organization_id: string;
          case_id: string | null;
          document_id: string | null;
          actor_type: ActorType;
          actor_id: string | null;
          action: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          case_id?: string | null;
          document_id?: string | null;
          actor_type: ActorType;
          actor_id?: string | null;
          action: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          case_id?: string | null;
          document_id?: string | null;
          actor_type?: ActorType;
          actor_id?: string | null;
          action?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
  };
}

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
    contact_email?: string | null;
    contact_phone?: string | null;
    advisor_name?: string | null;
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
