import { ErrorState } from "@/components/states/error-state";
import { LoadingState } from "@/components/states/loading-state";
import { ResultsView } from "@/features/grading/results-view";
import { getAttemptResults } from "@/lib/db/queries/attempts";

export default async function AttemptResultsPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const results = await getAttemptResults(attemptId);

  if (!results) {
    return <ErrorState description="Results are not available for this attempt yet." />;
  }

  if (results.attempt.status !== "graded" && results.grades.length === 0) {
    return (
      <LoadingState
        description="The worker is grading the paper and building your mistake booklet. Refresh shortly for the completed results view."
        title="Results are still processing"
      />
    );
  }

  return <ResultsView {...results} />;
}
