import { NextResponse } from "next/server";

import { getAttemptResults } from "@/lib/db/queries/attempts";

export async function GET(_: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  try {
    const { attemptId } = await params;
    const results = await getAttemptResults(attemptId);

    if (!results) {
      return NextResponse.json({ error: "Results not found." }, { status: 404 });
    }

    return NextResponse.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load results.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
