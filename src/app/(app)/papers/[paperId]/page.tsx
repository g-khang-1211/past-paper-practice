import { ErrorState } from "@/components/states/error-state";
import { PaperDetailView } from "@/features/papers/paper-detail-view";
import { getPaperDetail } from "@/lib/db/queries/papers";

export default async function PaperDetailPage({ params }: { params: Promise<{ paperId: string }> }) {
  const { paperId } = await params;
  const detail = await getPaperDetail(paperId);

  if (!detail?.paper) {
    return <ErrorState description="This paper could not be found or you no longer have access to it." />;
  }

  return (
    <PaperDetailView
      attempts={detail.attempts}
      paper={detail.paper}
      pages={detail.pages}
      questions={detail.questions}
      signedQuestionPdfUrl={detail.signedQuestionPdfUrl}
    />
  );
}
