import { AnalyticsView } from "@/features/analytics/analytics-view";
import { getAnalyticsSnapshot } from "@/lib/db/queries/analytics";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const analytics = await getAnalyticsSnapshot(user!.id);

  return <AnalyticsView attempts={analytics.attempts} mistakes={analytics.mistakes} />;
}
