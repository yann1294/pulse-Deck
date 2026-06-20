import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

interface SectionCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "dark" | "light" | "transparent";
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  tone = "dark",
  ...props
}: SectionCardProps) {
  const isLight = tone === "light";

  return (
    <Card className={cn("p-5 sm:p-6", className)} tone={tone} {...props}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className={cn("text-base font-semibold", isLight ? "text-zinc-950" : "text-zinc-100")}>{title}</h2>
          {description ? (
            <p className={cn("mt-1 text-sm leading-6", isLight ? "text-zinc-600" : "text-zinc-400")}>
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </Card>
  );
}
