import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-400 text-zinc-950 shadow-sm shadow-emerald-950/20 hover:bg-emerald-300",
  secondary:
    "border border-zinc-700 bg-zinc-900/80 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-800",
  ghost: "text-zinc-300 hover:bg-zinc-900 hover:text-white"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base"
};

interface BaseButtonProps {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export type ButtonProps = BaseButtonProps & ButtonHTMLAttributes<HTMLButtonElement>;
export type ButtonLinkProps = BaseButtonProps & AnchorHTMLAttributes<HTMLAnchorElement>;

export function Button(props: ButtonProps) {
  const { children, className, variant = "primary", size = "md", ...buttonProps } = props;
  const classes = cn(
    "focus-ring inline-flex items-center justify-center rounded-full font-semibold transition disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  );
}

export function ButtonLink(props: ButtonLinkProps) {
  const { children, className, variant = "primary", size = "md", ...anchorProps } = props;
  const classes = cn(
    "focus-ring inline-flex items-center justify-center rounded-full font-semibold transition",
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  return (
    <a className={classes} {...anchorProps}>
      {children}
    </a>
  );
}
