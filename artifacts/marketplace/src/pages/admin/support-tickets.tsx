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
import { Loader2, RefreshCw, Ticket, Send } from "lucide-react";
import { api, type AdminSupportTicket } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT, commonDict, useLanguage } from "@/lib/i18n";

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
  providerMsg: { ar: "رسالة مقدم الخدمة", en: "Provider message" },
  lastReply: { ar: "آخر رد إداري", en: "Latest admin reply" },
  newReply: { ar: "رد جديد للمقدّم", en: "New reply to provider" },
  replyPh: { ar: "اكتب ردك هنا...", en: "Write your reply here..." },
  ticketStatus: { ar: "حالة التذكرة", en: "Ticket status" },
  statusHint: { ar: "«مفتوحة» تعيد التذكرة إلى انتظار المتابعة، «مغلقة» تنهي التذكرة.", en: "“Open” puts the ticket back in the follow-up queue; “Closed” ends the ticket." },
  sendReply: { ar: "إرسال الرد", en: "Send reply" },
  applyStatusOnly: { ar: "تطبيق الحالة فقط", en: "Apply status only" },
  saveReplyClose: { ar: "حفظ الرد وإغلاق التذكرة", en: "Save reply and close ticket" },
  saved: { ar: "تم الحفظ", en: "Saved" },
  enterReply: { ar: "أدخل نص الرد", en: "Enter reply text" },
};

function statusBadgeClass(status: string) {
  if (status === "Closed") return "bg-slate-100 text-slate-700 border-slate-200";
  if (status === "Replied") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

export default function AdminSupportTickets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const t = useT(dict);
  const tc = useT(commonDict);
  const { lang, formatDate } = useLanguage();
  const [selected, setSelected] = useState<AdminSupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [sheetStatus, setSheetStatus] = useState<"Open" | "Closed">("Open");

  const statusLabel = (status: string) =>
    status === "Closed" ? t("closed") : status === "Replied" ? t("replied") : t("open");

  const { data: tickets = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-support-tickets"],
    queryFn: api.admin.supportTickets.list,
  });

  const updateTicket = useMutation({
    mutationFn: (args: { id: string; body: { adminReply?: string; status?: "Open" | "Closed" } }) =>
      api.admin.supportTickets.update(args.id, args.body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      toast({ title: t("saved") });
      setSelected(null);
      setReply("");
    },
    onError: (e: Error) => toast({ title: tc("error"), description: e.message, variant: "destructive" }),
  });

  const openSheet = (tk: AdminSupportTicket) => {
    setSelected(tk);
    setReply(tk.adminReply ?? "");
    setSheetStatus(tk.status === "Closed" ? "Closed" : "Open");
  };

  const submitReply = () => {
    if (!selected) return;
    const trimmed = reply.trim();
    if (!trimmed) {
      toast({ title: t("enterReply"), variant: "destructive" });
      return;
    }
    updateTicket.mutate({ id: selected.id, body: { adminReply: trimmed } });
  };

  const submitStatus = () => {
    if (!selected) return;
    updateTicket.mutate({ id: selected.id, body: { status: sheetStatus } });
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

        <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <SheetContent side={lang === "ar" ? "left" : "right"} className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader className="text-start space-y-1">
              <SheetTitle className="text-lg">{selected?.subject}</SheetTitle>
              <SheetDescription className="text-xs font-mono text-slate-500">{selected?.id}</SheetDescription>
            </SheetHeader>

            {selected && (
              <div className="mt-6 space-y-5 text-start">
                <div>
                  <Label className="text-xs text-slate-500">{t("providerMsg")}</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                    {selected.message}
                  </p>
                </div>

                {selected.adminReply && (
                  <div>
                    <Label className="text-xs text-slate-500">{t("lastReply")}</Label>
                    <p className="mt-1 text-sm whitespace-pre-wrap rounded-lg border border-teal-100 bg-teal-50/60 p-3">
                      {selected.adminReply}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="admin-reply">{t("newReply")}</Label>
                  <Textarea
                    id="admin-reply"
                    rows={5}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={t("replyPh")}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("ticketStatus")}</Label>
                  <Select value={sheetStatus} onValueChange={(v) => setSheetStatus(v as "Open" | "Closed")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">{t("open")}</SelectItem>
                      <SelectItem value="Closed">{t("closed")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-slate-500">{t("statusHint")}</p>
                </div>

                <SheetFooter className="flex-col gap-2 sm:flex-col pt-2">
                  <Button
                    className="w-full gap-2"
                    onClick={submitReply}
                    disabled={updateTicket.isPending}
                  >
                    {updateTicket.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {t("sendReply")}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={submitStatus} disabled={updateTicket.isPending}>
                    {t("applyStatusOnly")}
                  </Button>
                  <Button variant="secondary" className="w-full" onClick={submitReplyAndClose} disabled={updateTicket.isPending}>
                    {t("saveReplyClose")}
                  </Button>
                </SheetFooter>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AdminLayout>
  );
}
