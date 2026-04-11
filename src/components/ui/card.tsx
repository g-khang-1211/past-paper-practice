import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export function SurfaceCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl bg-surface-container p-6 text-on-surface shadow-[0_20px_60px_rgba(0,0,0,0.35)]",
        className,
      )}
      {...props}
    />
  );
}

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}
