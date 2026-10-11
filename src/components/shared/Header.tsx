"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Bell, MessageSquare, FileUp, Clock, Sparkles, Crown } from "lucide-react";
import { ProfileMenu } from "@/components/dashboard/ProfileMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useDashboardData } from "@/contexts/DashboardDataContext";

export function Header() {
  const { user, subscription, notifications } = useDashboardData();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const planName = (subscription?.plan_name || user?.subscription?.planName || "").toLowerCase();
  const isStarter = planName === "starter";
  const isFreeOrTrial = !planName || planName === "free_trial" || planName === "free" || planName === "trial";
  // For Pro and Firm, do not show any upgrade badge on the header
  const showUpgrade = isFreeOrTrial || isStarter;
  const upgradeTarget = isStarter ? "Professional" : "Starter";

  return (
    <header className="h-16 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 sticky top-0 z-30 shrink-0 transition-colors duration-150">
      <div className="max-w-7xl w-full mx-auto px-6 sm:px-8 h-full flex items-center justify-between">
        
        {/* Left: Clean Active Workspace Status Badge */}
        <div className="flex items-center gap-2.5 min-h-8">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 text-xs border border-neutral-200/60 dark:border-neutral-700/60 font-medium shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">Active Workspace</span>
          </div>
        </div>

        {/* Right: Quick actions, notifications, and clean profile menu */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {/* Quick Upgrade Plan Button: Only for Free/Trial -> Starter, and Starter -> Professional. Hidden for Pro & Firm. */}
          {showUpgrade && (
            <Link
              href="/dashboard/billing"
              title={`Upgrade to ${upgradeTarget} Plan`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs hover:shadow transition-all group"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 transition-transform group-hover:rotate-12" />
              <span className="hidden sm:inline">Upgrade to {upgradeTarget}</span>
              <span className="sm:hidden">Upgrade</span>
            </Link>
          )}

          {/* Quick 1-Click Dark/Light Mode Switcher */}
          <ThemeToggle />

          {/* Activity Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              title="Notifications"
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors relative cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              {notifications.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 ring-2 ring-white dark:ring-neutral-900" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">Activity & Client Queries</span>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-center text-xs text-neutral-400 dark:text-neutral-500 py-6">No recent activity.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          n.type === "query"
                            ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/50"
                            : "bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200/80 dark:border-neutral-700/80"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                            {n.type === "query" ? (
                              <MessageSquare className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                            ) : (
                              <FileUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            )}
                            {n.title}
                          </span>
                          <span className="text-[10px] text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {n.timestamp}
                          </span>
                        </div>
                        <p className="text-neutral-600 dark:text-neutral-300 text-[11px] leading-relaxed">{n.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" />

          {/* Clean Profile Menu on Right side (replaces scattered user info) */}
          <ProfileMenu />

        </div>
      </div>
    </header>
  );
}
