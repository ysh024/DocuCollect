"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useDashboardData, pathToDashboardTab, DashboardTab } from "@/contexts/DashboardDataContext";

export function DashboardTabSkeleton({ tab }: { tab: DashboardTab }) {
  if (tab === "cases") {
    return (
      <div className="space-y-6 w-full pb-12 animate-in fade-in duration-150">
        {/* Header Shimmer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[48px]">
          <div className="space-y-2">
            <div className="h-6 w-56 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
            <div className="h-3.5 w-72 bg-neutral-100 dark:bg-neutral-800/60 rounded-md animate-pulse" />
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-36 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
            <div className="h-9 w-36 bg-neutral-900/20 dark:bg-neutral-700/60 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Search & Filters Shimmer */}
        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs flex flex-col md:flex-row gap-3">
          <div className="flex-1 h-10 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl animate-pulse" />
          <div className="w-full md:w-48 h-10 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl animate-pulse" />
        </div>

        {/* 6 Case Cards Shimmer */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-4 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                <div className="h-5 w-20 bg-neutral-100 dark:bg-neutral-800/70 rounded-full animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-5 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                <div className="h-3.5 w-1/2 bg-neutral-100 dark:bg-neutral-800/60 rounded animate-pulse" />
              </div>
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between">
                  <div className="h-3 w-20 bg-neutral-100 dark:bg-neutral-800/50 rounded animate-pulse" />
                  <div className="h-3 w-10 bg-neutral-100 dark:bg-neutral-800/50 rounded animate-pulse" />
                </div>
                <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div className="h-full w-2/5 bg-neutral-300 dark:bg-neutral-700 rounded-full animate-pulse" />
                </div>
              </div>
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/70 flex items-center justify-between">
                <div className="h-8 w-24 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
                <div className="h-8 w-24 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === "clients") {
    return (
      <div className="space-y-6 w-full pb-12 animate-in fade-in duration-150">
        {/* Header Shimmer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[48px]">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
            <div className="h-3.5 w-80 bg-neutral-100 dark:bg-neutral-800/60 rounded-md animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-28 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
            <div className="h-9 w-28 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
            <div className="h-9 w-32 bg-neutral-900/20 dark:bg-neutral-700/60 rounded-xl animate-pulse" />
          </div>
        </div>

        {/* Search Bar Shimmer */}
        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
          <div className="h-10 w-full bg-neutral-100 dark:bg-neutral-800/80 rounded-xl animate-pulse" />
        </div>

        {/* Clients Table Shimmer */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs overflow-hidden">
          <div className="h-11 bg-neutral-50/80 dark:bg-neutral-800/40 border-b border-neutral-100 dark:border-neutral-800 px-6 flex items-center justify-between">
            <div className="h-3.5 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            <div className="h-3.5 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse hidden md:block" />
            <div className="h-3.5 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-4 sm:px-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse shrink-0" />
                  <div className="space-y-1.5 min-w-0">
                    <div className="h-4 w-36 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                    <div className="h-3 w-48 bg-neutral-100 dark:bg-neutral-800/60 rounded animate-pulse" />
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-6">
                  <div className="h-4 w-28 bg-neutral-100 dark:bg-neutral-800/70 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-neutral-100 dark:bg-neutral-800/70 rounded-full animate-pulse" />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="h-8 w-20 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
                  <div className="h-8 w-8 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tab === "templates") {
    return (
      <div className="space-y-6 w-full pb-12 animate-in fade-in duration-150">
        {/* Header Shimmer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[48px]">
          <div className="space-y-2">
            <div className="h-6 w-52 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
            <div className="h-3.5 w-80 bg-neutral-100 dark:bg-neutral-800/60 rounded-md animate-pulse" />
          </div>
          <div className="h-9 w-40 bg-neutral-900/20 dark:bg-neutral-700/60 rounded-xl animate-pulse" />
        </div>

        {/* Filter Pills Shimmer */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 w-28 bg-neutral-200/70 dark:bg-neutral-800/80 rounded-xl animate-pulse shrink-0" />
          ))}
        </div>

        {/* Template Cards Grid Shimmer */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-3 shadow-xs"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="h-4 w-28 bg-neutral-100 dark:bg-neutral-800 rounded-full animate-pulse" />
                <div className="h-5 w-16 bg-neutral-100 dark:bg-neutral-800 rounded-md animate-pulse" />
              </div>
              <div className="h-5 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              <div className="h-3.5 w-full bg-neutral-100 dark:bg-neutral-800/60 rounded animate-pulse" />
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/70 flex justify-between items-center">
                <div className="h-4 w-24 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
                <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === "audit") {
    return (
      <div className="space-y-6 w-full pb-12 animate-in fade-in duration-150">
        {/* Header Shimmer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[48px]">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
            <div className="h-3.5 w-72 bg-neutral-100 dark:bg-neutral-800/60 rounded-md animate-pulse" />
          </div>
          <div className="h-9 w-32 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
        </div>

        {/* Audit Filter Shimmer */}
        <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs flex flex-col md:flex-row gap-3">
          <div className="flex-1 h-10 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl animate-pulse" />
          <div className="w-full md:w-48 h-10 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl animate-pulse" />
        </div>

        {/* Table Rows Shimmer */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs overflow-hidden">
          <div className="h-11 bg-neutral-50/80 dark:bg-neutral-800/40 border-b border-neutral-100 dark:border-neutral-800 px-6 flex items-center justify-between">
            <div className="h-3.5 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            <div className="h-3.5 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            <div className="h-3.5 w-28 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="p-4 sm:px-6 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-neutral-100 dark:bg-neutral-800/50 rounded animate-pulse" />
                </div>
                <div className="h-6 w-24 bg-neutral-100 dark:bg-neutral-800 rounded-full animate-pulse" />
                <div className="h-4 w-48 bg-neutral-100 dark:bg-neutral-800/70 rounded animate-pulse hidden sm:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tab === "billing") {
    return (
      <div className="space-y-6 w-full pb-12 animate-in fade-in duration-150">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
          <div className="h-3.5 w-72 bg-neutral-100 dark:bg-neutral-800/60 rounded-md animate-pulse" />
        </div>
        <div className="h-28 w-full bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-96 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 space-y-4 shadow-xs"
            >
              <div className="h-5 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              <div className="h-8 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              <div className="space-y-2 pt-4">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="h-3.5 w-full bg-neutral-100 dark:bg-neutral-800/60 rounded animate-pulse" />
                ))}
              </div>
              <div className="h-10 w-full bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse mt-6" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tab === "settings") {
    return (
      <div className="space-y-6 w-full pb-12 animate-in fade-in duration-150">
        <div className="space-y-2">
          <div className="h-6 w-40 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
          <div className="h-3.5 w-64 bg-neutral-100 dark:bg-neutral-800/60 rounded-md animate-pulse" />
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-200 dark:bg-neutral-800 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              <div className="h-8 w-24 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3.5 w-24 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                <div className="h-10 w-full bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
          <div className="h-10 w-36 bg-neutral-900/20 dark:bg-neutral-700/60 rounded-xl animate-pulse pt-2" />
        </div>
      </div>
    );
  }

  // Default Overview / Subroute Shimmer
  return (
    <div className="space-y-6 w-full pb-12 animate-in fade-in duration-150">
      {/* Header Shimmer */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[48px]">
        <div className="space-y-2">
          <div className="h-6 w-52 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
          <div className="h-3.5 w-80 bg-neutral-100 dark:bg-neutral-800/60 rounded-md animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
          <div className="h-9 w-28 bg-neutral-900/20 dark:bg-neutral-700/60 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* 4 Metric Cards Shimmer */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-2"
          >
            <div className="h-3.5 w-20 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            <div className="h-7 w-12 bg-neutral-300 dark:bg-neutral-700 rounded animate-pulse" />
            <div className="h-3 w-16 bg-neutral-100 dark:bg-neutral-800/60 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Live Direct Document Submissions Strip Shimmer */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <div className="h-4 w-44 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="h-4 w-16 bg-neutral-100 dark:bg-neutral-800/60 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200/70 dark:border-neutral-700/70 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse shrink-0" />
                <div className="space-y-1.5 min-w-0">
                  <div className="h-3.5 w-28 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                  <div className="h-2.5 w-36 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-7 w-16 bg-neutral-200 dark:bg-neutral-700 rounded-lg animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Active Pipeline List Shimmer */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-36 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="h-4 w-20 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-3.5 bg-neutral-50/70 dark:bg-neutral-800/40 rounded-xl border border-neutral-200/70 dark:border-neutral-700/70 flex items-center justify-between"
            >
              <div className="space-y-1.5">
                <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                <div className="h-3 w-28 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
              </div>
              <div className="h-7 w-20 bg-neutral-200 dark:bg-neutral-700 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Wraps dashboard children.
 * On instant tab switch, it immediately replaces the previous stale content
 * with a high-fidelity shimmer skeleton until the new route renders.
 */
export function DashboardTabContent({ children }: { children: React.ReactNode }) {
  const { activeTab, isNavigating } = useDashboardData();
  const pathname = usePathname();
  const currentRenderedTab = pathToDashboardTab(pathname || "");

  // If activeTab is a top-level tab and does not match the currently rendered pathname tab,
  // or if router is transitioning tabs, DO NOT stay on the previous content:
  const isSwitchingTab = (activeTab !== "subroute" && currentRenderedTab !== activeTab) || (isNavigating && currentRenderedTab !== activeTab);

  if (isSwitchingTab) {
    return <DashboardTabSkeleton tab={activeTab} />;
  }

  return <>{children}</>;
}
