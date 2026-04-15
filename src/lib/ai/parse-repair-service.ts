import { generateGeminiJson } from "@/lib/ai/gemini-client";
import { buildParseRepairPrompt } from "@/lib/ai/prompts/parse-prompts";
import { getGeminiEnv } from "@/lib/env";

export async function repairParsedQuestions(extractedPages: string[]) {
  const result = await generateGeminiJson({
    getConfig: () => {
      const env = getGeminiEnv();
      return {
        apiKey: env.googleAiApiKey,
        model: env.geminiFastModel,
      };
    },
    prompt: buildParseRepairPrompt(extractedPages.join("\n\n---\n\n")),
    fallback: {
      questions: [],
    },
  });

  return {
    questions: result.data.questions,
    warning: result.warning?.message,
  };
}
