export function LoadingState({
  title = "Loading workspace",
  description = "Fetching the latest paper, attempt, and grading data.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface-container p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="size-3 animate-pulse rounded-full bg-primary" />
        <span className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-primary">
          Loading
        </span>
      </div>
      <h2 className="font-headline text-3xl font-black text-on-surface">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">{description}</p>
    </div>
  );
}
