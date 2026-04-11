import { NextResponse } from "next/server";

import { submitAttempt } from "@/lib/db/mutations/attempts";

export async function POST(_: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const { attemptId } = await params;
    const attempt = await submitAttempt(attemptId);
    return NextResponse.json({ attempt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit attempt.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
