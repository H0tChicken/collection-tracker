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

/**
 * Parse a pack-odds string into a rarity number = packs needed per card
 * (higher = rarer). Handles multiple figures like "1:6 hobby, 3:1 Mania" and
 * returns the EASIEST route (min packs-per-card). "1:250" → 250; "3:1" → 0.33.
 * Returns null when no ratio is found.
 */
export function oddsRarity(odds: string | null | undefined): number | null {
  if (!odds) return null;
  const matches = [...odds.matchAll(/(\d[\d,]*)\s*:\s*(\d[\d,]*)/g)];
  if (matches.length === 0) return null;
  let best = Infinity;
  for (const m of matches) {
    const a = Number(m[1].replace(/,/g, ""));
    const b = Number(m[2].replace(/,/g, ""));
    if (a > 0) best = Math.min(best, b / a); // packs per card
  }
  return Number.isFinite(best) ? best : null;
}

/**
 * Pick the odds figure to display for a parallel. Pack odds aren't comparable
 * across products, so prefer one channel: hobby → value → mania → whatever's
 * there. Returns the single "channel" segment, e.g. "1:67 hobby".
 */
export function displayOdds(odds: string | null | undefined): string | null {
  if (!odds) return null;
  // Each channel is "<ratio> <label>"; ratios contain commas (1:4,098), so
  // split on the comma that precedes the next ratio rather than every comma.
  const segments = odds
    .split(/,\s*(?=\d[\d,]*\s*:)/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return null;
  const pick = (kw: string) =>
    segments.find((s) => new RegExp(`\\b${kw}\\b`, "i").test(s));
  return pick("hobby") ?? pick("value") ?? pick("mania") ?? segments[0];
}

/**
 * Order parallels by rarity within a subset. Print run is the primary,
 * format-independent key (a /5 is objectively rarer than a /50, and a 1/1 is
 * always the chase). Unnumbered parallels come first (ordered by their pack
 * odds among themselves), then serial-numbered ones from highest run to lowest
 * (/250 … /10, /5, 1/1 last). Base is always first. Array#sort comparator.
 */
export function compareParallels(
  a: { isBase?: boolean; name: string; printRun: number | null; odds?: string | null },
  b: { isBase?: boolean; name: string; printRun: number | null; odds?: string | null },
): number {
  // Base always first.
  if (a.isBase && !b.isBase) return -1;
  if (b.isBase && !a.isBase) return 1;

  const an = a.printRun == null;
  const bn = b.printRun == null;
  // Unnumbered group before the numbered group.
  if (an !== bn) return an ? -1 : 1;

  if (an && bn) {
    // Both unnumbered: order by pack odds (easiest first), then name.
    const ra = oddsRarity(a.odds);
    const rb = oddsRarity(b.odds);
    if (ra != null && rb != null && ra !== rb) return ra - rb;
    if (ra != null && rb == null) return -1;
    if (rb != null && ra == null) return 1;
    return a.name.localeCompare(b.name);
  }

  // Both numbered: larger print run = easier = first; 1/1 ends up last.
  if (a.printRun !== b.printRun) return b.printRun! - a.printRun!;
  return a.name.localeCompare(b.name);
}

/**
 * Natural comparison for card numbers. Card numbers are strings that may be
 * plain ("1", "10"), prefixed ("RC-12", "MG-23"), or fully alphabetic
 * ("EKA-AG"). A plain DB string sort gives 1, 10, 11, 2…; this compares numeric
 * runs as numbers and text runs as text so 1, 2, 10 order correctly, and groups
 * by prefix (all "MG-" together, numerically within).
 */
export function compareCardNumbers(a: string, b: string): number {
  const ax = String(a);
  const bx = String(b);
  // Split into alternating non-digit / digit chunks.
  const re = /(\d+|\D+)/g;
  const at = ax.match(re) ?? [ax];
  const bt = bx.match(re) ?? [bx];
  const n = Math.min(at.length, bt.length);
  for (let i = 0; i < n; i++) {
    const ap = at[i];
    const bp = bt[i];
    const an = /^\d/.test(ap);
    const bn = /^\d/.test(bp);
    if (an && bn) {
      const d = Number.parseInt(ap, 10) - Number.parseInt(bp, 10);
      if (d !== 0) return d;
    } else {
      const d = ap.localeCompare(bp, undefined, { sensitivity: "base" });
      if (d !== 0) return d;
    }
  }
  return at.length - bt.length;
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
