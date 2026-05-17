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
import { Search, Eye, Loader2, RefreshCw, ShoppingBag, Clock, CheckCircle2, XCircle } from "lucide-react";
import { api, type Order } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-50 text-blue-700" },
  in_progress: { label: "In Progress", color: "bg-amber-50 text-amber-700" },
  completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700" },
  cancelled: { label: "Cancelled", color: "bg-red-50 text-red-700" },
};

export default function AdminOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
      toast({ title: "Order updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
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

  return (
    <AdminLayout title="Orders / Requests">
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { key: "all", label: "Total", icon: ShoppingBag, color: "bg-slate-100 text-slate-600" },
          { key: "new", label: "New", icon: Clock, color: "bg-blue-100 text-blue-600" },
          { key: "in_progress", label: "In Progress", icon: Loader2, color: "bg-amber-100 text-amber-600" },
          { key: "completed", label: "Completed", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600" },
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
              {statusFilter === "all" ? "All Orders" : STATUS_LABELS[statusFilter]?.label}
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input placeholder="Search..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">No orders found</TableCell></TableRow>
                  ) : filtered.map((o) => {
                    const s = STATUS_LABELS[o.status] ?? { label: o.status, color: "bg-slate-50 text-slate-600" };
                    return (
                      <TableRow key={o.id} className="cursor-pointer hover:bg-slate-50" onClick={() => openDetail(o)}>
                        <TableCell className="font-mono text-sm text-slate-500">#{o.id}</TableCell>
                        <TableCell className="font-medium">{o.userName ?? "—"}</TableCell>
                        <TableCell>{o.providerName ?? "—"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{o.serviceTitle ?? "—"}</TableCell>
                        <TableCell>{o.servicePrice ? `${o.servicePrice} SAR` : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={s.color}>{s.label}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {new Date(o.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
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

      {/* Order Detail Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={o => !o && setSelectedOrder(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Order #{selectedOrder?.id}</SheetTitle>
          </SheetHeader>
          {selectedOrder && (
            <div className="space-y-5 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Customer</p>
                  <p className="font-medium">{selectedOrder.userName ?? "—"}</p>
                  <p className="text-sm text-slate-500">{selectedOrder.userPhone ?? "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Provider</p>
                  <p className="font-medium">{selectedOrder.providerName ?? "—"}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Service</p>
                <p className="font-medium">{selectedOrder.serviceTitle ?? "—"}</p>
                {selectedOrder.servicePrice && <p className="text-sm text-teal-600 font-medium">{selectedOrder.servicePrice} SAR</p>}
              </div>

              {selectedOrder.message && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Customer Message</p>
                  <p className="text-sm">{selectedOrder.message}</p>
                </div>
              )}

              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Date</p>
                <p className="text-sm">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Internal Notes</Label>
                  <Textarea rows={3} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Add admin notes..." />
                </div>
                <Button onClick={saveChanges} disabled={updateOrder.isPending} className="w-full bg-teal-600 hover:bg-teal-700">
                  {updateOrder.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminLayout>
  );
}
