import { ErrorState } from "@/components/states/error-state";
import { AttemptWorkspace } from "@/features/attempts/attempt-workspace";
import { getAttemptWorkspace } from "@/lib/db/queries/attempts";

export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const workspace = await getAttemptWorkspace(attemptId);

  if (!workspace) {
    return <ErrorState description="This attempt could not be found or it is not available yet." />;
  }

  return <AttemptWorkspace {...workspace} />;
}
