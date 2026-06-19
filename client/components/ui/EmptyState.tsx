import { Card } from "./Card";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  tone?: "dark" | "light";
}

export function EmptyState({ title, description, action, tone = "dark" }: EmptyStateProps) {
  const isLight = tone === "light";

  return (
    <Card className="flex flex-col items-center justify-center px-6 py-10 text-center" tone={tone}>
      <div className={isLight ? "mb-4 h-12 w-12 rounded-2xl border border-zinc-200 bg-zinc-50" : "mb-4 h-12 w-12 rounded-2xl border border-zinc-800 bg-zinc-900"} />
      <h3 className={isLight ? "text-base font-semibold text-zinc-950" : "text-base font-semibold text-zinc-100"}>{title}</h3>
      <p className={isLight ? "mt-2 max-w-md text-sm leading-6 text-zinc-600" : "mt-2 max-w-md text-sm leading-6 text-zinc-400"}>{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
