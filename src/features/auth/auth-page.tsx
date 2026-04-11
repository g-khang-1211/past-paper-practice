import Link from "next/link";

import { Button } from "@/components/ui/button";
import { GlassCard, SurfaceCard } from "@/components/ui/card";
import { TextField } from "@/components/forms/text-field";
import { Pill } from "@/components/ui/pill";

export function AuthPage({
  title,
  subtitle,
  action,
  submitLabel,
  alternateHref,
  alternateLabel,
  alternateCta,
  message,
  showDisplayName = false,
  nextPath,
}: {
  title: string;
  subtitle: string;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  alternateHref: string;
  alternateLabel: string;
  alternateCta: string;
  message?: string | null;
  showDisplayName?: boolean;
  nextPath?: string | null;
}) {
  return (
    <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
      <SurfaceCard className="relative overflow-hidden p-8 md:p-12">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-secondary/10 blur-[100px]" />
        <div className="relative space-y-8">
          <Pill tone="primary">Past Paper Practice</Pill>
          <div className="space-y-5">
            <h1 className="font-headline text-5xl font-black leading-[0.92] tracking-tight text-on-surface md:text-7xl">
              Study Under
              <br />
              <span className="bg-flow-gradient bg-clip-text text-transparent">Real Pressure.</span>
            </h1>
            <p className="max-w-xl text-base leading-8 text-on-surface-variant">
              Upload a real paper, switch between practice and exam conditions, get question-scoped
              Gemini feedback, and turn every weak answer into your revision archive.
            </p>
          </div>
          <GlassCard className="max-w-lg">
            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-primary">
                  Practice
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  AI hints and question-level grading while you work.
                </p>
              </div>
              <div>
                <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-secondary">
                  Exam
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Locked assistance, timer pressure, and clean submission flow.
                </p>
              </div>
              <div>
                <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-tertiary">
                  Review
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  Mistakes, topic mastery, and session analytics that compound.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </SurfaceCard>

      <GlassCard className="border-white/12 p-8 md:p-10">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-primary">
              Access
            </p>
            <h2 className="font-headline text-4xl font-black tracking-tight text-on-surface">{title}</h2>
            <p className="text-sm leading-7 text-on-surface-variant">{subtitle}</p>
          </div>

          {message ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
              {message}
            </div>
          ) : null}

          <form action={action} className="space-y-4">
            {showDisplayName ? (
              <TextField name="displayName" placeholder="Display name" required />
            ) : null}
            <TextField name="email" placeholder="Email address" required type="email" />
            <TextField name="password" placeholder="Password" required type="password" />
            {nextPath ? <input name="next" type="hidden" value={nextPath} /> : null}
            <Button className="w-full" type="submit">
              {submitLabel}
            </Button>
          </form>

          <p className="text-sm leading-7 text-on-surface-variant">
            {alternateLabel}{" "}
            <Link className="font-headline font-bold uppercase tracking-[0.16em] text-primary" href={alternateHref}>
              {alternateCta}
            </Link>
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
