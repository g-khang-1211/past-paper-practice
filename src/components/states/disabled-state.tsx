export function DisabledState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-5 backdrop-blur-md">
      <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
        Disabled
      </p>
      <h4 className="mt-2 font-headline text-lg font-bold text-on-surface">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-on-surface-variant">{description}</p>
    </div>
  );
}
