import { detectQuestions } from "@/lib/detect-questions";
import type { ExtractedPdfPage } from "@/lib/pdf-types";
import { repairParsedQuestions } from "@/lib/parse-repair-service";
import { createWorkerSupabaseAdmin } from "@/lib/supabase-admin";
import { openPdf } from "@/services/pdf-service";

function logParse(message: string, extra?: Record<string, unknown>) {
  if (extra) {
    console.info(`[paper-parse] ${message}`, extra);
    return;
  }

  console.info(`[paper-parse] ${message}`);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function throwStepError(step: string, error: unknown): never {
  throw new Error(`${step}: ${getErrorMessage(error)}`);
}

export async function runPaperParseJob(job: any) {
  const supabase = createWorkerSupabaseAdmin();
  const { data: paper, error: paperError } = await supabase.from("papers").select("*").eq("id", job.paper_id).single();

  if (paperError) {
    throwStepError("Unable to load paper", paperError);
  }

  if (!paper?.question_pdf_path || paper.question_pdf_path === "pending") {
    throw new Error("Paper file path is missing.");
  }

  logParse("Starting parse job", {
    jobId: job.id,
    paperId: paper.id,
    storagePath: paper.question_pdf_path,
  });

  const { error: parsingUpdateError } = await supabase
    .from("papers")
    .update({ parse_status: "parsing", parse_error: null })
    .eq("id", paper.id);

  if (parsingUpdateError) {
    throwStepError("Unable to mark paper as parsing", parsingUpdateError);
  }

  logParse("Downloading PDF from storage", {
    paperId: paper.id,
  });
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("papers")
    .download(paper.question_pdf_path);

  if (downloadError || !fileData) {
    throwStepError("Unable to download paper PDF", downloadError ?? new Error("Missing storage blob"));
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const pdf = await openPdf(buffer);
  const extractedPages: ExtractedPdfPage[] = [];
  logParse("Opened PDF", {
    paperId: paper.id,
    totalPages: pdf.totalPages,
  });

  const { error: progressInitError } = await supabase
    .from("papers")
    .update({
      page_count: pdf.totalPages,
      parsed_pages_count: 0,
      parse_progress_pct: 0,
    })
    .eq("id", paper.id);

  if (progressInitError) {
    await pdf.cleanup();
    throwStepError(
      "Unable to initialize parse progress. Ensure supabase/migrations/0002_parse_progress.sql has been applied",
      progressInitError,
    );
  }

  for (let pageNumber = 1; pageNumber <= pdf.totalPages; pageNumber += 1) {
    logParse("Extracting page", {
      paperId: paper.id,
      pageNumber,
      totalPages: pdf.totalPages,
    });
    const text = await pdf.getPageText(pageNumber);
    extractedPages.push({
      pageNumber,
      text,
    });

    const { error: insertPagesError } = await supabase.from("paper_pages").upsert(
      {
        paper_id: paper.id,
        page_number: pageNumber,
        extracted_text: text,
        preview_image_path: null,
      },
      {
        onConflict: "paper_id,page_number",
      },
    );

    if (insertPagesError) {
      await pdf.cleanup();
      throwStepError(`Unable to persist parsed page ${pageNumber}`, insertPagesError);
    }

    const parsedPagesCount = extractedPages.length;
    const parseProgressPct = Math.min(100, Math.round((parsedPagesCount / pdf.totalPages) * 100));

    const { error: progressUpdateError } = await supabase
      .from("papers")
      .update({
        parsed_pages_count: parsedPagesCount,
        parse_progress_pct: parseProgressPct,
        page_count: pdf.totalPages,
      })
      .eq("id", paper.id);

    if (progressUpdateError) {
      await pdf.cleanup();
      throwStepError(`Unable to update parse progress after page ${pageNumber}`, progressUpdateError);
    }

    logParse("Persisted parsed page", {
      paperId: paper.id,
      pageNumber,
      parsedPagesCount,
      parseProgressPct,
    });
  }

  await pdf.cleanup();

  logParse("Running question extraction", {
    paperId: paper.id,
    parsedPagesCount: extractedPages.length,
  });
  const detectedQuestions = detectQuestions(extractedPages);
  const repaired = await repairParsedQuestions(extractedPages.map((page) => page.text));
  const repairedQuestions =
    Array.isArray(repaired.questions) && repaired.questions.length ? repaired.questions : detectedQuestions;

  if (!repairedQuestions.length) {
    throw new Error("Unable to detect questions for this paper. Parsed pages are still available.");
  }

  const { error: deleteQuestionsError } = await supabase.from("questions").delete().eq("paper_id", paper.id);
  if (deleteQuestionsError) {
    throwStepError("Unable to replace existing questions", deleteQuestionsError);
  }

  const { error: insertQuestionsError } = await supabase.from("questions").insert(
    repairedQuestions.map((question: any, index: number) => ({
      paper_id: paper.id,
      question_label: question.questionLabel ?? question.question_label ?? `${index + 1}`,
      display_order: question.displayOrder ?? question.display_order ?? index + 1,
      page_start: question.pageStart ?? question.page_start ?? 1,
      page_end: question.pageEnd ?? question.page_end ?? 1,
      question_text: question.questionText ?? question.question_text ?? "",
      marks: question.marks ?? null,
      topic: question.topic ?? null,
      parse_confidence: question.parseConfidence ?? question.parse_confidence ?? 60,
    })),
  );

  if (insertQuestionsError) {
    throwStepError("Unable to persist detected questions", insertQuestionsError);
  }

  const { error: finalPaperUpdateError } = await supabase
    .from("papers")
    .update({
      parse_status: "ready",
      parse_confidence: repairedQuestions.length ? 78 : 45,
      page_count: pdf.totalPages,
      parsed_pages_count: extractedPages.length,
      parse_progress_pct: 100,
      structured_paper_json: {
        pageCount: pdf.totalPages,
        questionCount: repairedQuestions.length,
      },
    })
    .eq("id", paper.id);

  if (finalPaperUpdateError) {
    throwStepError("Unable to mark paper as ready", finalPaperUpdateError);
  }

  logParse("Completed parse job", {
    paperId: paper.id,
    totalPages: pdf.totalPages,
    questionCount: repairedQuestions.length,
  });
}

export async function markPaperParseFailed(paperId: string, errorMessage: string) {
  const supabase = createWorkerSupabaseAdmin();
  logParse("Marking paper as failed", {
    paperId,
    errorMessage,
  });
  await supabase
    .from("papers")
    .update({
      parse_status: "failed",
      parse_error: errorMessage,
    })
    .eq("id", paperId);
}
