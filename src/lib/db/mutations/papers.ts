import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { deletePaperAssets, uploadPaperAsset } from "@/lib/supabase/storage";

export async function createPaperUpload(params: {
  userId: string;
  title: string;
  subject: string;
  board?: string;
  questionFile: File;
  markSchemeFile?: File | null;
}) {
  const supabase = await createSupabaseServerClient();
  let createdPaperId: string | null = null;
  const uploadedPaths: string[] = [];

  try {
    const { data: paper, error: createError } = await supabase
      .from("papers")
      .insert({
        user_id: params.userId,
        title: params.title,
        subject: params.subject,
        board: params.board ?? "Cambridge IGCSE",
        question_pdf_path: "pending",
        parse_status: "uploaded",
      })
      .select("*")
      .single();

    if (createError || !paper) {
      throw createError ?? new Error("Failed to create paper record");
    }

    createdPaperId = paper.id;

    const questionPath = await uploadPaperAsset({
      userId: params.userId,
      paperId: paper.id,
      file: params.questionFile,
      kind: "question",
    });
    uploadedPaths.push(questionPath);

    const markSchemePath = params.markSchemeFile
      ? await uploadPaperAsset({
          userId: params.userId,
          paperId: paper.id,
          file: params.markSchemeFile,
          kind: "mark-scheme",
        })
      : null;

    if (markSchemePath) {
      uploadedPaths.push(markSchemePath);
    }

    const { data: updated, error: updateError } = await supabase
      .from("papers")
      .update({
        question_pdf_path: questionPath,
        mark_scheme_pdf_path: markSchemePath,
        parse_status: "uploaded",
        parse_error: null,
      })
      .eq("id", paper.id)
      .select("*")
      .single();

    if (updateError || !updated) {
      throw updateError ?? new Error("Failed to persist uploaded file paths");
    }

    await enqueuePaperParseJob(updated.id);

    return updated;
  } catch (error) {
    if (uploadedPaths.length) {
      try {
        await deletePaperAssets(uploadedPaths);
      } catch {
        // Preserve the original upload failure and keep cleanup best-effort.
      }
    }

    if (createdPaperId) {
      await supabase.from("papers").delete().eq("id", createdPaperId);
    }

    throw error;
  }
}

export async function enqueuePaperParseJob(paperId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("worker_jobs")
    .insert({
      type: "paper_parse",
      paper_id: paperId,
      status: "queued",
      payload: {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to enqueue paper parse job");
  }

  return data;
}
