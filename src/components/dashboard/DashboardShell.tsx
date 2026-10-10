"use client";

import React, { useEffect } from "react";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import DashboardOverviewPage from "@/app/dashboard/page";
import CasesListPage from "@/app/dashboard/cases/page";
import ChecklistTemplatesPage from "@/app/dashboard/templates/page";
import ClientsPage from "@/app/dashboard/clients/page";
import AuditTrailPage from "@/app/dashboard/audit/page";
import BillingPage from "@/app/dashboard/billing/page";
import SettingsPage from "@/app/dashboard/settings/page";

/**
 * High-performance dashboard shell.
 * Enables instant (<0.05s) tab switching just like the admin panel
 * while keeping URL history and deep links perfectly synchronized.
 */
export function DashboardShell({ children }: { children?: React.ReactNode }) {
  const { activeTab, navigateToTab } = useDashboardData();

  // Intercept any click on internal /dashboard/* links to achieve 0.05s instant transitions
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href || !href.startsWith("/dashboard")) return;
      if (target.target === "_blank" || target.hasAttribute("download")) return;

      e.preventDefault();
      navigateToTab(href);
    };

    const scrollContainer = document.getElementById("dashboard-scroll-container");
    scrollContainer?.addEventListener("click", handleLinkClick);
    return () => scrollContainer?.removeEventListener("click", handleLinkClick);
  }, [navigateToTab]);

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
