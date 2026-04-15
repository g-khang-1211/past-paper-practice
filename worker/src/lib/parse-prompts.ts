export function buildParseRepairPrompt(input: string) {
  return `
You are repairing question extraction for a past-paper PDF.
Convert the extracted content into a normalized question tree.
Keep only what you can infer confidently, and prefer a tree over a flat list.

Input:
${input}

Return strict JSON:
{
  "tree": {
    "version": 1,
    "source": "gemini",
    "warnings": [],
    "sections": [
      {
        "nodeId": "section-1",
        "kind": "section",
        "label": "Section A",
        "title": "Section A",
        "text": "",
        "pageStart": 1,
        "pageEnd": 1,
        "confidence": 0.92,
        "questionId": null,
        "children": [
          {
            "nodeId": "question-1",
            "kind": "question",
            "label": "1(a)",
            "title": null,
            "text": "question text",
            "pageStart": 1,
            "pageEnd": 1,
            "confidence": 0.88,
            "questionId": null,
            "children": []
          }
        ]
      }
    ],
    "leafQuestionIds": []
  },
  "questions": [
    {
      "questionLabel": "1(a)",
      "displayOrder": 1,
      "questionText": "question text",
      "marks": 4,
      "pageStart": 1,
      "pageEnd": 1,
      "topic": "topic or null",
      "parseConfidence": 0.81
    }
  ],
  "warnings": []
}
`.trim();
}
