import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <SurfaceCard className="flex min-h-[260px] flex-col items-start justify-between">
      <div className="space-y-3">
        <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-primary">
          Empty State
        </p>
        <h3 className="font-headline text-3xl font-black text-on-surface">{title}</h3>
        <p className="max-w-xl text-sm leading-7 text-on-surface-variant">{description}</p>
      </div>
      {actionLabel && actionHref ? (
        <Link href={actionHref}>
          <Button>{actionLabel}</Button>
        </Link>
      ) : null}
    </SurfaceCard>
  );
}
