import { GoogleGenAI } from "@google/genai";

import { getWorkerEnv } from "@/env";
import type { ParseWarning, StructuredPaperJsonV1, StructuredPaperNode } from "@/lib/pdf-types";
import { buildParseRepairPrompt } from "@/lib/parse-prompts";

type ParseRepairTree = StructuredPaperJsonV1;
type ParseRepairNode = StructuredPaperNode;
type ParseRepairWarning = ParseWarning;

type ParseRepairQuestion = {
  questionLabel: string;
  displayOrder: number;
  questionText: string;
  marks: number | null;
  pageStart: number | null;
  pageEnd: number | null;
  topic: string | null;
  parseConfidence: number | null;
};

type ParseRepairResult = {
  tree: ParseRepairTree;
  questions: ParseRepairQuestion[];
  warnings: ParseRepairWarning[];
  usedGemini: boolean;
};

function createWarning(
  code: ParseRepairWarning["code"],
  message: string,
  pageStart: number | null = null,
  pageEnd: number | null = null,
): ParseRepairWarning {
  return { code, message, pageStart, pageEnd };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asNullablePageNumber(value: unknown): number | null {
  const numberValue = asNullableNumber(value);
  return numberValue && numberValue > 0 ? Math.trunc(numberValue) : null;
}

function stripCodeFences(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function buildEmptyTree(warnings: ParseRepairWarning[]): ParseRepairTree {
  return {
    version: 1,
    source: "gemini",
    warnings,
    sections: [],
    leafQuestionIds: [],
  };
}

// Normalize Gemini output into the same persisted tree contract the worker expects.
function normalizeNode(
  value: unknown,
  path: string[],
  warnings: ParseRepairWarning[],
): ParseRepairNode | null {
  if (!isRecord(value)) {
    warnings.push(createWarning("gemini_invalid_json", "Skipped a non-object node in Gemini output."));
    return null;
  }

  const rawKind = asNullableString(value.kind);
  const childrenInput = Array.isArray(value.children) ? value.children : [];
  const kind: "section" | "question" =
    rawKind === "section" || rawKind === "question"
      ? rawKind
      : childrenInput.length > 0
        ? "section"
        : "question";

  const nodeId = asNullableString(value.nodeId) ?? path.join("-");
  const label =
    asNullableString(value.label) ??
    asNullableString(value.questionLabel) ??
    asNullableString(value.title) ??
    path.join(".");

  const children = childrenInput
    .map((child, index) => normalizeNode(child, [...path, String(index + 1)], warnings))
    .filter((child): child is ParseRepairNode => child !== null);

  return {
    nodeId,
    kind,
    label,
    title: asNullableString(value.title),
    text: asString(value.text ?? value.questionText ?? value.body ?? ""),
    pageStart: asNullablePageNumber(value.pageStart ?? value.page_start),
    pageEnd: asNullablePageNumber(value.pageEnd ?? value.page_end),
    confidence: asNullableNumber(value.confidence ?? value.parseConfidence ?? value.parse_confidence),
    questionId: kind === "question" ? asNullableString(value.questionId) : null,
    children,
  };
}

function flattenLeafQuestions(nodes: ParseRepairNode[]): ParseRepairQuestion[] {
  const questions: ParseRepairQuestion[] = [];

  const visit = (node: ParseRepairNode) => {
    if (node.kind === "question" && node.children.length === 0) {
      questions.push({
        questionLabel: node.label,
        displayOrder: questions.length + 1,
        questionText: node.text || node.title || node.label,
        marks: null,
        pageStart: node.pageStart,
        pageEnd: node.pageEnd,
        topic: null,
        parseConfidence: node.confidence,
      });
      return;
    }

    for (const child of node.children) {
      visit(child);
    }
  };

  for (const node of nodes) {
    visit(node);
  }

  return questions;
}

function collectLeafQuestionIds(nodes: ParseRepairNode[]): string[] {
  const ids: string[] = [];

  const visit = (node: ParseRepairNode) => {
    if (node.kind === "question" && node.children.length === 0) {
      ids.push(node.nodeId);
      return;
    }

    for (const child of node.children) {
      visit(child);
    }
  };

  for (const node of nodes) {
    visit(node);
  }

  return ids;
}

function collectWarnings(value: unknown): ParseRepairWarning[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item === "string") {
      return [createWarning("gemini_invalid_json", item)];
    }

    if (!isRecord(item)) {
      return [];
    }

    const message = asNullableString(item.message) ?? asNullableString(item.text) ?? "Gemini returned a warning.";
    return [
      createWarning(
        "gemini_invalid_json",
        message,
        asNullablePageNumber(item.pageStart ?? item.page_start),
        asNullablePageNumber(item.pageEnd ?? item.page_end),
      ),
    ];
  });
}

// Accept both the new tree payload and the older flat-question payload during rollout.
function normalizeResponse(rawValue: unknown, baseWarnings: ParseRepairWarning[]): ParseRepairResult {
  const warnings = [...baseWarnings];

  if (!isRecord(rawValue)) {
    warnings.push(createWarning("gemini_invalid_json", "Gemini returned a non-object response."));
    const tree = buildEmptyTree(warnings);
    return { tree, questions: [], warnings, usedGemini: false };
  }

  const topLevelWarnings = collectWarnings(rawValue.warnings);
  warnings.push(...topLevelWarnings);

  const treeWarnings = collectWarnings(isRecord(rawValue.tree) ? rawValue.tree.warnings : undefined);
  warnings.push(...treeWarnings);

  let sections: ParseRepairNode[] = [];
  let normalizedFromFlatQuestions = false;

  if (isRecord(rawValue.tree) && Array.isArray(rawValue.tree.sections)) {
    sections = rawValue.tree.sections
      .map((section, index) => normalizeNode(section, ["section", String(index + 1)], warnings))
      .filter((section): section is ParseRepairNode => section !== null);
  } else if (Array.isArray(rawValue.sections)) {
    sections = rawValue.sections
      .map((section, index) => normalizeNode(section, ["section", String(index + 1)], warnings))
      .filter((section): section is ParseRepairNode => section !== null);
  } else if (Array.isArray(rawValue.questions) && rawValue.questions.length > 0) {
    // Keep compatibility with older Gemini output by wrapping flat questions in one synthetic section.
    const questionNodes = rawValue.questions
      .map((question, index) => normalizeNode(question, ["question", String(index + 1)], warnings))
      .filter((question): question is ParseRepairNode => question !== null);

    sections = [
      {
        nodeId: "section-1",
        kind: "section",
        label: "Questions",
        title: null,
        text: "",
        pageStart: null,
        pageEnd: null,
        confidence: null,
        questionId: null,
        children: questionNodes,
      },
    ];
    normalizedFromFlatQuestions = true;
  }

  if (normalizedFromFlatQuestions) {
    warnings.push(
      createWarning(
        "low_confidence_structure",
        "Gemini returned a flat question list, so it was wrapped into a synthetic tree.",
      ),
    );
  }

  if (!sections.length) {
    warnings.push(createWarning("low_confidence_structure", "Gemini returned no usable tree structure."));
  }

  const tree: ParseRepairTree = {
    version: 1,
    source: "gemini",
    warnings,
    sections,
    leafQuestionIds: collectLeafQuestionIds(sections),
  };

  return {
    tree,
    questions: flattenLeafQuestions(sections),
    warnings,
    usedGemini: sections.length > 0,
  };
}

export async function repairParsedQuestions(extractedPages: string[]): Promise<ParseRepairResult> {
  const env = getWorkerEnv();

  if (!env.geminiApiKey || !env.geminiFastModel) {
    const warnings = [
      createWarning(
        "gemini_unavailable",
        "Gemini repair was skipped because the API key or fast model is missing.",
      ),
    ];
    return {
      tree: buildEmptyTree(warnings),
      questions: [],
      warnings,
      usedGemini: false,
    };
  }

  try {
    // Ask Gemini for a tree-shaped repair so the worker can reconcile one consistent structure.
    const client = new GoogleGenAI({
      apiKey: env.geminiApiKey,
    });

    const response = await client.models.generateContent({
      model: env.geminiFastModel,
      contents: buildParseRepairPrompt(extractedPages.join("\n\n---\n\n")),
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = stripCodeFences(response.text ?? "");
    if (!text) {
      const warnings = [
        createWarning("low_confidence_structure", "Gemini returned an empty repair response."),
      ];
      return {
        tree: buildEmptyTree(warnings),
        questions: [],
        warnings,
        usedGemini: false,
      };
    }

    try {
      const parsed = JSON.parse(text) as unknown;
      return normalizeResponse(parsed, []);
    } catch (error) {
      const warnings = [
        createWarning(
          "gemini_invalid_json",
          error instanceof Error ? `Gemini returned invalid JSON: ${error.message}` : "Gemini returned invalid JSON.",
        ),
      ];
      return {
        tree: buildEmptyTree(warnings),
        questions: [],
        warnings,
        usedGemini: false,
      };
    }
  } catch (error) {
    const warnings = [
      createWarning(
        "gemini_invalid_json",
        error instanceof Error ? `Gemini repair failed: ${error.message}` : "Gemini repair failed.",
      ),
    ];

    return {
      tree: buildEmptyTree(warnings),
      questions: [],
      warnings,
      usedGemini: false,
    };
  }
}
