import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Loader2, RefreshCw, Ticket, Send, XCircle } from "lucide-react";
import { api, type AdminSupportTicket, type TicketMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useT, commonDict, useLanguage } from "@/lib/i18n";
import { format, parseISO } from "date-fns";
import { arSA } from "date-fns/locale";

const dict = {
  pageTitle: { ar: "تذاكر الدعم", en: "Support Tickets" },
  heading: { ar: "تذاكر دعم الوسطاء العقاريين", en: "Provider Support Tickets" },
  subtitle: { ar: "عرض التذاكر، الرد، وتغيير الحالة (مفتوحة / مغلقة)", en: "View tickets, reply, and change status (open / closed)" },
  ticketsList: { ar: "قائمة التذاكر", en: "Tickets List" },
  noTickets: { ar: "لا توجد تذاكر بعد", en: "No tickets yet" },
  colId: { ar: "رقم التذكرة", en: "Ticket ID" },
  colProvider: { ar: "مقدم الخدمة", en: "Provider" },
  colSubject: { ar: "الموضوع", en: "Subject" },
  colCategory: { ar: "التصنيف", en: "Category" },
  colDate: { ar: "التاريخ", en: "Date" },
  manage: { ar: "إدارة", en: "Manage" },
  open: { ar: "مفتوحة", en: "Open" },
  closed: { ar: "مغلقة", en: "Closed" },
  replied: { ar: "تم الرد", en: "Replied" },
  thread: { ar: "المحادثة", en: "Thread" },
  newReply: { ar: "رد جديد", en: "New reply" },
  replyPh: { ar: "اكتب ردك هنا...", en: "Write your reply here..." },
  sendReply: { ar: "إرسال الرد", en: "Send reply" },
  saveReplyClose: { ar: "رد وإغلاق التذكرة", en: "Reply and close ticket" },
  closeOnly: { ar: "إغلاق التذكرة", en: "Close ticket" },
  saved: { ar: "تم الحفظ", en: "Saved" },
  enterReply: { ar: "أدخل نص الرد", en: "Enter reply text" },
  you: { ar: "فريق الدعم", en: "Support Team" },
  provider: { ar: "مقدم الخدمة", en: "Provider" },
};

function statusBadgeClass(status: string) {
  if (status === "Closed") return "bg-slate-100 text-slate-700 border-slate-200";
  if (status === "Replied") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

function formatDt(iso: string) {
  try { return format(parseISO(iso), "d MMM yyyy، h:mm a", { locale: arSA }); }
  catch { return iso; }
}

/** Build full thread from messages array or fallback to flat fields */
function buildThread(tk: AdminSupportTicket): TicketMessage[] {
  if (Array.isArray(tk.messages) && tk.messages.length > 0) return tk.messages;
  const t: TicketMessage[] = [{ role: "provider", text: tk.message, createdAt: tk.createdAt }];
  if (tk.adminReply) t.push({ role: "admin", text: tk.adminReply, createdAt: tk.updatedAt });
  return t;
}

export default function AdminSupportTickets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const t = useT(dict);
  const tc = useT(commonDict);
  const { lang, formatDate } = useLanguage();
  const [selected, setSelected] = useState<AdminSupportTicket | null>(null);
  const [reply, setReply] = useState("");

  const statusLabel = (status: string) =>
    status === "Closed" ? t("closed") : status === "Replied" ? t("replied") : t("open");

  const { data: tickets = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-support-tickets"],
    queryFn: api.admin.supportTickets.list,
  });

  const updateTicket = useMutation({
    mutationFn: (args: { id: string; body: { adminReply?: string; status?: "Open" | "Closed" } }) =>
      api.admin.supportTickets.update(args.id, args.body),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      toast({ title: t("saved") });
      setReply("");
      // keep sheet open with refreshed data so admin can continue the conversation
      if (updated && (updated as any).data) {
        setSelected((updated as any).data as AdminSupportTicket);
      } else {
        setSelected(null);
      }
    },
    onError: (e: Error) => toast({ title: tc("error"), description: e.message, variant: "destructive" }),
  });

  const openSheet = (tk: AdminSupportTicket) => {
    setSelected(tk);
    setReply("");
  };

  const submitReply = () => {
    if (!selected) return;
    const trimmed = reply.trim();
    if (!trimmed) { toast({ title: t("enterReply"), variant: "destructive" }); return; }
    updateTicket.mutate({ id: selected.id, body: { adminReply: trimmed } });
  };

  const submitReplyAndClose = () => {
    if (!selected) return;
    const trimmed = reply.trim();
    updateTicket.mutate({
      id: selected.id,
      body: {
        ...(trimmed ? { adminReply: trimmed } : {}),
        status: "Closed",
      },
    });
  };

  const submitCloseOnly = () => {
    if (!selected) return;
    updateTicket.mutate({ id: selected.id, body: { status: "Closed" } });
  };

  const isClosed = selected?.status === "Closed";
  const thread = selected ? buildThread(selected) : [];

  return (
    <AdminLayout title={t("pageTitle")}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Ticket className="w-6 h-6 text-teal-600" />
              {t("heading")}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{t("subtitle")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ms-2">{tc("refresh")}</span>
          </Button>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("ticketsList")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-16 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : tickets.length === 0 ? (
              <p className="text-center py-12 text-slate-500 text-sm">{t("noTickets")}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-100">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="text-start">{t("colId")}</TableHead>
                      <TableHead className="text-start">{t("colProvider")}</TableHead>
                      <TableHead className="text-start">{t("colSubject")}</TableHead>
                      <TableHead className="text-start">{t("colCategory")}</TableHead>
                      <TableHead className="text-start">{tc("status")}</TableHead>
                      <TableHead className="text-start">{t("colDate")}</TableHead>
                      <TableHead className="text-end w-[100px]">{tc("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((tk) => (
                      <TableRow key={tk.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-mono text-xs text-slate-600">{tk.id}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-slate-800">{tk.providerName}</div>
                          <div className="text-xs text-slate-500">{tk.providerEmail}</div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{tk.subject}</TableCell>
                        <TableCell className="text-sm text-slate-600">{tk.category}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadgeClass(tk.status)}>
                            {statusLabel(tk.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                          {formatDate(tk.createdAt)}
                        </TableCell>
                        <TableCell className="text-end">
                          <Button size="sm" variant="secondary" onClick={() => openSheet(tk)}>
                            {t("manage")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Ticket management sheet ────────────────────────────────────── */}
        <Sheet open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setReply(""); } }}>
          <SheetContent side={lang === "ar" ? "left" : "right"} className="w-full sm:max-w-lg overflow-y-auto" dir="rtl">
            <SheetHeader className="text-start space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <SheetTitle className="text-lg">{selected?.subject}</SheetTitle>
                {selected && (
                  <Badge variant="outline" className={statusBadgeClass(selected.status)}>
                    {statusLabel(selected.status)}
                  </Badge>
                )}
              </div>
              <SheetDescription className="text-xs font-mono text-slate-500">{selected?.id}</SheetDescription>
            </SheetHeader>

            {selected && (
              <div className="mt-6 space-y-5 text-start">

                {/* ── Full conversation thread ─────────────────────────────── */}
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">{t("thread")}</Label>
                  <div className="flex flex-col gap-2 max-h-80 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    {thread.map((m, i) => (
                      <div
                        key={i}
                        className={`max-w-[90%] rounded-xl border p-3 text-sm shadow-sm ${
                          m.role === "admin"
                            ? "self-end border-teal-100 bg-teal-50/80"
                            : "self-start border-slate-100 bg-white"
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-600">
                            {m.role === "admin" ? t("you") : t("provider")}
                          </span>
                          <span className="text-[10px] text-slate-400">{formatDt(m.createdAt)}</span>
                        </div>
                        <p className="whitespace-pre-wrap text-slate-700">{m.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Reply input (hidden when closed) ────────────────────── */}
                {!isClosed && (
                  <div className="space-y-2">
                    <Label htmlFor="admin-reply">{t("newReply")}</Label>
                    <Textarea
                      id="admin-reply"
                      rows={4}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder={t("replyPh")}
                      className="resize-none"
                      disabled={updateTicket.isPending}
                    />
                  </div>
                )}

                {isClosed && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs text-slate-500">
                    هذه التذكرة مغلقة.
                  </div>
                )}

                {/* ── Action buttons ───────────────────────────────────────── */}
                <SheetFooter className="flex-col gap-2 sm:flex-col pt-2">
                  {!isClosed && (
                    <>
                      <Button
                        className="w-full gap-2"
                        onClick={submitReply}
                        disabled={updateTicket.isPending}
                      >
                        {updateTicket.isPending
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Send className="w-4 h-4" />}
                        {t("sendReply")}
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-full gap-2"
                        onClick={submitReplyAndClose}
                        disabled={updateTicket.isPending}
                      >
                        <XCircle className="w-4 h-4" />
                        {t("saveReplyClose")}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50"
                        onClick={submitCloseOnly}
                        disabled={updateTicket.isPending}
                      >
                        <XCircle className="w-4 h-4" />
                        {t("closeOnly")}
                      </Button>
                    </>
                  )}
                </SheetFooter>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AdminLayout>
  );
}
