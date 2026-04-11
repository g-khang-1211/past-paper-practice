import { generateGeminiJson } from "@/lib/ai/gemini-client";
import {
  buildPaperSummaryPrompt,
  buildQuestionGradingPrompt,
} from "@/lib/ai/prompts/grading-prompts";
import { getServerEnv } from "@/lib/env";
import type { GradingBasis, MistakeType } from "@/types";

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

export async function gradeQuestion(params: {
  questionLabel: string;
  questionText: string;
  answerText: string;
  markSchemeText?: string | null;
  marks?: number | null;
}): Promise<QuestionGradingResult> {
  const env = getServerEnv();
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
  const env = getServerEnv();
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
