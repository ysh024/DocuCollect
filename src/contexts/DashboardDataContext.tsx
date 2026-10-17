"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useTransition,
} from "react";
import { CaseWithDetails, Client } from "@/types";
import { getDashboardData, getAdvisorNotificationsAction, redeemLicenseKeyAction } from "@/app/actions";
import { getCurrentUserAction } from "@/app/actions";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  CreditCard,
  MessageSquare,
  KeyRound,
  ArrowRight,
  ShieldAlert,
  Mail,
} from "lucide-react";
import { useToast } from "@/components/ui";

export interface DashboardMetrics {
  totalClients: number;
  activeCases: number;
  completedCases: number;
  pendingDocuments: number;
  casesPendingUpload: number;
  documentsAwaitingReview: number;
  casesAwaitingReview: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  clients: Client[];
  cases: CaseWithDetails[];
  subscription: any | null;
}

export type DashboardTab =
  | "overview"
  | "cases"
  | "templates"
  | "clients"
  | "audit"
  | "billing"
  | "settings"
  | "subroute";

export function pathToDashboardTab(pathname: string): DashboardTab {
  if (!pathname) return "overview";
  const clean = pathname.split("?")[0].replace(/\/$/, "") || "/dashboard";
  if (clean === "/dashboard/cases") return "cases";
  if (clean === "/dashboard/templates") return "templates";
  if (clean === "/dashboard/clients") return "clients";
  if (clean === "/dashboard/audit") return "audit";
  if (clean === "/dashboard/billing") return "billing";
  if (clean === "/dashboard/settings") return "settings";
  if (clean === "/dashboard") return "overview";
  return "subroute";
}

export function dashboardTabToPath(tab: DashboardTab): string {
  switch (tab) {
    case "cases":
      return "/dashboard/cases";
    case "templates":
      return "/dashboard/templates";
    case "clients":
      return "/dashboard/clients";
    case "audit":
      return "/dashboard/audit";
    case "billing":
      return "/dashboard/billing";
    case "settings":
      return "/dashboard/settings";
    default:
      return "/dashboard";
  }
}

interface DashboardContextValue {
  data: DashboardData | null;
  clients: Client[];
  cases: CaseWithDetails[];
  metrics: DashboardMetrics;
  user: any | null;
  subscription: any | null;
  notifications: any[];
  loading: boolean;
  error: string | null;
  activeTab: DashboardTab;
  isNavigating: boolean;
  navigateToTab: (target: DashboardTab | string) => void;
  refresh: (silent?: boolean, forceFresh?: boolean) => Promise<void>;
  updateCaseOptimistically: (caseId: string, updater: (prev: CaseWithDetails) => CaseWithDetails) => void;
  updateRequirementOptimistically: (caseId: string, reqId: string, newStatus: string) => void;
}

const DEFAULT_METRICS: DashboardMetrics = {
  totalClients: 0,
  activeCases: 0,
  completedCases: 0,
  pendingDocuments: 0,
  casesPendingUpload: 0,
  documentsAwaitingReview: 0,
  casesAwaitingReview: 0,
};

// Strictly tenant-isolated in-memory and session cache
const SESSION_CACHE_PREFIX = "docucollect_dashboard_cache_org_";
let activeCachedOrgId: string | null = null;
let globalDashboardCache: DashboardData | null = null;
let globalUserCache: any | null = null;
let globalNotificationsCache: any[] = [];
let lastFetchTimestamp = 0;
const CACHE_FRESHNESS_MS = 30000; // 30 seconds

export function clearClientDashboardCache() {
  globalDashboardCache = null;
  globalUserCache = null;
  globalNotificationsCache = [];
  lastFetchTimestamp = 0;
  activeCachedOrgId = null;
  if (typeof window !== "undefined") {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith("docucollect_dashboard_cache")) {
          keysToRemove.push(k);
        }
      }
      for (const k of keysToRemove) {
        sessionStorage.removeItem(k);
      }
    } catch {}
  }
}

function getStoredCache(orgId?: string | null): DashboardData | null {
  if (typeof window === "undefined" || !orgId) return null;
  try {
    const raw = sessionStorage.getItem(`${SESSION_CACHE_PREFIX}${orgId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Strict sanity check: ensure stored cases belong to the specified organization
      if (Array.isArray(parsed?.cases) && parsed.cases.length > 0) {
        if (parsed.cases.some((c: any) => c.organization_id && c.organization_id !== orgId)) {
          sessionStorage.removeItem(`${SESSION_CACHE_PREFIX}${orgId}`);
          return null;
        }
      }
      return parsed;
    }
  } catch {}
  return null;
}

function setStoredCache(data: DashboardData, orgId?: string | null) {
  if (typeof window === "undefined" || !orgId) return;
  try {
    sessionStorage.setItem(`${SESSION_CACHE_PREFIX}${orgId}`, JSON.stringify(data));
  } catch {}
}

const DashboardDataContext = createContext<DashboardContextValue | null>(null);

export function DashboardDataProvider({
  children,
  initialData = null,
  initialUser = null,
  initialNotifications = [],
}: {
  children: React.ReactNode;
  initialData?: DashboardData | null;
  initialUser?: any | null;
  initialNotifications?: any[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => {
    return pathToDashboardTab(pathname || "/dashboard");
  });
  const [isNavigating, startTransition] = useTransition();

  // Sync tab on browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(pathToDashboardTab(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Sync if pathname changes via Next.js router
  useEffect(() => {
    if (pathname) {
      setActiveTab(pathToDashboardTab(pathname));
    }
  }, [pathname]);

  const navigateToTab = useCallback((target: DashboardTab | string) => {
    const tab: DashboardTab = target.startsWith("/dashboard")
      ? pathToDashboardTab(target)
      : (target as DashboardTab);
    const targetPath = target.startsWith("/dashboard") ? target : dashboardTabToPath(tab);

    // 1. Optimistically switch active tab immediately in 0ms
    setActiveTab(tab);

    // 2. Instantly scroll content to top
    if (typeof window !== "undefined") {
      const scrollEl = document.getElementById("dashboard-scroll-container");
      if (scrollEl) scrollEl.scrollTop = 0;
    }

    // 3. Perform smooth non-blocking transition via Next.js router
    const currentClean = (pathname || "").split("?")[0].replace(/\/$/, "");
    const targetClean = targetPath.split("?")[0].replace(/\/$/, "");
    if (currentClean !== targetClean) {
      startTransition(() => {
        router.push(targetPath);
      });
    }
  }, [router, pathname]);

  // Initial state: populate immediately from SSR props or cache to eliminate loading window
  const [data, setData] = useState<DashboardData | null>(() => initialData || globalDashboardCache || null);
  const [user, setUser] = useState<any | null>(() => initialUser || globalUserCache || null);
  const [notifications, setNotifications] = useState<any[]>(() => (initialNotifications && initialNotifications.length > 0) ? initialNotifications : globalNotificationsCache);
  const [loading, setLoading] = useState<boolean>(() => !initialData && !globalDashboardCache);
  const [syncError, setSyncError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  // If initialData is provided, update in-memory cache
  if (initialData && !globalDashboardCache) {
    globalDashboardCache = initialData;
    lastFetchTimestamp = Date.now();
  }
  if (initialUser && !globalUserCache) {
    globalUserCache = initialUser;
    activeCachedOrgId = initialUser.organization_id || initialUser.organizationId;
  }
  if (initialNotifications && initialNotifications.length > 0 && globalNotificationsCache.length === 0) {
    globalNotificationsCache = initialNotifications;
  }

  const refresh = useCallback(async (silent = false, forceFresh = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (!silent && !globalDashboardCache) {
      setLoading(true);
    }

    try {
      setSyncError(null);
      let currentUser: any = null;
      let dashRes: any = null;
      let notifsRes: any[] = [];

      // 1. Primary Strategy: Dedicated HTTP API route with credentials
      try {
        const url = `/api/dashboard${forceFresh ? "?fresh=true" : ""}`;
        const response = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        });

        if (response.status === 401) {
          clearClientDashboardCache();
          setData(null);
          setUser(null);
          setNotifications([]);
          setLoading(false);
          fetchingRef.current = false;
          if (typeof window !== "undefined") {
            document.cookie = "docucollect_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = "better-auth.session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = "better-auth_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            window.location.replace("/login?logout=1&reason=session_expired");
          }
          return;
        }

        if (response.ok) {
          const json = await response.json();
          if (json.success && json.user && json.data) {
            currentUser = json.user;
            dashRes = json.data;
            notifsRes = json.notifications || [];
          }
        }
      } catch (fetchErr) {
        console.warn("Direct /api/dashboard fetch failed, trying Server Action fallback:", fetchErr);
      }

      // 2. Fallback Strategy: Server Actions
      if (!currentUser || !dashRes) {
        currentUser = await getCurrentUserAction();
        const currentOrgIdFallback = currentUser?.organization_id || (currentUser as any)?.organizationId;

        if (!currentOrgIdFallback) {
          clearClientDashboardCache();
          setData(null);
          setUser(null);
          setNotifications([]);
          setLoading(false);
          fetchingRef.current = false;

          if (typeof window !== "undefined") {
            document.cookie = "docucollect_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = "better-auth.session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            document.cookie = "better-auth_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
            window.location.replace("/login?logout=1&reason=session_expired");
          }
          return;
        }

        const actionDash = await getDashboardData({ forceFresh });
        let actionNotifs: any[] = [];
        try {
          actionNotifs = (globalNotificationsCache.length === 0 || forceFresh)
            ? await getAdvisorNotificationsAction()
            : globalNotificationsCache;
        } catch {
          actionNotifs = [];
        }
        dashRes = actionDash;
        notifsRes = actionNotifs || [];
      }

      const currentOrgId = currentUser?.organization_id || (currentUser as any)?.organizationId;
      if (!currentOrgId) {
        throw new Error("No organization found for current user");
      }

      // If active tenant changed, flush old tenant's cached data immediately
      if (activeCachedOrgId && activeCachedOrgId !== currentOrgId) {
        clearClientDashboardCache();
        setData(null);
      }
      activeCachedOrgId = currentOrgId;
      globalUserCache = currentUser;
      setUser(currentUser);

      // Hydrate stored cache if available
      const stored = getStoredCache(currentOrgId);
      if (stored && !dashRes) {
        setData(stored);
      }

      if (dashRes) {
        // Enforce that returned cases belong to this organization
        if (Array.isArray(dashRes.cases)) {
          const crossTenantRecord = dashRes.cases.find(
            (c: any) => c.organization_id && c.organization_id !== currentOrgId
          );
          if (crossTenantRecord) {
            console.error("Security alert: Cross-tenant data returned by server!", crossTenantRecord);
            throw new Error("SECURITY_VIOLATION_CROSS_TENANT_DATA");
          }
        }

        globalDashboardCache = dashRes;
        setStoredCache(dashRes, currentOrgId);
        setData(dashRes);
        setSyncError(null);
        lastFetchTimestamp = Date.now();
      }

      if (notifsRes) {
        globalNotificationsCache = notifsRes;
        setNotifications(notifsRes);
      }
    } catch (err: any) {
      console.warn("Background dashboard data sync error:", err);
      const msg = String(err?.message || "");
      if (msg.includes("UNAUTHENTICATED") && typeof window !== "undefined") {
        clearClientDashboardCache();
        document.cookie = "docucollect_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "better-auth.session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "better-auth_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        window.location.replace("/login?logout=1&reason=session_expired");
      } else {
        setSyncError(err?.message || "Database connection error. Unable to synchronize latest workspace data.");
      }
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // If SSR pre-hydrated data or cache is available, don't trigger a blocking reload
    if (initialData || globalDashboardCache) {
      return;
    }
    refresh(false, false);
  }, [refresh, initialData]);


  // Optimistic update helpers for instantaneous (<1ms) UI response on clicks
  const updateCaseOptimistically = useCallback(
    (caseId: string, updater: (prev: CaseWithDetails) => CaseWithDetails) => {
      setData((prev) => {
        if (!prev) return prev;
        const updatedCases = prev.cases.map((c) => (c.id === caseId ? updater(c) : c));
        const updated = { ...prev, cases: updatedCases };
        globalDashboardCache = updated;
        setStoredCache(updated, activeCachedOrgId);
        return updated;
      });
    },
    []
  );

  const updateRequirementOptimistically = useCallback(
    (caseId: string, reqId: string, newStatus: string) => {
      setData((prev) => {
        if (!prev) return prev;
        const updatedCases = prev.cases.map((c) => {
          if (c.id !== caseId) return c;
          const updatedReqs = c.requirements.map((r) =>
            r.id === reqId ? { ...r, status: newStatus as any } : r
          );
          return { ...c, requirements: updatedReqs };
        });
        const updated = { ...prev, cases: updatedCases };
        globalDashboardCache = updated;
        setStoredCache(updated, activeCachedOrgId);
        return updated;
      });
    },
    []
  );

  const metrics = data?.metrics || DEFAULT_METRICS;
  const clients = data?.clients || [];
  const cases = data?.cases || [];

  // Intelligent resolution of subscription: prioritize active paid plan over stale trial cache
  const chooseBestSub = (subA: any, subB: any) => {
    if (!subA && !subB) return null;
    if (!subA) return subB;
    if (!subB) return subA;
    const isPaidA =
      subA.status === "active" &&
      (subA.plan_name === "pro" ||
        subA.plan_name === "starter" ||
        subA.plan_name === "firm" ||
        subA.plan_name === "professional" ||
        subA.planName === "pro" ||
        subA.planName === "starter" ||
        subA.planName === "firm" ||
        subA.planName === "professional");
    const isPaidB =
      subB.status === "active" &&
      (subB.plan_name === "pro" ||
        subB.plan_name === "starter" ||
        subB.plan_name === "firm" ||
        subB.plan_name === "professional" ||
        subB.planName === "pro" ||
        subB.planName === "starter" ||
        subB.planName === "firm" ||
        subB.planName === "professional");
    if (isPaidA && !isPaidB) return subA;
    if (isPaidB && !isPaidA) return subB;
    return subA || subB;
  };
  const rawSub = chooseBestSub(data?.subscription, user?.subscription);

  const rawPlanName = (rawSub?.plan_name || rawSub?.planName || "free_trial").toLowerCase();
  const isPaidTier =
    rawPlanName === "pro" ||
    rawPlanName === "professional" ||
    rawPlanName === "starter" ||
    rawPlanName === "firm";
  const isExplicitExpired = rawSub?.status === "expired" || rawSub?.status === "cancelled";
  const normalizedStatus = isPaidTier ? (isExplicitExpired ? "expired" : "active") : (rawSub?.status || "trial");

  const normalizedPlanDisplayName =
    (rawPlanName === "pro" || rawPlanName === "professional")
      ? "Professional"
      : rawPlanName === "starter"
      ? "Starter"
      : rawPlanName === "firm"
      ? "Firm"
      : rawSub?.plan_display_name || rawSub?.planDisplayName || "Free Trial";

  const subscription = rawSub
    ? {
        ...rawSub,
        status: normalizedStatus,
        plan_name: rawPlanName === "professional" ? "pro" : rawPlanName,
        planName: rawPlanName === "professional" ? "pro" : rawPlanName,
        plan_display_name: normalizedPlanDisplayName,
        planDisplayName: normalizedPlanDisplayName,
        trial_ends_at: isPaidTier ? null : (rawSub.trial_ends_at || rawSub.trialEndsAt),
        trialEndsAt: isPaidTier ? null : (rawSub.trialEndsAt || rawSub.trial_ends_at),
        current_period_end: rawSub.current_period_end || rawSub.currentPeriodEnd,
        currentPeriodEnd: rawSub.currentPeriodEnd || rawSub.current_period_end,
        max_clients: rawSub.max_clients || rawSub.maxClients || (isPaidTier ? (rawPlanName === "starter" ? 50 : 200) : 10),
        maxClients: rawSub.maxClients || rawSub.max_clients || (isPaidTier ? (rawPlanName === "starter" ? 50 : 200) : 10),
        file_retention_days: rawSub.file_retention_days || rawSub.fileRetentionDays || (isPaidTier ? 45 : 14),
        fileRetentionDays: rawSub.fileRetentionDays || rawSub.file_retention_days || (isPaidTier ? 45 : 14),
        max_storage_mb: rawSub.max_storage_mb || rawSub.maxStorageMb || (isPaidTier ? 5120 : 500),
        maxStorageMb: rawSub.maxStorageMb || rawSub.max_storage_mb || (isPaidTier ? 5120 : 500),
      }
    : null;

  return (
    <DashboardDataContext.Provider
      value={{
        data,
        clients,
        cases,
        metrics,
        user,
        subscription,
        notifications,
        loading,
        error: syncError,
        activeTab,
        isNavigating,
        navigateToTab,
        refresh,
        updateCaseOptimistically,
        updateRequirementOptimistically,
      }}
    >
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (!context) {
    throw new Error("useDashboardData must be used within a DashboardDataProvider");
  }
  return context;
}

export function TrialExpiryGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { toast } = useToast();
  const { subscription: contextSub, user, refresh } = useDashboardData();
  const [localSub, setLocalSub] = useState<any>(null);
  const subscription = localSub || contextSub;

  const [showCodeInput, setShowCodeInput] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);

  const handleQuickActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) return;

    setActivating(true);
    try {
      const res = await redeemLicenseKeyAction({
        code: licenseKey.trim(),
      });

      if (res.success) {
        toast({ title: "Account Upgraded!", description: res.message });
        setLicenseKey("");
        setShowCodeInput(false);
        clearClientDashboardCache();
        if (typeof window !== "undefined") {
          try { sessionStorage.clear(); } catch {}
        }
        await refresh(false, true);
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        toast({ title: "Redemption Failed", description: res.error || "Invalid license key" });
      }
    } finally {
      setActivating(false);
    }
  };

  if (user?.isDeactivated) {
    const adminPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE || "+919718871979";
    const cleanPhone = adminPhone.replace(/[^0-9]/g, "");
    const adminEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "support@docget.in";
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
      `Hello! My account (${user?.email || ""}) has been deactivated. Please assist with reactivation.`
    )}`;
    const mailtoUrl = `mailto:${adminEmail}?subject=${encodeURIComponent(
      `Account Reactivation Request - ${user?.email || ""}`
    )}&body=${encodeURIComponent(
      `Hello DocGet Admin,\n\nMy account (${user?.email || ""}) is currently deactivated. Please assist me in reactivating my account.\n\nThank you.`
    )}`;

    return (
      <div className="py-12 max-w-xl mx-auto space-y-6 px-4">
        <div className="bg-white dark:bg-neutral-900 border-2 border-rose-300 dark:border-rose-900/60 rounded-3xl p-8 sm:p-10 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto shadow-inner">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              Account Suspended
            </span>
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white mt-2">
              Your Account Has Been Deactivated
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
              An administrator has deactivated this workspace account. Access to cases, client vaults, and document uploads has been temporarily paused. Please contact us to reactivate your account.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition group cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Direct Chat</p>
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200 mt-0.5">WhatsApp Support</p>
              </div>
              <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </a>

            <a
              href={mailtoUrl}
              className="flex items-center justify-between p-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition group cursor-pointer"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">Email Admin</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">{adminEmail}</p>
              </div>
              <Mail className="w-5 h-5 text-neutral-600 dark:text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>

          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/login";
              }}
              className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition cursor-pointer"
            >
              Sign out of this account →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return <>{children}</>;
  }

  const now = new Date();
  const isTrial = subscription.status === "trial";
  const isExpiredStatus = subscription.status === "expired";
  const trialEnds = subscription.trial_ends_at || subscription.trialEndsAt;
  const periodEnd = subscription.current_period_end || subscription.currentPeriodEnd;
  const trialExpired = isTrial && trialEnds && new Date(trialEnds) < now;
  const planExpired = subscription.status === "active" && periodEnd && new Date(periodEnd) < now;

  const isBlocked = isExpiredStatus || trialExpired || planExpired;
  const isBillingPage = pathname === "/dashboard/billing";

  if (isBlocked && !isBillingPage) {
    const adminPhone = process.env.NEXT_PUBLIC_CONTACT_PHONE || "+919718871979";
    const cleanPhone = adminPhone.replace(/[^0-9]/g, "");
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
      "Hello! My trial for DocGet has ended and I would like to renew my subscription plan."
    )}`;

    return (
      <div className="py-8 max-w-2xl mx-auto space-y-6">
        <div className="bg-white border-2 border-amber-300 rounded-2xl p-8 sm:p-10 shadow-lg text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
              Subscription Required
            </span>
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 mt-2">
              Your Free Trial Has Ended
            </h2>
            <p className="text-sm text-neutral-600 max-w-md mx-auto leading-relaxed">
              We hope DocGet helped your firm streamline client document collection! To continue creating cases, adding clients, and sharing secure upload links, please upgrade your subscription.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left">
            <Link
              href="/dashboard/billing"
              className="flex items-center justify-between p-4 rounded-xl border-2 border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-800 transition group"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Step 1</p>
                <p className="text-sm font-bold text-white mt-0.5">Pay via UPI / Bank</p>
              </div>
              <CreditCard className="w-5 h-5 text-neutral-300 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 transition group"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Step 2</p>
                <p className="text-sm font-bold text-emerald-900 mt-0.5">Contact on WhatsApp</p>
              </div>
              <MessageSquare className="w-5 h-5 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>

          <div className="border-t border-neutral-200 pt-5 text-center">
            <button
              onClick={() => setShowCodeInput(!showCodeInput)}
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1.5 transition"
            >
              <KeyRound className="w-3.5 h-3.5" />
              {showCodeInput ? "Hide license key input" : "Have a one-time license key or voucher?"}
            </button>

            {showCodeInput && (
              <form onSubmit={handleQuickActivate} className="mt-4 max-w-sm mx-auto flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. DOCU-PRO-YR-..."
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
                <button
                  type="submit"
                  disabled={activating || !licenseKey.trim()}
                  className="px-4 py-2 bg-neutral-900 text-white text-xs font-bold rounded-lg hover:bg-neutral-800 transition disabled:opacity-50"
                >
                  {activating ? "Redeeming..." : "Redeem"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  const trialDaysLeft = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const showTrialBanner = isTrial && !isBlocked && trialDaysLeft !== null;

  return (
    <>
      {showTrialBanner && (
        <div className="mb-6 p-3 sm:p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 dark:from-amber-950/40 dark:via-amber-900/30 dark:to-amber-950/40 border border-amber-300/80 dark:border-amber-800/60 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
            <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-xs">
              ⏳
            </div>
            <div>
              <span className="font-bold">{trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} left</span> in your Free Trial. Upgrade anytime to keep links active and unlock premium limits.
            </div>
          </div>
          <Link
            href="/dashboard/billing"
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition shrink-0 flex items-center gap-1.5"
          >
            <span>Upgrade Plan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
      {children}
    </>
  );
}
