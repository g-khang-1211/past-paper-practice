import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAnalyticsSnapshot(userId: string) {
  const supabase = await createSupabaseServerClient();

  const [{ data: attempts }, { data: mistakes }] = await Promise.all([
    supabase
      .from("attempts")
      .select("id, total_awarded_marks, total_max_marks, created_at, summary_json")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("mistakes")
      .select("topic, mistake_type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    attempts: attempts ?? [],
    mistakes: mistakes ?? [],
  };
}
