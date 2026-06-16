"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Users,
  Shield,
  Boxes,
  Heart,
  Archive,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Ripple } from "@/components/ripple";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sets", label: "Sets", icon: Layers },
  { href: "/players", label: "Players", icon: Users },
  { href: "/teams", label: "Teams", icon: Shield },
  { href: "/collection", label: "Collection", icon: Boxes },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/storage", label: "Storage", icon: Archive },
  { href: "/import/tag", label: "Import", icon: Upload },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 bg-surface-container md-elev-2">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
        <Link
          href="/"
          className="mr-2 flex items-center gap-2 text-title-lg font-medium text-primary"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-container text-on-primary-container">
            ⚽
          </span>
          <span className="hidden sm:inline">Collection</span>
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2 overflow-hidden rounded-full px-3.5 py-2 text-label-lg transition-colors",
                  active
                    ? "bg-secondary-container text-on-secondary-container"
                    : "text-on-surface-variant hover:bg-on-surface/[0.08]",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="hidden md:inline">{label}</span>
                <Ripple />
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
