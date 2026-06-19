import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  tone?: "dark" | "light";
}

const toneClasses: Record<NonNullable<TextareaProps["tone"]>, string> = {
  dark: "border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500",
  light: "border-zinc-300 bg-white text-zinc-950 placeholder:text-zinc-400"
};

export function Textarea({ className, tone = "dark", ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "focus-ring min-h-28 w-full resize-y rounded-xl border px-3 py-3 text-sm transition",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
