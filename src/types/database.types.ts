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
