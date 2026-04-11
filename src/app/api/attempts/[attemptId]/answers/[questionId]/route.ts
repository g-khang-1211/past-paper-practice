import { NextResponse } from "next/server";

import { saveAttemptAnswer } from "@/lib/db/mutations/attempts";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ attemptId: string; questionId: string }> },
) {
  try {
    const { attemptId, questionId } = await params;
    const body = await request.json();
    const answer = await saveAttemptAnswer({
      attemptId,
      questionId,
      answerText: body.answerText ?? "",
      status: body.status ?? "in_progress",
      flagged: Boolean(body.flagged),
      timeSpentSeconds: body.timeSpentSeconds ?? 0,
    });

    return NextResponse.json({ answer });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save answer.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
