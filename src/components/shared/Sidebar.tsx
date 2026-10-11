"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Layers,
  Settings,
  ArrowUpRight,
  CreditCard,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";

import { useDashboardData, DashboardTab } from "@/contexts/DashboardDataContext";

const navItems: { href: string; tab: DashboardTab; label: string; icon: any }[] = [
  { href: "/dashboard", tab: "overview", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/cases", tab: "cases", label: "Cases & Checklists", icon: Briefcase },
  { href: "/dashboard/templates", tab: "templates", label: "Checklist Templates", icon: Layers },
  { href: "/dashboard/clients", tab: "clients", label: "Clients & Document Vault", icon: Users },
  { href: "/dashboard/audit", tab: "audit", label: "Audit Trail", icon: ShieldCheck },
  { href: "/dashboard/billing", tab: "billing", label: "Billing & Plan", icon: CreditCard },
  { href: "/dashboard/settings", tab: "settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, activeTab, navigateToTab } = useDashboardData();

  // Warm-up / prefetch all dashboard routes in the browser cache on initial mount
  useEffect(() => {
    navItems.forEach((item) => {
      router.prefetch(item.href);
    });
  }, [router]);

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const trialDaysLeft = user?.subscription?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.subscription.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const isTrialExpiringSoon = trialDaysLeft !== null && trialDaysLeft <= 7;
  const isOnTrial = user?.subscription?.status === "trial";

  return (
    <aside className="w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200/80 dark:border-neutral-800 flex flex-col h-screen sticky top-0 shrink-0 z-20 transition-colors duration-150">
      {/* Brand */}
      <div className="h-16 px-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center shrink-0">
        <Link
          href="/dashboard"
          onClick={(e) => {
            if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
              e.preventDefault();
              navigateToTab("/dashboard");
            }
          }}
          className="flex items-center gap-2.5 group min-w-0"
        >
          {user?.logoUrl ? (
            <div className="w-8 h-8 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden shrink-0 shadow-xs flex items-center justify-center bg-white dark:bg-neutral-800 p-0.5">
              <img
                src={user.logoUrl}
                alt={user.organizationName}
                className="w-full h-full object-cover rounded-md"
              />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white truncate block">
              {user?.organizationName || "DocuCollect"}
            </span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block -mt-0.5">Document Portal</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {/* Trial warning */}
        {isOnTrial && isTrialExpiringSoon && trialDaysLeft !== null && (
          <div className="px-3 py-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Trial expires in {trialDaysLeft}d</p>
              <Link
                href="/dashboard/billing"
                className="text-[10px] text-amber-700 dark:text-amber-400 underline cursor-pointer"
              >
                View plans →
              </Link>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <p className="px-3 text-[11px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
            Main
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const targetTab = item.href === "/dashboard" ? "overview" : item.href.replace("/dashboard/", "");
            const isActive = activeTab === targetTab;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                    e.preventDefault();
                    navigateToTab(item.href);
                  }
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-100 cursor-pointer",
                  isActive
                    ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm font-semibold"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100/70 dark:hover:bg-neutral-800/70"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-white dark:text-neutral-900" : "text-neutral-400 dark:text-neutral-500")} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="space-y-1">
          <p className="px-3 text-[11px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
            Quick Actions
          </p>
          <Link
            href="/dashboard/cases"
            prefetch={true}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                navigateToTab("/dashboard/cases");
              }
            }}
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group cursor-pointer"
          >
            <span>Active Checklists</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-white" />
          </Link>
          <Link
            href="/dashboard/clients"
            prefetch={true}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                navigateToTab("/dashboard/clients");
              }
            }}
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group cursor-pointer"
          >
            <span>Client Vault</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-white" />
          </Link>
        </div>
      </div>

      {/* Workspace Status Card (Settings Link) */}
      <div className="p-3 border-t border-neutral-100 dark:border-neutral-800">
        {user ? (
          <Link
            href="/dashboard/settings"
            prefetch={true}
            onClick={(e) => {
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                navigateToTab("/dashboard/settings");
              }
            }}
            title="Manage Workspace Settings"
            className="p-2.5 bg-neutral-50 hover:bg-neutral-100/90 dark:bg-neutral-800/60 dark:hover:bg-neutral-800 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 flex items-center gap-2.5 transition-colors group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-neutral-700 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
              {getInitials(user.fullName || user.email || "Advisor")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate group-hover:text-neutral-950 dark:group-hover:text-white">
                {user.fullName || user.email?.split("@")[0] || "Advisor Profile"}
              </p>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                {isOnTrial
                  ? `Trial · ${trialDaysLeft ?? "?"} days left`
                  : user.subscription?.planDisplayName || "Lead Advisor"}
              </p>
            </div>
          </Link>
        ) : (
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 h-14 animate-pulse" />
        )}
      </div>
    </aside>
  );
}
