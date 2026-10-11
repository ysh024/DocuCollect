import { ArrowLeft, Loader2 } from "lucide-react";

export default function CaseDetailsLoading() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Animated Progress Line */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-emerald-100 dark:bg-emerald-950/60 overflow-hidden">
        <div className="h-full bg-emerald-600 animate-[pulse_1s_infinite] w-full" />
      </div>

      {/* Floating Status Indicator */}
      <div className="flex items-center justify-center pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
          <span>Opening case file & checklist...</span>
        </div>
      </div>

      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 animate-pulse">
            <ArrowLeft className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-1.5">
            <div className="w-24 h-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            <div className="w-48 h-6 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-28 h-9 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
          <div className="w-28 h-9 bg-neutral-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* 3 Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-subtle space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <div className="w-16 h-3 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
              <div className="w-4 h-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            </div>
            <div className="w-32 h-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            <div className="w-44 h-3 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Requirements List Skeleton */}
      <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-subtle overflow-hidden">
        <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="w-40 h-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        </div>
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="pt-3 first:pt-0 space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-48 h-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
                <div className="w-20 h-6 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
              </div>
              <div className="w-full h-12 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
