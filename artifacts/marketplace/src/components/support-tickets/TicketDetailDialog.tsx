import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { arTicketCategoryLabel } from "./ar-ui";
import { TicketStatusBadge } from "./TicketStatusBadge";
import type { SupportTicket } from "./types";

function formatDt(iso: string) {
  try {
    return format(parseISO(iso), "d MMMM yyyy، h:mm a", { locale: arSA });
  } catch {
    return iso;
  }
}

function threadAuthorLabel(who: "You" | "Support") {
  return who === "You" ? "أنت" : "فريق الدعم";
}

export function TicketDetailDialog({
  ticket,
  open,
  onOpenChange,
  defaultTab,
}: {
  ticket: SupportTicket | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTab: "overview" | "thread";
}) {
  if (!ticket) return null;

  const adminText = ticket.adminReply?.trim();
  const mockThread = adminText
    ? [
        { who: "You" as const, text: ticket.message, at: ticket.createdAt },
        { who: "Support" as const, text: adminText, at: ticket.updatedAt },
      ]
    : ticket.status === "Pending"
      ? [
          { who: "You" as const, text: ticket.message, at: ticket.createdAt },
          {
            who: "Support" as const,
            text: "شكرًا لتواصلك — سيقوم مختص بمراجعة طلبك قريبًا.",
            at: ticket.updatedAt,
          },
        ]
      : ticket.status === "Replied"
        ? [
            { who: "You" as const, text: ticket.message, at: ticket.createdAt },
            {
              who: "Support" as const,
              text: "تم التعامل مع المشكلة من جانبنا. يرجى إعادة المحاولة وإبلاغنا إن بقي أي استفسار.",
              at: ticket.updatedAt,
            },
          ]
        : [
            { who: "You" as const, text: ticket.message, at: ticket.createdAt },
            {
              who: "Support" as const,
              text: "تم الحل — نُغلق هذه التذكرة. يمكنك فتح تذكرة جديدة عند الحاجة.",
              at: ticket.updatedAt,
            },
          ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-h-[90vh] max-w-lg overflow-y-auto rounded-2xl border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 sm:rounded-2xl"
      >
        <DialogHeader className="space-y-1 text-start">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-medium text-slate-400">{ticket.id}</span>
            <TicketStatusBadge status={ticket.status} />
          </div>
          <DialogTitle className="text-lg font-bold leading-snug tracking-tight">{ticket.subject}</DialogTitle>
          <DialogDescription className="text-start text-xs text-slate-500 dark:text-slate-400">
            {arTicketCategoryLabel[ticket.category]} · تاريخ الإنشاء {formatDt(ticket.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <Tabs key={`${ticket.id}-${defaultTab}`} defaultValue={defaultTab} className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            <TabsTrigger value="overview" className="rounded-lg text-sm">
              نظرة عامة
            </TabsTrigger>
            <TabsTrigger value="thread" className="rounded-lg text-sm">
              المحادثة
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-4 space-y-3 text-sm">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <p className="text-xs font-semibold tracking-wide text-slate-500">الرسالة</p>
              <p className="mt-2 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{ticket.message}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                <dt className="font-medium text-slate-500">تاريخ الإنشاء</dt>
                <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">{formatDt(ticket.createdAt)}</dd>
              </div>
              <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                <dt className="font-medium text-slate-500">آخر تحديث</dt>
                <dd className="mt-1 font-medium text-slate-800 dark:text-slate-200">{formatDt(ticket.updatedAt)}</dd>
              </div>
            </dl>
          </TabsContent>
          <TabsContent value="thread" className="mt-4 flex flex-col gap-3">
            {mockThread.map((m, i) => (
              <div
                key={i}
                className={`max-w-[92%] rounded-xl border p-3 text-sm shadow-sm transition-colors ${
                  m.who === "You"
                    ? "self-end border-sky-100 bg-sky-50/80 dark:border-sky-900/40 dark:bg-sky-950/30"
                    : "self-start border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900/40"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{threadAuthorLabel(m.who)}</span>
                  <span className="text-[10px] text-slate-400">{formatDt(m.at)}</span>
                </div>
                <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">{m.text}</p>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
