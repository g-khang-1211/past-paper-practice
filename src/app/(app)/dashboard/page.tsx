import { DashboardOverview } from "@/features/papers/dashboard-overview";
import { getAnalyticsSnapshot } from "@/lib/db/queries/analytics";
import { getDashboardSnapshot } from "@/lib/db/queries/papers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [dashboard, analytics] = await Promise.all([
    getDashboardSnapshot(user!.id),
    getAnalyticsSnapshot(user!.id),
  ]);

  const average =
    analytics.attempts.length > 0
      ? analytics.attempts.reduce((sum, attempt) => {
          const max = Number(attempt.total_max_marks ?? 0);
          const awarded = Number(attempt.total_awarded_marks ?? 0);
          return sum + (max > 0 ? (awarded / max) * 100 : 0);
        }, 0) / analytics.attempts.length
      : 80.4;

  return (
    <DashboardOverview
      analytics={{
        currentAverage: average || 80.4,
        targetAverage: 90,
        mistakeCount: dashboard.mistakes.length,
      }}
      papers={dashboard.papers}
    />
  );
}
