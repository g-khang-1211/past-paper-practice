"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { primaryNavigation, secondaryNavigation } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";
import { AnalyticsIcon, DashboardIcon, MistakeIcon } from "@/components/ui/icons";

function getIcon(key: string) {
  switch (key) {
    case "dashboard":
      return <DashboardIcon />;
    case "mistakes":
      return <MistakeIcon />;
    case "analytics":
      return <AnalyticsIcon />;
    default:
      return <span className="size-4 rounded-full bg-current" />;
  }
}

export function SidebarNav() {
  const activePath = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between rounded-r-xl bg-background py-10 shadow-shell-sidebar md:flex">
      <div className="space-y-10">
        <div className="px-8">
          <h1 className="font-headline text-xl font-black tracking-[0.12em] text-on-surface">STRIVE</h1>
          <p className="mt-1 font-headline text-[10px] font-bold uppercase tracking-[0.28em] text-primary/70">
            Mastering Physics
          </p>
        </div>

        <nav className="flex flex-col">
          {primaryNavigation.map((item) => {
            const active = activePath.startsWith(item.href);
            return (
              <Link
                className={cn(
                  "flex items-center gap-4 px-6 py-4 font-headline text-sm font-bold uppercase tracking-[0.24em] transition-all duration-200",
                  active
                    ? "border-l-4 border-primary bg-gradient-to-r from-primary/20 to-transparent text-primary"
                    : "text-zinc-600 hover:translate-x-2 hover:bg-zinc-900/50",
                )}
                href={item.href}
                key={item.href}
              >
                {getIcon(item.key)}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-white/5 pt-6">
        {secondaryNavigation.map((item) => (
          <Link
            className="flex items-center gap-4 px-6 py-4 font-headline text-sm font-bold uppercase tracking-[0.24em] text-zinc-600 transition-all duration-200 hover:translate-x-2 hover:bg-zinc-900/50"
            href={item.href}
            key={item.label}
          >
            {getIcon(item.key)}
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
