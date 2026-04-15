"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { startTransition } from "react";

import { PdfViewer } from "@/components/pdf/pdf-viewer";
import { TextAreaField } from "@/components/forms/text-field";
import { DisabledState } from "@/components/states/disabled-state";
import { ErrorState } from "@/components/states/error-state";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { AnswerStatus, Attempt, AttemptAnswer, Paper, Question } from "@/types";

// These view models keep the client state aligned with server-backed attempt data.
type AttemptAnswerDraft = {
  text: string;
  flagged: boolean;
  status: AnswerStatus;
};

type HintPanelState = {
  title: string;
  content: string;
  bullet_points?: string[];
};

type GradePanelState = {
  awarded_marks?: number;
  awardedMarks?: number;
  max_marks?: number;
  maxMarks?: number;
};

type AiRoutePayload = {
  warning?: string;
};

type AttemptWorkspaceProps = {
  attempt: Attempt;
  paper: Paper | null;
  questions: Question[];
  answers: AttemptAnswer[];
  signedQuestionPdfUrl?: string | null;
};

export function AttemptWorkspace({
  attempt,
  paper,
  questions,
  answers,
  signedQuestionPdfUrl,
}: AttemptWorkspaceProps) {
  const [selectedQuestionId, setSelectedQuestionId] = useState(questions[0]?.id ?? null);
  const [answerMap, setAnswerMap] = useState<Record<string, AttemptAnswerDraft>>(
    () =>
      Object.fromEntries(
        answers.map((answer) => [
          answer.question_id,
          {
            text: answer.answer_text ?? "",
            flagged: answer.flagged ?? false,
            status: answer.status ?? "unanswered",
          },
        ]),
      ),
  );
  const [hintResponse, setHintResponse] = useState<HintPanelState | null>(null);
  const [gradeResponse, setGradeResponse] = useState<GradePanelState | null>(null);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [isRunningHint, setIsRunningHint] = useState(false);
  const [isRunningGrade, setIsRunningGrade] = useState(false);

  const selectedQuestion = useMemo(
    () => questions.find((question) => question.id === selectedQuestionId) ?? questions[0],
    [questions, selectedQuestionId],
  );

  useEffect(() => {
    if (!selectedQuestion) return;
    setHintResponse(null);
    setGradeResponse(null);
    setAiWarning(null);
  }, [selectedQuestion?.id]);

  useEffect(() => {
    if (!selectedQuestion) return;

    const current = answerMap[selectedQuestion.id];
    if (!current) return;

    const timeout = window.setTimeout(() => {
      startTransition(async () => {
        await fetch(`/api/attempts/${attempt.id}/answers/${selectedQuestion.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answerText: current.text,
            flagged: current.flagged,
            status: current.text.trim() ? "answered" : current.flagged ? "flagged" : "in_progress",
          }),
        });
      });
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [answerMap, attempt.id, selectedQuestion]);

  if (!selectedQuestion) {
    return <ErrorState description="No parsed questions were found for this attempt yet." />;
  }

  const selectedAnswer = answerMap[selectedQuestion.id] ?? {
    text: "",
    flagged: false,
    status: "unanswered",
  };
  const isExam = attempt.mode === "exam";

  async function requestHint(level: "small_hint" | "method_hint" | "full_explanation") {
    setError(null);
    setAiWarning(null);
    setIsRunningHint(true);
    const response = await fetch(`/api/attempts/${attempt.id}/help`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        questionId: selectedQuestion.id,
        level,
        answerText: selectedAnswer.text,
      }),
    });
    const payload = await response.json();
    setIsRunningHint(false);

    if (!response.ok) {
      setError(payload.error ?? "Hint request failed.");
      return;
    }

    setHintResponse(payload.hint as HintPanelState);
    setAiWarning((payload as AiRoutePayload).warning ?? null);
  }

  async function gradeCurrentQuestion() {
    setError(null);
    setAiWarning(null);
    setIsRunningGrade(true);
    const response = await fetch(`/api/attempts/${attempt.id}/grade-question`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        questionId: selectedQuestion.id,
        answerText: selectedAnswer.text,
      }),
    });
    const payload = await response.json();
    setIsRunningGrade(false);

    if (!response.ok) {
      setError(payload.error ?? "Question grading failed.");
      return;
    }

    setGradeResponse(payload.grade as GradePanelState);
    setAiWarning((payload as AiRoutePayload).warning ?? null);
  }

  async function submitAttempt() {
    setError(null);
    const response = await fetch(`/api/attempts/${attempt.id}/submit`, {
      method: "POST",
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Submission failed.");
      return;
    }

    window.location.href = `/attempts/${attempt.id}/results`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Pill tone={isExam ? "error" : "primary"}>{isExam ? "Exam mode" : "Practice mode"}</Pill>
            {attempt.timed && attempt.timer_expires_at ? (
              <span className="font-headline text-3xl font-black tracking-tight text-primary">
                {new Date(attempt.timer_expires_at).toLocaleTimeString()}
              </span>
            ) : null}
          </div>
          <h1 className="mt-4 font-headline text-4xl font-black tracking-tight text-on-surface">
            {paper?.title ?? "Attempt workspace"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-on-surface-variant">
            {paper?.subject ?? "Mathematics"} • {questions.length} parsed questions
          </p>
        </div>
        <Button onClick={submitAttempt} variant={isExam ? "primary" : "secondary"}>
          {isExam ? "Submit exam" : "Submit paper"}
        </Button>
      </div>

      {error ? <ErrorState description={error} /> : null}

      <div className={`grid gap-6 ${isExam ? "xl:grid-cols-[0.95fr_1.6fr_1fr]" : "xl:grid-cols-[0.32fr_1fr_0.9fr]"}`}>
        <SurfaceCard className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-sm font-black uppercase tracking-[0.24em] text-on-surface">
              Questions
            </h2>
            <Pill tone="neutral">{questions.length}</Pill>
          </div>
          <div className="space-y-2">
            {questions.map((question) => {
              const state = answerMap[question.id];
              const active = question.id === selectedQuestion.id;
              return (
                <button
                  className={`flex w-full items-center justify-between rounded-[1.5rem] px-4 py-3 text-left transition ${
                    active
                      ? "border-l-4 border-primary bg-gradient-to-r from-primary/20 to-transparent text-primary"
                      : "bg-transparent text-on-surface-variant hover:bg-white/5"
                  }`}
                  key={question.id}
                  onClick={() => setSelectedQuestionId(question.id)}
                  type="button"
                >
                  <div>
                    <p className="font-headline text-sm font-bold tracking-[0.18em]">{question.question_label}</p>
                    <p className="mt-1 text-xs">{state?.flagged ? "Flagged" : state?.status ?? "Unanswered"}</p>
                  </div>
                  <span className="text-xs">{question.marks ?? "--"}m</span>
                </button>
              );
            })}
          </div>
        </SurfaceCard>

        <div className="space-y-6">
          <SurfaceCard className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-white/10 bg-surface-container-high px-6 py-4">
              <p className="font-headline text-lg font-black text-on-surface">{selectedQuestion.question_label}</p>
              <Pill tone="neutral">{selectedQuestion.marks ?? "--"} marks</Pill>
            </div>
            <div className="space-y-6 bg-surface-container-low p-6">
              <p className="text-lg leading-9 text-on-surface/90">{selectedQuestion.question_text}</p>
              <PdfViewer documentUrl={signedQuestionPdfUrl} pageNumber={selectedQuestion.page_start ?? 1} />
              <TextAreaField
                onChange={(event) =>
                  setAnswerMap((current) => ({
                    ...current,
                    [selectedQuestion.id]: {
                      ...selectedAnswer,
                      text: event.target.value,
                      status: event.target.value.trim() ? "answered" : "in_progress",
                    },
                  }))
                }
                placeholder="Type your answer or working here..."
                rows={7}
                value={selectedAnswer.text}
              />
            </div>
          </SurfaceCard>

          {!isExam ? (
            <div className="grid gap-6 md:grid-cols-2">
              <SurfaceCard className="border-l-4 border-secondary">
                <h3 className="font-headline text-sm font-black uppercase tracking-[0.24em] text-on-surface">
                  Quick Concept
                </h3>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                  Use the question text, your working, and the key relation before expanding into a final answer.
                </p>
              </SurfaceCard>
              <SurfaceCard className="border-l-4 border-tertiary">
                <h3 className="font-headline text-sm font-black uppercase tracking-[0.24em] text-on-surface">
                  Your Progress
                </h3>
                <div className="mt-5">
                  <ProgressBar tone="tertiary" value={selectedAnswer.text.trim() ? 67 : 18} />
                </div>
              </SurfaceCard>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          {!isExam ? (
            <>
              <SurfaceCard className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-headline text-sm font-black uppercase tracking-[0.24em] text-on-surface">
                      AI Tutor
                    </p>
                    <p className="mt-1 text-xs text-primary">Enhanced reasoning active</p>
                  </div>
                  <Pill tone="primary">Question scoped</Pill>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button disabled={isRunningHint} onClick={() => requestHint("small_hint")} variant="secondary">
                    Hint
                  </Button>
                  <Button disabled={isRunningHint} onClick={() => requestHint("method_hint")} variant="secondary">
                    Method
                  </Button>
                  <Button disabled={isRunningHint} onClick={() => requestHint("full_explanation")} variant="secondary">
                    Full
                  </Button>
                </div>
                {aiWarning ? (
                  <div className="rounded-[1.5rem] border border-secondary/30 bg-secondary/10 p-4 text-sm leading-7 text-on-surface-variant">
                    {aiWarning}
                  </div>
                ) : null}
                {hintResponse ? (
                  <div className="space-y-4 rounded-[1.5rem] bg-surface-container-high p-4">
                    <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-primary">
                      {hintResponse.title}
                    </p>
                    <p className="text-sm leading-7 text-on-surface-variant">{hintResponse.content}</p>
                    {Array.isArray(hintResponse.bullet_points) ? (
                      <ul className="space-y-2 text-sm text-on-surface-variant">
                        {hintResponse.bullet_points.map((item: string) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] bg-surface-container-high p-4 text-sm leading-7 text-on-surface-variant">
                    Use one of the three help levels. The request stays scoped to this question and your current draft only.
                  </div>
                )}
                <Button disabled={isRunningGrade} onClick={gradeCurrentQuestion}>
                  {isRunningGrade ? "Grading..." : "Grade current question"}
                </Button>
                {gradeResponse ? (
                  <div className="rounded-[1.5rem] bg-surface-container-high p-4">
                    <p className="font-headline text-sm font-black uppercase tracking-[0.24em] text-tertiary">
                      Grade
                    </p>
                    <p className="mt-2 text-2xl font-headline font-black text-on-surface">
                      {gradeResponse.awarded_marks ?? gradeResponse.awardedMarks}/{gradeResponse.max_marks ?? gradeResponse.maxMarks}
                    </p>
                  </div>
                ) : null}
              </SurfaceCard>

              <SurfaceCard className="flex items-center justify-between border border-tertiary/25 bg-transparent">
                <div>
                  <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-tertiary">
                    Current streak
                  </p>
                  <p className="mt-2 font-headline text-3xl font-black text-on-surface">12 questions</p>
                </div>
                <div className="flex size-14 items-center justify-center rounded-full border border-tertiary/30 text-tertiary">
                  6
                </div>
              </SurfaceCard>
            </>
          ) : (
            <>
              <SurfaceCard className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline text-sm font-black uppercase tracking-[0.24em] text-on-surface">
                    Response editor
                  </h3>
                  <span className="text-xs text-on-surface-variant">{isSaving ? "Autosaving..." : "Autosaved"}</span>
                </div>
                <DisabledState
                  description="Exam mode hides hint controls and blocks grading until after submission. Only your answer editor remains active during the session."
                  title="AI help is locked"
                />
              </SurfaceCard>

              <SurfaceCard className="space-y-4 bg-surface-container-lowest">
                <h3 className="font-headline text-sm font-black uppercase tracking-[0.24em] text-primary">
                  Drafting area
                </h3>
                <p className="text-sm leading-7 text-on-surface-variant">
                  Use this space for rough calculations or an outline. These notes are not submitted as part of the final answer.
                </p>
                <Button className="w-full" onClick={submitAttempt}>
                  Submit exam
                </Button>
              </SurfaceCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
