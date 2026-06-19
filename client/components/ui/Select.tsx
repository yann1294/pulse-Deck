import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  tone?: "dark" | "light";
}

const toneClasses: Record<NonNullable<SelectProps["tone"]>, string> = {
  dark: "border-zinc-800 bg-zinc-950 text-zinc-100",
  light: "border-zinc-300 bg-white text-zinc-950"
};

export function Select({ className, children, tone = "dark", ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "focus-ring h-11 w-full rounded-xl border px-3 text-sm transition",
        toneClasses[tone],
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
