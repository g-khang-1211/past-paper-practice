import { NextResponse } from "next/server";

import { createAttempt } from "@/lib/db/mutations/attempts";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    const { paperId } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: paper } = await supabase.from("papers").select("*").eq("id", paperId).single();
    const { data: questions } = await supabase.from("questions").select("id").eq("paper_id", paperId).limit(1);

    if (!paper) {
      return NextResponse.json({ error: "Paper not found." }, { status: 404 });
    }

    if (paper.parse_status !== "ready" || !questions?.length) {
      return NextResponse.json(
        { error: "This paper is still parsing. Start an attempt once the question map is ready." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const attempt = await createAttempt({
      paperId,
      userId: user.id,
      mode: body.mode,
      timed: Boolean(body.timed),
      durationSeconds: body.durationSeconds ?? null,
    });

    return NextResponse.json({ attempt });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create attempt.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
