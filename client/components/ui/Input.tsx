import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  tone?: "dark" | "light";
}

const toneClasses: Record<NonNullable<InputProps["tone"]>, string> = {
  dark: "border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500",
  light: "border-zinc-300 bg-white text-zinc-950 placeholder:text-zinc-400"
};

export function Input({ className, tone = "dark", ...props }: InputProps) {
  return (
    <input
      className={cn(
        "focus-ring min-h-11 w-full min-w-0 rounded-xl border px-3 text-sm transition",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
