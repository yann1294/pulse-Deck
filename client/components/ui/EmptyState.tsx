import { useId } from "react";
import { Card } from "./Card";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  tone?: "dark" | "light";
}

export function EmptyState({ title, description, action, tone = "dark" }: EmptyStateProps) {
  const isLight = tone === "light";
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Card
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="flex flex-col items-center justify-center px-5 py-10 text-center sm:px-6"
      tone={tone}
    >
      <div
        aria-hidden="true"
        className={isLight ? "mb-4 h-12 w-12 rounded-2xl border border-zinc-200 bg-zinc-50" : "mb-4 h-12 w-12 rounded-2xl border border-zinc-800 bg-zinc-900"}
      />
      <h3
        className={isLight ? "text-base font-semibold text-zinc-950" : "text-base font-semibold text-zinc-100"}
        id={titleId}
      >
        {title}
      </h3>
      <p
        className={isLight ? "mt-2 max-w-md text-sm leading-6 text-zinc-600" : "mt-2 max-w-md text-sm leading-6 text-zinc-400"}
        id={descriptionId}
      >
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
