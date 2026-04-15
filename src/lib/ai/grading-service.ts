import { generateGeminiJson } from "@/lib/ai/gemini-client";
import {
  buildPaperSummaryPrompt,
  buildQuestionGradingPrompt,
} from "@/lib/ai/prompts/grading-prompts";
import { getGeminiEnv } from "@/lib/env";
import type { GradingBasis, MistakeType } from "@/types";

export type QuestionGradingPayload = {
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

export type GradeQuestionResult = {
  grade: QuestionGradingPayload;
  warning?: string;
};

export async function gradeQuestion(params: {
  questionLabel: string;
  questionText: string;
  answerText: string;
  markSchemeText?: string | null;
  marks?: number | null;
}): Promise<GradeQuestionResult> {
  const result = await generateGeminiJson<QuestionGradingPayload>({
    getConfig: () => {
      const env = getGeminiEnv();
      return {
        apiKey: env.googleAiApiKey,
        model: env.geminiGradingModel,
      };
    },
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

  // Keep the existing grading payload intact while letting routes surface a non-fatal warning.
  return {
    grade: result.data,
    warning: result.warning?.message,
  };
}

export type PaperSummaryPayload = {
  headline: string;
  weakTopics: string[];
  repeatedMistakes: string[];
  nextStep: string;
};

export type PaperSummaryResult = {
  summary: PaperSummaryPayload;
  warning?: string;
};

export async function summarizePaperGrading(
  summaryInput: string,
): Promise<PaperSummaryResult> {
  const result = await generateGeminiJson<PaperSummaryPayload>({
    getConfig: () => {
      const env = getGeminiEnv();
      return {
        apiKey: env.googleAiApiKey,
        model: env.geminiFastModel,
      };
    },
    prompt: buildPaperSummaryPrompt(summaryInput),
    fallback: {
      headline: "Review the lowest-scoring questions first.",
      weakTopics: [],
      repeatedMistakes: [],
      nextStep: "Rework the missed questions before starting a new paper.",
    },
  });

  return {
    summary: result.data,
    warning: result.warning?.message,
  };
}
