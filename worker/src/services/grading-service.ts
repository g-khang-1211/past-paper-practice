import { GoogleGenAI } from "@google/genai";

import { getWorkerEnv } from "@/env";
import { buildPaperSummaryPrompt, buildQuestionGradingPrompt } from "@/lib/grading-prompts";

type MistakeType = "concept_error" | "method_error" | "careless_error" | "incomplete_answer";
type GradingBasis = "mark_scheme" | "fallback_question_only";

type QuestionGradingResult = {
  awardedMarks: number;
  maxMarks: number;
  confidence: number;
  gradingBasis: GradingBasis;
  summary: string;
  strengths: string[];
  misses: string[];
  mistakeType: MistakeType;
  sourceExcerpt: string;
};

async function generateGeminiJson<T>(params: {
  model: string | undefined;
  prompt: string;
  fallback: T;
}): Promise<T> {
  const env = getWorkerEnv();

  if (!env.geminiApiKey || !params.model) {
    return params.fallback;
  }

  try {
    const client = new GoogleGenAI({
      apiKey: env.geminiApiKey,
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

export async function gradeQuestion(params: {
  questionLabel: string;
  questionText: string;
  answerText: string;
  markSchemeText?: string | null;
  marks?: number | null;
}): Promise<QuestionGradingResult> {
  const env = getWorkerEnv();

  return generateGeminiJson<QuestionGradingResult>({
    model: env.geminiGradingModel,
    prompt: buildQuestionGradingPrompt(params),
    fallback: {
      awardedMarks: 0,
      maxMarks: params.marks ?? 0,
      confidence: params.markSchemeText ? 0.7 : 0.45,
      gradingBasis: params.markSchemeText ? "mark_scheme" : "fallback_question_only",
      summary: "The answer needs stronger working and a clearer final result.",
      strengths: [],
      misses: ["Key working is missing or incomplete."],
      mistakeType: "incomplete_answer",
      sourceExcerpt: params.answerText.slice(0, 180),
    },
  });
}

export async function summarizePaperGrading(summaryInput: string) {
  const env = getWorkerEnv();

  return generateGeminiJson({
    model: env.geminiFastModel,
    prompt: buildPaperSummaryPrompt(summaryInput),
    fallback: {
      headline: "Review the lowest-scoring questions first.",
      weakTopics: [],
      repeatedMistakes: [],
      nextStep: "Rework the missed questions before starting a new paper.",
    },
  });
}
