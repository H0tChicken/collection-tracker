import Link from "next/link";
import {
  LayoutDashboard,
  Layers,
  Users,
  Shield,
  Boxes,
  Heart,
  Archive,
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sets", label: "Sets", icon: Layers },
  { href: "/players", label: "Players", icon: Users },
  { href: "/teams", label: "Teams", icon: Shield },
  { href: "/collection", label: "Collection", icon: Boxes },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/storage", label: "Storage", icon: Archive },
];

export function Nav() {
  return (
    <header className="border-b border-black/10 bg-white/70 backdrop-blur dark:border-white/10 dark:bg-black/30">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-3">
        <Link href="/" className="mr-4 font-bold text-brand-600">
          ⚽ Collection Tracker
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-foreground/70 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-white/10"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
