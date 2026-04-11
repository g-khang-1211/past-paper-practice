export type ExtractedPdfPage = {
  pageNumber: number;
  text: string;
};

export type ParsedQuestionCandidate = {
  questionLabel: string;
  displayOrder: number;
  questionText: string;
  marks?: number | null;
  pageStart?: number | null;
  pageEnd?: number | null;
  topic?: string | null;
  parseConfidence?: number | null;
};
