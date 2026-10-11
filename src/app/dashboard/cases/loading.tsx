import { Loader2 } from "lucide-react";

export default function CasesListLoading() {
  return (
    <div className="space-y-6 w-full pb-16 animate-in fade-in duration-200">
      {/* Top Animated Progress Line */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-emerald-100 dark:bg-emerald-950/60 overflow-hidden">
        <div className="h-full bg-emerald-600 animate-[pulse_1s_infinite] w-full" />
      </div>

      {/* Floating Status Indicator */}
      <div className="flex items-center justify-center pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
          <span>Loading cases list...</span>
        </div>
      </div>

      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          <div className="w-40 h-6 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          <div className="w-64 h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="w-32 h-9 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
      </div>

      {/* Search & Filter Bar Skeleton */}
      <div className="h-14 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800 animate-pulse" />

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-20 h-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              <div className="w-16 h-4 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
            </div>
            <div className="w-36 h-5 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            <div className="w-28 h-3 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
              <div className="w-20 h-3 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              <div className="w-16 h-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
