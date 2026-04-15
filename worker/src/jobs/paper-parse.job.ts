import { detectQuestions } from "@/lib/detect-questions";
import type {
  ExtractedPdfPage,
  ParseWarning,
  StructuredPaperJsonV1,
  StructuredPaperNode,
  StructuredPaperSource,
} from "@/lib/pdf-types";
import { repairParsedQuestions } from "@/lib/parse-repair-service";
import { createWorkerSupabaseAdmin } from "@/lib/supabase-admin";
import { openPdf } from "@/services/pdf-service";

type PersistedQuestionRow = {
  id: string;
  display_order: number;
};

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

function trimText(value: string) {
  return value.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function createWarning(
  code: ParseWarning["code"],
  message: string,
  pageStart: number | null = null,
  pageEnd: number | null = null,
): ParseWarning {
  return {
    code,
    message,
    pageStart,
    pageEnd,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeText(value: unknown, fallback = "") {
  return trimText(asString(value) || fallback);
}

function normalizePageNumber(value: unknown) {
  const numberValue = asNullableNumber(value);
  return numberValue && numberValue > 0 ? Math.trunc(numberValue) : null;
}

function toNodeId(prefix: string, path: string[]) {
  return `${prefix}-${path.join("-")}`;
}

// Normalize both heuristic and Gemini outputs into the same tree contract before reconciling.
function normalizeNode(
  value: unknown,
  path: string[],
  warnings: ParseWarning[],
): StructuredPaperNode | null {
  const record = asRecord(value);
  if (!record) {
    warnings.push(
      createWarning("low_confidence_structure", "Skipped a malformed parse node during normalization."),
    );
    return null;
  }

  const childrenInput = Array.isArray(record.children) ? record.children : [];
  const kindValue = asNullableString(record.kind);
  const kind: StructuredPaperNode["kind"] =
    kindValue === "section" || kindValue === "question"
      ? kindValue
      : childrenInput.length > 0
        ? "section"
        : "question";

  const label =
    asNullableString(record.label) ??
    asNullableString(record.questionLabel) ??
    asNullableString(record.title) ??
    path.join(".");

  const children = childrenInput
    .map((child, index) => normalizeNode(child, [...path, String(index + 1)], warnings))
    .filter((child): child is StructuredPaperNode => child !== null);

  return {
    nodeId: asNullableString(record.nodeId) ?? toNodeId(kind, path),
    kind,
    label,
    title: asNullableString(record.title),
    text: normalizeText(record.text ?? record.questionText ?? record.body ?? "", ""),
    pageStart: normalizePageNumber(record.pageStart ?? record.page_start),
    pageEnd: normalizePageNumber(record.pageEnd ?? record.page_end),
    confidence:
      asNullableNumber(record.confidence ?? record.parseConfidence ?? record.parse_confidence) ?? null,
    questionId: null,
    children,
  };
}

function normalizeSections(value: unknown, warnings: ParseWarning[]) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item, index) => normalizeNode(item, [String(index + 1)], warnings))
    .filter((item): item is StructuredPaperNode => item !== null);
}

function normalizeWarnings(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const record = asRecord(item);
    if (!record) {
      return [];
    }

    const code = asNullableString(record.code);
    const allowedCode: ParseWarning["code"] =
      code === "gemini_unavailable" ||
      code === "gemini_invalid_json" ||
      code === "heuristic_only" ||
      code === "low_confidence_structure" ||
      code === "empty_page_text" ||
      code === "unmapped_leaf"
        ? code
        : "low_confidence_structure";

    return [
      createWarning(
        allowedCode,
        asNullableString(record.message) ?? "The parser reported a warning.",
        normalizePageNumber(record.pageStart ?? record.page_start),
        normalizePageNumber(record.pageEnd ?? record.page_end),
      ),
    ];
  });
}

function patchString(baseValue: string | null, candidateValue: string | null) {
  return candidateValue && candidateValue.trim() ? candidateValue : baseValue;
}

function patchText(baseValue: string, candidateValue: string) {
  return candidateValue.trim() ? candidateValue : baseValue;
}

function patchNumber(baseValue: number | null, candidateValue: number | null) {
  return candidateValue !== null ? candidateValue : baseValue;
}

function patchNode(baseNode: StructuredPaperNode, candidateNode: StructuredPaperNode): StructuredPaperNode {
  return {
    ...baseNode,
    title: patchString(baseNode.title, candidateNode.title),
    text: patchText(baseNode.text, candidateNode.text),
    pageStart: patchNumber(baseNode.pageStart, candidateNode.pageStart),
    pageEnd: patchNumber(baseNode.pageEnd, candidateNode.pageEnd),
    confidence: patchNumber(baseNode.confidence, candidateNode.confidence),
    children: reconcileNodes(baseNode.children, candidateNode.children),
  };
}

// Reconcile sibling nodes by label first, then by sibling position if labels are absent.
function reconcileNodes(
  baseNodes: StructuredPaperNode[],
  candidateNodes: StructuredPaperNode[],
): StructuredPaperNode[] {
  const reconciled = [...baseNodes];

  for (let index = 0; index < candidateNodes.length; index += 1) {
    const candidateNode = candidateNodes[index];
    const existingIndex = reconciled.findIndex(
      (baseNode, baseIndex) =>
        baseNode.label.toLowerCase() === candidateNode.label.toLowerCase() || baseIndex === index,
    );

    if (existingIndex === -1) {
      reconciled.push(candidateNode);
      continue;
    }

    reconciled[existingIndex] = patchNode(reconciled[existingIndex], candidateNode);
  }

  return reconciled;
}

function collectLeafNodes(nodes: StructuredPaperNode[]) {
  const leaves: StructuredPaperNode[] = [];

  const visit = (node: StructuredPaperNode) => {
    if (node.kind === "question" && node.children.length === 0) {
      leaves.push(node);
      return;
    }

    for (const child of node.children) {
      visit(child);
    }
  };

  for (const node of nodes) {
    visit(node);
  }

  return leaves;
}

function hydrateQuestionIds(
  nodes: StructuredPaperNode[],
  questionIds: string[],
  warnings: ParseWarning[],
) {
  let leafIndex = 0;

  const visit = (node: StructuredPaperNode): StructuredPaperNode => {
    if (node.kind === "question" && node.children.length === 0) {
      const questionId = questionIds[leafIndex] ?? null;
      leafIndex += 1;

      if (!questionId) {
        warnings.push(
          createWarning(
            "unmapped_leaf",
            `Could not map the parsed leaf "${node.label}" to a persisted question row.`,
            node.pageStart,
            node.pageEnd,
          ),
        );
      }

      return {
        ...node,
        questionId,
      };
    }

    return {
      ...node,
      children: node.children.map(visit),
    };
  };

  return nodes.map(visit);
}

function collectLeafQuestionIds(nodes: StructuredPaperNode[]) {
  return collectLeafNodes(nodes)
    .map((node) => node.questionId)
    .filter((questionId): questionId is string => Boolean(questionId));
}

function getAverageLeafConfidence(nodes: StructuredPaperNode[]) {
  const confidences = collectLeafNodes(nodes)
    .map((node) => node.confidence)
    .filter((confidence): confidence is number => confidence !== null);

  if (!confidences.length) {
    return null;
  }

  return Number((confidences.reduce((sum, value) => sum + value, 0) / confidences.length).toFixed(2));
}

function buildStructuredPaperJson(
  source: StructuredPaperSource,
  warnings: ParseWarning[],
  sections: StructuredPaperNode[],
): StructuredPaperJsonV1 {
  return {
    version: 1,
    source,
    warnings,
    sections,
    leafQuestionIds: collectLeafQuestionIds(sections),
  };
}

async function persistFailedSnapshot(params: {
  paperId: string;
  pageCount: number;
  parsedPagesCount: number;
  source: StructuredPaperSource;
  warnings: ParseWarning[];
  sections: StructuredPaperNode[];
}) {
  const supabase = createWorkerSupabaseAdmin();
  const structuredPaperJson = buildStructuredPaperJson(
    params.source,
    params.warnings,
    params.sections,
  );

  await supabase
    .from("papers")
    .update({
      parse_confidence: getAverageLeafConfidence(params.sections),
      page_count: params.pageCount,
      parsed_pages_count: params.parsedPagesCount,
      parse_progress_pct: 100,
      structured_paper_json: structuredPaperJson,
    })
    .eq("id", params.paperId);
}

export async function runPaperParseJob(job: { id: string; paper_id: string | null }) {
  const supabase = createWorkerSupabaseAdmin();
  const { data: paper, error: paperError } = await supabase
    .from("papers")
    .select("*")
    .eq("id", job.paper_id)
    .single();

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

  const { data: fileData, error: downloadError } = await supabase.storage
    .from("papers")
    .download(paper.question_pdf_path);

  if (downloadError || !fileData) {
    throwStepError("Unable to download paper PDF", downloadError ?? new Error("Missing storage blob"));
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const pdf = await openPdf(buffer);
  const extractedPages: ExtractedPdfPage[] = [];

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
  }

  await pdf.cleanup();

  if (!extractedPages.some((page) => page.text.trim())) {
    await supabase.from("questions").delete().eq("paper_id", paper.id);

    const warnings = [
      createWarning("empty_page_text", "All parsed pages were empty, so no answerable questions could be built."),
    ];

    await persistFailedSnapshot({
      paperId: paper.id,
      pageCount: pdf.totalPages,
      parsedPagesCount: extractedPages.length,
      source: "heuristic",
      warnings,
      sections: [],
    });

    throw new Error("All parsed pages were empty, so no answerable questions could be built.");
  }

  const heuristicResult = detectQuestions(extractedPages).tree;
  const repairedResult = await repairParsedQuestions(extractedPages.map((page) => page.text));
  const warnings = [
    ...normalizeWarnings(heuristicResult.warnings),
    ...normalizeWarnings(repairedResult.warnings),
  ];

  const heuristicSections = normalizeSections(heuristicResult.sections, warnings);
  const geminiSections = normalizeSections(repairedResult.tree.sections, warnings);

  let source: StructuredPaperSource = "heuristic";
  let finalSections = heuristicSections;

  if (heuristicSections.length && geminiSections.length) {
    source = "merged";
    finalSections = reconcileNodes(heuristicSections, geminiSections);
  } else if (!heuristicSections.length && geminiSections.length) {
    source = "gemini";
    finalSections = geminiSections;
  } else if (heuristicSections.length && !geminiSections.length) {
    warnings.push(
      createWarning(
        "heuristic_only",
        "Gemini did not return a usable tree, so the heuristic structure was kept.",
      ),
    );
  } else {
    warnings.push(
      createWarning(
        "low_confidence_structure",
        "Neither heuristics nor Gemini produced an answerable question tree.",
      ),
    );
    finalSections = [];
  }

  const leafNodes = collectLeafNodes(finalSections);

  const { error: deleteQuestionsError } = await supabase.from("questions").delete().eq("paper_id", paper.id);
  if (deleteQuestionsError) {
    throwStepError("Unable to replace existing questions", deleteQuestionsError);
  }

  if (!leafNodes.length) {
    await persistFailedSnapshot({
      paperId: paper.id,
      pageCount: pdf.totalPages,
      parsedPagesCount: extractedPages.length,
      source,
      warnings,
      sections: finalSections,
    });

    throw new Error("Unable to detect answerable questions for this paper. Parsed pages are still available.");
  }

  const insertPayload = leafNodes.map((node, index) => ({
    paper_id: paper.id,
    parent_question_id: null,
    question_label: node.label,
    display_order: index + 1,
    page_start: node.pageStart,
    page_end: node.pageEnd,
    page_regions: [],
    question_text: node.text || node.title || node.label,
    marks: null,
    topic: null,
    parse_confidence: node.confidence,
  }));

  const { data: insertedQuestions, error: insertQuestionsError } = await supabase
    .from("questions")
    .insert(insertPayload)
    .select("id, display_order");

  if (insertQuestionsError || !insertedQuestions) {
    throwStepError("Unable to persist detected questions", insertQuestionsError ?? new Error("Missing inserted rows"));
  }

  const orderedQuestionIds = (insertedQuestions as PersistedQuestionRow[])
    .sort((left, right) => left.display_order - right.display_order)
    .map((row) => row.id);

  const hydratedSections = hydrateQuestionIds(finalSections, orderedQuestionIds, warnings);
  const structuredPaperJson = buildStructuredPaperJson(source, warnings, hydratedSections);

  const { error: finalPaperUpdateError } = await supabase
    .from("papers")
    .update({
      parse_status: "ready",
      parse_error: null,
      parse_confidence: getAverageLeafConfidence(hydratedSections),
      page_count: pdf.totalPages,
      parsed_pages_count: extractedPages.length,
      parse_progress_pct: 100,
      structured_paper_json: structuredPaperJson,
    })
    .eq("id", paper.id);

  if (finalPaperUpdateError) {
    throwStepError("Unable to mark paper as ready", finalPaperUpdateError);
  }

  logParse("Completed parse job", {
    paperId: paper.id,
    totalPages: pdf.totalPages,
    questionCount: orderedQuestionIds.length,
    source,
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
