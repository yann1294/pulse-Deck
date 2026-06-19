import type { NavItem } from "@/types/navigation";
import { Badge } from "@/components/ui";
import { MobileNav } from "./MobileNav";

interface TopbarProps {
  items: NavItem[];
  activeHref?: string;
  title?: string;
}

export function Topbar({ items, activeHref, title = "Dashboard" }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{title}</p>
          <p className="hidden text-xs text-zinc-500 sm:block">AI-assisted support operations</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone="emerald">AI review only</Badge>
          <MobileNav activeHref={activeHref} items={items} />
        </div>
      </div>
    </header>
  );
}
