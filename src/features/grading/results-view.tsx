import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress-bar";

export function ResultsView({
  attempt,
  paper,
  questions,
  answers,
  grades,
  mistakes,
}: {
  attempt: any;
  paper: any;
  questions: any[];
  answers: any[];
  grades: any[];
  mistakes: any[];
}) {
  const totalAwarded =
    attempt.total_awarded_marks ??
    grades.reduce((sum, grade) => sum + Number(grade.awarded_marks ?? 0), 0);
  const totalMax =
    attempt.total_max_marks ??
    grades.reduce((sum, grade) => sum + Number(grade.max_marks ?? 0), 0);
  const score = totalMax > 0 ? Math.round((totalAwarded / totalMax) * 100) : 0;
  const merged = questions.map((question) => ({
    question,
    answer: answers.find((answer) => answer.question_id === question.id),
    grade: grades.find((grade) => grade.question_id === question.id),
  }));
  const focusQuestion = merged.find((item) => item.grade) ?? merged[0];
  const focusFeedback =
    focusQuestion?.grade?.feedback && typeof focusQuestion.grade.feedback === "object"
      ? (focusQuestion.grade.feedback as { summary?: string; misses?: string[] })
      : undefined;

  return (
    <div className="space-y-8">
      <section className="grid gap-8 lg:grid-cols-[1.6fr_0.8fr]">
        <SurfaceCard className="relative overflow-hidden p-8">
          <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-primary/8 blur-[110px]" />
          <div className="relative flex items-end justify-between gap-8">
            <div>
              <Pill tone="primary">Results</Pill>
              <p className="mt-3 text-sm text-on-surface-variant">{paper?.title ?? "Paper results"}</p>
              <div className="mt-8">
                <span className="font-headline text-7xl font-black tracking-tight text-on-surface">{score}</span>
                <span className="font-headline text-2xl font-bold text-on-surface-variant">/100</span>
              </div>
              <div className="mt-4 max-w-xs">
                <ProgressBar value={score} />
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex size-24 items-center justify-center rounded-full border-4 border-primary/20 bg-primary/10 font-headline text-5xl font-black text-primary">
                {score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : "D"}
              </div>
              <p className="mt-4 font-headline text-sm font-black uppercase tracking-[0.24em] text-primary">
                {score >= 80 ? "Distinction" : "Working Grade"}
              </p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <h2 className="font-headline text-sm font-black uppercase tracking-[0.24em] text-secondary">
            Topic Mastery
          </h2>
          <div className="mt-6 space-y-5">
            {[
              { label: "Algebra", value: 92, tone: "secondary" as const },
              { label: "Applied reasoning", value: 45, tone: "tertiary" as const },
              { label: "Functions", value: 88, tone: "secondary" as const },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-on-surface-variant">
                  <span>{item.label}</span>
                  <span className={item.tone === "secondary" ? "text-secondary" : "text-tertiary"}>{item.value}%</span>
                </div>
                <ProgressBar tone={item.tone} value={item.value} />
              </div>
            ))}
          </div>
        </SurfaceCard>
      </section>

      <div className="grid gap-8 xl:grid-cols-[0.75fr_1.25fr]">
        <div className="space-y-6">
          <SurfaceCard>
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-xl font-black uppercase tracking-[0.18em] text-on-surface">
                Timeline
              </h2>
              <Pill tone="neutral">{questions.length} questions</Pill>
            </div>
            <div className="mt-6 grid grid-cols-4 gap-3">
              {merged.map(({ question, grade }) => {
                const ratio = grade?.max_marks ? Number(grade.awarded_marks ?? 0) / Number(grade.max_marks) : 0;
                const tone = ratio >= 0.8 ? "primary" : ratio >= 0.5 ? "secondary" : "tertiary";
                return (
                  <button
                    className={`aspect-square rounded-lg border-b-2 bg-surface-container-high text-center font-headline text-lg font-black ${
                      tone === "primary"
                        ? "border-primary text-on-surface"
                        : tone === "secondary"
                          ? "border-secondary text-on-surface"
                          : "border-tertiary text-on-surface"
                    }`}
                    key={question.id}
                    type="button"
                  >
                    {question.question_label}
                  </button>
                );
              })}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-tertiary">
              Struggling with
            </p>
            <h3 className="mt-3 font-headline text-xl font-black text-on-surface">
              {mistakes[0]?.topic ?? "Multi-step algebra"}
            </h3>
            <p className="mt-3 text-sm leading-7 text-on-surface-variant">
              You missed {mistakes.length} question{mistakes.length === 1 ? "" : "s"} on this attempt. Review them in the booklet before starting another paper.
            </p>
          </SurfaceCard>
        </div>

        <SurfaceCard className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Pill tone="tertiary">{focusQuestion?.question.question_label ?? "Question"}</Pill>
              <h3 className="mt-3 font-headline text-3xl font-black tracking-tight text-on-surface">
                {focusQuestion?.question.question_text ?? "Detailed grading view"}
              </h3>
            </div>
            <Link href="/mistakes">
              <Button>Add to mistake booklet</Button>
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-tertiary">
                Your answer
              </p>
              <div className="mt-3 rounded-[2rem] bg-surface-container-lowest p-5 text-sm leading-7 text-on-surface-variant">
                {focusQuestion?.answer?.answer_text ?? "No answer captured."}
              </div>
            </div>
            <div>
              <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-primary">
                Mark scheme
              </p>
              <div className="mt-3 rounded-[2rem] border border-primary/15 bg-surface-container-high p-5 text-sm leading-7 text-on-surface-variant">
                {focusQuestion?.question.mark_scheme_text ?? "No explicit mark scheme was available, so grading used the question text cautiously."}
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-surface-container-high p-6">
            <p className="font-headline text-sm font-black uppercase tracking-[0.24em] text-on-surface">
              AI reasoning analysis
            </p>
            <div className="mt-5 grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">Conceptual gap</p>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                  {focusFeedback?.summary ?? "The answer missed a critical step or justification."}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">Procedural error</p>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                  {Array.isArray(focusFeedback?.misses)
                    ? focusFeedback?.misses.join(" ")
                    : "Working was incomplete or did not land on a valid final result."}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-on-surface-variant">Marks lost</p>
                <p className="mt-3 font-headline text-3xl font-black text-tertiary">
                  -{Math.max(
                    0,
                    Number(focusQuestion?.grade?.max_marks ?? 0) - Number(focusQuestion?.grade?.awarded_marks ?? 0),
                  )}
                </p>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <SurfaceCard>
          <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-primary">Total time taken</p>
          <p className="mt-4 font-headline text-4xl font-black text-on-surface">42:15</p>
        </SurfaceCard>
        <SurfaceCard>
          <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-secondary">Vs last attempt</p>
          <p className="mt-4 font-headline text-4xl font-black text-on-surface">+12%</p>
        </SurfaceCard>
        <SurfaceCard className="bg-[linear-gradient(135deg,rgba(172,138,255,0.16),rgba(255,89,227,0.16))]">
          <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-on-surface">Mastery milestone</p>
          <p className="mt-4 text-sm leading-7 text-on-surface-variant">
            You reached Gold Tier on this revision cycle. Keep the same pressure profile in the next exam run.
          </p>
        </SurfaceCard>
      </div>
    </div>
  );
}
