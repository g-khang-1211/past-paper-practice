"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { Attempt, Paper, Question } from "@/types";

// Keep prop types aligned with the DB-backed domain models this screen receives.
type PaperPageViewModel = {
  id: string;
  page_number: number;
  extracted_text: string;
  preview_image_path: string | null;
};

type PaperAttemptSummary = Pick<Attempt, "id" | "mode" | "status"> & {
  created_at: string;
};

type PaperDetailViewProps = {
  paper: Paper;
  pages: PaperPageViewModel[];
  questions: Question[];
  attempts: PaperAttemptSummary[];
  signedQuestionPdfUrl?: string | null;
};

export function PaperDetailView({
  paper,
  pages,
  questions,
  attempts,
  signedQuestionPdfUrl,
}: PaperDetailViewProps) {
  const router = useRouter();
  const [loadingMode, setLoadingMode] = useState<null | "practice" | "exam">(null);
  const [paperState, setPaperState] = useState<Paper>(paper);
  const [pageState, setPageState] = useState(pages);
  const [questionState, setQuestionState] = useState(questions);
  const [documentUrl, setDocumentUrl] = useState(signedQuestionPdfUrl ?? null);
  const [selectedPageNumber, setSelectedPageNumber] = useState<number>(pages[0]?.page_number ?? 1);
  const canStart = paperState.parse_status === "ready" && questionState.length > 0;
  const parsedPagesCount = paperState.parsed_pages_count ?? pageState.length;
  const totalPages = paperState.page_count ?? null;
  const parseProgressPct = paperState.parse_progress_pct ?? 0;

  useEffect(() => {
    if (!pageState.length) {
      return;
    }

    if (!pageState.some((page) => page.page_number === selectedPageNumber)) {
      setSelectedPageNumber(pageState[0].page_number);
    }
  }, [pageState, selectedPageNumber]);

  useEffect(() => {
    const shouldPoll = paperState.parse_status === "uploaded" || paperState.parse_status === "parsing";
    if (!shouldPoll) {
      return;
    }

    let cancelled = false;

    async function refreshPaperDetail() {
      try {
        const response = await fetch(`/api/papers/${paperState.id}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        if (cancelled) {
          return;
        }

        if (payload.paper) {
          setPaperState(payload.paper as Paper);
        }
        if (Array.isArray(payload.pages)) {
          setPageState(payload.pages as PaperPageViewModel[]);
        }
        if (Array.isArray(payload.questions)) {
          setQuestionState(payload.questions as Question[]);
        }
        setDocumentUrl(payload.signedQuestionPdfUrl ?? null);
      } catch {
        // Keep the last known parse state visible and retry on the next interval.
      }
    }

    void refreshPaperDetail();
    const intervalId = window.setInterval(() => {
      void refreshPaperDetail();
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [paperState.id, paperState.parse_status]);

  async function startAttempt(mode: "practice" | "exam", timed: boolean) {
    setLoadingMode(mode);
    const response = await fetch(`/api/papers/${paperState.id}/attempts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode,
        timed,
        durationSeconds: timed ? 90 * 60 : null,
      }),
    });

    const payload = await response.json();

    if (response.ok) {
      router.push(`/attempts/${payload.attempt.id}`);
      return;
    }

    setLoadingMode(null);
  }

  return (
    <div className="space-y-6">
      <SurfaceCard className="relative overflow-hidden p-8 md:p-10">
        <div className="absolute right-0 top-0 h-60 w-60 rounded-full bg-primary/8 blur-[110px]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Pill tone="primary">{paperState.subject}</Pill>
            <div>
              <h1 className="font-headline text-4xl font-black tracking-tight text-on-surface md:text-5xl">
                {paperState.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">
                Review parse progress, inspect detected questions, and launch either a guided Practice run or a locked Exam session.
              </p>
            </div>
          </div>

          <div className="grid gap-4 rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl sm:grid-cols-2">
            <div>
              <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                Parse Status
              </p>
              <p className="mt-2 font-headline text-2xl font-black text-on-surface">{paperState.parse_status}</p>
            </div>
            <div>
              <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                Parsed Pages
              </p>
              <p className="mt-2 font-headline text-2xl font-black text-on-surface">
                {parsedPagesCount}/{totalPages ?? "--"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                  Parse Progress
                </p>
                <span className="text-xs text-on-surface-variant">{parseProgressPct}%</span>
              </div>
              <ProgressBar value={parseProgressPct} />
            </div>
            {paperState.parse_status === "failed" && paperState.parse_error ? (
              <div className="sm:col-span-2 rounded-xl border border-[#ff9f99]/25 bg-[#ff9f99]/10 px-4 py-3 text-sm leading-7 text-[#ffd6d2]">
                {paperState.parse_error}
              </div>
            ) : null}
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceCard className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-xl font-black uppercase tracking-[0.18em] text-on-surface">
              Question Map
            </h2>
            <Pill tone="neutral">{questionState.length} detected</Pill>
          </div>
          <div className="space-y-3">
            {questionState.length ? (
              questionState.map((question) => (
                <div
                  className="flex items-start justify-between rounded-[1.5rem] bg-surface-container-high px-5 py-4"
                  key={question.id}
                >
                  <div>
                    <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-primary">
                      {question.question_label}
                    </p>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-on-surface-variant">
                      {question.question_text}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-on-surface-variant">
                    {question.marks ?? "--"} marks
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-white/10 bg-surface-container-high p-5 text-sm leading-7 text-on-surface-variant">
                The worker has not finished building the question list yet. Parsed pages can still appear before the question map is complete.
              </div>
            )}
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-xl font-black uppercase tracking-[0.18em] text-on-surface">
                Parsed Pages
              </h2>
              <Pill tone="neutral">{pageState.length} ready</Pill>
            </div>
            {pageState.length ? (
              <div className="space-y-5">
                <div className="grid gap-2 md:grid-cols-4">
                  {pageState.map((page) => {
                    const active = page.page_number === selectedPageNumber;
                    return (
                      <button
                        className={`rounded-[1.25rem] px-4 py-3 text-left text-sm transition ${
                          active
                            ? "bg-gradient-to-r from-primary/25 to-transparent text-primary"
                            : "bg-surface-container-high text-on-surface-variant hover:bg-white/5"
                        }`}
                        key={page.id}
                        onClick={() => setSelectedPageNumber(page.page_number)}
                        type="button"
                      >
                        <p className="font-headline text-xs font-bold uppercase tracking-[0.24em]">
                          Page {page.page_number}
                        </p>
                        <p className="mt-2 line-clamp-3 text-xs leading-6">
                          {page.extracted_text || "Parsed page text is empty."}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <PdfViewer documentUrl={documentUrl} pageNumber={selectedPageNumber} title={`Page ${selectedPageNumber}`} />
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-white/10 bg-surface-container-high p-5 text-sm leading-7 text-on-surface-variant">
                Parsed pages will appear here as soon as the worker finishes each page.
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard className="space-y-5">
            <h2 className="font-headline text-xl font-black uppercase tracking-[0.18em] text-on-surface">
              Start a session
            </h2>
            <div className="space-y-4 rounded-[2rem] bg-surface-container-high p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-headline text-sm font-bold uppercase tracking-[0.18em] text-primary">
                    Practice Mode
                  </p>
                  <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                    Hint tabs and question-level grading stay available while you work.
                  </p>
                </div>
                <Button disabled={!canStart || loadingMode === "practice"} onClick={() => startAttempt("practice", false)}>
                  Start untimed
                </Button>
              </div>
              <Button
                className="w-full"
                disabled={!canStart || loadingMode === "practice"}
                onClick={() => startAttempt("practice", true)}
                variant="secondary"
              >
                Start timed practice
              </Button>
            </div>

            <div className="space-y-4 rounded-[2rem] bg-surface-container-high p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-headline text-sm font-bold uppercase tracking-[0.18em] text-[#ff9f99]">
                    Exam Mode
                  </p>
                  <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                    Help controls are hidden and the backend rejects AI requests until after submission.
                  </p>
                </div>
                <Button disabled={!canStart || loadingMode === "exam"} onClick={() => startAttempt("exam", true)} variant="danger">
                  Launch exam
                </Button>
              </div>
            </div>

            {!canStart ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-surface-container-low p-4 text-sm leading-7 text-on-surface-variant">
                Start controls unlock once the parse worker has finished building the question list for this paper.
              </div>
            ) : null}
          </SurfaceCard>

          <SurfaceCard className="space-y-4">
            <h3 className="font-headline text-sm font-black uppercase tracking-[0.18em] text-on-surface">
              Previous attempts
            </h3>
            {attempts.length ? (
              attempts.map((attempt) => (
                <div className="rounded-[1.5rem] bg-surface-container-high p-4" key={attempt.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-primary">
                        {attempt.mode}
                      </p>
                      <p className="mt-2 text-sm text-on-surface-variant">
                        {new Date(attempt.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button onClick={() => router.push(`/attempts/${attempt.id}`)} variant="ghost">
                      Open
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-7 text-on-surface-variant">No attempts have started for this paper yet.</p>
            )}
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
