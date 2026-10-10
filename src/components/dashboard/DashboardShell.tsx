"use client";

import React from "react";

/**
 * Clean dashboard shell wrapper.
 * Renders page children directly with Next.js App Router.
 */
export function DashboardShell({ children }: { children?: React.ReactNode }) {
  return <div className="w-full">{children}</div>;
}

