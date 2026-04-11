import Link from "next/link";

import { EmptyState } from "@/components/states/empty-state";
import { SurfaceCard } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";

export function MistakesView({ mistakes }: { mistakes: any[] }) {
  if (!mistakes.length) {
    return (
      <EmptyState
        actionHref="/dashboard"
        description="Mistakes are created after grading. Finish a paper or grade a question in Practice mode to start building your revision archive."
        actionLabel="Return to dashboard"
        title="Your mistake booklet is empty"
      />
    );
  }

  return (
    <div className="space-y-6">
      <SurfaceCard>
        <Pill tone="tertiary">Mistake booklet</Pill>
        <h1 className="mt-4 font-headline text-4xl font-black tracking-tight text-on-surface">
          Revision signals, not just scores.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant">
          Every weak answer becomes a structured follow-up item tied back to the paper, question, and mistake type.
        </p>
      </SurfaceCard>

      <div className="grid gap-4">
        {mistakes.map((mistake) => (
          <SurfaceCard className="grid gap-4 lg:grid-cols-[0.32fr_1fr_0.3fr]" key={mistake.id}>
            <div>
              <Pill tone="tertiary">{mistake.mistake_type.replace(/_/g, " ")}</Pill>
              <p className="mt-4 font-headline text-sm font-black uppercase tracking-[0.24em] text-on-surface">
                {mistake.papers?.title ?? "Paper"}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                {mistake.questions?.question_label ?? "Question"}
              </p>
            </div>
            <div>
              <p className="font-headline text-lg font-black text-on-surface">
                {mistake.topic ?? "Untagged weakness"}
              </p>
              <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                {mistake.note ?? mistake.source_excerpt ?? "Review this question and repair the missing logic or method."}
              </p>
            </div>
            <div className="flex items-start justify-end">
              <Link className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-primary" href="/analytics">
                Trace pattern
              </Link>
            </div>
          </SurfaceCard>
        ))}
      </div>
    </div>
  );
}
