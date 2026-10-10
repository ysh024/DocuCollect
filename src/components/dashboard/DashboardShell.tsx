"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import DashboardOverviewPage from "@/app/dashboard/page";
import CasesListPage from "@/app/dashboard/cases/page";
import ChecklistTemplatesPage from "@/app/dashboard/templates/page";
import ClientsPage from "@/app/dashboard/clients/page";
import AuditTrailPage from "@/app/dashboard/audit/page";
import BillingPage from "@/app/dashboard/billing/page";
import SettingsPage from "@/app/dashboard/settings/page";

const TOP_LEVEL_TABS = new Set([
  "/dashboard",
  "/dashboard/cases",
  "/dashboard/templates",
  "/dashboard/clients",
  "/dashboard/audit",
  "/dashboard/billing",
  "/dashboard/settings",
]);

/**
 * High-performance dashboard shell.
 * Enables instant (<0.05s) tab switching between top-level tabs
 * while rendering detail subroutes (e.g. /dashboard/cases/[id]) seamlessly via {children}.
 */
export function DashboardShell({ children }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeTab, navigateToTab } = useDashboardData();

  // Intercept click ONLY for top-level tabs to achieve 0.05s instant transitions without full page reload
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;
      if (target.target === "_blank" || target.hasAttribute("download")) return;

      // If clicking one of the 7 top-level tabs
      if (TOP_LEVEL_TABS.has(href)) {
        // If currently on a subroute (e.g. /dashboard/cases/[id]), route back to the tab
        if (!TOP_LEVEL_TABS.has(window.location.pathname)) {
          e.preventDefault();
          router.push(href);
          navigateToTab(href);
          return;
        }

        e.preventDefault();
        navigateToTab(href);
        return;
      }

      // If clicking a subroute (e.g. /dashboard/cases/[id]), DO NOT preventDefault!
      // Next.js Link will navigate directly to the detail page and render {children}.
    };

    const scrollContainer = document.getElementById("dashboard-scroll-container");
    scrollContainer?.addEventListener("click", handleLinkClick);
    return () => scrollContainer?.removeEventListener("click", handleLinkClick);
  }, [navigateToTab, router]);

  // If the current route is a subroute (e.g. /dashboard/cases/[id]), render {children} directly
  const isSubRoute = !TOP_LEVEL_TABS.has(pathname);
  if (isSubRoute || activeTab === "subroute") {
    return <div className="w-full">{children}</div>;
  }

  return (
    <div className="w-full">
      {activeTab === "overview" && <DashboardOverviewPage />}
      {activeTab === "cases" && <CasesListPage />}
      {activeTab === "templates" && <ChecklistTemplatesPage />}
      {activeTab === "clients" && <ClientsPage />}
      {activeTab === "audit" && <AuditTrailPage />}
      {activeTab === "billing" && <BillingPage />}
      {activeTab === "settings" && <SettingsPage />}
    </div>
  );
}
