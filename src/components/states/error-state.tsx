import { SurfaceCard } from "@/components/ui/card";

export function ErrorState({
  title = "Something went wrong",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <SurfaceCard className="border border-[#9f0519]/30 bg-[#180d0f]">
      <p className="font-headline text-xs font-bold uppercase tracking-[0.24em] text-[#ff9f99]">
        Failure
      </p>
      <h2 className="mt-3 font-headline text-3xl font-black text-on-surface">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#ffb7b3]">{description}</p>
    </SurfaceCard>
  );
}
