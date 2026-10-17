"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Trash2,
  X,
  Loader2,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sun,
  Moon,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

/* =========================================================================
   1. TOAST NOTIFICATION SYSTEM
   ========================================================================= */

interface Toast {
  id: string;
  title: string;
  description?: string;
  type?: "success" | "error" | "info";
}

interface ToastContextType {
  toast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, type = "success" }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-3 p-3.5 bg-neutral-900 text-white rounded-xl shadow-xl border border-neutral-800 text-xs animate-in slide-in-from-bottom-3 duration-200"
          >
            {t.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {t.type === "error" && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
            {t.type === "info" && <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">{t.title}</p>
              {t.description && <p className="text-neutral-400 mt-0.5 text-[11px]">{t.description}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-neutral-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toast: (opts: { title: string; description?: string; type?: "success" | "error" | "info" }) => {
        console.log("Toast:", opts);
      },
    };
  }
  return context;
}

/* =========================================================================
   2. THEME SYSTEM & TOGGLE BUTTON
   ========================================================================= */

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

function disableTransitions() {
  if (typeof document === "undefined") return () => {};
  const css = document.createElement("style");
  css.appendChild(
    document.createTextNode(
      "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}"
    )
  );
  document.head.appendChild(css);
  return () => {
    // Force a reflow so DOM style changes apply instantly without transition
    (() => window.getComputedStyle(document.body))();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (css.parentNode) {
          css.parentNode.removeChild(css);
        }
      });
    });
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

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
      const restoreTransitions = disableTransitions();
      if (effective === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "light";
      }
      restoreTransitions();
    }
    return effective;
  }, []);

  useEffect(() => {
    setMounted(true);
    let savedTheme: Theme = "system";
    try {
      savedTheme = (localStorage.getItem("docget_theme") as Theme) || "system";
    } catch {}

    setThemeState(savedTheme);
    applyTheme(savedTheme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleMediaChange = () => {
      let current: Theme = "system";
      try {
        current = (localStorage.getItem("docget_theme") as Theme) || "system";
      } catch {}
      if (current === "system") {
        applyTheme("system");
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "docget_theme") {
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
      localStorage.setItem("docget_theme", newTheme);
    } catch {}
    applyTheme(newTheme);
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    const isCurrentlyDark = typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : resolvedTheme === "dark";

    const nextTheme: ResolvedTheme = isCurrentlyDark ? "light" : "dark";
    setTheme(nextTheme);
  }, [resolvedTheme, setTheme]);

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

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <button
        type="button"
        title="Toggle theme appearance"
        aria-label="Toggle theme appearance"
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer group relative ${className}`}
      >
        <Moon className="w-4 h-4 text-neutral-500" />
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
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
      )}
    </button>
  );
}

/* =========================================================================
   3. DELETE CONFIRMATION MODAL
   ========================================================================= */

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  fileName?: string;
  count?: number;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  fileName,
  count,
  confirmLabel = "Yes, Delete",
  cancelLabel = "Cancel",
  isLoading = false,
}: DeleteConfirmationModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 space-y-4 animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200/80 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
            {title}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {description}
          </p>

          {fileName && (
            <div className="mt-2.5 p-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/70 dark:border-neutral-800 rounded-xl flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                {fileName}
              </span>
            </div>
          )}

          {typeof count === "number" && count > 1 && (
            <div className="mt-2.5 p-2 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{count} files selected for permanent deletion.</span>
            </div>
          )}
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{confirmLabel}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   4. INFO POPOVER & REQUIREMENTS GUIDELINES
   ========================================================================= */

interface InfoPopoverProps {
  content?: React.ReactNode;
  text?: string;
  title?: string;
  items?: string[];
  align?: "left" | "center" | "right";
  side?: "top" | "bottom";
  className?: string;
  iconClassName?: string;
  buttonLabel?: string;
}

export function InfoPopover({
  content,
  text,
  title,
  items,
  align = "left",
  side = "top",
  className = "",
  iconClassName = "w-3.5 h-3.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors",
  buttonLabel,
}: InfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current || typeof window === "undefined") return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popoverWidth = 260;

    // Vertical placement
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let useBottom = side === "bottom";
    if (side === "top" && spaceAbove < 160 && spaceBelow > spaceAbove) {
      useBottom = true;
    } else if (side === "bottom" && spaceBelow < 160 && spaceAbove > spaceBelow) {
      useBottom = false;
    }

    // Horizontal placement
    let targetLeft: number;
    if (align === "right") {
      targetLeft = rect.right - popoverWidth;
    } else if (align === "center") {
      targetLeft = rect.left + rect.width / 2 - popoverWidth / 2;
    } else {
      targetLeft = rect.left;
    }

    // Viewport clamping
    const maxLeft = window.innerWidth - popoverWidth - 12;
    targetLeft = Math.max(12, Math.min(maxLeft, targetLeft));

    if (useBottom) {
      setCoords({
        top: Math.round(rect.bottom + 6),
        left: Math.round(targetLeft),
      });
    } else {
      setCoords({
        bottom: Math.round(window.innerHeight - rect.top + 6),
        left: Math.round(targetLeft),
      });
    }
  }, [side, align]);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    updatePosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [isOpen, updatePosition]);

  const hasItems = items && items.length > 0;
  const displayText = text || content;

  return (
    <div
      className={`inline-flex items-center align-middle ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isOpen) updatePosition();
          setIsOpen((prev) => !prev);
        }}
        aria-label={title || "More information"}
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 rounded p-0.5 cursor-pointer ${
          buttonLabel
            ? "text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100/80 dark:bg-neutral-800 px-2 py-0.5 rounded-md"
            : ""
        }`}
      >
        <Info className={iconClassName} />
        {buttonLabel && <span>{buttonLabel}</span>}
      </button>

      {isOpen &&
        mounted &&
        coords &&
        createPortal(
          <div
            ref={popoverRef}
            role="tooltip"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="fixed z-[99999] w-64 max-w-[calc(100vw-1.5rem)] bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-xs text-neutral-100 text-xs rounded-xl p-3.5 shadow-2xl border border-neutral-700/80 dark:border-neutral-600/80 animate-in fade-in-0 zoom-in-95 pointer-events-auto select-text"
            style={{
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              left: `${coords.left}px`,
            }}
          >
            {title && (
              <p className="font-bold text-white mb-1.5 tracking-tight text-xs flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                {title}
              </p>
            )}

            {displayText && (
              <div className="text-neutral-300 leading-relaxed font-normal">
                {displayText}
              </div>
            )}

            {hasItems && (
              <ul className="space-y-1.5 mt-1.5 text-neutral-300 list-disc list-inside leading-relaxed">
                {items.map((item, idx) => (
                  <li key={idx} className="text-[11px] text-neutral-300">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

export function RequirementsPopover({
  title = "Photo & Document Guidelines",
  items = [
    "Ensure documents are crisp and legible",
    "Capture all 4 corners in good lighting",
    "Avoid flash glare and extreme tilt",
    "Supported: PDF, JPG, PNG up to 10MB",
  ],
  buttonLabel = "Guidelines",
  align = "right",
}: {
  title?: string;
  items?: string[];
  buttonLabel?: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <InfoPopover
      title={title}
      items={items}
      buttonLabel={buttonLabel}
      align={align}
      iconClassName="w-3.5 h-3.5 text-neutral-500"
    />
  );
}

/* =========================================================================
   5. PAGINATION COMPONENT
   ========================================================================= */

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  itemLabel = "items",
  className = "",
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = Math.min(totalItems, (currentPage - 1) * pageSize + 1);
  const endItem = Math.min(totalItems, currentPage * pageSize);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={`px-4 sm:px-6 py-3.5 bg-white dark:bg-neutral-900 border-t border-neutral-200/80 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs transition-colors ${className}`}
    >
      <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400">
        <span>
          Showing <strong className="text-neutral-900 dark:text-neutral-100 font-semibold">{startItem}</strong>–
          <strong className="text-neutral-900 dark:text-neutral-100 font-semibold">{endItem}</strong> of{" "}
          <strong className="text-neutral-900 dark:text-neutral-100 font-semibold">{totalItems}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-3 border-l border-neutral-200 dark:border-neutral-800">
            <span className="text-[11px] text-neutral-400 dark:text-neutral-500">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs rounded-lg px-2 py-1 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 self-end sm:self-auto">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="First page"
          className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          title="Previous page"
          className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-neutral-400 dark:text-neutral-600 font-bold select-none">
                  …
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(p as number)}
                className={`min-w-[28px] h-7 px-2 rounded-lg font-semibold text-xs transition-all ${
                  isCurrent
                    ? "bg-neutral-900 dark:bg-emerald-600 text-white shadow-xs"
                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-800"
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          title="Next page"
          className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          title="Last page"
          className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   6. USER AVATAR & SAFE IMAGE WITH RESILIENT FALLBACKS
   ========================================================================= */

export function getSafeInitials(name?: string | null, fallback = "U"): string {
  if (!name || typeof name !== "string") return fallback;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length >= 2) {
    const first = parts[0][0] || "";
    const second = parts[1][0] || "";
    const combined = `${first}${second}`.toUpperCase();
    return combined || fallback;
  }
  return parts[0].slice(0, 2).toUpperCase() || fallback;
}

export function UserAvatar({
  src,
  name,
  size = "md",
  className = "",
  showBadge = false,
}: {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showBadge?: boolean;
}) {
  const [imageError, setImageError] = useState(false);
  const initials = getSafeInitials(name, "U");

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const sizeClasses = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-7 h-7 text-[11px]",
    md: "w-8 h-8 text-xs",
    lg: "w-10 h-10 text-sm",
    xl: "w-12 h-12 text-base",
  }[size];

  const hasValidImage = Boolean(src && !imageError);

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full select-none ${sizeClasses} ${className}`}
    >
      {hasValidImage ? (
        <img
          src={src!}
          alt={name || "Avatar"}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-full shadow-2xs"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-gradient-to-tr from-neutral-900 via-neutral-800 to-neutral-700 dark:from-neutral-700 dark:to-neutral-600 text-white font-bold flex items-center justify-center shadow-2xs">
          <span>{initials}</span>
        </div>
      )}
      {showBadge && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-neutral-900" />
      )}
    </div>
  );
}

export function SafeImage({
  src,
  alt,
  className = "",
  fallbackIcon,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackIcon?: React.ReactNode;
}) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [src]);

  if (!src || error) {
    return <>{fallbackIcon || null}</>;
  }

  return (
    <img
      src={src}
      alt={alt || "Image"}
      onError={() => setError(true)}
      className={className}
    />
  );
}
