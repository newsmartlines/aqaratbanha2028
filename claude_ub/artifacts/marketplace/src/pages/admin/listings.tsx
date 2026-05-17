import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, AlertCircle, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { api, type Listing } from "@/lib/api";

export default function AdminListings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", price: "", status: "active" });

  const { data: listings = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["listings"],
    queryFn: () => api.listings.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title?: string; description?: string; price?: string; status?: string } }) =>
      api.listings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      setEditingListing(null);
      toast({ title: "تم التعديل", description: "تم تحديث الخدمة بنجاح" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.listings.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
      setDeleteConfirmId(null);
      toast({ title: "تم الحذف", description: "تم حذف الخدمة بنجاح" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const handleEditOpen = (listing: Listing) => {
    setEditingListing(listing);
    setEditForm({
      title: listing.title,
      description: listing.description ?? "",
      price: listing.price ?? "",
      status: listing.status,
    });
  };

  const handleEditSave = () => {
    if (!editingListing) return;
    updateMutation.mutate({
      id: editingListing.id,
      data: {
        title: editForm.title || undefined,
        description: editForm.description || undefined,
        price: editForm.price || undefined,
        status: editForm.status,
      },
    });
  };

  const handleDeleteClick = (id: number) => {
    if (deleteConfirmId === id) {
      deleteMutation.mutate(id);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const filtered = listings.filter(l => {
    const matchesSearch =
      !search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.providerName.toLowerCase().includes(search.toLowerCase()) ||
      (l.categoryNameAr ?? "").includes(search);
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: "text-emerald-700 border-emerald-200 bg-emerald-50",
      pending: "text-amber-700 border-amber-200 bg-amber-50",
      inactive: "text-slate-500 border-slate-200 bg-slate-50",
    };
    const labels: Record<string, string> = { active: "نشط", pending: "معلق", inactive: "غير نشط" };
    return { cls: map[status] ?? "text-slate-500 border-slate-200", label: labels[status] ?? status };
  };

  return (
    <AdminLayout title="Listings Management">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="بحث في الخدمات..."
                  className="pl-9"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="كل الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="pending">معلق</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">{filtered.length} خدمة</span>
              <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          )}
          {isError && (
            <div className="text-center py-12 text-red-600">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>فشل تحميل البيانات</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">إعادة المحاولة</Button>
            </div>
          )}
          {!isLoading && !isError && (
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>العنوان</TableHead>
                    <TableHead>المزود</TableHead>
                    <TableHead>التصنيف</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>تاريخ الإضافة</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                        لا توجد نتائج
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map(listing => {
                      const { cls, label } = statusBadge(listing.status);
                      return (
                        <TableRow key={listing.id}>
                          <TableCell className="font-medium max-w-[180px] truncate" dir="rtl">{listing.title}</TableCell>
                          <TableCell className="text-slate-600">{listing.providerName}</TableCell>
                          <TableCell className="text-slate-500">{listing.categoryNameAr ?? "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cls}>{label}</Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {listing.price ? `${listing.price} ر.س` : "—"}
                          </TableCell>
                          <TableCell className="text-slate-400 text-sm">
                            {new Date(listing.createdAt).toLocaleDateString("ar-SA")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                onClick={() => handleEditOpen(listing)}
                              >
                                <Pencil className="w-4 h-4 ml-1" /> تعديل
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={
                                  deleteConfirmId === listing.id
                                    ? "text-white bg-red-600 hover:bg-red-700"
                                    : "text-red-600 hover:text-red-700 hover:bg-red-50"
                                }
                                onClick={() => handleDeleteClick(listing.id)}
                                disabled={deleteMutation.isPending && deleteMutation.variables === listing.id}
                              >
                                {deleteMutation.isPending && deleteMutation.variables === listing.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : deleteConfirmId === listing.id ? (
                                  "تأكيد؟"
                                ) : (
                                  <><Trash2 className="w-4 h-4 ml-1" /> حذف</>
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingListing} onOpenChange={open => !open && setEditingListing(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Price (SAR)</Label>
                <Input type="number" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} placeholder="0" />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingListing(null)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} className="bg-teal-600 hover:bg-teal-700" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
