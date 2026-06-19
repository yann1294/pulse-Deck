import { Card } from "./Card";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-4 h-12 w-12 rounded-2xl border border-zinc-800 bg-zinc-900" />
      <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
