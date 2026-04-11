import { getServerEnv } from "@/lib/env";
import { generateGeminiJson } from "@/lib/ai/gemini-client";
import { buildHintPrompt } from "@/lib/ai/prompts/hint-prompts";

export async function generateHint(params: {
  level: "small_hint" | "method_hint" | "full_explanation";
  questionLabel: string;
  questionText: string;
  answerText: string;
  markSchemeText?: string | null;
}) {
  const env = getServerEnv();
  return generateGeminiJson({
    model: env.geminiFastModel,
    prompt: buildHintPrompt(params),
    fallback: {
      level: params.level,
      title: "Question-scoped guidance",
      content:
        params.level === "small_hint"
          ? "Start by identifying what the question is asking you to solve first, then write the governing formula before substituting any values."
          : params.level === "method_hint"
            ? "Break the question into known values, the unknown you need, and the formula path that connects them. Then solve in clear steps."
            : "Use the known values, choose the governing relation, rearrange carefully, and check whether the final unit and magnitude make sense for the problem.",
      bullet_points: [
        "Stay inside the selected question.",
        "Write the key relation before computing.",
        "Check the unit and final meaning.",
      ],
    },
  });
}
