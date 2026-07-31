import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import { Eye, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { arTicketCategoryLabel } from "./ar-ui";
import { TicketStatusBadge } from "./TicketStatusBadge";
import type { SupportTicket } from "./types";

function formatShort(iso: string) {
  try {
    return format(parseISO(iso), "d MMM yyyy", { locale: arSA });
  } catch {
    return iso;
  }
}

function formatRelative(iso: string) {
  try {
    return format(parseISO(iso), "d MMM yyyy، HH:mm", { locale: arSA });
  } catch {
    return iso;
  }
}

function TableSkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse border-b border-slate-50 dark:border-slate-800/80">
          <td className="px-4 py-4">
            <div className="h-4 w-20 rounded-md bg-slate-100 dark:bg-slate-800" />
          </td>
          <td className="px-4 py-4">
            <div className="h-4 w-full max-w-xs rounded-md bg-slate-100 dark:bg-slate-800" />
            <div className="mt-2 h-3 w-24 rounded-md bg-slate-50 dark:bg-slate-900" />
          </td>
          <td className="hidden px-4 py-4 sm:table-cell">
            <div className="h-4 w-28 rounded-md bg-slate-100 dark:bg-slate-800" />
          </td>
          <td className="px-4 py-4">
            <div className="h-6 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
          </td>
          <td className="hidden px-4 py-4 lg:table-cell">
            <div className="h-4 w-36 rounded-md bg-slate-100 dark:bg-slate-800" />
          </td>
          <td className="px-4 py-4 text-end">
            <div className="ms-auto h-8 w-24 rounded-lg bg-slate-100 dark:bg-slate-800" />
          </td>
        </tr>
      ))}
    </>
  );
}

export function TicketsTableSection({
  tickets,
  loading,
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onView,
  onOpenThread,
}: {
  tickets: SupportTicket[];
  loading: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onView: (t: SupportTicket) => void;
  onOpenThread: (t: SupportTicket) => void;
}) {
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/40">
      <div className="hidden md:block" dir="rtl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-start text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/90 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-4 py-3.5 text-xs font-semibold tracking-wide text-slate-500">رقم التذكرة</th>
                <th className="px-4 py-3.5 text-xs font-semibold tracking-wide text-slate-500">الموضوع</th>
                <th className="hidden px-4 py-3.5 text-xs font-semibold tracking-wide text-slate-500 sm:table-cell">
                  تاريخ الإنشاء
                </th>
                <th className="px-4 py-3.5 text-xs font-semibold tracking-wide text-slate-500">الحالة</th>
                <th className="hidden px-4 py-3.5 text-xs font-semibold tracking-wide text-slate-500 lg:table-cell">
                  آخر تحديث
                </th>
                <th className="px-4 py-3.5 text-end text-xs font-semibold tracking-wide text-slate-500">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows />
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-slate-500 dark:text-slate-400">
                    لا توجد تذاكر مطابقة لعوامل التصفية الحالية.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={cn(
                      "border-b border-slate-50 transition-colors last:border-0 dark:border-slate-800/80",
                      "hover:bg-sky-50/40 dark:hover:bg-slate-900/60"
                    )}
                  >
                    <td className="px-4 py-4 font-mono text-xs font-medium text-slate-500 dark:text-slate-400">
                      {ticket.id}
                    </td>
                    <td className="max-w-[280px] px-4 py-4">
                      <span className="line-clamp-1 font-semibold text-slate-900 dark:text-slate-100">{ticket.subject}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{arTicketCategoryLabel[ticket.category]}</span>
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-4 text-slate-600 dark:text-slate-300 sm:table-cell">
                      {formatShort(ticket.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <TicketStatusBadge status={ticket.status} />
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-4 text-slate-600 dark:text-slate-300 lg:table-cell">
                      {formatRelative(ticket.updatedAt)}
                    </td>
                    <td className="px-4 py-4 text-end">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-sky-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-sky-400"
                          onClick={() => onView(ticket)}
                        >
                          <Eye className="h-4 w-4" />
                          عرض
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 rounded-xl border-slate-200 dark:border-slate-700"
                          onClick={() => onOpenThread(ticket)}
                        >
                          <ExternalLink className="h-4 w-4" />
                          فتح
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="divide-y divide-slate-100 p-3 md:hidden dark:divide-slate-800" dir="rtl">
        {loading ? (
          <div className="space-y-3 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                <div className="h-4 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="mt-3 h-5 w-full rounded bg-slate-100 dark:bg-slate-800" />
                <div className="mt-4 h-9 w-full rounded-xl bg-slate-100 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-500">لا توجد تذاكر مطابقة لعوامل التصفية الحالية.</p>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="rounded-2xl p-3 transition-colors hover:bg-sky-50/30 dark:hover:bg-slate-900/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 text-start">
                  <p className="font-mono text-[11px] font-medium text-slate-400">{ticket.id}</p>
                  <p className="mt-1 line-clamp-2 font-semibold text-slate-900 dark:text-slate-100">{ticket.subject}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatShort(ticket.createdAt)} · {arTicketCategoryLabel[ticket.category]}
                  </p>
                </div>
                <TicketStatusBadge status={ticket.status} className="shrink-0" />
              </div>
              <p className="mt-2 text-xs text-slate-500">آخر تحديث: {formatRelative(ticket.updatedAt)}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 flex-1 rounded-xl"
                  onClick={() => onView(ticket)}
                >
                  <Eye className="h-4 w-4" />
                  عرض
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 flex-1 rounded-xl border-slate-200 dark:border-slate-700"
                  onClick={() => onOpenThread(ticket)}
                >
                  <ExternalLink className="h-4 w-4" />
                  فتح
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div
          dir="rtl"
          className="flex flex-col items-stretch justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center dark:border-slate-800"
        >
          <span>
            عرض {from}–{to} من أصل {totalCount} — صفحة {page} من {totalPages}
          </span>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronRight className="h-4 w-4" />
              السابق
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-xl"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
