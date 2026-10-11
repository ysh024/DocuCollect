"use client";

import React, { useMemo } from "react";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import DashboardOverviewPage from "@/app/dashboard/page";
import CasesListPage from "@/app/dashboard/cases/page";
import ClientsListPage from "@/app/dashboard/clients/page";
import TemplatesPage from "@/app/dashboard/templates/page";
import BillingPage from "@/app/dashboard/billing/page";
import SettingsPage from "@/app/dashboard/settings/page";
import AuditTrailPage from "@/app/dashboard/audit/page";

interface DashboardTabContainerProps {
  children: React.ReactNode;
}

export function DashboardTabContainer({ children }: DashboardTabContainerProps) {
  const { activeTab } = useDashboardData();

  // If currently browsing a deep subroute (like /dashboard/cases/[id]), render native page children
  if (activeTab === "subroute") {
    return <>{children}</>;
  }

  // Instant 0ms client-side tab switching without waiting for RSC server round-trips
  switch (activeTab) {
    case "cases":
      return <CasesListPage />;
    case "clients":
      return <ClientsListPage />;
    case "templates":
      return <TemplatesPage />;
    case "billing":
      return <BillingPage />;
    case "settings":
      return <SettingsPage />;
    case "audit":
      return <AuditTrailPage />;
    case "overview":
    default:
      return <DashboardOverviewPage />;
  }
}
