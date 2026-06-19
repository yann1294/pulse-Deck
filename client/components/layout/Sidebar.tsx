import Link from "next/link";
import type { NavItem } from "@/types/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  items: NavItem[];
  activeHref?: string;
  className?: string;
}

export function Sidebar({ items, activeHref, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden w-72 shrink-0 border-r border-zinc-800 bg-zinc-950/95 px-4 py-5 lg:block",
        className
      )}
    >
      <Link className="focus-ring flex items-center gap-3 rounded-2xl px-2 py-1" href="/">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400 text-sm font-black text-zinc-950">
          P
        </span>
        <div>
          <p className="text-sm font-semibold text-white">PulseDesk</p>
          <p className="text-xs text-zinc-500">Support ops</p>
        </div>
      </Link>
      <nav className="mt-8 grid gap-1">
        {items.map((item) => (
          <a
            className={cn(
              "focus-ring rounded-xl px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-white",
              activeHref === item.href && "bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-400/20"
            )}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}
