import Link from "next/link";

import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";
import { GlassCard, SurfaceCard } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import { dashboardRecommendations, demoRecentPapers } from "@/lib/constants/navigation";
import type { Paper } from "@/types";

export function DashboardOverview({
  papers,
  analytics,
}: {
  papers: Paper[];
  analytics: {
    currentAverage: number;
    targetAverage: number;
    mistakeCount: number;
  };
}) {
  if (!papers.length) {
    return (
      <EmptyState
        actionLabel="Upload a paper"
        actionHref="/papers/new"
        description="Your dashboard will fill with active papers, attempt progress, and mistake history once you upload your first past paper."
        title="Your practice cockpit is empty"
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-xl bg-surface-container px-8 py-10 md:px-12">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary/10 blur-[110px]" />
        <div className="absolute -bottom-16 -left-16 h-60 w-60 rounded-full bg-secondary/10 blur-[100px]" />
        <div className="relative grid gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <Pill tone="primary">Cambridge IGCSE Mathematics</Pill>
            <div>
              <h1 className="font-headline text-5xl font-black leading-[0.92] tracking-tight text-on-surface md:text-7xl">
                WELCOME
                <br />
                BACK,
                <br />
                <span className="bg-flow-gradient bg-clip-text text-transparent">ARCHITECT.</span>
              </h1>
              <p className="mt-5 max-w-md text-sm leading-7 text-on-surface-variant">
                Keep momentum across uploads, active attempts, and revision loops without leaving the shell.
              </p>
            </div>
          </div>

          <GlassCard className="self-center">
            <div className="flex items-end justify-between">
              <div>
                <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                  Weekly Streak
                </p>
                <p className="mt-2 font-headline text-3xl font-black text-on-surface">12 days</p>
              </div>
              <div className="text-right">
                <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                  XP to Level 43
                </p>
                <p className="mt-2 font-headline text-3xl font-black text-on-surface">840/1200</p>
              </div>
            </div>
            <ProgressBar className="mt-5" value={70} />
            <p className="mt-4 text-xs text-primary/70">Top 5% of students this week. Keep the momentum.</p>
          </GlassCard>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <SurfaceCard className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <h2 className="font-headline text-sm font-black uppercase tracking-[0.18em] text-on-surface">
                Recent activity
              </h2>
              <Link className="text-xs font-bold text-primary" href="/papers/new">
                Upload another
              </Link>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              {(papers.length ? papers : demoRecentPapers).slice(0, 2).map((paper: any) => (
                <div className="rounded-lg bg-surface-container-high p-4" key={paper.id}>
                  <div className="flex gap-4">
                    <div className="flex h-20 w-16 items-center justify-center rounded-lg bg-surface-container-highest text-[10px] font-headline font-black text-on-surface">
                      {paper.tag ?? "PP-01"}
                    </div>
                    <div className="flex-1">
                      <p className="font-headline text-sm font-bold text-on-surface">{paper.title}</p>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        {paper.subtitle ?? new Date(paper.created_at).toLocaleDateString()}
                      </p>
                      <div className="mt-4 flex items-center justify-between">
                        <Pill tone="primary">{paper.score ? `Score ${paper.score}%` : paper.parse_status}</Pill>
                        <Link className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-primary" href={paper.id === "demo-1" || paper.id === "demo-2" ? "/papers/new" : `/papers/${paper.id}`}>
                          Resume
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-sm font-black uppercase tracking-[0.18em] text-on-surface">
                Recommended practice
              </h2>
            </div>
            <div className="mt-5 space-y-4">
              {dashboardRecommendations.map((item) => (
                <div className="flex items-center justify-between rounded-xl bg-surface-container-high px-5 py-4" key={item.id}>
                  <div>
                    <p className="font-headline text-sm font-bold text-on-surface">{item.title}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">{item.focus}</p>
                  </div>
                  <Button variant={item.accent === "tertiary" ? "primary" : "secondary"}>Start now</Button>
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <SurfaceCard>
            <h2 className="font-headline text-sm font-black uppercase tracking-[0.18em] text-on-surface">
              Performance analytics
            </h2>
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-5">
                <div className="flex size-20 items-center justify-center rounded-full border-4 border-primary/20 bg-primary/10 font-headline text-2xl font-black text-primary">
                  {Math.round(analytics.currentAverage)}%
                </div>
                <div>
                  <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                    Current Avg
                  </p>
                  <p className="mt-2 text-sm text-on-surface">A- ({analytics.currentAverage.toFixed(1)}%)</p>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="flex size-20 items-center justify-center rounded-full border-4 border-secondary/20 bg-secondary/10 font-headline text-2xl font-black text-secondary">
                  {Math.round(analytics.targetAverage)}%
                </div>
                <div>
                  <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                    Target score
                  </p>
                  <p className="mt-2 text-sm text-on-surface">A+ ({analytics.targetAverage.toFixed(1)}%)</p>
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                  <span>Velocity</span>
                  <span className="text-primary">+12% this month</span>
                </div>
                <ProgressBar tone="secondary" value={74} />
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="bg-[linear-gradient(135deg,rgba(255,5,229,0.16),rgba(85,22,190,0.25))]">
            <div className="flex items-start justify-between">
              <div>
                <Pill tone="tertiary">Mistake booklet</Pill>
                <p className="mt-5 text-2xl font-headline font-black text-on-surface">Keep your misses alive.</p>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                  {analytics.mistakeCount} recent mistake signals are ready to review and convert into a cleaner next attempt.
                </p>
              </div>
              <Pill tone="tertiary">{analytics.mistakeCount} new</Pill>
            </div>
            <div className="mt-6 space-y-3 rounded-[2rem] bg-black/30 p-4 backdrop-blur-md">
              <p className="text-sm text-on-surface">Vector decomposition</p>
              <p className="text-sm text-on-surface">Algebra slips under time pressure</p>
            </div>
            <div className="mt-6">
              <Link href="/mistakes">
                <Button className="w-full" variant="secondary">
                  Open archive
                </Button>
              </Link>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
