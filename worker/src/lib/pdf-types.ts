export type ExtractedPdfPage = {
  pageNumber: number;
  text: string;
};

export type ParsedQuestionCandidate = {
  nodeId?: string;
  parentNodeId?: string | null;
  kind?: "section" | "question";
  questionLabel: string;
  displayOrder: number;
  questionText: string;
  marks?: number | null;
  pageStart?: number | null;
  pageEnd?: number | null;
  topic?: string | null;
  parseConfidence?: number | null;
};

export type ParseWarningCode =
  | "gemini_unavailable"
  | "gemini_invalid_json"
  | "heuristic_only"
  | "low_confidence_structure"
  | "empty_page_text"
  | "unmapped_leaf";

export type ParseWarning = {
  code: ParseWarningCode;
  message: string;
  pageStart: number | null;
  pageEnd: number | null;
};

export type StructuredPaperSource = "heuristic" | "gemini" | "merged";
export type StructuredPaperNodeKind = "section" | "question";

export type StructuredPaperNode = {
  nodeId: string;
  kind: StructuredPaperNodeKind;
  label: string;
  title: string | null;
  text: string;
  pageStart: number | null;
  pageEnd: number | null;
  confidence: number | null;
  questionId: string | null;
  children: StructuredPaperNode[];
};

// The worker persists this exact structure into papers.structured_paper_json.
export type StructuredPaperJsonV1 = {
  version: 1;
  source: StructuredPaperSource;
  warnings: ParseWarning[];
  sections: StructuredPaperNode[];
  leafQuestionIds: string[];
};

export type ParseTreeResult = {
  sections: StructuredPaperNode[];
  warnings: ParseWarning[];
};

export type HeuristicQuestionTree = StructuredPaperJsonV1;

export type HeuristicQuestionDetectionResult = ParsedQuestionCandidate[] & {
  tree: HeuristicQuestionTree;
  structuredPaperJson: HeuristicQuestionTree;
};
