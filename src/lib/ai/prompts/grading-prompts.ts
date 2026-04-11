export function buildQuestionGradingPrompt(params: {
  questionLabel: string;
  questionText: string;
  answerText: string;
  markSchemeText?: string | null;
  marks?: number | null;
}) {
  return `
You are grading a single past-paper question.
Use only the provided question, answer, and criteria.
If mark scheme text is provided, ground the grading in it.
If no mark scheme text is available, grade cautiously and lower confidence.

Question label: ${params.questionLabel}
Question:
${params.questionText}

Student answer:
${params.answerText || "No answer submitted."}

Available marks: ${params.marks ?? "unknown"}

Mark scheme / criteria:
${params.markSchemeText || "No mark scheme provided."}

Return strict JSON:
{
  "awardedMarks": number,
  "maxMarks": number,
  "confidence": number,
  "gradingBasis": "mark_scheme" | "fallback_question_only",
  "summary": "short explanation",
  "strengths": ["..."],
  "misses": ["..."],
  "mistakeType": "concept_error" | "method_error" | "careless_error" | "incomplete_answer",
  "sourceExcerpt": "a short quote or paraphrase from the student answer"
}
`.trim();
}

export function buildPaperSummaryPrompt(input: string) {
  return `
Summarize the full attempt grading data into a short revision summary.
Input:
${input}

Return JSON:
{
  "headline": "short summary",
  "weakTopics": ["..."],
  "repeatedMistakes": ["..."],
  "nextStep": "short action"
}
`.trim();
}
