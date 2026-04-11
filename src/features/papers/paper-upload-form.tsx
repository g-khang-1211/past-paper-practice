"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/card";
import { TextField } from "@/components/forms/text-field";
import { ErrorState } from "@/components/states/error-state";

export function PaperUploadForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);

      const response = await fetch("/api/papers/upload", {
        method: "POST",
        body: formData,
      });

      let payload: { error?: string; paper?: { id: string } } | null = null;
      try {
        payload = (await response.json()) as { error?: string; paper?: { id: string } };
      } catch {
        payload = null;
      }

      if (!response.ok || !payload?.paper?.id) {
        setError(payload?.error ?? "Upload failed.");
        return;
      }

      router.push(`/papers/${payload.paper.id}`);
      router.refresh();
    } catch {
      setError("Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <ErrorState description={error} /> : null}
      <SurfaceCard className="p-8 md:p-10">
        <form className="grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
          <div className="md:col-span-2">
            <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-primary">
              Upload Paper
            </p>
            <h1 className="mt-3 font-headline text-4xl font-black tracking-tight text-on-surface">
              Add a new past paper
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">
              Upload the question paper PDF and, if you have it, the mark scheme. The worker will parse the
              file into pages and question structure before the attempt flow opens up.
            </p>
          </div>

          <TextField name="title" placeholder="Paper title" required />
          <TextField defaultValue="Mathematics" name="subject" placeholder="Subject" required />

          <label className="space-y-2 text-sm text-on-surface-variant">
            <span className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-on-surface">
              Question paper PDF
            </span>
            <input
              accept="application/pdf"
              className="block w-full rounded-[1.5rem] border border-dashed border-white/15 bg-surface-container-low px-4 py-5"
              name="questionFile"
              required
              type="file"
            />
          </label>

          <label className="space-y-2 text-sm text-on-surface-variant">
            <span className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-on-surface">
              Optional mark scheme PDF
            </span>
            <input
              accept="application/pdf"
              className="block w-full rounded-[1.5rem] border border-dashed border-white/15 bg-surface-container-low px-4 py-5"
              name="markSchemeFile"
              type="file"
            />
          </label>

          <div className="md:col-span-2 flex items-center justify-between rounded-xl border border-white/10 bg-surface-container-low p-4">
            <div>
              <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-primary">
                Worker pipeline
              </p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Upload -&gt; queued parse job -&gt; extracted pages -&gt; repaired question structure -&gt; ready.
              </p>
            </div>
            <Button disabled={loading} type="submit">
              {loading ? "Uploading..." : "Create paper"}
            </Button>
          </div>
        </form>
      </SurfaceCard>
    </div>
  );
}
