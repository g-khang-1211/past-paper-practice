export type PaperParseStatus = "uploaded" | "parsing" | "ready" | "failed";
export type AttemptMode = "practice" | "exam";
export type AttemptStatus = "active" | "submitted" | "graded";
export type AnswerStatus = "unanswered" | "in_progress" | "answered" | "flagged";
export type MistakeType =
  | "concept_error"
  | "method_error"
  | "careless_error"
  | "incomplete_answer";
export type AnnotationType = "highlight" | "note" | "flag";
export type GradeScope = "question" | "paper";
export type GradingBasis = "mark_scheme" | "fallback_question_only";
export type WorkerJobType = "paper_parse" | "grade_question" | "grade_paper";
export type WorkerJobStatus = "queued" | "processing" | "completed" | "failed";

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type Paper = {
  id: string;
  user_id: string;
  title: string;
  board: string;
  subject: string;
  question_pdf_path: string;
  mark_scheme_pdf_path: string | null;
  parse_status: PaperParseStatus;
  parse_confidence: number | null;
  parse_error: string | null;
  page_count: number | null;
  parsed_pages_count: number;
  parse_progress_pct: number;
  structured_paper_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Question = {
  id: string;
  paper_id: string;
  parent_question_id: string | null;
  question_label: string;
  display_order: number;
  page_start: number | null;
  page_end: number | null;
  page_regions: Array<Record<string, number>>;
  question_text: string;
  marks: number | null;
  topic: string | null;
  parse_confidence: number | null;
  mark_scheme_text: string | null;
  grading_criteria: Record<string, unknown>;
};

export type Attempt = {
  id: string;
  user_id: string;
  paper_id: string;
  mode: AttemptMode;
  timed: boolean;
  duration_seconds: number | null;
  timer_expires_at: string | null;
  status: AttemptStatus;
  started_at: string;
  submitted_at: string | null;
  graded_at: string | null;
  total_awarded_marks: number | null;
  total_max_marks: number | null;
  summary_json: Record<string, unknown>;
};

export type AttemptAnswer = {
  id: string;
  attempt_id: string;
  question_id: string;
  answer_text: string;
  status: AnswerStatus;
  flagged: boolean;
  time_spent_seconds: number;
};

export type Grade = {
  id: string;
  attempt_id: string;
  question_id: string | null;
  scope: GradeScope;
  awarded_marks: number;
  max_marks: number;
  confidence: number | null;
  grading_basis: GradingBasis;
  feedback: Record<string, unknown>;
};

export type Mistake = {
  id: string;
  user_id: string;
  paper_id: string;
  attempt_id: string;
  question_id: string;
  topic: string | null;
  mistake_type: MistakeType;
  note: string | null;
  source_excerpt: string | null;
  created_at: string;
};

export type Annotation = {
  id: string;
  user_id: string;
  paper_id: string;
  question_id: string | null;
  attempt_id: string | null;
  page_number: number;
  annotation_type: AnnotationType;
  body: string | null;
  rect: Record<string, number>;
  color: string | null;
};

export type WorkerJob = {
  id: string;
  type: WorkerJobType;
  status: WorkerJobStatus;
  paper_id: string | null;
  attempt_id: string | null;
  payload: Record<string, unknown>;
  retry_count: number;
};
