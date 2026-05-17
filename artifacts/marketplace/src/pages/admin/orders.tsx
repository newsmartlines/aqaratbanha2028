import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Eye, Loader2, RefreshCw, ShoppingBag, Clock, CheckCircle2 } from "lucide-react";
import { api, type Order } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useT, useLanguage, commonDict } from "@/lib/i18n";

const dict = {
  pageTitle: { ar: "الطلبات / الطلبيات", en: "Orders / Requests" },
  total: { ar: "الإجمالي", en: "Total" },
  newOrder: { ar: "جديد", en: "New" },
  inProgress: { ar: "قيد التنفيذ", en: "In Progress" },
  completed: { ar: "مكتمل", en: "Completed" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
  allOrders: { ar: "كل الطلبات", en: "All Orders" },
  allStatus: { ar: "كل الحالات", en: "All Status" },
  noOrders: { ar: "لا توجد طلبات", en: "No orders found" },
  orderId: { ar: "رقم الطلب", en: "Order ID" },
  customer: { ar: "العميل", en: "Customer" },
  provider: { ar: "مقدم الخدمة", en: "Provider" },
  service: { ar: "الخدمة", en: "Service" },
  price: { ar: "السعر", en: "Price" },
  customerMessage: { ar: "رسالة العميل", en: "Customer Message" },
  internalNotes: { ar: "ملاحظات داخلية", en: "Internal Notes" },
  notesPlaceholder: { ar: "أضف ملاحظات إدارية...", en: "Add admin notes..." },
  orderUpdated: { ar: "تم تحديث الطلب", en: "Order updated" },
};

const STATUS_KEY: Record<string, "newOrder" | "inProgress" | "completed" | "cancelled"> = {
  new: "newOrder", in_progress: "inProgress", completed: "completed", cancelled: "cancelled",
};
const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-700",
};

export default function AdminOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const t = useT(dict);
  const tc = useT(commonDict);
  const { formatDate, formatDateTime, formatCurrency } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");

  const { data: orders = [], isLoading, refetch } = useQuery({ queryKey: ["admin-orders"], queryFn: api.admin.orders.list });

  const updateOrder = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { status?: string; notes?: string } }) =>
      api.admin.orders.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setSelectedOrder(updated);
      toast({ title: t("orderUpdated") });
    },
    onError: (e: Error) => toast({ title: tc("error"), description: e.message, variant: "destructive" }),
  });

  const openDetail = (o: Order) => {
    setSelectedOrder(o);
    setEditNotes(o.notes ?? "");
    setEditStatus(o.status);
  };

  const saveChanges = () => {
    if (!selectedOrder) return;
    updateOrder.mutate({ id: selectedOrder.id, data: { status: editStatus, notes: editNotes } });
  };

  const filtered = orders.filter(o => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchSearch = !search || (o.userName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (o.providerName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (o.serviceTitle ?? "").toLowerCase().includes(search.toLowerCase()) ||
      String(o.id).includes(search);
    return matchStatus && matchSearch;
  });

  const counts = {
    all: orders.length,
    new: orders.filter(o => o.status === "new").length,
    in_progress: orders.filter(o => o.status === "in_progress").length,
    completed: orders.filter(o => o.status === "completed").length,
    cancelled: orders.filter(o => o.status === "cancelled").length,
  };

  const statusLabel = (s: string) => STATUS_KEY[s] ? t(STATUS_KEY[s]) : s;

  return (
    <AdminLayout title={t("pageTitle")}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { key: "all", label: t("total"), icon: ShoppingBag, color: "bg-slate-100 text-slate-600" },
          { key: "new", label: t("newOrder"), icon: Clock, color: "bg-blue-100 text-blue-600" },
          { key: "in_progress", label: t("inProgress"), icon: Loader2, color: "bg-amber-100 text-amber-600" },
          { key: "completed", label: t("completed"), icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600" },
        ].map(({ key, label, icon: Icon, color }) => (
          <Card key={key} className="border-slate-200 shadow-sm cursor-pointer hover:border-teal-300 transition-colors" onClick={() => setStatusFilter(key)}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{counts[key as keyof typeof counts]}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle>
              {statusFilter === "all" ? t("allOrders") : statusLabel(statusFilter)}
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allStatus")}</SelectItem>
                  <SelectItem value="new">{t("newOrder")}</SelectItem>
                  <SelectItem value="in_progress">{t("inProgress")}</SelectItem>
                  <SelectItem value="completed">{t("completed")}</SelectItem>
                  <SelectItem value="cancelled">{t("cancelled")}</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute top-2.5 h-4 w-4 text-slate-500 start-2.5" />
                <Input placeholder={tc("search")} className="ps-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
          ) : (
            <div className="rounded-md border border-slate-200">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>{t("orderId")}</TableHead>
                    <TableHead>{t("customer")}</TableHead>
                    <TableHead>{t("provider")}</TableHead>
                    <TableHead>{t("service")}</TableHead>
                    <TableHead>{t("price")}</TableHead>
                    <TableHead>{tc("status")}</TableHead>
                    <TableHead>{tc("date")}</TableHead>
                    <TableHead className="text-end">{tc("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">{t("noOrders")}</TableCell></TableRow>
                  ) : filtered.map((o) => {
                    return (
                      <TableRow key={o.id} className="cursor-pointer hover:bg-slate-50" onClick={() => openDetail(o)}>
                        <TableCell className="font-mono text-sm text-slate-500">#{o.id}</TableCell>
                        <TableCell className="font-medium">{o.userName ?? "—"}</TableCell>
                        <TableCell>{o.providerName ?? "—"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{o.serviceTitle ?? "—"}</TableCell>
                        <TableCell>{o.servicePrice ? formatCurrency(o.servicePrice) : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_COLOR[o.status] ?? "bg-slate-50 text-slate-600"}>{statusLabel(o.status)}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {formatDate(o.createdAt)}
                        </TableCell>
                        <TableCell className="text-end">
                          <Button variant="ghost" size="sm" className="text-teal-600" onClick={e => { e.stopPropagation(); openDetail(o); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedOrder} onOpenChange={o => !o && setSelectedOrder(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("orderId")} #{selectedOrder?.id}</SheetTitle>
          </SheetHeader>
          {selectedOrder && (
            <div className="space-y-5 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 font-medium mb-1">{t("customer")}</p>
                  <p className="font-medium">
                    {selectedOrder.userName
                      ?? (selectedOrder.userId ? `مستخدم #${selectedOrder.userId}` : "—")}
                  </p>
                  <p className="text-sm text-slate-500">{selectedOrder.userPhone ?? "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 font-medium mb-1">{t("provider")}</p>
                  <p className="font-medium">
                    {selectedOrder.providerName
                      ?? (selectedOrder.providerId ? `مقدم #${selectedOrder.providerId}` : "—")}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 font-medium mb-1">{t("service")}</p>
                <p className="font-medium">
                  {selectedOrder.serviceTitle
                    ?? (selectedOrder.serviceId ? `خدمة #${selectedOrder.serviceId}` : "طلب عام بدون خدمة محددة")}
                </p>
                {selectedOrder.servicePrice && <p className="text-sm text-teal-600 font-medium">{formatCurrency(selectedOrder.servicePrice)}</p>}
              </div>

              {selectedOrder.message && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 font-medium mb-1">{t("customerMessage")}</p>
                  <p className="text-sm">{selectedOrder.message}</p>
                </div>
              )}

              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 font-medium mb-1">{tc("date")}</p>
                <p className="text-sm">{formatDateTime(selectedOrder.createdAt)}</p>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="space-y-1">
                  <Label>{tc("status")}</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">{t("newOrder")}</SelectItem>
                      <SelectItem value="in_progress">{t("inProgress")}</SelectItem>
                      <SelectItem value="completed">{t("completed")}</SelectItem>
                      <SelectItem value="cancelled">{t("cancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{t("internalNotes")}</Label>
                  <Textarea rows={3} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder={t("notesPlaceholder")} />
                </div>
                <Button onClick={saveChanges} disabled={updateOrder.isPending} className="w-full bg-teal-600 hover:bg-teal-700">
                  {updateOrder.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {tc("saveChanges")}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
