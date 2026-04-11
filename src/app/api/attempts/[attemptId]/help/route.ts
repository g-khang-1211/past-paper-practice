import { NextResponse } from "next/server";

import { generateHint } from "@/lib/ai/hint-service";
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
        { error: "AI help is disabled during Exam mode until submission." },
        { status: 403 },
      );
    }

    const { data: question } = await supabase.from("questions").select("*").eq("id", body.questionId).single();
    if (!question) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    const hint = await generateHint({
      level: body.level,
      questionLabel: question.question_label,
      questionText: question.question_text,
      answerText: body.answerText ?? "",
      markSchemeText: question.mark_scheme_text,
    });

    return NextResponse.json({ hint });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch hint.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
