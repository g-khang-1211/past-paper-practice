import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils/cn";

export function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-[1.5rem] border border-white/10 bg-surface-container-low px-4 py-3 text-sm text-on-surface outline-none transition focus:border-primary/25 focus:bg-surface-container-high focus:ring-2 focus:ring-primary/15",
        props.className,
      )}
    />
  );
}

export function TextAreaField(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-white/10 bg-surface-container-highest px-5 py-4 text-sm text-on-surface outline-none transition focus:border-primary/25 focus:ring-2 focus:ring-primary/15",
        props.className,
      )}
    />
  );
}
