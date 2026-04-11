import { createSignedPaperUrl } from "@/lib/supabase/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Attempt, AttemptAnswer, Grade, Paper, Question } from "@/types";

export async function getAttemptWorkspace(attemptId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: attempt } = await supabase.from("attempts").select("*").eq("id", attemptId).single();

  if (!attempt) {
    return null;
  }

  const [{ data: paper }, { data: questions }, { data: answers }, { data: grades }] =
    await Promise.all([
      supabase.from("papers").select("*").eq("id", attempt.paper_id).single(),
      supabase
        .from("questions")
        .select("*")
        .eq("paper_id", attempt.paper_id)
        .order("display_order", { ascending: true }),
      supabase.from("attempt_answers").select("*").eq("attempt_id", attempt.id),
      supabase.from("grades").select("*").eq("attempt_id", attempt.id).eq("scope", "question"),
    ]);

  const signedQuestionPdfUrl =
    paper?.question_pdf_path ? await createSignedPaperUrl(paper.question_pdf_path) : null;

  return {
    attempt: attempt as Attempt,
    paper: paper as Paper | null,
    questions: (questions ?? []) as Question[],
    answers: (answers ?? []) as AttemptAnswer[],
    grades: (grades ?? []) as Grade[],
    signedQuestionPdfUrl,
  };
}

export async function getAttemptResults(attemptId: string) {
  const workspace = await getAttemptWorkspace(attemptId);
  if (!workspace) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: mistakes } = await supabase
    .from("mistakes")
    .select("*")
    .eq("attempt_id", attemptId)
    .order("created_at", { ascending: false });

  return {
    ...workspace,
    mistakes: mistakes ?? [],
  };
}
