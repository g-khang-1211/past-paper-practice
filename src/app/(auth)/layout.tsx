import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-6 py-10 text-on-surface md:px-10">
      {children}
    </div>
  );
}
