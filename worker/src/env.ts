import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { env } from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
let envLoaded = false;

function parseEnvFile(filePath: string) {
  const values: Record<string, string> = {};
  const content = readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separatorIndex = normalized.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = normalized.slice(0, separatorIndex).trim();
    let value = normalized.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function loadWorkerEnvFiles() {
  if (envLoaded) {
    return;
  }

  envLoaded = true;
  const merged: Record<string, string> = {};

  for (const fileName of [".env", ".env.local"]) {
    const filePath = resolve(repoRoot, fileName);

    if (!existsSync(filePath)) {
      continue;
    }

    Object.assign(merged, parseEnvFile(filePath));
  }

  for (const [key, value] of Object.entries(merged)) {
    if (env[key] == null) {
      env[key] = value;
    }
  }
}

export function getWorkerEnv() {
  loadWorkerEnvFiles();

  return {
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    geminiApiKey: env.GOOGLE_AI_API_KEY,
    geminiFastModel: env.GEMINI_FAST_MODEL,
    geminiGradingModel: env.GEMINI_GRADING_MODEL,
    workerSharedSecret: env.WORKER_SHARED_SECRET,
  };
}

export function getMissingWorkerEnvKeys() {
  const workerEnv = getWorkerEnv();
  const missing: string[] = [];

  if (!workerEnv.supabaseUrl) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!workerEnv.serviceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  return missing;
}
