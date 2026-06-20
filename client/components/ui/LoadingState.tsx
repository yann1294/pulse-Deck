import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  label?: string;
  className?: string;
  rows?: number;
  tone?: "dark" | "light";
}

export function LoadingSkeleton({
  label = "Loading",
  className,
  rows = 3,
  tone = "dark"
}: LoadingSkeletonProps) {
  const isLight = tone === "light";

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "rounded-2xl border p-5",
        isLight ? "border-zinc-200 bg-white text-zinc-700" : "border-zinc-800 bg-zinc-950/70 text-zinc-300",
        className
      )}
      role="status"
    >
      <div className="flex items-center gap-3 text-sm">
        <span
          aria-hidden="true"
          className={cn(
            "h-4 w-4 animate-spin rounded-full border-2 border-t-emerald-300",
            isLight ? "border-zinc-200" : "border-zinc-700"
          )}
        />
        <span>{label}</span>
      </div>
      <div aria-hidden="true" className="mt-5 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            className={cn(
              "h-3 rounded-full",
              isLight ? "bg-zinc-100" : "bg-zinc-800",
              index % 3 === 0 ? "w-3/4" : index % 3 === 1 ? "w-1/2" : "w-2/3"
            )}
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

export function LoadingState(props: LoadingSkeletonProps) {
  return <LoadingSkeleton {...props} />;
}
