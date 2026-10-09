import { type ClassValue, clsx } from "clsx";
import { CaseStatus, RequirementStatus, DocumentStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!+bytes) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getCaseStatusBadge(status: CaseStatus): {
  label: string;
  className: string;
  dotColor: string;
} {
  switch (status) {
    case "draft":
      return {
        label: "Draft",
        className: "bg-neutral-100 text-neutral-600 border-neutral-200/80",
        dotColor: "bg-neutral-400",
      };
    case "active":
      return {
        label: "Active",
        className: "bg-blue-50/80 text-blue-700 border-blue-200/60",
        dotColor: "bg-blue-500",
      };
    case "waiting_for_client":
      return {
        label: "Waiting for Client",
        className: "bg-amber-50/80 text-amber-800 border-amber-200/60",
        dotColor: "bg-amber-500",
      };
    case "under_review":
      return {
        label: "Under Review",
        className: "bg-indigo-50/80 text-indigo-700 border-indigo-200/60",
        dotColor: "bg-indigo-500",
      };
    case "completed":
      return {
        label: "Completed",
        className: "bg-emerald-50/80 text-emerald-800 border-emerald-200/60",
        dotColor: "bg-emerald-500",
      };
    case "archived":
      return {
        label: "Archived",
        className: "bg-neutral-100 text-neutral-500 border-neutral-200/60",
        dotColor: "bg-neutral-400",
      };
    default:
      return {
        label: status,
        className: "bg-neutral-100 text-neutral-700 border-neutral-200",
        dotColor: "bg-neutral-400",
      };
  }
}

export function getRequirementStatusBadge(status: RequirementStatus): {
  label: string;
  className: string;
  dotColor: string;
  borderAccent: string;
  bgCard: string;
} {
  switch (status) {
    case "not_uploaded":
      return {
        label: "To Upload",
        className: "bg-amber-100 text-amber-900 border-amber-300 font-semibold",
        dotColor: "bg-amber-500",
        borderAccent: "border-l-amber-500 border-amber-200",
        bgCard: "bg-amber-50/20",
      };
    case "uploaded":
    case "under_review":
      return {
        label: "Under Review",
        className: "bg-blue-100 text-blue-900 border-blue-300 font-semibold",
        dotColor: "bg-blue-500",
        borderAccent: "border-l-blue-500 border-blue-200",
        bgCard: "bg-blue-50/15",
      };
    case "approved":
      return {
        label: "Approved",
        className: "bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold",
        dotColor: "bg-emerald-500",
        borderAccent: "border-l-emerald-500 border-emerald-200",
        bgCard: "bg-emerald-50/20",
      };
    case "rejected":
      return {
        label: "Needs Re-upload",
        className: "bg-rose-100 text-rose-900 border-rose-300 font-semibold",
        dotColor: "bg-rose-600",
        borderAccent: "border-l-rose-500 border-rose-300",
        bgCard: "bg-rose-50/30",
      };
    default:
      return {
        label: status,
        className: "bg-neutral-100 text-neutral-800 border-neutral-300 font-medium",
        dotColor: "bg-neutral-400",
        borderAccent: "border-l-neutral-400 border-neutral-200",
        bgCard: "bg-white",
      };
  }
}
