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

// Global in-memory and session cache shared across client-side page transitions
const SESSION_CACHE_KEY = "docucollect_dashboard_cache_v2";

function getStoredCache(): DashboardData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function setStoredCache(data: DashboardData) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(data));
  } catch {}
}

let globalDashboardCache: DashboardData | null = null;
let globalUserCache: any | null = null;
let globalNotificationsCache: any[] = [];
let lastFetchTimestamp = 0;
const CACHE_FRESHNESS_MS = 45000; // 45 seconds

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

  const [data, setData] = useState<DashboardData | null>(() => {
    return globalDashboardCache;
  });
  const [user, setUser] = useState<any | null>(globalUserCache);
  const [notifications, setNotifications] = useState<any[]>(globalNotificationsCache);
  const [loading, setLoading] = useState<boolean>(() => {
    return !globalDashboardCache;
  });
  const fetchingRef = useRef(false);

  const refresh = useCallback(async (silent = false, forceFresh = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (!silent && !globalDashboardCache && !getStoredCache()) {
      setLoading(true);
    }

    try {
      // Parallel fetch for user, dashboard data, and notifications
      const [dashRes, userRes, notifsRes] = await Promise.all([
        getDashboardData({ forceFresh }),
        !globalUserCache || forceFresh ? getCurrentUserAction() : Promise.resolve(globalUserCache),
        globalNotificationsCache.length === 0 || forceFresh
          ? getAdvisorNotificationsAction()
          : Promise.resolve(globalNotificationsCache),
      ]);

      if (dashRes) {
        globalDashboardCache = dashRes;
        setStoredCache(dashRes);
        setData(dashRes);
        lastFetchTimestamp = Date.now();
      }

      if (userRes) {
        globalUserCache = userRes;
        setUser(userRes);
      }

      if (notifsRes) {
        globalNotificationsCache = notifsRes;
        setNotifications(notifsRes);
      }
    } catch (err) {
      console.warn("Background dashboard data sync error:", err);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Hydrate from sessionStorage once client mounted without breaking SSR hydration
    if (!globalDashboardCache) {
      const stored = getStoredCache();
      if (stored) {
        globalDashboardCache = stored;
        setData(stored);
        setLoading(false);
      }
    }

    const hasCache = Boolean(globalDashboardCache || getStoredCache());
    const isStale = Date.now() - lastFetchTimestamp > CACHE_FRESHNESS_MS;
    if (!hasCache || isStale) {
      refresh(hasCache, false);
    }
  }, [refresh]);

  // Optimistic update helpers for instantaneous (<1ms) UI response on clicks
  const updateCaseOptimistically = useCallback(
    (caseId: string, updater: (prev: CaseWithDetails) => CaseWithDetails) => {
      setData((prev) => {
        if (!prev) return prev;
        const updatedCases = prev.cases.map((c) => (c.id === caseId ? updater(c) : c));
        const updated = { ...prev, cases: updatedCases };
        globalDashboardCache = updated;
        setStoredCache(updated);
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
        setStoredCache(updated);
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
