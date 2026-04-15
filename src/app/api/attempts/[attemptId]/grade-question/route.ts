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

    const gradingResult = await gradeQuestion({
      questionLabel: question.question_label,
      questionText: question.question_text,
      answerText: body.answerText ?? answer?.answer_text ?? "",
      markSchemeText: question.mark_scheme_text,
      marks: question.marks,
    });

    const grade = await persistQuestionGrade({
      attemptId,
      questionId: body.questionId,
      awardedMarks: gradingResult.grade.awardedMarks,
      maxMarks: gradingResult.grade.maxMarks,
      confidence: gradingResult.grade.confidence,
      gradingBasis: gradingResult.grade.gradingBasis,
      feedback: {
        summary: gradingResult.grade.summary,
        strengths: gradingResult.grade.strengths,
        misses: gradingResult.grade.misses,
      },
      rawResponse: gradingResult.grade,
    });

    if (gradingResult.grade.awardedMarks < gradingResult.grade.maxMarks) {
      await persistMistake({
        userId: attempt.user_id,
        paperId: paper.id,
        attemptId: attempt.id,
        questionId: body.questionId,
        gradeId: grade.id,
        topic: question.topic,
        mistakeType: gradingResult.grade.mistakeType,
        note: gradingResult.grade.summary,
        sourceExcerpt: gradingResult.grade.sourceExcerpt,
      });
    }

    return NextResponse.json({
      grade: { ...grade, ...gradingResult.grade },
      ...(gradingResult.warning ? { warning: gradingResult.warning } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to grade question.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
