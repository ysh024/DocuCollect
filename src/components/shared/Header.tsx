"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, LogOut, Building2, MessageSquare, FileUp, Clock } from "lucide-react";
import { getCurrentUserAction, handleLogoutAction } from "@/app/actions/auth";
import { getAdvisorNotificationsAction } from "@/app/actions/portal";
import { useToast } from "@/components/ui/Toast";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: string;
}

import { useDashboardData } from "@/contexts/DashboardDataContext";

export function Header() {
  const { toast } = useToast();
  const { user, notifications } = useDashboardData();
  const [loggingOut, setLoggingOut] = useState(false);
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

  const handleSignOut = async () => {
    setLoggingOut(true);
    toast({ title: "Signing out...", description: "Clearing session." });
    try {
      await handleLogoutAction();
      window.location.href = "/login";
    } catch {
      window.location.href = "/login";
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="h-16 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 sticky top-0 z-30 shrink-0">
      <div className="max-w-7xl w-full mx-auto px-6 sm:px-8 h-full flex items-center justify-between">
        {/* Left: page context */}
        <div className="flex items-center gap-2 min-h-8">
          {user ? (
            <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-neutral-100/90 text-neutral-800 text-xs border border-neutral-200/80 font-semibold shadow-2xs">
              {user.logoUrl ? (
                <img
                  src={user.logoUrl}
                  alt={user.organizationName}
                  className="w-4 h-4 rounded-sm object-cover border border-neutral-200"
                />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-neutral-500" />
              )}
              <span className="truncate max-w-[200px]">{user.organizationName}</span>
            </div>
          ) : (
            <div className="hidden md:block w-32 h-6 rounded-lg bg-neutral-100 animate-pulse" />
          )}
        </div>

      {/* Right */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            title="Notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors relative"
          >
            <Bell className="w-3.5 h-3.5" />
            {notifications.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 ring-2 ring-white" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-neutral-200 p-4 z-50">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-neutral-900">Activity & Client Queries</span>
                </div>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <p className="text-center text-xs text-neutral-400 py-6">No recent activity.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        n.type === "query" ? "bg-amber-50/40 border-amber-200/80" : "bg-neutral-50 border-neutral-200/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                          {n.type === "query" ? (
                            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <FileUp className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          {n.title}
                        </span>
                        <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {n.timestamp}
                        </span>
                      </div>
                      <p className="text-neutral-600 text-[11px] leading-relaxed">{n.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-neutral-200" />

        {/* User */}
        {user ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-neutral-900 to-neutral-700 text-white text-[11px] font-semibold flex items-center justify-center shadow-xs">
              {getInitials(user.fullName)}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-semibold text-neutral-900 truncate max-w-[140px]">{user.fullName}</p>
              <p className="text-[10px] text-neutral-400 truncate max-w-[140px]">{user.email}</p>
            </div>
          </div>
        ) : (
          <div className="w-24 h-7 bg-neutral-100 rounded-lg animate-pulse" />
        )}

        {/* Sign Out */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={loggingOut}
          title="Sign Out"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-700 hover:text-rose-800 hover:bg-rose-50 border border-rose-200/60 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{loggingOut ? "..." : "Sign Out"}</span>
        </button>
      </div>
      </div>
    </header>
  );
}
