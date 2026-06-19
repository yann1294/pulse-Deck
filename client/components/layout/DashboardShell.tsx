import type { ReactNode } from "react";
import type { NavItem } from "@/types/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const defaultItems: NavItem[] = [
  { label: "Overview", href: "/dashboard" },
  { label: "Tickets", href: "/dashboard/tickets" },
  { label: "Customers", href: "/dashboard/customers" },
  { label: "Knowledge Base", href: "/knowledge-base" },
  { label: "AI Suggestions", href: "/dashboard/ai" }
];

interface DashboardShellProps {
  children: ReactNode;
  activeHref?: string;
  navItems?: NavItem[];
  title?: string;
}

export function DashboardShell({
  children,
  activeHref = "/dashboard",
  navItems = defaultItems,
  title
}: DashboardShellProps) {
  return (
    <div className="dashboard-shell flex">
      <Sidebar activeHref={activeHref} items={navItems} />
      <div className="min-w-0 flex-1">
        <Topbar activeHref={activeHref} items={navItems} title={title} />
        <main className="mx-auto w-full max-w-[96rem] px-4 py-6 sm:px-6 lg:px-8" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
