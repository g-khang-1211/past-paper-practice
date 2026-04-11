import { NextResponse } from "next/server";

import { getMistakeBooklet } from "@/lib/db/queries/mistakes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mistakes = await getMistakeBooklet(user.id);
    return NextResponse.json({ mistakes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load mistakes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
