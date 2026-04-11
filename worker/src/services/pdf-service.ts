type PdfTextItem = {
  str?: string;
  transform?: number[];
};

type OpenPdfDocument = {
  totalPages: number;
  getPageText: (pageNumber: number) => Promise<string>;
  cleanup: () => Promise<void>;
};

function normalizePageText(items: PdfTextItem[]) {
  const chunks: string[] = [];
  let lastY: number | null = null;

  for (const item of items) {
    const text = item.str ?? "";
    if (!text) {
      continue;
    }

    const y = Array.isArray(item.transform) ? item.transform[5] ?? null : null;
    if (chunks.length) {
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
        chunks.push("\n");
      } else {
        chunks.push(" ");
      }
    }

    chunks.push(text);
    lastY = y;
  }

  return chunks
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function openPdf(buffer: Buffer): Promise<OpenPdfDocument> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  });
  const document = await loadingTask.promise;

  return {
    totalPages: document.numPages,
    async getPageText(pageNumber: number) {
      const page = await document.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const text = normalizePageText(textContent.items as PdfTextItem[]);
      page.cleanup();
      return text;
    },
    async cleanup() {
      await document.cleanup();
      await loadingTask.destroy();
    },
  };
}
