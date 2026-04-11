import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

type PillTone = "primary" | "secondary" | "tertiary" | "error" | "neutral";

const toneMap: Record<PillTone, string> = {
  primary: "bg-primary/10 text-primary border border-primary/20",
  secondary: "bg-secondary/10 text-secondary border border-secondary/20",
  tertiary: "bg-tertiary/10 text-tertiary border border-tertiary/20",
  error: "bg-[#9f0519]/20 text-[#ff9f99] border border-[#9f0519]/30",
  neutral: "bg-white/5 text-on-surface-variant border border-white/10",
};

export function Pill({
  className,
  children,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: PillTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-headline font-bold uppercase tracking-[0.24em]",
        toneMap[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
