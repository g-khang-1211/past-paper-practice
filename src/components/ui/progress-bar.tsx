import { cn } from "@/lib/utils/cn";

export function ProgressBar({
  value,
  className,
  tone = "primary",
}: {
  value: number;
  className?: string;
  tone?: "primary" | "secondary" | "tertiary";
}) {
  const width = Math.max(0, Math.min(100, value));
  const fillClass =
    tone === "primary"
      ? "bg-flow-gradient"
      : tone === "secondary"
        ? "bg-secondary"
        : "bg-tertiary";

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-container-lowest", className)}>
      <div className={cn("h-full rounded-full", fillClass)} style={{ width: `${width}%` }} />
    </div>
  );
}
