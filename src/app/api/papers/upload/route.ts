import { NextResponse } from "next/server";

import { createPaperUpload } from "@/lib/db/mutations/papers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const title = String(formData.get("title") ?? "");
    const subject = String(formData.get("subject") ?? "Mathematics");
    const questionFile = formData.get("questionFile");
    const markSchemeFile = formData.get("markSchemeFile");

    if (!(questionFile instanceof File)) {
      return NextResponse.json({ error: "Question paper PDF is required." }, { status: 400 });
    }

    const paper = await createPaperUpload({
      userId: user.id,
      title,
      subject,
      questionFile,
      markSchemeFile: markSchemeFile instanceof File && markSchemeFile.size > 0 ? markSchemeFile : null,
    });

    return NextResponse.json({ paper });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
