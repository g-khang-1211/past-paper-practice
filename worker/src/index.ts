import { randomUUID } from "node:crypto";

import { getMissingWorkerEnvKeys } from "@/env";
import { runGradePaperJob } from "@/jobs/grade-paper.job";
import { runGradeQuestionJob } from "@/jobs/grade-question.job";
import { markPaperParseFailed, runPaperParseJob } from "@/jobs/paper-parse.job";
import { claimNextJob, completeJob, failJob } from "@/services/queue-service";

const workerId = `worker-${randomUUID()}`;

function logWorker(message: string, extra?: Record<string, unknown>) {
  if (extra) {
    console.info(`[worker ${workerId}] ${message}`, extra);
    return;
  }

  console.info(`[worker ${workerId}] ${message}`);
}

function logWorkerError(message: string, error?: unknown, extra?: Record<string, unknown>) {
  console.error(`[worker ${workerId}] ${message}`, {
    ...extra,
    error: error instanceof Error ? error.message : error,
  });
}

async function processLoop() {
  const job = await claimNextJob(workerId);

  if (!job) {
    return;
  }

  try {
    logWorker("Claimed job", {
      jobId: job.id,
      type: job.type,
      paperId: job.paper_id ?? null,
      retryCount: job.retry_count ?? 0,
    });

    if (job.type === "paper_parse") {
      await runPaperParseJob(job);
    } else if (job.type === "grade_question") {
      await runGradeQuestionJob(job);
    } else if (job.type === "grade_paper") {
      await runGradePaperJob(job);
    }

    await completeJob(job.id);
    logWorker("Completed job", {
      jobId: job.id,
      type: job.type,
      paperId: job.paper_id ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown worker failure";
    logWorkerError("Job failed", error, {
      jobId: job.id,
      type: job.type,
      paperId: job.paper_id ?? null,
      retryCount: Number(job.retry_count ?? 0) + 1,
    });

    if (job.type === "paper_parse" && job.paper_id) {
      await markPaperParseFailed(job.paper_id, message);
    }

    await failJob(job.id, message, Number(job.retry_count ?? 0) + 1);
  }
}

async function main() {
  const missingKeys = getMissingWorkerEnvKeys();
  if (missingKeys.length) {
    throw new Error(
      `Worker is missing required env vars: ${missingKeys.join(
        ", ",
      )}. The worker reads .env and .env.local from the repo root, or explicit shell env.`,
    );
  }

  logWorker("Worker booted", {
    pid: process.pid,
  });

  while (true) {
    try {
      await processLoop();
    } catch (error) {
      logWorkerError("Worker loop failed", error);
    }

    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
}

void main().catch((error) => {
  logWorkerError("Worker exited during startup", error);
  process.exit(1);
});
