import pdfParse from "pdf-parse";

import type { ExtractedPdfPage } from "@/lib/pdf/types";

export async function extractTextFromPdf(buffer: Buffer): Promise<{
  pageCount: number;
  pages: ExtractedPdfPage[];
}> {
  const parsed = await pdfParse(buffer);
  const rawPages = parsed.text
    .split(/\f|\n\s*\n\s*\n/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const pages =
    rawPages.length > 0
      ? rawPages.map((text, index) => ({
          pageNumber: index + 1,
          text,
        }))
      : [
          {
            pageNumber: 1,
            text: parsed.text.trim(),
          },
        ];

  return {
    pageCount: parsed.numpages,
    pages,
  };
}
