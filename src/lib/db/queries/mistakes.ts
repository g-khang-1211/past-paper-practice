import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getMistakeBooklet(userId: string) {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("mistakes")
    .select("*, papers(title, subject), questions(question_label, question_text)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return data ?? [];
}
