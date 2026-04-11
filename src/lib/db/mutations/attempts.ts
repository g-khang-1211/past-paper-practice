import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AttemptMode, AnswerStatus, MistakeType } from "@/types";

export async function createAttempt(params: {
  paperId: string;
  userId: string;
  mode: AttemptMode;
  timed: boolean;
  durationSeconds?: number | null;
}) {
  const supabase = await createSupabaseServerClient();

  const timerExpiresAt =
    params.timed && params.durationSeconds
      ? new Date(Date.now() + params.durationSeconds * 1000).toISOString()
      : null;

  const { data: attempt, error } = await supabase
    .from("attempts")
    .insert({
      paper_id: params.paperId,
      user_id: params.userId,
      mode: params.mode,
      timed: params.timed,
      duration_seconds: params.durationSeconds ?? null,
      timer_expires_at: timerExpiresAt,
      status: "active",
    })
    .select("*")
    .single();

  if (error || !attempt) {
    throw error ?? new Error("Failed to create attempt");
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id")
    .eq("paper_id", params.paperId)
    .order("display_order", { ascending: true });

  if (questions?.length) {
    await supabase.from("attempt_answers").insert(
      questions.map((question) => ({
        attempt_id: attempt.id,
        question_id: question.id,
      })),
    );
  }

  return attempt;
}

export async function saveAttemptAnswer(params: {
  attemptId: string;
  questionId: string;
  answerText: string;
  status: AnswerStatus;
  flagged: boolean;
  timeSpentSeconds?: number;
}) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("attempt_answers")
    .update({
      answer_text: params.answerText,
      status: params.status,
      flagged: params.flagged,
      time_spent_seconds: params.timeSpentSeconds ?? 0,
    })
    .eq("attempt_id", params.attemptId)
    .eq("question_id", params.questionId)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to save answer");
  }

  return data;
}

export async function persistQuestionGrade(params: {
  attemptId: string;
  questionId: string;
  awardedMarks: number;
  maxMarks: number;
  confidence: number;
  gradingBasis: "mark_scheme" | "fallback_question_only";
  feedback: Record<string, unknown>;
  rawResponse: Record<string, unknown>;
}) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("grades")
    .insert({
      attempt_id: params.attemptId,
      question_id: params.questionId,
      scope: "question",
      awarded_marks: params.awardedMarks,
      max_marks: params.maxMarks,
      confidence: params.confidence,
      grading_basis: params.gradingBasis,
      feedback: params.feedback,
      raw_response: params.rawResponse,
      provider: "gemini",
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to persist question grade");
  }

  await supabase
    .from("attempt_answers")
    .update({
      last_graded_at: new Date().toISOString(),
      status: "answered",
    })
    .eq("attempt_id", params.attemptId)
    .eq("question_id", params.questionId);

  return data;
}

export async function persistMistake(params: {
  userId: string;
  paperId: string;
  attemptId: string;
  questionId: string;
  gradeId?: string;
  topic?: string | null;
  mistakeType: MistakeType;
  note?: string | null;
  sourceExcerpt?: string | null;
}) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("mistakes").insert({
    user_id: params.userId,
    paper_id: params.paperId,
    attempt_id: params.attemptId,
    question_id: params.questionId,
    grade_id: params.gradeId ?? null,
    topic: params.topic ?? null,
    mistake_type: params.mistakeType,
    note: params.note ?? null,
    source_excerpt: params.sourceExcerpt ?? null,
  });

  if (error) {
    throw error;
  }
}

export async function submitAttempt(attemptId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: attempt, error } = await supabase
    .from("attempts")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .select("*")
    .single();

  if (error || !attempt) {
    throw error ?? new Error("Failed to submit attempt");
  }

  await supabase.from("worker_jobs").insert({
    type: "grade_paper",
    attempt_id: attemptId,
    paper_id: attempt.paper_id,
    status: "queued",
    payload: {},
  });

  return attempt;
}
