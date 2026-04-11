import { createWorkerSupabaseAdmin } from "@/lib/supabase-admin";
import { gradeQuestion } from "@/services/grading-service";

export async function runGradeQuestionJob(job: any) {
  const supabase = createWorkerSupabaseAdmin();
  const questionId = job.payload?.questionId;
  if (!job.attempt_id || !questionId) {
    throw new Error("Question grading job is missing required payload.");
  }

  const [{ data: attempt }, { data: question }, { data: answer }] = await Promise.all([
    supabase.from("attempts").select("*").eq("id", job.attempt_id).single(),
    supabase.from("questions").select("*").eq("id", questionId).single(),
    supabase
      .from("attempt_answers")
      .select("*")
      .eq("attempt_id", job.attempt_id)
      .eq("question_id", questionId)
      .single(),
  ]);

  if (!attempt || !question || !answer) {
    throw new Error("Missing attempt grading context.");
  }

  const grading = await gradeQuestion({
    questionLabel: question.question_label,
    questionText: question.question_text,
    answerText: answer.answer_text,
    markSchemeText: question.mark_scheme_text,
    marks: question.marks,
  });

  await supabase.from("grades").insert({
    attempt_id: attempt.id,
    question_id: question.id,
    scope: "question",
    awarded_marks: grading.awardedMarks,
    max_marks: grading.maxMarks,
    confidence: grading.confidence,
    grading_basis: grading.gradingBasis,
    feedback: {
      summary: grading.summary,
      strengths: grading.strengths,
      misses: grading.misses,
    },
    raw_response: grading,
    provider: "gemini",
  });
}
