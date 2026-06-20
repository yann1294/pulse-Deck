import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  className?: string;
  surface?: "public" | "dashboard" | "light";
}

const surfaceClasses: Record<NonNullable<AppShellProps["surface"]>, string> = {
  public: "app-background min-h-screen text-zinc-100",
  dashboard: "dashboard-shell",
  light: "min-h-screen bg-zinc-50 text-zinc-950"
};

export function AppShell({ children, className, surface = "public" }: AppShellProps) {
  return <div className={cn(surfaceClasses[surface], className)}>{children}</div>;
}
