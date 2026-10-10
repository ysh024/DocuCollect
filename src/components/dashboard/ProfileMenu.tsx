"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Settings,
  CreditCard,
  ShieldCheck,
  LogOut,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
  Building2,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useTheme, Theme } from "@/contexts/ThemeContext";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { handleLogoutAction } from "@/app/actions/auth";
import { useToast } from "@/components/ui/Toast";

export function ProfileMenu() {
  const { user } = useDashboardData();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

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

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  if (!user) {
    return <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 animate-pulse" />;
  }

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="relative" ref={menuRef}>
      {/* Sleek Profile Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Account & Profile Menu"
        className={`flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border transition-all duration-150 cursor-pointer ${
          isOpen
            ? "bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 ring-2 ring-neutral-400/20"
            : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 shadow-2xs"
        }`}
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-neutral-900 via-neutral-800 to-neutral-700 dark:from-neutral-700 dark:to-neutral-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
          {getInitials(user.fullName)}
        </div>
        <span className="hidden md:inline text-xs font-semibold text-neutral-800 dark:text-neutral-200 max-w-[100px] truncate">
          {user.fullName.split(" ")[0]}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Profile Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-neutral-900 to-neutral-700 dark:from-neutral-700 dark:to-neutral-500 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                {getInitials(user.fullName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                  {user.fullName}
                </p>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                  {user.email}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                    <Building2 className="w-2.5 h-2.5 text-neutral-400" />
                    <span className="truncate max-w-[130px]">{user.organizationName}</span>
                  </span>
                  {user.subscription && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      {user.subscription.status === "trial" ? "Trial" : user.subscription.planDisplayName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Appearance / Theme Options */}
          <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Appearance
              </span>
              <span className="text-[10px] text-neutral-400 font-mono capitalize">
                {theme === "system" ? `System (${resolvedTheme})` : theme}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs border border-neutral-200/80 dark:border-neutral-700"
                        : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Nav Links */}
          <div className="px-2 py-1.5 border-b border-neutral-100 dark:border-neutral-800">
            <Link
              href="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <Settings className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              <span>Account & Org Settings</span>
            </Link>
            <Link
              href="/dashboard/billing"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <CreditCard className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              <span>Subscription & Billing</span>
            </Link>
            <Link
              href="/dashboard/audit"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
              <span>Security & Audit Trail</span>
            </Link>
          </div>

          {/* Sign Out */}
          <div className="p-2">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={loggingOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>{loggingOut ? "Signing out..." : "Sign Out of DocuCollect"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
