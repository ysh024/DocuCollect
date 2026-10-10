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

  // Close on outside click
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
    };
  }, [isOpen]);

  const alignClasses =
    align === "right"
      ? "right-0"
      : align === "center"
      ? "left-1/2 -translate-x-1/2"
      : "left-0";

  const sideClasses =
    side === "bottom"
      ? "top-full mt-1.5"
      : "bottom-full mb-1.5";

  const hasItems = items && items.length > 0;
  const displayText = text || content;

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
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
          buttonLabel ? "text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-100/80 px-2 py-0.5 rounded-md" : ""
        }`}
      >
        <Info className={iconClassName} />
        {buttonLabel && <span>{buttonLabel}</span>}
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className={`absolute ${sideClasses} ${alignClasses} z-50 w-64 max-w-xs bg-neutral-900 text-neutral-100 text-xs rounded-xl p-3 shadow-xl border border-neutral-800 animate-in fade-in-0 zoom-in-95 pointer-events-auto`}
          style={{ minWidth: "180px" }}
        >
          {title && (
            <p className="font-semibold text-white mb-1 tracking-tight text-xs flex items-center gap-1.5">
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
