import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Material Design 3 surface card. `variant` follows MD3 card types:
 * - "elevated": surface-container-low + elevation shadow
 * - "filled": surface-container-highest, no shadow
 * - "outlined": surface + outline border
 */
export function Card({
  children,
  className,
  variant = "elevated",
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "elevated" | "filled" | "outlined";
  interactive?: boolean;
}) {
  const base = {
    elevated: "bg-surface-low md-elev-1",
    filled: "bg-surface-highest",
    outlined: "bg-surface border border-outline-variant",
  }[variant];
  return (
    <div
      className={cn(
        "rounded-lg p-4 text-on-surface",
        base,
        interactive && "transition-shadow hover:md-elev-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-display-sm font-normal tracking-tight text-on-background">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-body-md text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/**
 * MD3 chip / badge. Tone names kept for API compatibility but mapped to
 * Material container color roles.
 */
export function Badge({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: "gray" | "blue" | "green" | "amber" | "red";
}) {
  const tones: Record<string, string> = {
    gray: "bg-surface-variant text-on-surface-variant",
    blue: "bg-secondary-container text-on-secondary-container",
    green: "bg-primary-container text-on-primary-container",
    amber: "bg-tertiary-container text-on-tertiary-container",
    red: "bg-error-container text-on-error-container",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-label-md",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

/** MD3 button. */
export function Button({
  children,
  variant = "filled",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "filled" | "tonal" | "outlined" | "text";
}) {
  const variants = {
    filled: "bg-primary text-on-primary hover:md-elev-1",
    tonal: "bg-secondary-container text-on-secondary-container hover:md-elev-1",
    outlined: "border border-outline text-primary hover:bg-primary/[0.08]",
    text: "text-primary hover:bg-primary/[0.08]",
  }[variant];
  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-label-lg transition-all disabled:opacity-50",
        variants,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Link styled as an MD3 filled button. */
export function ButtonLink({
  children,
  href,
  variant = "filled",
  className,
}: {
  children: React.ReactNode;
  href: string;
  variant?: "filled" | "tonal" | "outlined" | "text";
  className?: string;
}) {
  const variants = {
    filled: "bg-primary text-on-primary hover:md-elev-1",
    tonal: "bg-secondary-container text-on-secondary-container hover:md-elev-1",
    outlined: "border border-outline text-primary hover:bg-primary/[0.08]",
    text: "text-primary hover:bg-primary/[0.08]",
  }[variant];
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-label-lg transition-all",
        variants,
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
}) {
  const body = (
    <Card variant="filled" interactive className="h-full">
      <div className="text-label-md uppercase tracking-wide text-on-surface-variant">
        {label}
      </div>
      <div className="mt-1 text-headline-sm font-normal text-on-surface">
        {value}
      </div>
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-outline-variant p-10 text-center text-body-md text-on-surface-variant">
      {message}
    </div>
  );
}

/**
 * MD3 segmented button group, link-based (each segment is a URL — fits our
 * filter toggles). The selected segment gets a secondary-container fill with a
 * check, matching the Material 3 single-select pattern.
 */
export function SegmentedButtons({
  segments,
}: {
  segments: { label: string; href: string; selected: boolean }[];
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-full border border-outline">
      {segments.map((s, i) => (
        <Link
          key={s.href}
          href={s.href}
          aria-pressed={s.selected}
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 text-label-lg transition-colors",
            i > 0 && "border-l border-outline",
            s.selected
              ? "bg-secondary-container text-on-secondary-container"
              : "text-on-surface hover:bg-on-surface/[0.08]",
          )}
        >
          {s.selected && (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {s.label}
        </Link>
      ))}
    </div>
  );
}
