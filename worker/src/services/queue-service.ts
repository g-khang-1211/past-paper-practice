import { createWorkerSupabaseAdmin } from "@/lib/supabase-admin";

export async function claimNextJob(workerId: string) {
  const supabase = createWorkerSupabaseAdmin();

  const { data: jobs, error } = await supabase
    .from("worker_jobs")
    .select("*")
    .eq("status", "queued")
    .lte("available_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    throw error;
  }

  const job = jobs?.[0];
  if (!job) {
    return null;
  }

  const { data: locked, error: lockError } = await supabase
    .from("worker_jobs")
    .update({
      status: "processing",
      locked_at: new Date().toISOString(),
      locked_by: workerId,
    })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("*")
    .single();

  if (lockError || !locked) {
    return null;
  }

  return locked;
}

export async function completeJob(jobId: string) {
  const supabase = createWorkerSupabaseAdmin();
  await supabase
    .from("worker_jobs")
    .update({
      status: "completed",
      locked_at: null,
      locked_by: null,
    })
    .eq("id", jobId);
}

export async function failJob(jobId: string, errorMessage: string, retryCount: number) {
  const supabase = createWorkerSupabaseAdmin();
  await supabase
    .from("worker_jobs")
    .update({
      status: retryCount >= 3 ? "failed" : "queued",
      retry_count: retryCount,
      error_message: errorMessage,
      available_at:
        retryCount >= 3
          ? new Date().toISOString()
          : new Date(Date.now() + retryCount * 30_000).toISOString(),
      locked_at: null,
      locked_by: null,
    })
    .eq("id", jobId);
}
