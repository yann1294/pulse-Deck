import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";

interface SectionCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  ...props
}: SectionCardProps) {
  return (
    <Card className={cn("p-5 sm:p-6", className)} {...props}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-zinc-400">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </Card>
  );
}
