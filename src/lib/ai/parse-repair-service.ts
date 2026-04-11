import { getServerEnv } from "@/lib/env";
import { generateGeminiJson } from "@/lib/ai/gemini-client";
import { buildParseRepairPrompt } from "@/lib/ai/prompts/parse-prompts";

export async function repairParsedQuestions(extractedPages: string[]) {
  const env = getServerEnv();
  return generateGeminiJson({
    model: env.geminiFastModel,
    prompt: buildParseRepairPrompt(extractedPages.join("\n\n---\n\n")),
    fallback: {
      questions: [],
    },
  });
}
