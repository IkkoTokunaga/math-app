"use client";

export function isPageHidden(): boolean {
  return typeof document !== "undefined" && document.hidden;
}
