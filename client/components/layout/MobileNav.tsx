"use client";

import { useState } from "react";
import type { NavItem } from "@/types/navigation";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  items: NavItem[];
  activeHref?: string;
}

export function MobileNav({ items, activeHref }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Button
        aria-label={isOpen ? "Close dashboard navigation" : "Open dashboard navigation"}
        aria-controls="mobile-dashboard-nav"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        size="sm"
        type="button"
        variant="secondary"
      >
        Menu
      </Button>
      {isOpen ? (
        <div
          className="fixed inset-x-4 top-16 z-50 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 shadow-panel-dark"
          id="mobile-dashboard-nav"
        >
          <nav aria-label="Dashboard navigation" className="grid gap-1">
            {items.map((item) => (
              <a
                className={cn(
                  "focus-ring rounded-xl px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-white",
                  activeHref === item.href && "bg-emerald-400/10 text-emerald-200"
                )}
                href={item.href}
                key={item.href}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
