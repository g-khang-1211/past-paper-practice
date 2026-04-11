import { NextResponse } from "next/server";

import { getPaperDetail } from "@/lib/db/queries/papers";

export async function GET(_: Request, { params }: { params: Promise<{ paperId: string }> }) {
  try {
    const { paperId } = await params;
    const detail = await getPaperDetail(paperId);

    if (!detail?.paper) {
      return NextResponse.json({ error: "Paper not found." }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load paper.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
