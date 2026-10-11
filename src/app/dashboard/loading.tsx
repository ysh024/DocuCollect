export default function DashboardLoading() {
  return (
    <div className="space-y-6 w-full animate-pulse pb-12">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 min-h-[48px]">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
          <div className="h-3.5 w-72 bg-neutral-100 dark:bg-neutral-850 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
          <div className="h-9 w-28 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        </div>
      </div>

      {/* Hero / Stat Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 space-y-3"
          >
            <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-800 rounded" />
            <div className="h-7 w-14 bg-neutral-300 dark:bg-neutral-700 rounded-md" />
            <div className="h-2.5 w-24 bg-neutral-100 dark:bg-neutral-850 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="h-4 w-36 bg-neutral-200 dark:bg-neutral-800 rounded" />
          <div className="h-4 w-20 bg-neutral-100 dark:bg-neutral-850 rounded" />
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-14 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-100 dark:border-neutral-800 flex items-center justify-between px-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-700" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  <div className="h-2.5 w-24 bg-neutral-100 dark:bg-neutral-800 rounded" />
                </div>
              </div>
              <div className="h-7 w-20 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
