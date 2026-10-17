"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
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
  MessageSquare,
  Mail,
  Sparkles,
  Bell,
  FileUp,
  Clock,
  ChevronDown,
  Building2,
  Key,
  LogOut,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
  Loader2,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle, useToast, useTheme, Theme, UserAvatar, SafeImage, getSafeInitials } from "@/components/ui";
import {
  useDashboardData,
  DashboardTab,
  clearClientDashboardCache,
} from "@/contexts/DashboardDataContext";
import { handleLogoutAction } from "@/app/actions";
import { redeemLicenseKeyAction } from "@/app/actions";


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
  const { user, subscription, activeTab, navigateToTab, isNavigating } = useDashboardData();

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

  const sub = subscription || user?.subscription;
  const isPaidActive =
    (sub?.status === "active" || sub?.status === "paid") &&
    (sub?.plan_name === "pro" ||
      sub?.planName === "pro" ||
      sub?.plan_name === "professional" ||
      sub?.planName === "professional" ||
      sub?.plan_name === "starter" ||
      sub?.planName === "starter" ||
      sub?.plan_name === "firm" ||
      sub?.planName === "firm");
  const isOnTrial = !isPaidActive && (sub?.status === "trial" || sub?.plan_name === "free_trial" || sub?.planName === "free_trial");
  const trialEnds = sub?.trial_ends_at || sub?.trialEndsAt;
  const trialDaysLeft = (!isPaidActive && trialEnds)
    ? Math.max(0, Math.ceil((new Date(trialEnds).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const isTrialExpiringSoon = trialDaysLeft !== null && trialDaysLeft <= 7;

  return (
    <aside className="w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200/80 dark:border-neutral-800 flex flex-col h-screen sticky top-0 shrink-0 z-20">
      {/* Brand */}
      <div className="h-16 px-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center shrink-0">
        <Link
          href="/dashboard"
          prefetch={true}
          onClick={(e) => {
            if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
              e.preventDefault();
              navigateToTab("overview");
            }
          }}
          className="flex items-center gap-2.5 group min-w-0"
        >
          {user?.logoUrl ? (
            <div className="w-8 h-8 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden shrink-0 shadow-xs flex items-center justify-center bg-white dark:bg-neutral-800 p-0.5">
              <SafeImage
                src={user.logoUrl}
                alt={user.organizationName}
                className="w-full h-full object-cover rounded-md"
                fallbackIcon={
                  <div className="w-7 h-7 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shadow-sm shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                }
              />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shadow-sm transition-transform group-hover:scale-105 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <span className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white truncate block">
              {user?.organizationName || "DocGet"}
            </span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 block -mt-0.5">Document Portal</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 px-3 py-4 space-y-6 overflow-y-auto no-scrollbar">
        {/* Trial warning */}
        {isOnTrial && isTrialExpiringSoon && trialDaysLeft !== null && (
          <div className="px-3 py-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Trial expires in {trialDaysLeft}d</p>
              <Link
                href="/dashboard/billing"
                prefetch={true}
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                    e.preventDefault();
                    navigateToTab("billing");
                  }
                }}
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
            // 0ms optimistic active tab check: matches activeTab immediately upon click, with fallback to pathname for subroutes
            const isActive =
              activeTab === item.tab ||
              (activeTab === "subroute" && (
                item.href === "/dashboard"
                  ? (pathname === "/dashboard" || pathname === "/dashboard/")
                  : (pathname === item.href || (pathname?.startsWith(item.href + "/") ?? false))
              ));

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={(e) => {
                  if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                    e.preventDefault();
                    navigateToTab(item.tab);
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
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                navigateToTab("cases");
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
              if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                e.preventDefault();
                navigateToTab("clients");
              }
            }}
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors group cursor-pointer"
          >
            <span>Client Vault</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-white" />
          </Link>
        </div>

        {/* Trial Days Alert in Sidebar */}
        {isOnTrial && trialDaysLeft !== null && (
          <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-800/60 space-y-1.5">
            <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{trialDaysLeft} Days Left in Trial</span>
            </div>
            <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90 leading-tight">
              Upgrade to keep links active and unlock premium limits.
            </p>
            <Link
              href="/dashboard/billing"
              prefetch={true}
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault();
                  navigateToTab("billing");
                }
              }}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 dark:text-amber-200 hover:underline pt-0.5"
            >
              <span>Upgrade Plan</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        )}

        {/* Support Contact Info */}
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700/60 space-y-2">
          <p className="text-[11px] font-bold text-neutral-800 dark:text-neutral-200">
            Need Help / Support?
          </p>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
            Reach our support team directly for setup or billing assistance:
          </p>
          <div className="flex items-center gap-1.5 pt-0.5">
            <a
              href={`https://wa.me/${(process.env.NEXT_PUBLIC_CONTACT_PHONE || "+919718871979").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                `Hello! I need support with my DocGet account (${user?.email || ""}).`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold hover:bg-emerald-100 transition"
              title="Message Admin on WhatsApp"
            >
              <MessageSquare className="w-3 h-3" />
              <span>WhatsApp</span>
            </a>
            <a
              href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@docget.in"}?subject=DocGet Support Request`}
              className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-600 text-[10px] font-bold hover:bg-neutral-200 transition"
              title="Email Support"
            >
              <Mail className="w-3 h-3" />
              <span>Email</span>
            </a>
          </div>
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
              {getSafeInitials(user.fullName || user.email, "AD")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate group-hover:text-neutral-950 dark:group-hover:text-white">
                {user.fullName || (user.email ? user.email.split("@")[0] : "Advisor Profile")}
              </p>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                {isOnTrial
                  ? `Trial · ${trialDaysLeft ?? "?"} days left`
                  : sub?.planDisplayName || user.subscription?.planDisplayName || "Professional"}
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

export function ProfileMenu() {
  const { user, navigateToTab } = useDashboardData();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setLoggingOut(true);
    toast({ title: "Signing out...", description: "Clearing session." });
    try {
      clearClientDashboardCache();
      if (typeof window !== "undefined") {
        sessionStorage.clear();
      }
      await handleLogoutAction();
      window.location.href = "/login";
    } catch {
      clearClientDashboardCache();
      if (typeof window !== "undefined") {
        sessionStorage.clear();
      }
      window.location.href = "/login";
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  if (!user) {
    return <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />;
  }

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Account & Profile Menu"
        className={`flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border transition-all duration-150 cursor-pointer ${
          isOpen
            ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 ring-2 ring-neutral-400/20"
            : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-2xs"
        }`}
      >
        <UserAvatar
          src={user.logoUrl}
          name={user.fullName || user.email}
          size="sm"
        />
        <span className="hidden md:inline text-xs font-semibold text-neutral-800 dark:text-neutral-200 max-w-[100px] truncate">
          {(user.fullName || user.email || "Advisor").trim().split(/\s+/)[0]}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <UserAvatar
                src={user.logoUrl}
                name={user.fullName || user.email}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                  {user.fullName || "Advisor"}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                  {user.email || ""}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                    <Building2 className="w-2.5 h-2.5 text-neutral-400" />
                    <span className="truncate max-w-[130px]">{user.organizationName}</span>
                  </span>
                  {user.subscription && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      {user.subscription.status === "trial" ? "Trial" : user.subscription.planDisplayName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Appearance
              </span>
              <span className="text-[10px] text-neutral-400 font-mono capitalize min-w-[50px] text-right">
                {theme}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors duration-100 cursor-pointer ${
                      isSelected
                        ? "bg-white text-neutral-900 shadow-2xs border border-neutral-200 dark:bg-neutral-700 dark:text-white dark:border-neutral-600 font-bold"
                        : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white border border-transparent"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-2 py-1.5 border-b border-neutral-100 dark:border-neutral-800">
            <Link
              href="/dashboard/settings"
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                  e.preventDefault();
                  setIsOpen(false);
                  navigateToTab("/dashboard/settings");
                }
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <Settings className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              <span>Account & Org Settings</span>
            </Link>
            <Link
              href="/dashboard/billing"
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                  e.preventDefault();
                  setIsOpen(false);
                  navigateToTab("/dashboard/billing");
                }
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <CreditCard className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              <span>Subscription & Billing</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setIsRedeemModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors text-left cursor-pointer"
            >
              <Key className="w-4 h-4 text-amber-500" />
              <span>Redeem Activation Key</span>
            </button>
            <Link
              href="/dashboard/audit"
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                  e.preventDefault();
                  setIsOpen(false);
                  navigateToTab("/dashboard/audit");
                }
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              <span>Security & Audit Trail</span>
            </Link>
          </div>

          <div className="p-2">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={loggingOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>{loggingOut ? "Signing out..." : "Sign Out of DocGet"}</span>
            </button>
          </div>
        </div>
      )}

      <RedeemVoucherModal
        isOpen={isRedeemModalOpen}
        onClose={() => setIsRedeemModalOpen(false)}
      />
    </div>
  );
}

export function Header() {
  const { user, subscription, notifications, navigateToTab, isNavigating } = useDashboardData();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [seenIds, setSeenIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("docget_seen_notifications_v1");
      if (stored) {
        setSeenIds(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const unreadCount = notifications.filter((n) => !seenIds.includes(n.id)).length;

  const handleMarkAllAsRead = () => {
    const allIds = Array.from(new Set([...seenIds, ...notifications.map((n) => n.id)]));
    setSeenIds(allIds);
    try {
      localStorage.setItem("docget_seen_notifications_v1", JSON.stringify(allIds));
    } catch {}
  };

  const handleToggleNotifications = () => {
    const nextState = !showNotifications;
    setShowNotifications(nextState);
    if (nextState && unreadCount > 0) {
      // Mark as read when opening notifications
      handleMarkAllAsRead();
    }
  };

  const sub = subscription || user?.subscription;
  const planName = (sub?.plan_name || sub?.planName || "").toLowerCase();
  const isStarter = planName === "starter";
  const isFreeOrTrial = !planName || planName === "free_trial" || planName === "trial" || sub?.status === "trial";
  const isPaid = sub?.status === "active" && !isFreeOrTrial;
  const showUpgrade = !isPaid;
  const upgradeTarget = isStarter ? "Professional" : "Starter";

  return (
    <header className="h-16 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 sticky top-0 z-30 shrink-0 transition-colors duration-150 relative">
      {/* Sleek Optimistic Tab Navigation Micro Progress Bar */}
      {isNavigating && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-neutral-900 dark:via-white to-emerald-500 animate-pulse z-50 pointer-events-none" />
      )}
      <div className="max-w-7xl w-full mx-auto px-6 sm:px-8 h-full flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-h-8">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 text-xs border border-neutral-200/60 dark:border-neutral-700/60 font-medium shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">Active Workspace</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {showUpgrade && (
            <Link
              href="/dashboard/billing"
              title={`Upgrade to ${upgradeTarget} Plan`}
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey) {
                  e.preventDefault();
                  navigateToTab("/dashboard/billing");
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs hover:shadow transition-all group"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 transition-transform group-hover:rotate-12" />
              <span className="hidden sm:inline">Upgrade to {upgradeTarget}</span>
              <span className="sm:hidden">Upgrade</span>
            </Link>
          )}

          <ThemeToggle />

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              title={unreadCount > 0 ? `${unreadCount} new notifications` : "Notifications"}
              onClick={handleToggleNotifications}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors relative cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 ring-2 ring-white dark:ring-neutral-900 animate-pulse" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">Activity & Client Queries</span>
                  </div>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllAsRead}
                      className="text-[11px] font-semibold text-neutral-500 hover:text-emerald-600 dark:text-neutral-400 dark:hover:text-emerald-400 transition cursor-pointer"
                    >
                      Clear / Mark Read
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-center text-xs text-neutral-400 dark:text-neutral-500 py-6">No recent activity</p>
                  ) : (
                    notifications.slice(0, 8).map((n) => {
                      const isSeen = seenIds.includes(n.id);
                      return (
                        <div
                          key={n.id}
                          className={`p-3 rounded-xl border text-xs space-y-1 transition-opacity ${
                            n.type === "query"
                              ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/50"
                              : "bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200/80 dark:border-neutral-700/80"
                          } ${isSeen ? "opacity-75" : "opacity-100 ring-1 ring-emerald-500/20"}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5 truncate">
                              {n.type === "query" ? (
                                <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              ) : (
                                <FileUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              )}
                              <span className="truncate">{n.title}</span>
                            </span>
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1 shrink-0 ml-2">
                              <Clock className="w-2.5 h-2.5" />
                              {n.timestamp}
                            </span>
                          </div>
                          <p className="text-neutral-600 dark:text-neutral-300 text-[11px] leading-relaxed">{n.description}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" />

          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}

export function RedeemVoucherModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ message: string; planName?: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = () => {
    setCode("");
    setError(null);
    setSuccessData(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !mounted || typeof window === "undefined" || !window.document?.body) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError("Please enter your activation code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await redeemLicenseKeyAction({ code: cleanCode });
      if (!res.success) {
        setError(res.error || "Failed to redeem activation key.");
      } else {
        setSuccessData({
          message: res.message || "Your plan has been activated successfully!",
          planName: res.planName,
        });
        toast({
          title: "Voucher Redeemed!",
          description: res.message || "Your subscription is now active.",
        });
        clearClientDashboardCache();
        if (typeof window !== "undefined") {
          try {
            sessionStorage.clear();
          } catch {}
        }
        if (onSuccess) onSuccess();
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while redeeming voucher.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#15181e] rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        aria-labelledby="redeem-modal-title"
      >
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-start justify-between gap-3 bg-neutral-50/70 dark:bg-neutral-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-neutral-800 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Key className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 id="redeem-modal-title" className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                Redeem Activation Key / Voucher
              </h2>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Instant plan activation with zero waiting time
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            title="Close modal"
            className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {successData ? (
            <div className="py-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Plan Activated Successfully!
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">
                  {successData.message}
                </p>
              </div>
              <p className="text-[10px] text-neutral-400 dark:text-neutral-500 animate-pulse">
                Refreshing your dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="voucher-code"
                  className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300"
                >
                  Enter License Code
                </label>
                <div className="relative">
                  <input
                    id="voucher-code"
                    type="text"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase());
                      setError(null);
                    }}
                    placeholder="DOCU-PRO-YR-XXXX-XXXX"
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl border font-mono text-xs font-semibold tracking-wider bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border-neutral-300 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-400 transition-all placeholder:text-neutral-400 dark:placeholder:text-neutral-600 uppercase"
                  />
                </div>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                  Format: <span className="font-mono">DOCU-START-MO-...</span> or <span className="font-mono">DOCU-PRO-YR-...</span>
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in duration-100">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Single-use Cryptographic Voucher</span>
                </div>
                <p className="leading-relaxed text-amber-700 dark:text-amber-400">
                  Once redeemed, the key permanently upgrades your advisory firm account and is locked to prevent reuse.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Redeem Voucher</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}