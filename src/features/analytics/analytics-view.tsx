import { EmptyState } from "@/components/states/empty-state";
import { SurfaceCard } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";

export function AnalyticsView({ attempts, mistakes }: { attempts: any[]; mistakes: any[] }) {
  if (!attempts.length) {
    return (
      <EmptyState
        actionHref="/dashboard"
        actionLabel="Go to dashboard"
        description="Once you submit a graded attempt, this page will show score trends, repeated mistake patterns, and revision targets."
        title="No analytics yet"
      />
    );
  }

  const totalAttempts = attempts.length;
  const average =
    attempts.reduce((sum, attempt) => {
      const awarded = Number(attempt.total_awarded_marks ?? 0);
      const max = Number(attempt.total_max_marks ?? 0);
      return sum + (max > 0 ? (awarded / max) * 100 : 0);
    }, 0) / totalAttempts;

  return (
    <div className="space-y-6">
      <SurfaceCard>
        <h1 className="font-headline text-4xl font-black tracking-tight text-on-surface">Performance analytics</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-on-surface-variant">
          Track score movement, repeated mistakes, and the next topics to revisit before a fresh paper.
        </p>
      </SurfaceCard>

      <div className="grid gap-6 md:grid-cols-3">
        <SurfaceCard>
          <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-primary">Average score</p>
          <p className="mt-4 font-headline text-5xl font-black text-on-surface">{Math.round(average)}%</p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-secondary">Attempts logged</p>
          <p className="mt-4 font-headline text-5xl font-black text-on-surface">{totalAttempts}</p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-tertiary">Mistake signals</p>
          <p className="mt-4 font-headline text-5xl font-black text-on-surface">{mistakes.length}</p>
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <h2 className="font-headline text-sm font-black uppercase tracking-[0.24em] text-on-surface">Topic mastery</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            { topic: "Number", value: 78, tone: "primary" as const },
            { topic: "Algebra", value: 64, tone: "secondary" as const },
            { topic: "Graphs", value: 52, tone: "tertiary" as const },
          ].map((item) => (
            <div key={item.topic}>
              <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                <span>{item.topic}</span>
                <span>{item.value}%</span>
              </div>
              <ProgressBar tone={item.tone} value={item.value} />
            </div>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
