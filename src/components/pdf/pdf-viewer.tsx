"use client";

import { useEffect, useRef, useState } from "react";

import { LoadingState } from "@/components/states/loading-state";
import { ErrorState } from "@/components/states/error-state";

export function PdfViewer({
  documentUrl,
  pageNumber,
  title,
}: {
  documentUrl?: string | null;
  pageNumber: number;
  title?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      if (!documentUrl || !canvasRef.current) {
        return;
      }

      setState("loading");

      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs";

        const loadingTask = pdfjs.getDocument(documentUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.45 });
        const context = canvasRef.current.getContext("2d");

        if (!context || cancelled) {
          return;
        }

        canvasRef.current.width = viewport.width;
        canvasRef.current.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;

        if (!cancelled) {
          setState("ready");
        }
      } catch {
        if (!cancelled) {
          setState("error");
        }
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [documentUrl, pageNumber]);

  if (!documentUrl) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border border-white/10 bg-surface-container-low text-center">
        <div>
          <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">
            PDF Preview
          </p>
          <p className="mt-3 text-sm text-on-surface-variant">
            A signed paper URL will appear here once the file has been uploaded and the route can read it.
          </p>
        </div>
      </div>
    );
  }

  if (state === "loading") {
    return <LoadingState description="Rendering the current paper page with PDF.js." title={title ?? "Loading PDF page"} />;
  }

  if (state === "error") {
    return <ErrorState description="PDF.js could not render this page. The paper file may still be processing or unavailable." />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#1d1d1e] p-4 shadow-2xl">
      <canvas className="mx-auto h-auto max-w-full rounded-lg" ref={canvasRef} />
    </div>
  );
}
