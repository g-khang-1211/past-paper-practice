import { createSupabaseAdminClient } from "@/lib/supabase/server";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9.\-_]/g, "-").toLowerCase();
}

export async function uploadPaperAsset(params: {
  userId: string;
  paperId: string;
  file: File;
  kind: "question" | "mark-scheme";
}) {
  const supabase = createSupabaseAdminClient();
  const fileName = sanitizeFileName(params.file.name);
  const path = `${params.userId}/papers/${params.paperId}/${params.kind}/${Date.now()}-${fileName}`;
  const arrayBuffer = await params.file.arrayBuffer();

  const { error } = await supabase.storage
    .from("papers")
    .upload(path, arrayBuffer, {
      contentType: params.file.type || "application/pdf",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return path;
}

export async function createSignedPaperUrl(path: string, expiresIn = 3600) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage.from("papers").createSignedUrl(path, expiresIn);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

export async function deletePaperAssets(paths: Array<string | null | undefined>) {
  const normalizedPaths = paths.filter((path): path is string => Boolean(path));
  if (!normalizedPaths.length) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from("papers").remove(normalizedPaths);

  if (error) {
    throw error;
  }
}
