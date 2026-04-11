import type { ReactNode } from "react";

import { SidebarNav } from "@/components/shell/sidebar-nav";
import { TopBar } from "@/components/shell/top-bar";

export function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <TopBar />
      <div className="flex min-h-screen pt-20">
        <SidebarNav />
        <main className="min-w-0 flex-1 px-6 pb-10 pt-6 md:px-8 xl:px-12">{children}</main>
      </div>
    </div>
  );
}
