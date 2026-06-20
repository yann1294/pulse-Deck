import type { ReactNode } from "react";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

interface LayoutPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  tone?: "light" | "dark";
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  tone = "dark"
}: LayoutPageHeaderProps) {
  const isLight = tone === "light";

  return (
    <div className={cn("flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow ? <Badge tone={isLight ? "zinc" : "emerald"}>{eyebrow}</Badge> : null}
        <h1
          className={cn(
            "mt-4 max-w-4xl break-words text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl",
            isLight ? "text-zinc-950" : "text-white"
          )}
        >
          {title}
        </h1>
        {description ? (
          <p
            className={cn(
              "mt-4 max-w-2xl text-sm leading-7 sm:text-base",
              isLight ? "text-zinc-600" : "text-zinc-300"
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap gap-3 sm:w-auto">{actions}</div> : null}
    </div>
  );
}
