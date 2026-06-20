import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "dark" | "light" | "transparent";
}

const toneClasses: Record<NonNullable<CardProps["tone"]>, string> = {
  dark: "border-zinc-800/80 bg-zinc-950/70 text-zinc-100 shadow-panel backdrop-blur",
  light: "border-zinc-200 bg-white text-zinc-950 shadow-panel-soft",
  transparent: "border-zinc-800/70 bg-transparent text-zinc-100"
};

export function Card({ className, tone = "dark", ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border shadow-sm",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
