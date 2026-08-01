import { useState } from "react";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";
import { Send, XCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { arTicketCategoryLabel } from "./ar-ui";
import { TicketStatusBadge } from "./TicketStatusBadge";
import type { SupportTicket, TicketMessage } from "./types";

function formatDt(iso: string) {
  try {
    return format(parseISO(iso), "d MMMM yyyy، h:mm a", { locale: arSA });
  } catch {
    return iso;
  }
}

/** Build the visible message thread from real messages or fall back to old flat fields */
function buildThread(ticket: SupportTicket): TicketMessage[] {
  if (ticket.messages && ticket.messages.length > 0) return ticket.messages;
  // Backward compat: old tickets with flat fields
  const thread: TicketMessage[] = [
    { role: "provider", text: ticket.message, createdAt: ticket.createdAt },
  ];
  const adminText = ticket.adminReply?.trim();
  if (adminText) {
    thread.push({ role: "admin", text: adminText, createdAt: ticket.updatedAt });
  }
  return thread;
}

export function TicketDetailDialog({
  ticket,
  open,
  onOpenChange,
  defaultTab,
  onReply,
  onClose,
  replying,
  closing,
}: {
  ticket: SupportTicket | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTab: "overview" | "thread";
  onReply?: (text: string) => Promise<void>;
  onClose?: () => Promise<void>;
  replying?: boolean;
  closing?: boolean;
}) {
  const [replyText, setReplyText] = useState("");

  if (!ticket) return null;

  const thread = buildThread(ticket);
  const isClosed = ticket.status === "Closed";

  const handleSendReply = async () => {
    const trimmed = replyText.trim();
    if (!trimmed || !onReply) return;
    await onReply(trimmed);
    setReplyText("");
  };

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
            <TabsTrigger value="overview" className="rounded-lg text-sm">نظرة عامة</TabsTrigger>
            <TabsTrigger value="thread" className="rounded-lg text-sm">المحادثة</TabsTrigger>
          </TabsList>

          {/* ── Overview tab ─────────────────────────────────────────────── */}
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

          {/* ── Thread tab ────────────────────────────────────────────────── */}
          <TabsContent value="thread" className="mt-4 flex flex-col gap-3">

            {/* Messages */}
            <div className="flex flex-col gap-3 max-h-72 overflow-y-auto px-1">
              {thread.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[92%] rounded-xl border p-3 text-sm shadow-sm ${
                    m.role === "provider"
                      ? "self-end border-sky-100 bg-sky-50/80 dark:border-sky-900/40 dark:bg-sky-950/30"
                      : "self-start border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900/40"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {m.role === "provider" ? "أنت" : "فريق الدعم"}
                    </span>
                    <span className="text-[10px] text-slate-400">{formatDt(m.createdAt)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-300">{m.text}</p>
                </div>
              ))}
            </div>

            {/* Reply input — hidden when ticket is closed */}
            {!isClosed && onReply && (
              <div className="mt-2 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <Textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="اكتب ردك هنا..."
                  className="resize-none rounded-xl text-sm"
                  disabled={replying}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSendReply}
                    disabled={!replyText.trim() || replying}
                    className="gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    {replying
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Send className="h-3.5 w-3.5" />}
                    إرسال الرد
                  </Button>
                  {onClose && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onClose}
                      disabled={closing}
                      className="gap-2 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                    >
                      {closing
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <XCircle className="h-3.5 w-3.5" />}
                      إغلاق التذكرة
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Closed notice */}
            {isClosed && (
              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900/40">
                هذه التذكرة مغلقة — يمكنك فتح تذكرة جديدة إن احتجت مساعدة أخرى.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
