import type { ExtractedPdfPage, ParsedQuestionCandidate } from "@/lib/pdf/types";

const questionStartRegex = /(?:^|\n)\s*(\d+(?:\.\d+)?(?:\([a-z]\))?)\s+/gi;

export function detectQuestions(pages: ExtractedPdfPage[]): ParsedQuestionCandidate[] {
  const candidates: ParsedQuestionCandidate[] = [];

  for (const page of pages) {
    const matches = [...page.text.matchAll(questionStartRegex)];

    matches.forEach((match, index) => {
      const start = match.index ?? 0;
      const end = matches[index + 1]?.index ?? page.text.length;
      const questionText = page.text.slice(start, end).trim();

      candidates.push({
        questionLabel: match[1],
        displayOrder: candidates.length + 1,
        questionText,
        pageStart: page.pageNumber,
        pageEnd: page.pageNumber,
        parseConfidence: 0.55,
      });
    });
  }

  return candidates;
}
