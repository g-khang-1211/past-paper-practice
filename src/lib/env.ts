const clientEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

const serverEnv = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  GEMINI_FAST_MODEL: process.env.GEMINI_FAST_MODEL,
  GEMINI_GRADING_MODEL: process.env.GEMINI_GRADING_MODEL,
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

export function getServerEnv() {
  return {
    ...getClientEnv(),
    serviceRoleKey: readRequired(
      serverEnv.SUPABASE_SERVICE_ROLE_KEY,
      "SUPABASE_SERVICE_ROLE_KEY",
    ),
    googleAiApiKey: readRequired(
      serverEnv.GOOGLE_AI_API_KEY,
      "GOOGLE_AI_API_KEY",
    ),
    geminiFastModel: readRequired(
      serverEnv.GEMINI_FAST_MODEL,
      "GEMINI_FAST_MODEL",
    ),
    geminiGradingModel: readRequired(
      serverEnv.GEMINI_GRADING_MODEL,
      "GEMINI_GRADING_MODEL",
    ),
    workerSharedSecret: readRequired(
      serverEnv.WORKER_SHARED_SECRET,
      "WORKER_SHARED_SECRET",
    ),
  };
}

export function hasRequiredEnv() {
  return Boolean(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL &&
      clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      serverEnv.SUPABASE_SERVICE_ROLE_KEY &&
      serverEnv.GOOGLE_AI_API_KEY &&
      serverEnv.GEMINI_FAST_MODEL &&
      serverEnv.GEMINI_GRADING_MODEL &&
      serverEnv.WORKER_SHARED_SECRET,
  );
}
