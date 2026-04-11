import { GoogleGenAI } from "@google/genai";

import { getServerEnv } from "@/lib/env";

export async function generateGeminiJson<T>(params: {
  model: string;
  prompt: string;
  fallback: T;
}): Promise<T> {
  try {
    const env = getServerEnv();
    const client = new GoogleGenAI({
      apiKey: env.googleAiApiKey,
    });

    const response = await client.models.generateContent({
      model: params.model,
      contents: params.prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "";
    return JSON.parse(text) as T;
  } catch {
    return params.fallback;
  }
}
