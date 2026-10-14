"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { CaseWithDetails, Client } from "@/types";
import { getDashboardData, getAdvisorNotificationsAction } from "@/app/actions/portal";
import { getCurrentUserAction } from "@/app/actions/auth";
import { usePathname, useRouter } from "next/navigation";

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
  if (pathname === "/dashboard/cases") return "cases";
  if (pathname === "/dashboard/templates") return "templates";
  if (pathname === "/dashboard/clients") return "clients";
  if (pathname === "/dashboard/audit") return "audit";
  if (pathname === "/dashboard/billing") return "billing";
  if (pathname === "/dashboard/settings") return "settings";
  if (pathname === "/dashboard" || pathname === "/dashboard/") return "overview";
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
  activeTab: DashboardTab;
  navigateToTab: (target: DashboardTab | string) => void;
  refresh: (silent?: boolean) => Promise<void>;
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

export function DashboardDataProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => {
    return pathToDashboardTab(pathname || "/dashboard");
  });

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

    setActiveTab(tab);
    if (tab === "subroute") {
      router.push(targetPath);
    } else if (typeof window !== "undefined") {
      window.history.pushState({ tab }, "", targetPath);
    }

    // Instantly scroll content to top
    if (typeof window !== "undefined") {
      const scrollEl = document.getElementById("dashboard-scroll-container");
      if (scrollEl) scrollEl.scrollTop = 0;
    }
  }, [router]);

  // Initial state: never initialize with unverified cross-tenant global memory
  const [data, setData] = useState<DashboardData | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const fetchingRef = useRef(false);

  const refresh = useCallback(async (silent = false, forceFresh = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (!silent && !globalDashboardCache) {
      setLoading(true);
    }

    try {
      // 1. Fetch current user first to guarantee authenticated tenant boundary
      const currentUser = await getCurrentUserAction();
      const currentOrgId = currentUser?.organization_id || (currentUser as any)?.organizationId;

      if (!currentOrgId) {
        clearClientDashboardCache();
        setData(null);
        setUser(null);
        setNotifications([]);
        setLoading(false);
        fetchingRef.current = false;
        
        if (typeof window !== "undefined") {
          // Explicitly clear stale session cookies to avoid middleware redirect ping-pong loop
          document.cookie = "docucollect_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie = "better-auth.session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie = "better-auth_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          window.location.replace("/login?logout=1&reason=session_expired");
        }
        return;
      }

      // If active tenant changed, flush old tenant's cached data immediately
      if (activeCachedOrgId && activeCachedOrgId !== currentOrgId) {
        clearClientDashboardCache();
        setData(null);
      }
      activeCachedOrgId = currentOrgId;
      globalUserCache = currentUser;
      setUser(currentUser);

      // 2. Fetch fresh dashboard data and notifications strictly for this organization
      const [dashRes, notifsRes] = await Promise.all([
        getDashboardData({ forceFresh }),
        globalNotificationsCache.length === 0 || forceFresh
          ? getAdvisorNotificationsAction()
          : Promise.resolve(globalNotificationsCache),
      ]);

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
      }
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(false, false);
  }, [refresh]);


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
  const subscription = data?.subscription || user?.subscription || null;

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
        activeTab,
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
