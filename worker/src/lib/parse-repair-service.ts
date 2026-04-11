import { GoogleGenAI } from "@google/genai";

import { getWorkerEnv } from "@/env";
import { buildParseRepairPrompt } from "@/lib/parse-prompts";

export async function repairParsedQuestions(extractedPages: string[]) {
  const env = getWorkerEnv();

  if (!env.geminiApiKey || !env.geminiFastModel) {
    return { questions: [] };
  }

  try {
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

    const text = response.text ?? "";
    return JSON.parse(text) as { questions: unknown[] };
  } catch {
    return {
      questions: [],
    };
  }
}
