import { BellIcon, BoltIcon, SearchIcon } from "@/components/ui/icons";
import { TextField } from "@/components/forms/text-field";

export function TopBar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-shell-fade bg-[#0e0e0e]/80 shadow-shell-top backdrop-blur-shell">
      <div className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-8">
          <div className="font-headline text-2xl font-black italic uppercase tracking-tight text-primary drop-shadow-[0_0_8px_rgba(0,242,255,0.5)]">
            ATELIER.EDU
          </div>
          <div className="hidden items-center rounded-full border border-white/10 bg-surface-container-lowest px-4 py-2 lg:flex">
            <SearchIcon className="mr-3 text-on-surface-variant" />
            <TextField
              aria-label="Search"
              className="w-56 border-0 bg-transparent px-0 py-0 text-on-surface placeholder:text-on-surface-variant focus:border-0 focus:bg-transparent focus:ring-0"
              placeholder="Search modules..."
            />
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden items-center gap-2 rounded-full border border-primary/20 bg-surface-container-high px-4 py-1.5 sm:flex">
            <BoltIcon className="text-primary" />
            <span className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-primary">
              LVL 42
            </span>
          </div>
          <button className="text-on-surface-variant transition hover:text-primary" type="button">
            <BellIcon />
          </button>
          <div className="flex size-10 items-center justify-center rounded-full border-2 border-primary/30 bg-surface-container-highest text-xs font-bold text-on-surface">
            GK
          </div>
        </div>
      </div>
    </header>
  );
}
