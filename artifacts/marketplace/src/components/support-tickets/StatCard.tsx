import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Accent = "cyan" | "amber" | "emerald";

const accentMap: Record<Accent, { icon: string; glow: string }> = {
  cyan: {
    icon: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    glow: "shadow-[0_0_0_1px_rgba(6,182,212,0.08)]",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    glow: "shadow-[0_0_0_1px_rgba(245,158,11,0.08)]",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    glow: "shadow-[0_0_0_1px_rgba(16,185,129,0.08)]",
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: Accent;
  loading?: boolean;
}) {
  const a = accentMap[accent];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60",
        a.glow
      )}
    >
      <div
        className="pointer-events-none absolute -end-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-sky-400/10 to-cyan-400/5 blur-2xl"
        aria-hidden
      />
      <div className="relative flex items-center gap-4">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", a.icon)}>
          <Icon className="h-6 w-6" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 text-start">
          <p className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
          {loading ? (
            <div className="mt-2 h-9 w-16 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ) : (
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}
