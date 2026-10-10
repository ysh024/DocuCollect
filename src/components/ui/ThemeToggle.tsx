"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, toggleTheme, mounted } = useTheme();

  // Until mounted on client, render deterministic initial markup that matches SSR 100%
  if (!mounted) {
    return (
      <button
        type="button"
        title="Toggle theme appearance"
        aria-label="Toggle theme appearance"
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer group relative ${className}`}
      >
        <Moon className="w-4 h-4 text-neutral-500 transition-transform duration-300" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode (currently Dark)" : "Switch to dark mode (currently Light)"}
      aria-label="Toggle theme appearance"
      className={`w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer group relative ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 group-hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-neutral-600 dark:text-neutral-300 transition-transform duration-300 group-hover:-rotate-12" />
      )}
    </button>
  );
}
