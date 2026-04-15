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

export type StructuredPaperNodeKind = "section" | "question";
export type StructuredPaperSource = "heuristic" | "gemini" | "merged";

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

// Versioned parsed-paper payload stored on papers.structured_paper_json.
export type StructuredPaperJsonV1 = {
  version: 1;
  source: StructuredPaperSource;
  warnings: ParseWarning[];
  sections: StructuredPaperNode[];
  leafQuestionIds: string[];
};
