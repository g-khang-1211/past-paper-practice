import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Providers } from "@/app/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Past Paper Practice",
  description: "A production-minded MVP for past paper practice with AI help and grading.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className="dark" lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
