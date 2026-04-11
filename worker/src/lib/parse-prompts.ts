export function buildParseRepairPrompt(input: string) {
  return `
You are repairing question extraction for a past-paper PDF.
Convert the extracted content into a clean ordered question list.
Keep only what you can infer confidently.

Input:
${input}

Return strict JSON:
{
  "questions": [
    {
      "questionLabel": "1(a)",
      "displayOrder": 1,
      "questionText": "text",
      "marks": 4,
      "pageStart": 1,
      "pageEnd": 1,
      "topic": "topic or null",
      "parseConfidence": 0.81
    }
  ]
}
`.trim();
}
