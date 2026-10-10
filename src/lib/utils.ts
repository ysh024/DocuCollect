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
        className: "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200/80 dark:border-neutral-700",
        dotColor: "bg-neutral-400",
      };
    case "active":
      return {
        label: "Active",
        className: "bg-blue-50/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60",
        dotColor: "bg-blue-500",
      };
    case "waiting_for_client":
      return {
        label: "Waiting for Client",
        className: "bg-amber-50/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60",
        dotColor: "bg-amber-500",
      };
    case "under_review":
      return {
        label: "Under Review",
        className: "bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60",
        dotColor: "bg-indigo-500",
      };
    case "completed":
      return {
        label: "Completed",
        className: "bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60",
        dotColor: "bg-emerald-500",
      };
    case "archived":
      return {
        label: "Archived",
        className: "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200/60 dark:border-neutral-700",
        dotColor: "bg-neutral-400",
      };
    default:
      return {
        label: status,
        className: "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700",
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
        className: "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800/80 font-semibold",
        dotColor: "bg-amber-500",
        borderAccent: "border-l-amber-500 border-amber-200 dark:border-amber-800/60",
        bgCard: "bg-amber-50/20 dark:bg-amber-950/20",
      };
    case "uploaded":
    case "under_review":
      return {
        label: "Under Review",
        className: "bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-800/80 font-semibold",
        dotColor: "bg-blue-500",
        borderAccent: "border-l-blue-500 border-blue-200 dark:border-blue-800/60",
        bgCard: "bg-blue-50/15 dark:bg-blue-950/20",
      };
    case "approved":
      return {
        label: "Approved",
        className: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/80 font-semibold",
        dotColor: "bg-emerald-500",
        borderAccent: "border-l-emerald-500 border-emerald-200 dark:border-emerald-800/60",
        bgCard: "bg-emerald-50/20 dark:bg-emerald-950/20",
      };
    case "rejected":
      return {
        label: "Needs Re-upload",
        className: "bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-800/80 font-semibold",
        dotColor: "bg-rose-600",
        borderAccent: "border-l-rose-500 border-rose-300 dark:border-rose-800/60",
        bgCard: "bg-rose-50/30 dark:bg-rose-950/20",
      };
    default:
      return {
        label: status,
        className: "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 font-medium",
        dotColor: "bg-neutral-400",
        borderAccent: "border-l-neutral-400 border-neutral-200 dark:border-neutral-700",
        bgCard: "bg-white dark:bg-neutral-900",
      };
  }
}
