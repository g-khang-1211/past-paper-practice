import { cn } from "@/lib/utils/cn";

type IconProps = {
  className?: string;
};

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg className={cn("size-4", className)} fill="none" viewBox="0 0 16 16">
      <path d="M2 2h5v5H2V2Zm7 0h5v5H9V2ZM2 9h5v5H2V9Zm7 0h5v5H9V9Z" fill="currentColor" />
    </svg>
  );
}

export function MistakeIcon({ className }: IconProps) {
  return (
    <svg className={cn("size-4", className)} fill="none" viewBox="0 0 16 16">
      <path d="M8 2a4 4 0 0 1 4 4c0 1.48-.81 2.78-2 3.47V13H6V9.47A4 4 0 0 1 8 2Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 14h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

export function AnalyticsIcon({ className }: IconProps) {
  return (
    <svg className={cn("size-4", className)} fill="none" viewBox="0 0 16 16">
      <path d="M2.5 2.5h11v11h-11v-11Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 10.5V8m3 2.5v-5m3 5V6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg className={cn("size-4", className)} fill="none" viewBox="0 0 16 16">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="m10.5 10.5 3 3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.3" />
    </svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <svg className={cn("size-4", className)} fill="none" viewBox="0 0 16 16">
      <path d="M8 2.5a3 3 0 0 0-3 3V7c0 .85-.34 1.66-.94 2.26L3.5 9.8V11h9V9.8l-.56-.55A3.2 3.2 0 0 1 11 7V5.5a3 3 0 0 0-3-3Z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.5 12.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
    </svg>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <svg className={cn("size-4", className)} fill="currentColor" viewBox="0 0 16 16">
      <path d="M9 1 4.5 8H8l-1 7L11.5 8H8.2L9 1Z" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg className={cn("size-4", className)} fill="none" viewBox="0 0 16 16">
      <path d="m3.5 8 3 3 6-6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

export function FlagIcon({ className }: IconProps) {
  return (
    <svg className={cn("size-4", className)} fill="none" viewBox="0 0 16 16">
      <path d="M4 2.5v11" stroke="currentColor" strokeLinecap="round" strokeWidth="1.3" />
      <path d="M5 3h6l-1.5 2L11 7H5V3Z" fill="currentColor" />
    </svg>
  );
}
