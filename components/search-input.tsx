"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Reactive search box: updates the `param` query string as you type (debounced),
 * so the server component re-queries without an explicit submit. Keeps the
 * efficient server-side filtering rather than loading everything client-side.
 */
export function SearchInput({
  param = "q",
  placeholder = "Search…",
  debounceMs = 250,
  clearParams,
  className,
}: {
  param?: string;
  placeholder?: string;
  debounceMs?: number;
  /** Params to remove from the URL whenever the search value changes (e.g. ["page"]). */
  clearParams?: string[];
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(param) ?? "");
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Push the (debounced) value into the URL query string.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(param, value);
      else params.delete(param);
      clearParams?.forEach((p) => params.delete(p));
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    }, debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // Re-run when the typed value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <svg
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-full bg-surface-highest py-3 pl-12 pr-10 text-body-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      {pending && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-body-sm text-on-surface-variant">
          …
        </span>
      )}
    </div>
  );
}
