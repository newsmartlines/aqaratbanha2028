import { cn } from "@/lib/utils";
import { arTicketStatusLabel } from "./ar-ui";
import type { TicketStatus } from "./types";

const styles: Record<TicketStatus, string> = {
  Replied:
    "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
  Pending:
    "bg-amber-500/10 text-amber-800 border-amber-500/25 dark:text-amber-300 dark:border-amber-500/30",
  Closed: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

export function TicketStatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        styles[status],
        className
      )}
    >
      {arTicketStatusLabel[status]}
    </span>
  );
}
