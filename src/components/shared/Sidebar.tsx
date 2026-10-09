"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Layers,
  Settings,
  ArrowUpRight,
  LogOut,
  CreditCard,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentUserAction, handleLogoutAction } from "@/app/actions/auth";
import { useToast } from "@/components/ui/Toast";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/cases", label: "Cases & Checklists", icon: Briefcase },
  { href: "/dashboard/templates", label: "Checklist Templates", icon: Layers },
  { href: "/dashboard/clients", label: "Clients & Document Vault", icon: Users },
  { href: "/dashboard/audit", label: "Audit Trail", icon: ShieldCheck },
  { href: "/dashboard/billing", label: "Billing & Plan", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

import { useDashboardData } from "@/contexts/DashboardDataContext";

export function Sidebar() {
  const pathname = usePathname();
  const { toast } = useToast();
  const { user } = useDashboardData();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setLoggingOut(true);
    toast({ title: "Signing out...", description: "Clearing active session." });
    try {
      await handleLogoutAction();
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

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
    <aside className="w-64 bg-white border-r border-neutral-200/80 flex flex-col h-screen sticky top-0 shrink-0 z-20">
      {/* Brand */}
      <div className="h-16 px-6 border-b border-neutral-100 flex items-center shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5 group min-w-0">
          {user?.logoUrl ? (
            <div className="w-8 h-8 rounded-lg border border-neutral-200 overflow-hidden shrink-0 shadow-xs flex items-center justify-center bg-white p-0.5">
              <img
                src={user.logoUrl}
                alt={user.organizationName}
                className="w-full h-full object-cover rounded-md"
              />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold tracking-tight text-neutral-900 truncate block">
              {user?.organizationName || "DocuCollect"}
            </span>
            <span className="text-[10px] text-neutral-400 block -mt-0.5">Document Portal</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        {/* Trial warning */}
        {isOnTrial && isTrialExpiringSoon && trialDaysLeft !== null && (
          <div className="px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">Trial expires in {trialDaysLeft}d</p>
              <Link href="/dashboard/billing" className="text-[10px] text-amber-700 underline">View plans →</Link>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <p className="px-3 text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-2">
            Main
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150",
                  isActive
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-neutral-400")} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="space-y-1">
          <p className="px-3 text-[11px] font-medium text-neutral-400 uppercase tracking-wider mb-2">
            Quick Actions
          </p>
          <Link
            href="/dashboard/cases"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors group"
          >
            <span>Active Checklists</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900" />
          </Link>
          <Link
            href="/dashboard/clients"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors group"
          >
            <span>Client Vault</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900" />
          </Link>
        </div>
      </div>

      {/* User + Sign Out */}
      <div className="p-3 border-t border-neutral-100 space-y-2">
        {user ? (
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 flex items-center gap-2.5">
            {user.logoUrl ? (
              <div className="w-8 h-8 rounded-lg border border-neutral-200 overflow-hidden shrink-0 shadow-xs flex items-center justify-center bg-white p-0.5">
                <img
                  src={user.logoUrl}
                  alt={user.organizationName}
                  className="w-full h-full object-cover rounded-md"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {getInitials(user.organizationName || "?")}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-neutral-900 truncate">{user.organizationName}</p>
              <p className="text-[10px] text-neutral-500 truncate">
                {isOnTrial
                  ? `Trial · ${trialDaysLeft ?? "?"} days left`
                  : user.subscription?.planDisplayName || "Active"}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 h-14 animate-pulse" />
        )}

        <button
          type="button"
          onClick={handleSignOut}
          disabled={loggingOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-700 bg-rose-50/60 hover:bg-rose-100 border border-rose-200/60 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{loggingOut ? "Signing Out..." : "Sign Out"}</span>
        </button>
      </div>
    </aside>
  );
}
