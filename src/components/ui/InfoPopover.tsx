"use client";

import React, { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";

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
  iconClassName = "w-3.5 h-3.5 text-neutral-400 hover:text-neutral-700 transition-colors",
  buttonLabel,
}: InfoPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [effectiveAlign, setEffectiveAlign] = useState<"left" | "right" | "center">(align);
  const [effectiveSide, setEffectiveSide] = useState<"top" | "bottom">(side);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    if (containerRef.current && typeof window !== "undefined") {
      const rect = containerRef.current.getBoundingClientRect();
      const distFromRight = window.innerWidth - rect.right;
      const distFromLeft = rect.left;
      const distFromTop = rect.top;

      // Smart horizontal alignment: if close to right edge, flip to right-aligned
      if (distFromRight < 270) {
        setEffectiveAlign("right");
      } else if (distFromLeft < 140) {
        setEffectiveAlign("left");
      } else {
        setEffectiveAlign(align);
      }

      // Smart vertical alignment: if close to top edge, open downwards
      if (distFromTop < 140) {
        setEffectiveSide("bottom");
      } else {
        setEffectiveSide(side);
      }
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [isOpen]);

  const alignClasses =
    effectiveAlign === "right"
      ? "right-0"
      : effectiveAlign === "center"
      ? "left-1/2 -translate-x-1/2"
      : "left-0";

  const sideClasses =
    effectiveSide === "bottom"
      ? "top-full mt-1.5"
      : "bottom-full mb-1.5";

  const hasItems = items && items.length > 0;
  const displayText = text || content;

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        aria-label={title || "More information"}
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 rounded p-0.5 cursor-pointer ${
          buttonLabel ? "text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white bg-neutral-100/80 dark:bg-neutral-800 px-2 py-0.5 rounded-md" : ""
        }`}
      >
        <Info className={iconClassName} />
        {buttonLabel && <span>{buttonLabel}</span>}
      </button>

      {isOpen && (
        <div
          role="tooltip"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`absolute ${sideClasses} ${alignClasses} z-50 w-64 max-w-[calc(100vw-2rem)] bg-neutral-900 dark:bg-neutral-800 text-neutral-100 text-xs rounded-xl p-3 shadow-2xl border border-neutral-700/80 animate-in fade-in-0 zoom-in-95 pointer-events-auto select-text`}
          style={{ minWidth: "200px" }}
        >
          {title && (
            <p className="font-bold text-white mb-1 tracking-tight text-xs flex items-center gap-1.5">
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
            <ul className="space-y-1 mt-1 text-neutral-300 list-disc list-inside leading-relaxed">
              {items.map((item, idx) => (
                <li key={idx} className="text-[11px] text-neutral-300">
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Clean reusable popover for requirements / document checklist rules
 */
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
