import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "emerald" | "teal" | "amber" | "red" | "zinc";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-zinc-700 bg-zinc-900 text-zinc-200",
  emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  teal: "border-teal-400/30 bg-teal-400/10 text-teal-200",
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  red: "border-red-400/30 bg-red-400/10 text-red-200",
  zinc: "border-zinc-300 bg-white text-zinc-700"
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
