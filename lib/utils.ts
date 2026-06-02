import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conditional logic. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Build a clean display label for a set without duplicating tokens. The stored
 * `name` often already contains the brand and/or year (e.g. "Topps Chrome MLS
 * (2025)"), so we only prepend a prefix token when it isn't already present.
 */
export function setLabel(set: {
  name: string;
  brand?: string | null;
  year?: number | null;
  season?: string | null;
}): string {
  const name = set.name.trim();
  const lower = name.toLowerCase();
  const parts: string[] = [];
  // Season/year prefix only if the name doesn't already mention it.
  const period = set.season ?? (set.year != null ? String(set.year) : null);
  if (period && !lower.includes(period.toLowerCase())) parts.push(period);
  // Brand prefix only if the name doesn't already start with / contain it.
  if (set.brand && !lower.includes(set.brand.toLowerCase())) parts.push(set.brand);
  parts.push(name);
  return parts.join(" ");
}

/** Format a number as a percentage string, e.g. 0.73 -> "73%". */
export function pct(ratio: number): string {
  if (!Number.isFinite(ratio)) return "0%";
  return `${Math.round(ratio * 100)}%`;
}

/** Format a money value (stored as integer cents) into a display string. */
export function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/** Parse a user-entered money string into integer cents, or null. */
export function parseMoneyToCents(input: string | null | undefined): number | null {
  if (!input) return null;
  const cleaned = input.replace(/[^0-9.\-]/g, "");
  if (cleaned === "") return null;
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

/** Slugify a string for URLs. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
