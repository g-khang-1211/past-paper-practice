import { GoogleGenAI } from "@google/genai";

export type GeminiWarningCode =
  | "gemini_unavailable"
  | "gemini_invalid_json"
  | "gemini_api_error";

export type GeminiJsonWarning = {
  code: GeminiWarningCode;
  message: string;
};

export type GeminiJsonResult<T> = {
  data: T;
  usedFallback: boolean;
  warning?: GeminiJsonWarning;
};

function createWarning(
  code: GeminiWarningCode,
  message: string,
): GeminiJsonWarning {
  return { code, message };
}

function stripCodeFences(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function withFallback<T>(
  fallback: T,
  code: GeminiWarningCode,
  message: string,
): GeminiJsonResult<T> {
  console.warn("[ai] Gemini fallback used.", { code, message });

  return {
    data: fallback,
    usedFallback: true,
    warning: createWarning(code, message),
  };
}

export async function generateGeminiJson<T>(params: {
  getConfig: () => { apiKey: string; model: string };
  prompt: string;
  fallback: T;
}): Promise<GeminiJsonResult<T>> {
  let config: { apiKey: string; model: string };

  try {
    // Resolve config inside the client so missing env can become a warning instead of a crash.
    config = params.getConfig();
  } catch (error) {
    return withFallback(
      params.fallback,
      "gemini_unavailable",
      error instanceof Error
        ? `Gemini is unavailable, so a local fallback was used: ${error.message}`
        : "Gemini is unavailable, so a local fallback was used.",
    );
  }

  try {
    const client = new GoogleGenAI({
      apiKey: config.apiKey,
    });

    const response = await client.models.generateContent({
      model: config.model,
      contents: params.prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = stripCodeFences(response.text ?? "");
    if (!text) {
      return withFallback(
        params.fallback,
        "gemini_invalid_json",
        "Gemini returned an empty JSON response, so a local fallback was used.",
      );
    }

    try {
      return {
        data: JSON.parse(text) as T,
        usedFallback: false,
      };
    } catch (error) {
      return withFallback(
        params.fallback,
        "gemini_invalid_json",
        error instanceof Error
          ? `Gemini returned invalid JSON, so a local fallback was used: ${error.message}`
          : "Gemini returned invalid JSON, so a local fallback was used.",
      );
    }
  } catch (error) {
    return withFallback(
      params.fallback,
      "gemini_api_error",
      error instanceof Error
        ? `Gemini request failed, so a local fallback was used: ${error.message}`
        : "Gemini request failed, so a local fallback was used.",
    );
  }
}
