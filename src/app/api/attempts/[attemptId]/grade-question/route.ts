import { NextResponse } from "next/server";

import { gradeQuestion } from "@/lib/ai/grading-service";
import {
  persistMistake,
  persistQuestionGrade,
} from "@/lib/db/mutations/attempts";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const { attemptId } = await params;
    const supabase = await createSupabaseServerClient();
    const body = await request.json();

    const { data: attempt } = await supabase.from("attempts").select("*").eq("id", attemptId).single();
    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
    }

    if (attempt.mode === "exam" && attempt.status !== "submitted" && attempt.status !== "graded") {
      return NextResponse.json(
        { error: "Question grading is disabled during Exam mode until submission." },
        { status: 403 },
      );
    }

    const [{ data: question }, { data: answer }, { data: paper }] = await Promise.all([
      supabase.from("questions").select("*").eq("id", body.questionId).single(),
      supabase
        .from("attempt_answers")
        .select("*")
        .eq("attempt_id", attemptId)
        .eq("question_id", body.questionId)
        .single(),
      supabase.from("papers").select("*").eq("id", attempt.paper_id).single(),
    ]);

    if (!question || !paper) {
      return NextResponse.json({ error: "Question context not found." }, { status: 404 });
    }

    const grading = await gradeQuestion({
      questionLabel: question.question_label,
      questionText: question.question_text,
      answerText: body.answerText ?? answer?.answer_text ?? "",
      markSchemeText: question.mark_scheme_text,
      marks: question.marks,
    });

    const grade = await persistQuestionGrade({
      attemptId,
      questionId: body.questionId,
      awardedMarks: grading.awardedMarks,
      maxMarks: grading.maxMarks,
      confidence: grading.confidence,
      gradingBasis: grading.gradingBasis,
      feedback: {
        summary: grading.summary,
        strengths: grading.strengths,
        misses: grading.misses,
      },
      rawResponse: grading,
    });

    if (grading.awardedMarks < grading.maxMarks) {
      await persistMistake({
        userId: attempt.user_id,
        paperId: paper.id,
        attemptId: attempt.id,
        questionId: body.questionId,
        gradeId: grade.id,
        topic: question.topic,
        mistakeType: grading.mistakeType,
        note: grading.summary,
        sourceExcerpt: grading.sourceExcerpt,
      });
    }

    return NextResponse.json({ grade: { ...grade, ...grading } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to grade question.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
