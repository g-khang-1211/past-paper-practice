import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    "bg-flow-gradient text-slate-900 shadow-glow-primary hover:brightness-105 disabled:brightness-75",
  secondary:
    "bg-surface-container-high text-primary border border-primary/15 hover:bg-surface-container-highest",
  ghost:
    "bg-transparent text-on-surface hover:bg-white/5",
  danger:
    "bg-[#2a1114] text-[#ff9f99] border border-[#9f0519]/30 hover:bg-[#391518]",
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-3 font-headline text-xs font-bold uppercase tracking-[0.24em] transition-all duration-200 disabled:cursor-not-allowed",
        variantClassMap[variant],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
