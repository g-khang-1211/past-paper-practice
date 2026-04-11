export function buildHintPrompt(params: {
  level: "small_hint" | "method_hint" | "full_explanation";
  questionLabel: string;
  questionText: string;
  answerText: string;
  markSchemeText?: string | null;
}) {
  const styleMap = {
    small_hint: "Give a very small nudge. Do not reveal the full solution.",
    method_hint: "Explain the method clearly, but stop short of fully solving it.",
    full_explanation: "Explain the full solution in a concise, structured way.",
  } as const;

  return `
You are helping a student with one IGCSE past-paper question.
Stay strictly scoped to the provided question.
${styleMap[params.level]}

Question label: ${params.questionLabel}
Question:
${params.questionText}

Student answer so far:
${params.answerText || "No answer written yet."}

Relevant mark scheme or grading criteria:
${params.markSchemeText || "No mark scheme available. Give help cautiously and stay question-scoped."}

Return JSON:
{
  "level": "${params.level}",
  "title": "short title",
  "content": "the help text",
  "bullet_points": ["optional", "short", "points"]
}
`.trim();
}
