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
  className,
}: {
  param?: string;
  placeholder?: string;
  debounceMs?: number;
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
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-md border border-black/15 bg-white px-3 py-2 pr-9 text-sm dark:border-white/15 dark:bg-white/5"
      />
      {pending && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground/40">
          …
        </span>
      )}
    </div>
  );
}
