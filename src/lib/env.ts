const clientEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

const supabaseServerEnv = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

const geminiEnv = {
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  GEMINI_FAST_MODEL: process.env.GEMINI_FAST_MODEL,
  GEMINI_GRADING_MODEL: process.env.GEMINI_GRADING_MODEL,
};

const workerEnv = {
  WORKER_SHARED_SECRET: process.env.WORKER_SHARED_SECRET,
};

function readRequired(value: string | undefined, key: string) {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

export function getClientEnv() {
  return {
    supabaseUrl: readRequired(
      clientEnv.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL",
    ),
    supabaseAnonKey: readRequired(
      clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ),
  };
}

// Server-side Supabase admin helpers only need the service role key.
export function getSupabaseServerEnv() {
  return {
    serviceRoleKey: readRequired(
      supabaseServerEnv.SUPABASE_SERVICE_ROLE_KEY,
      "SUPABASE_SERVICE_ROLE_KEY",
    ),
  };
}

// Gemini callers should not depend on worker-only secrets.
export function getGeminiEnv() {
  return {
    googleAiApiKey: readRequired(
      geminiEnv.GOOGLE_AI_API_KEY,
      "GOOGLE_AI_API_KEY",
    ),
    geminiFastModel: readRequired(
      geminiEnv.GEMINI_FAST_MODEL,
      "GEMINI_FAST_MODEL",
    ),
    geminiGradingModel: readRequired(
      geminiEnv.GEMINI_GRADING_MODEL,
      "GEMINI_GRADING_MODEL",
    ),
  };
}

// Keep worker-secret access isolated so app AI routes do not require it.
export function getWorkerSharedSecretEnv() {
  return {
    workerSharedSecret: readRequired(
      workerEnv.WORKER_SHARED_SECRET,
      "WORKER_SHARED_SECRET",
    ),
  };
}

// This compatibility helper intentionally excludes worker-only secrets.
export function getServerEnv() {
  return {
    ...getClientEnv(),
    ...getSupabaseServerEnv(),
    ...getGeminiEnv(),
  };
}

export function hasRequiredEnv() {
  return Boolean(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL &&
      clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      supabaseServerEnv.SUPABASE_SERVICE_ROLE_KEY &&
      geminiEnv.GOOGLE_AI_API_KEY &&
      geminiEnv.GEMINI_FAST_MODEL &&
      geminiEnv.GEMINI_GRADING_MODEL,
  );
}
