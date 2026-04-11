import { MistakesView } from "@/features/mistakes/mistakes-view";
import { getMistakeBooklet } from "@/lib/db/queries/mistakes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function MistakesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const mistakes = await getMistakeBooklet(user!.id);

  return <MistakesView mistakes={mistakes} />;
}
