import { createWorkerSupabaseAdmin } from "@/lib/supabase-admin";
import { gradeQuestion, summarizePaperGrading } from "@/services/grading-service";

export async function runGradePaperJob(job: any) {
  const supabase = createWorkerSupabaseAdmin();
  if (!job.attempt_id) {
    throw new Error("Paper grading job is missing attempt id.");
  }

  const { data: attempt } = await supabase.from("attempts").select("*").eq("id", job.attempt_id).single();
  if (!attempt) {
    throw new Error("Attempt not found.");
  }

  const [{ data: paper }, { data: questions }, { data: answers }] = await Promise.all([
    supabase.from("papers").select("*").eq("id", attempt.paper_id).single(),
    supabase.from("questions").select("*").eq("paper_id", attempt.paper_id).order("display_order"),
    supabase.from("attempt_answers").select("*").eq("attempt_id", attempt.id),
  ]);

  let totalAwarded = 0;
  let totalMax = 0;
  const summaries: string[] = [];

  for (const question of questions ?? []) {
    const answer = answers?.find((item) => item.question_id === question.id);
    const grading = await gradeQuestion({
      questionLabel: question.question_label,
      questionText: question.question_text,
      answerText: answer?.answer_text ?? "",
      markSchemeText: question.mark_scheme_text,
      marks: question.marks,
    });

    totalAwarded += Number(grading.awardedMarks ?? 0);
    totalMax += Number(grading.maxMarks ?? 0);
    summaries.push(
      `${question.question_label}: ${grading.awardedMarks}/${grading.maxMarks} - ${grading.summary}`,
    );

    const { data: insertedGrade } = await supabase
      .from("grades")
      .insert({
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
      })
      .select("id")
      .single();

    if (grading.awardedMarks < grading.maxMarks) {
      await supabase.from("mistakes").insert({
        user_id: attempt.user_id,
        paper_id: paper?.id,
        attempt_id: attempt.id,
        question_id: question.id,
        grade_id: insertedGrade?.id ?? null,
        topic: question.topic,
        mistake_type: grading.mistakeType,
        note: grading.summary,
        source_excerpt: grading.sourceExcerpt,
      });
    }
  }

  const summary = await summarizePaperGrading(summaries.join("\n"));

  await supabase.from("grades").insert({
    attempt_id: attempt.id,
    scope: "paper",
    awarded_marks: totalAwarded,
    max_marks: totalMax,
    confidence: totalMax > 0 ? 0.76 : 0.5,
    grading_basis: "fallback_question_only",
    feedback: summary,
    raw_response: summary,
    provider: "gemini",
  });

  await supabase
    .from("attempts")
    .update({
      status: "graded",
      graded_at: new Date().toISOString(),
      total_awarded_marks: totalAwarded,
      total_max_marks: totalMax,
      summary_json: summary,
    })
    .eq("id", attempt.id);
}
