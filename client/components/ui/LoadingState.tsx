import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = "Loading", className }: LoadingStateProps) {
  return (
    <div className={cn("rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5", className)}>
      <div className="flex items-center gap-3 text-sm text-zinc-300">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-300" />
        {label}
      </div>
      <div className="mt-5 space-y-3">
        <div className="h-3 w-3/4 rounded-full bg-zinc-800" />
        <div className="h-3 w-1/2 rounded-full bg-zinc-800" />
      </div>
    </div>
  );
}
