import type {
  ExtractedPdfPage,
  HeuristicQuestionDetectionResult,
  ParsedQuestionCandidate,
  ParseWarning,
  StructuredPaperJsonV1,
  StructuredPaperNode,
} from "@/lib/pdf-types";

type LineRecord = {
  pageNumber: number;
  lineIndex: number;
  text: string;
  trimmed: string;
};

type Token = {
  kind: "section" | "question";
  lineIndex: number;
  pageNumber: number;
  localLabel: string;
  label: string;
  title: string | null;
  depth: number;
  confidence: number;
  isRelativeLabel: boolean;
};

type TreeNodeState = {
  nodeId: string;
  kind: "section" | "question";
  localLabel: string;
  label: string;
  title: string | null;
  startLine: number;
  endLine: number;
  confidence: number | null;
  children: TreeNodeState[];
};

const SECTION_PREFIX_REGEX = /^((?:section|part|unit|module|paper|topic|chapter))\s+([a-z0-9ivxlc]+)(?:\s*[:.\-]\s*(.*))?$/i;
const QUESTION_PREFIX_REGEX = /^(?:question\s+|q\s*)?(\d+(?:\.\d+)*)(?:\s*[\.)])?(?:\s*[:\-]\s*(.*))?$/i;
const QUESTION_PAREN_PREFIX_REGEX = /^(?:question\s+|q\s*)?(\d+(?:\.\d+)*)\s*((?:\(\s*[a-zivx0-9]+\s*\))+)(?:\s*[:\-]\s*(.*))?$/i;
const QUESTION_RELATIVE_REGEX = /^(?:\(\s*([a-zivx0-9]+)\s*\)|([a-z])\))(?:\s*[:\-]\s*(.*))?$/i;

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripLeadingBullet(value: string) {
  return value.replace(/^[•·\-–—*]\s*/, "");
}

function normalizeLine(value: string) {
  return collapseWhitespace(stripLeadingBullet(value));
}

function splitPagesIntoLines(pages: ExtractedPdfPage[]) {
  const lines: LineRecord[] = [];

  for (const page of pages) {
    const pageLines = page.text.split(/\r?\n/);

    pageLines.forEach((text) => {
      lines.push({
        pageNumber: page.pageNumber,
        lineIndex: lines.length,
        text,
        trimmed: normalizeLine(text),
      });
    });

    // Preserve empty pages so downstream spans still know a page existed.
    if (!pageLines.length) {
      lines.push({
        pageNumber: page.pageNumber,
        lineIndex: lines.length,
        text: "",
        trimmed: "",
      });
    }
  }

  return lines;
}

function isLikelyHeadingLine(line: string) {
  if (!line || line.length > 48) {
    return false;
  }

  if (QUESTION_PREFIX_REGEX.test(line) || QUESTION_PAREN_PREFIX_REGEX.test(line) || QUESTION_RELATIVE_REGEX.test(line)) {
    return false;
  }

  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 6) {
    return false;
  }

  if (/[.?!:]$/.test(line)) {
    return false;
  }

  const alpha = line.replace(/[^A-Za-z]/g, "");
  if (!alpha) {
    return false;
  }

  const upperRatio = alpha.replace(/[^A-Z]/g, "").length / alpha.length;
  return upperRatio >= 0.7;
}

function parseSectionToken(line: string): Omit<Token, "kind" | "lineIndex" | "pageNumber"> | null {
  const explicitMatch = line.match(SECTION_PREFIX_REGEX);
  if (explicitMatch) {
    const sectionKind = collapseWhitespace(explicitMatch[1]);
    const sectionId = collapseWhitespace(explicitMatch[2]).toUpperCase();
    const title = explicitMatch[3] ? collapseWhitespace(explicitMatch[3]) : null;

    return {
      localLabel: `${sectionKind} ${sectionId}`,
      label: `${sectionKind} ${sectionId}`,
      title,
      depth: 0,
      confidence: title ? 0.88 : 0.93,
      isRelativeLabel: false,
    };
  }

  if (!isLikelyHeadingLine(line)) {
    return null;
  }

  return {
    localLabel: line,
    label: line,
    title: null,
    depth: 0,
    confidence: 0.55,
    isRelativeLabel: false,
  };
}

function parseQuestionToken(line: string): Omit<Token, "kind" | "lineIndex" | "pageNumber"> | null {
  const normalized = normalizeLine(line);

  const parentheticalGroups = [...normalized.matchAll(/\(\s*([a-zivx0-9]+)\s*\)/gi)].map((match) => match[1].toLowerCase());
  if (parentheticalGroups.length) {
    const numericPrefix = normalized.match(/^(\d+(?:\.\d+)*)/)?.[1] ?? "";

    return {
      localLabel: `${numericPrefix}${parentheticalGroups.map((group) => `(${group})`).join("")}`,
      label: `${numericPrefix}${parentheticalGroups.map((group) => `(${group})`).join("")}`,
      title: null,
      depth: 1 + parentheticalGroups.length,
      confidence: parentheticalGroups.length === 1 ? 0.84 : 0.79,
      isRelativeLabel: false,
    };
  }

  const relativeMatch = normalized.match(QUESTION_RELATIVE_REGEX);
  if (relativeMatch) {
    const local = `(${(relativeMatch[1] ?? relativeMatch[2] ?? "").toLowerCase()})`;

    return {
      localLabel: local,
      label: local,
      title: relativeMatch[3] ? collapseWhitespace(relativeMatch[3]) : null,
      depth: 2,
      confidence: 0.72,
      isRelativeLabel: true,
    };
  }

  const numericMatch = normalized.match(QUESTION_PREFIX_REGEX);
  if (numericMatch) {
    const numericLabel = collapseWhitespace(numericMatch[1]);

    return {
      localLabel: numericLabel,
      label: numericLabel,
      title: numericMatch[2] ? collapseWhitespace(numericMatch[2]) : null,
      depth: numericLabel.split(".").length,
      confidence: numericLabel.includes(".") ? 0.88 : 0.93,
      isRelativeLabel: false,
    };
  }

  return null;
}

function createNodeId(kind: "section" | "question", lineIndex: number, label: string) {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  return `${kind}-${lineIndex}-${slug || "node"}`;
}

function openImplicitSection(lineIndex: number, pageNumber: number, warnings: ParseWarning[]) {
  warnings.push({
    code: "heuristic_only",
    message: "No explicit section header was found, so the parser grouped the paper under a general section.",
    pageStart: pageNumber,
    pageEnd: pageNumber,
  });

  return {
    nodeId: createNodeId("section", lineIndex, "General"),
    kind: "section" as const,
    localLabel: "General",
    label: "General",
    title: null,
    startLine: lineIndex,
    endLine: lineIndex,
    confidence: 0.35,
    children: [],
  };
}

function buildQuestionLabel(parentLabel: string | null, localLabel: string, isRelativeLabel: boolean) {
  if (!parentLabel || !isRelativeLabel) {
    return localLabel;
  }

  return `${parentLabel}${localLabel}`;
}

function closeNode(state: TreeNodeState, endLine: number) {
  state.endLine = Math.max(state.startLine, endLine);
}

function extractSpanText(lines: LineRecord[], startLine: number, endLine: number) {
  const span = lines.slice(startLine, endLine + 1).map((line) => line.text);

  while (span.length && !span[0].trim()) {
    span.shift();
  }

  while (span.length && !span[span.length - 1].trim()) {
    span.pop();
  }

  return span.join("\n").trim();
}

function toTreeNode(state: TreeNodeState, lines: LineRecord[]): StructuredPaperNode {
  const spanLines = lines.slice(state.startLine, state.endLine + 1);
  const pageNumbers = spanLines.map((line) => line.pageNumber);

  return {
    nodeId: state.nodeId,
    kind: state.kind,
    label: state.label,
    title: state.title,
    text: extractSpanText(lines, state.startLine, state.endLine),
    pageStart: pageNumbers.length ? Math.min(...pageNumbers) : null,
    pageEnd: pageNumbers.length ? Math.max(...pageNumbers) : null,
    confidence: state.confidence,
    questionId: null,
    children: state.children.map((child) => toTreeNode(child, lines)),
  };
}

function collectLeafQuestions(
  nodes: StructuredPaperNode[],
  flattened: ParsedQuestionCandidate[] = [],
  parentNodeId: string | null = null,
) {
  for (const node of nodes) {
    if (node.kind === "question" && !node.children.length) {
      flattened.push({
        nodeId: node.nodeId,
        parentNodeId,
        kind: "question",
        questionLabel: node.label,
        displayOrder: flattened.length + 1,
        questionText: node.text || node.label,
        pageStart: node.pageStart,
        pageEnd: node.pageEnd,
        parseConfidence: node.confidence,
      });
      continue;
    }

    collectLeafQuestions(node.children, flattened, node.nodeId);
  }

  return flattened;
}

export function buildHeuristicQuestionTree(pages: ExtractedPdfPage[]): StructuredPaperJsonV1 {
  const lines = splitPagesIntoLines(pages);
  const warnings: ParseWarning[] = [];
  const sections: TreeNodeState[] = [];
  const questionStack: TreeNodeState[] = [];

  let currentSection: TreeNodeState | null = null;

  for (const line of lines) {
    if (!line.trimmed) {
      continue;
    }

    const sectionToken = parseSectionToken(line.trimmed);
    if (sectionToken) {
      if (currentSection) {
        closeNode(currentSection, line.lineIndex - 1);
      }

      while (questionStack.length) {
        closeNode(questionStack.pop()!, line.lineIndex - 1);
      }

      currentSection = {
        nodeId: createNodeId("section", line.lineIndex, sectionToken.localLabel),
        kind: "section",
        localLabel: sectionToken.localLabel,
        label: sectionToken.label,
        title: sectionToken.title,
        startLine: line.lineIndex,
        endLine: line.lineIndex,
        confidence: sectionToken.confidence,
        children: [],
      };
      sections.push(currentSection);
      continue;
    }

    const questionToken = parseQuestionToken(line.trimmed);
    if (!questionToken) {
      continue;
    }

    if (!currentSection) {
      // Keep orphaned questions reachable by placing them under one synthetic section.
      currentSection = openImplicitSection(line.lineIndex, line.pageNumber, warnings);
      sections.push(currentSection);
    }

    const desiredDepth = Math.max(1, questionToken.depth);
    const effectiveDepth = questionStack.length ? Math.min(desiredDepth, questionStack.length + 1) : 1;

    if (effectiveDepth !== desiredDepth) {
      warnings.push({
        code: "unmapped_leaf",
        message: `Question label ${questionToken.localLabel} was nested using the closest available parent.`,
        pageStart: line.pageNumber,
        pageEnd: line.pageNumber,
      });
    }

    while (questionStack.length >= effectiveDepth) {
      closeNode(questionStack.pop()!, line.lineIndex - 1);
    }

    const parentNode = effectiveDepth === 1 ? currentSection : questionStack[effectiveDepth - 2] ?? currentSection;
    const fullLabel = buildQuestionLabel(
      parentNode?.kind === "question" ? parentNode.label : null,
      questionToken.localLabel,
      questionToken.isRelativeLabel,
    );

    const questionNode: TreeNodeState = {
      nodeId: createNodeId("question", line.lineIndex, fullLabel),
      kind: "question",
      localLabel: questionToken.localLabel,
      label: fullLabel,
      title: questionToken.title,
      startLine: line.lineIndex,
      endLine: line.lineIndex,
      confidence: questionToken.confidence,
      children: [],
    };

    parentNode?.children.push(questionNode);
    questionStack[effectiveDepth - 1] = questionNode;
    questionStack.length = effectiveDepth;
  }

  const finalLineIndex = Math.max(0, lines.length - 1);

  if (currentSection) {
    closeNode(currentSection, finalLineIndex);
  }

  while (questionStack.length) {
    closeNode(questionStack.pop()!, finalLineIndex);
  }

  const exportedSections = sections.map((section) => toTreeNode(section, lines));
  const leafQuestionIds = collectLeafQuestions(exportedSections).map((candidate) => candidate.nodeId ?? "");

  return {
    version: 1,
    source: "heuristic",
    warnings,
    sections: exportedSections,
    leafQuestionIds,
  };
}

export function detectQuestions(pages: ExtractedPdfPage[]): HeuristicQuestionDetectionResult {
  const tree = buildHeuristicQuestionTree(pages);
  const flatCandidates: ParsedQuestionCandidate[] = [];

  for (const section of tree.sections) {
    collectLeafQuestions(section.children, flatCandidates, section.nodeId);
  }

  // Keep the legacy array return shape for the current worker job, but attach the tree metadata now.
  return Object.assign(flatCandidates, {
    tree,
    structuredPaperJson: tree,
  });
}
