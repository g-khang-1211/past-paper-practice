import { createSignedPaperUrl } from "@/lib/supabase/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Paper, Question } from "@/types";

export async function getDashboardSnapshot(userId: string) {
  const supabase = await createSupabaseServerClient();

  const [{ data: papers }, { data: attempts }, { data: mistakes }] = await Promise.all([
    supabase
      .from("papers")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("attempts")
      .select("id, paper_id, mode, status, total_awarded_marks, total_max_marks, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("mistakes")
      .select("id, topic, mistake_type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    papers: (papers ?? []) as Paper[],
    attempts: attempts ?? [],
    mistakes: mistakes ?? [],
  };
}

export async function getPaperDetail(paperId: string) {
  const supabase = await createSupabaseServerClient();

  const [{ data: paper }, { data: pages }, { data: questions }, { data: attempts }] =
    await Promise.all([
      supabase.from("papers").select("*").eq("id", paperId).single(),
      supabase
        .from("paper_pages")
        .select("*")
        .eq("paper_id", paperId)
        .order("page_number", { ascending: true }),
      supabase
        .from("questions")
        .select("*")
        .eq("paper_id", paperId)
        .order("display_order", { ascending: true }),
      supabase
        .from("attempts")
        .select("*")
        .eq("paper_id", paperId)
        .order("created_at", { ascending: false }),
    ]);

  let signedQuestionPdfUrl: string | null = null;

  if (paper?.question_pdf_path && paper.question_pdf_path !== "pending") {
    try {
      signedQuestionPdfUrl = await createSignedPaperUrl(paper.question_pdf_path);
    } catch {
      signedQuestionPdfUrl = null;
    }
  }

  return {
    paper: (paper ?? null) as Paper | null,
    pages: pages ?? [],
    questions: (questions ?? []) as Question[],
    attempts: attempts ?? [],
    signedQuestionPdfUrl,
  };
}
