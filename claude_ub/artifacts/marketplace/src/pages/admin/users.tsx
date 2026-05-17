import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Search, Pencil, Trash2, UserX, UserCheck, Loader2, RefreshCw, Users, Eye,
  Phone, Mail, Calendar, MapPin, Shield, Briefcase, User as UserIcon,
} from "lucide-react";
import { api, type AdminUser } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function getRoleBadge(role: string) {
  if (role === "admin") return { label: "مسؤول", cls: "bg-purple-50 text-purple-700 border-purple-200" };
  if (role === "provider") return { label: "مقدم خدمة", cls: "bg-blue-50 text-blue-700 border-blue-200" };
  return { label: "مستخدم", cls: "bg-slate-50 text-slate-600 border-slate-200" };
}

function getStatusBadge(status: string) {
  if (status === "active") return { label: "نشط", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  return { label: "موقوف", cls: "bg-red-50 text-red-700 border-red-200" };
}

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);

  const { data: users = [], isLoading, refetch } = useQuery({ queryKey: ["admin-users"], queryFn: api.admin.users.list });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; email: string; phone: string } }) =>
      api.admin.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "تم تحديث المستخدم" });
      setEditUser(null);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "active" | "suspended" }) =>
      api.admin.users.setStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "تم تحديث الحالة" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => api.admin.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "تم حذف المستخدم" });
      setDeleteTarget(null);
      setViewUser(null);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const openEdit = (u: AdminUser) => {
    setEditUser(u);
    setEditForm({ name: u.name, email: u.email, phone: u.phone ?? "" });
  };

  const regularUsers = users.filter((u: AdminUser) => u.role === "user");

  const filtered = regularUsers.filter((u: AdminUser) =>
    !search ||
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.phone ?? "").includes(search)
  );

  const totalCount = regularUsers.length;
  const activeCount = regularUsers.filter((u: AdminUser) => u.status === "active").length;
  const suspendedCount = regularUsers.filter((u: AdminUser) => u.status === "suspended").length;
  const newThisMonth = regularUsers.filter((u: AdminUser) => {
    const created = new Date(u.createdAt ?? 0);
    const now = new Date();
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
  }).length;

  return (
    <AdminLayout title="Users Management">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "إجمالي المستخدمين", count: totalCount, icon: Users, color: "blue" },
          { label: "النشطين", count: activeCount, icon: UserCheck, color: "emerald" },
          { label: "الموقوفين", count: suspendedCount, icon: UserX, color: "red" },
          { label: "جدد هذا الشهر", count: newThisMonth, icon: Briefcase, color: "purple" },
        ].map(item => (
          <Card key={item.label} className="border-slate-200 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-${item.color}-100 flex items-center justify-center`}>
                  <item.icon className={`w-5 h-5 text-${item.color}-600`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{item.count}</p>
                  <p className="text-xs text-slate-500">{item.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle>المستخدمون المسجلون</CardTitle>
            <div className="flex gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input placeholder="بحث بالاسم / البريد / الهاتف..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
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
                    <TableHead>#</TableHead>
                    <TableHead>المستخدم</TableHead>
                    <TableHead>البريد الإلكتروني</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>الدور</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ الانضمام</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-500">لا يوجد مستخدمون</TableCell></TableRow>
                  ) : filtered.map((u: AdminUser) => {
                    const roleBadge = getRoleBadge(u.role);
                    const statusBadge = getStatusBadge(u.status);
                    return (
                      <TableRow
                        key={u.id}
                        className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                        onClick={() => setViewUser(u)}
                      >
                        <TableCell className="text-slate-400 text-sm">{u.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-8 h-8 border border-slate-200">
                              <AvatarImage src={u.avatar ?? undefined} />
                              <AvatarFallback className="bg-teal-100 text-teal-700 text-xs font-bold">
                                {getInitials(u.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{u.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600">{u.email}</TableCell>
                        <TableCell className="text-slate-500">{u.phone ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={roleBadge.cls}>{roleBadge.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadge.cls}>{statusBadge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {new Date(u.createdAt).toLocaleDateString("ar-SA")}
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setViewUser(u)} className="text-slate-600 hover:text-slate-700 hover:bg-slate-100" title="عرض الملف">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(u)} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50" title="تعديل">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {u.status === "active" ? (
                              <Button variant="ghost" size="sm" onClick={() => setStatus.mutate({ id: u.id, status: "suspended" })} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50" title="إيقاف">
                                <UserX className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => setStatus.mutate({ id: u.id, status: "active" })} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" title="تفعيل">
                                <UserCheck className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(u)} className="text-red-500 hover:text-red-600 hover:bg-red-50" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

      {/* User Profile View Modal */}
      <Dialog open={!!viewUser} onOpenChange={o => !o && setViewUser(null)}>
        <DialogContent className="max-w-lg">
          {viewUser && (() => {
            const roleBadge = getRoleBadge(viewUser.role);
            const statusBadge = getStatusBadge(viewUser.status);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-lg">ملف المستخدم</DialogTitle>
                </DialogHeader>

                <div className="space-y-5">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <Avatar className="w-16 h-16 border-2 border-white shadow-md">
                      <AvatarImage src={viewUser.avatar ?? undefined} />
                      <AvatarFallback className="bg-teal-100 text-teal-700 text-xl font-bold">
                        {getInitials(viewUser.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{viewUser.name}</h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className={roleBadge.cls}>
                          {viewUser.role === "admin" ? <Shield className="w-3 h-3 mr-1" /> : viewUser.role === "provider" ? <Briefcase className="w-3 h-3 mr-1" /> : <UserIcon className="w-3 h-3 mr-1" />}
                          {roleBadge.label}
                        </Badge>
                        <Badge variant="outline" className={statusBadge.cls}>{statusBadge.label}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50/70 border border-slate-100">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">البريد الإلكتروني</p>
                        <p className="text-sm font-medium">{viewUser.email}</p>
                      </div>
                    </div>
                    {viewUser.phone && (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50/70 border border-slate-100">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <p className="text-xs text-slate-500">رقم الهاتف</p>
                          <p className="text-sm font-medium" dir="ltr">{viewUser.phone}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50/70 border border-slate-100">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">تاريخ التسجيل</p>
                        <p className="text-sm font-medium">{new Date(viewUser.createdAt).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50/70 border border-slate-100">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">المعرّف</p>
                        <p className="text-sm font-medium">#{viewUser.id}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2 flex-row-reverse sm:flex-row-reverse">
                  <Button variant="outline" onClick={() => setViewUser(null)}>إغلاق</Button>
                  <Button variant="outline" className="text-teal-600 border-teal-200 hover:bg-teal-50" onClick={() => { openEdit(viewUser); setViewUser(null); }}>
                    <Pencil className="w-4 h-4 mr-1" /> تعديل
                  </Button>
                  <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => { setDeleteTarget(viewUser); setViewUser(null); }}>
                    <Trash2 className="w-4 h-4 mr-1" /> حذف
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={!!editUser} onOpenChange={o => !o && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل المستخدم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>الاسم الكامل</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>البريد الإلكتروني</Label>
              <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>رقم الهاتف</Label>
              <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="+966..." dir="ltr" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>إلغاء</Button>
            <Button
              onClick={() => editUser && updateUser.mutate({ id: editUser.id, data: editForm })}
              disabled={updateUser.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {updateUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المستخدم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف <strong>{deleteTarget?.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteUser.mutate(deleteTarget.id)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
