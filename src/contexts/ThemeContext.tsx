"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  mounted: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  // Apply theme to document with style.colorScheme support
  const applyTheme = useCallback((targetTheme: Theme) => {
    let effective: ResolvedTheme = "light";
    if (targetTheme === "system") {
      const systemDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
      effective = systemDark ? "dark" : "light";
    } else {
      effective = targetTheme;
    }

    setResolvedTheme(effective);

    if (typeof document !== "undefined") {
      if (effective === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "light";
      }
    }
    return effective;
  }, []);

  useEffect(() => {
    setMounted(true);
    let savedTheme: Theme = "system";
    try {
      savedTheme = (localStorage.getItem("docucollect_theme") as Theme) || "system";
    } catch {}

    setThemeState(savedTheme);
    applyTheme(savedTheme);

    // Watch OS system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => {
      let current: Theme = "system";
      try {
        current = (localStorage.getItem("docucollect_theme") as Theme) || "system";
      } catch {}
      if (current === "system") {
        applyTheme("system");
      }
    };

    // Watch cross-tab or external storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "docucollect_theme") {
        const next = (e.newValue as Theme) || "system";
        setThemeState(next);
        applyTheme(next);
      }
    };

    mediaQuery.addEventListener("change", handleMediaChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      mediaQuery.removeEventListener("change", handleMediaChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [applyTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem("docucollect_theme", newTheme);
    } catch {}
    applyTheme(newTheme);
  }, [applyTheme]);

  // Guaranteed deterministic toggle: reads the live document class to prevent desync
  const toggleTheme = useCallback(() => {
    const isCurrentlyDark = typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : resolvedTheme === "dark";

    const nextTheme: ResolvedTheme = isCurrentlyDark ? "light" : "dark";
    setTheme(nextTheme);
  }, [resolvedTheme, setTheme]);

  // Cycle through all 3 modes: light -> dark -> system -> light
  const cycleTheme = useCallback(() => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, mounted, setTheme, toggleTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
