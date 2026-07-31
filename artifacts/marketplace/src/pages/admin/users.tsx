import { useState, useMemo } from "react";
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
  Crown, Building2, Check, Sparkles, Package, CheckCircle2,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api, type AdminUser, type Region } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useT, useLanguage, commonDict } from "@/lib/i18n";

const dict = {
  pageTitle: { ar: "إدارة المستخدمين", en: "Users Management" },
  totalUsers: { ar: "إجمالي المستخدمين", en: "Total Users" },
  activeOnes: { ar: "النشطين", en: "Active" },
  suspended: { ar: "الموقوفين", en: "Suspended" },
  newThisMonth: { ar: "جدد هذا الشهر", en: "New this Month" },
  registeredUsers: { ar: "المستخدمون المسجلون", en: "Registered Users" },
  searchPh: { ar: "بحث بالاسم / البريد / الهاتف...", en: "Search by name / email / phone..." },
  allRegions: { ar: "كل المناطق", en: "All Regions" },
  allCities: { ar: "كل المدن", en: "All Cities" },
  showingCount: { ar: "عرض", en: "Showing" },
  userSuffix: { ar: "مستخدم بعد التصفية والبحث", en: "users after filters" },
  user: { ar: "المستخدم", en: "User" },
  region: { ar: "المنطقة", en: "Region" },
  city: { ar: "المدينة", en: "City" },
  role: { ar: "الدور", en: "Role" },
  joinedAt: { ar: "تاريخ الانضمام", en: "Joined" },
  noUsers: { ar: "لا يوجد مستخدمون", en: "No users found" },
  view: { ar: "عرض الملف", en: "View profile" },
  suspend: { ar: "إيقاف", en: "Suspend" },
  activate: { ar: "تفعيل", en: "Activate" },
  userProfile: { ar: "ملف المستخدم", en: "User Profile" },
  registeredAt: { ar: "تاريخ التسجيل", en: "Registered" },
  identifier: { ar: "المعرّف", en: "ID" },
  close: { ar: "إغلاق", en: "Close" },
  editUser: { ar: "تعديل المستخدم", en: "Edit User" },
  fullName: { ar: "الاسم الكامل", en: "Full Name" },
  phoneNo: { ar: "رقم الهاتف", en: "Phone Number" },
  deleteUser: { ar: "حذف المستخدم", en: "Delete User" },
  confirmDelete: { ar: "هل أنت متأكد من حذف", en: "Are you sure you want to delete" },
  cannotUndo: { ar: "؟ لا يمكن التراجع عن هذا الإجراء.", en: "? This action cannot be undone." },
  userUpdated: { ar: "تم تحديث المستخدم", en: "User updated" },
  statusUpdated: { ar: "تم تحديث الحالة", en: "Status updated" },
  userDeleted: { ar: "تم حذف المستخدم", en: "User deleted" },
  roleAdmin: { ar: "مسؤول", en: "Admin" },
  roleProvider: { ar: "شركة عقارية", en: "Provider" },
  roleUser: { ar: "مستخدم", en: "User" },
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function AdminUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const t = useT(dict);
  const tc = useT(commonDict);
  const { formatDate, lang } = useLanguage();

  const getRoleBadge = (role: string) => {
    if (role === "admin") return { label: t("roleAdmin"), cls: "bg-purple-50 text-purple-700 border-purple-200" };
    if (role === "provider") return { label: t("roleProvider"), cls: "bg-blue-50 text-blue-700 border-blue-200" };
    return { label: t("roleUser"), cls: "bg-slate-50 text-slate-600 border-slate-200" };
  };
  const getStatusBadge = (status: string) => {
    if (status === "active") return { label: tc("active"), cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    return { label: t("suspended"), cls: "bg-red-50 text-red-700 border-red-200" };
  };
  const regionLabel = (r: Region) => lang === "ar" ? r.nameAr : (r.nameEn ?? r.nameAr);
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [locRegion, setLocRegion] = useState<string>("all");
  const [locCity, setLocCity] = useState<string>("all");
  const [upgradeUser, setUpgradeUser] = useState<AdminUser | null>(null);
  const [upgradePlanId, setUpgradePlanId] = useState<number | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const { data: regAdmin = [] } = useQuery({
    queryKey: ["admin-regions-users"],
    queryFn: api.locations.admin.allRegions,
  });

  const { data: billingPlans = [] } = useQuery({
    queryKey: ["billing-plans-admin-users"],
    queryFn: api.billingPlans.adminList,
    staleTime: 5 * 60_000,
  });

  const upgradeToProviderMutation = useMutation({
    mutationFn: (id: number) =>
      api.admin.users.update(id, { role: "provider" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setUpgradeSuccess(true);
      setTimeout(() => {
        setUpgradeUser(null);
        setUpgradePlanId(null);
        setUpgradeSuccess(false);
      }, 2200);
    },
    onError: (e: Error) => toast({ title: tc("error"), description: e.message, variant: "destructive" }),
  });

  const cityOptions = useMemo(() => {
    if (locRegion === "all") return [];
    const rid = parseInt(locRegion, 10);
    return (regAdmin as Region[]).find((r) => r.id === rid)?.cities ?? [];
  }, [regAdmin, locRegion]);

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-users", locRegion, locCity],
    queryFn: () =>
      api.admin.users.list({
        regionId: locRegion !== "all" ? parseInt(locRegion, 10) : undefined,
        cityId: locCity !== "all" ? parseInt(locCity, 10) : undefined,
      }),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; email: string; phone: string } }) =>
      api.admin.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: t("userUpdated") });
      setEditUser(null);
    },
    onError: (e: Error) => toast({ title: tc("error"), description: e.message, variant: "destructive" }),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "active" | "suspended" }) =>
      api.admin.users.setStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: t("statusUpdated") });
    },
    onError: (e: Error) => toast({ title: tc("error"), description: e.message, variant: "destructive" }),
  });

  const deleteUser = useMutation({
    mutationFn: (id: number) => api.admin.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: t("userDeleted") });
      setDeleteTarget(null);
      setViewUser(null);
    },
    onError: (e: Error) => toast({ title: tc("error"), description: e.message, variant: "destructive" }),
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
    <AdminLayout title={t("pageTitle")}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: t("totalUsers"), count: totalCount, icon: Users, color: "blue" },
          { label: t("activeOnes"), count: activeCount, icon: UserCheck, color: "emerald" },
          { label: t("suspended"), count: suspendedCount, icon: UserX, color: "red" },
          { label: t("newThisMonth"), count: newThisMonth, icon: Briefcase, color: "purple" },
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
            <CardTitle>{t("registeredUsers")}</CardTitle>
            <div className="flex flex-col lg:flex-row gap-2 lg:items-center flex-wrap">
              <div className="relative w-full sm:w-64">
                <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input placeholder={t("searchPh")} className="ps-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={locRegion} onValueChange={(v) => { setLocRegion(v); setLocCity("all"); }}>
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder={t("allRegions")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allRegions")}</SelectItem>
                  {(regAdmin as Region[]).map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>{regionLabel(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={locCity} onValueChange={setLocCity} disabled={locRegion === "all"}>
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder={t("allCities")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allCities")}</SelectItem>
                  {cityOptions.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{lang === "ar" ? c.nameAr : (c.nameEn ?? c.nameAr)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
            </div>
            <p className="text-xs text-slate-500 mt-2">{t("showingCount")} {filtered.length} {t("userSuffix")}</p>
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
                    <TableHead>{t("user")}</TableHead>
                    <TableHead>{tc("email")}</TableHead>
                    <TableHead>{tc("phone")}</TableHead>
                    <TableHead>{t("region")}</TableHead>
                    <TableHead>{t("city")}</TableHead>
                    <TableHead>{t("role")}</TableHead>
                    <TableHead>{tc("status")}</TableHead>
                    <TableHead>{t("joinedAt")}</TableHead>
                    <TableHead className="text-end">{tc("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-slate-500">{t("noUsers")}</TableCell></TableRow>
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
                        <TableCell className="text-slate-600 text-sm">{u.regionNameAr ?? "—"}</TableCell>
                        <TableCell className="text-slate-600 text-sm">{u.cityNameAr ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={roleBadge.cls}>{roleBadge.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusBadge.cls}>{statusBadge.label}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {formatDate(u.createdAt)}
                        </TableCell>
                        <TableCell className="text-end" onClick={e => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setViewUser(u)} className="text-slate-600 hover:text-slate-700 hover:bg-slate-100" title={t("view")}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(u)} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50" title={tc("edit")}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {u.status === "active" ? (
                              <Button variant="ghost" size="sm" onClick={() => setStatus.mutate({ id: u.id, status: "suspended" })} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50" title={t("suspend")}>
                                <UserX className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => setStatus.mutate({ id: u.id, status: "active" })} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" title={t("activate")}>
                                <UserCheck className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => { setUpgradeUser(u); setUpgradePlanId(null); setUpgradeSuccess(false); }}
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              title="إضافة باقة / ترقية"
                            >
                              <Crown className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(u)} className="text-red-500 hover:text-red-600 hover:bg-red-50" title={tc("delete")}>
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
                  <DialogTitle className="text-lg">{t("userProfile")}</DialogTitle>
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
                          {viewUser.role === "admin" ? <Shield className="w-3 h-3 me-1" /> : viewUser.role === "provider" ? <Briefcase className="w-3 h-3 me-1" /> : <UserIcon className="w-3 h-3 me-1" />}
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
                        <p className="text-xs text-slate-500">{tc("email")}</p>
                        <p className="text-sm font-medium">{viewUser.email}</p>
                      </div>
                    </div>
                    {viewUser.phone && (
                      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50/70 border border-slate-100">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <p className="text-xs text-slate-500">{t("phoneNo")}</p>
                          <p className="text-sm font-medium" dir="ltr">{viewUser.phone}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50/70 border border-slate-100">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">{t("registeredAt")}</p>
                        <p className="text-sm font-medium">{formatDate(viewUser.createdAt, { year: "numeric", month: "long", day: "numeric" })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50/70 border border-slate-100">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-500">{t("identifier")}</p>
                        <p className="text-sm font-medium">#{viewUser.id}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setViewUser(null)}>{t("close")}</Button>
                  <Button variant="outline" className="text-teal-600 border-teal-200 hover:bg-teal-50" onClick={() => { openEdit(viewUser); setViewUser(null); }}>
                    <Pencil className="w-4 h-4 me-1" /> {tc("edit")}
                  </Button>
                  <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => { setDeleteTarget(viewUser); setViewUser(null); }}>
                    <Trash2 className="w-4 h-4 me-1" /> {tc("delete")}
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
            <DialogTitle>{t("editUser")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>{t("fullName")}</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{tc("email")}</Label>
              <Input type="email" dir="ltr" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>{t("phoneNo")}</Label>
              <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="+20..." dir="ltr" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>{tc("cancel")}</Button>
            <Button
              onClick={() => editUser && updateUser.mutate({ id: editUser.id, data: editForm })}
              disabled={updateUser.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {updateUser.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {tc("saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteUser")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDelete")} <strong>{deleteTarget?.name}</strong>{t("cannotUndo")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteUser.mutate(deleteTarget.id)}
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* ── Upgrade / Add Package Modal ─────────────────────────── */}
      <Dialog
        open={!!upgradeUser}
        onOpenChange={o => { if (!o && !upgradeToProviderMutation.isPending) { setUpgradeUser(null); setUpgradePlanId(null); setUpgradeSuccess(false); } }}
      >
        <DialogContent className="max-w-2xl p-0 overflow-hidden" dir="rtl">
          {/* Gradient header */}
          <div className="bg-gradient-to-l from-teal-700 to-teal-600 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold">ترقية الحساب إلى مزوّد عقاري</h2>
                {upgradeUser && (
                  <p className="text-teal-100 text-sm">{upgradeUser.name} · {upgradeUser.email}</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {upgradeSuccess ? (
              /* ── Success state ── */
              <div className="py-10 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-teal-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-gray-800">تم ترقية الحساب بنجاح! 🎉</p>
                  <p className="text-gray-500 text-sm mt-1">
                    أصبح الحساب الآن مزوّداً عقارياً — يمكن تعيين الباقة من صفحة الشركات
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Info card */}
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <Building2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-800 text-sm">ماذا يعني هذا؟</p>
                    <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                      سيتحوّل هذا المستخدم من حساب عادي إلى مزوّد عقاري (شركة/وسيط)،
                      وسيتمكن من نشر العقارات وإدارة إعلاناته. يمكنك بعدها تعيين الباقة
                      المناسبة من صفحة إدارة الشركات.
                    </p>
                  </div>
                </div>

                {/* Plan selection label */}
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-500" />
                  <p className="font-bold text-gray-800">اختر الباقة المبدئية <span className="font-normal text-gray-400 text-sm">(اختياري)</span></p>
                </div>

                {/* Plan cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pb-1">
                  {/* "No package" option */}
                  <button
                    type="button"
                    onClick={() => setUpgradePlanId(null)}
                    className={`text-right p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 hover:shadow-md ${
                      upgradePlanId === null
                        ? "border-gray-400 bg-gray-50 shadow-md"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Package className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="font-bold text-sm text-gray-600">بدون باقة الآن</p>
                    <p className="text-xs text-gray-400">يمكن التعيين لاحقاً</p>
                  </button>

                  {billingPlans
                    .filter((p: any) => p.status === "active")
                    .sort((a: any, b: any) => a.sortOrder - b.sortOrder)
                    .map((plan: any) => {
                      const price = parseFloat(plan.price);
                      const isFree = price === 0;
                      const isSelected = upgradePlanId === plan.id;
                      const isPop = plan.isMostPopular;

                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setUpgradePlanId(plan.id)}
                          className={`relative text-right p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col gap-2 hover:shadow-md ${
                            isSelected
                              ? "border-teal-500 bg-teal-50 shadow-md"
                              : "border-gray-200 bg-white hover:border-teal-300"
                          }`}
                        >
                          {isPop && (
                            <span className="absolute top-2 left-2 text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                              الأكثر طلباً
                            </span>
                          )}
                          <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                            isSelected ? "bg-teal-500" : "opacity-0"
                          }`}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isFree ? "bg-gray-100" : isPop ? "bg-amber-100" : "bg-teal-100"
                          }`}>
                            {isFree ? <Package className="w-4 h-4 text-gray-500" /> : isPop ? <Crown className="w-4 h-4 text-amber-600" /> : <Sparkles className="w-4 h-4 text-teal-600" />}
                          </div>
                          <div>
                            <p className={`font-bold text-sm ${isSelected ? "text-teal-700" : "text-gray-800"}`}>
                              {plan.nameAr ?? plan.name}
                            </p>
                            <p className="text-xs text-gray-400">{plan.durationDays} يوم</p>
                          </div>
                          <p className={`font-black text-xl leading-none ${isSelected ? "text-teal-600" : "text-gray-700"}`}>
                            {isFree
                              ? <span className="text-emerald-600">مجاني</span>
                              : <span dir="ltr">{Number(plan.price).toLocaleString("en-US")}<span className="text-xs font-normal text-gray-400 mr-1">{plan.currency}</span></span>
                            }
                          </p>
                        </button>
                      );
                    })}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 border-t pt-4">
                  <Button
                    onClick={() => upgradeUser && upgradeToProviderMutation.mutate(upgradeUser.id)}
                    disabled={upgradeToProviderMutation.isPending}
                    className="flex-1 h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl gap-2"
                  >
                    {upgradeToProviderMutation.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الترقية...</>
                      : <><Building2 className="w-4 h-4" />ترقية إلى مزوّد عقاري</>}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { setUpgradeUser(null); setUpgradePlanId(null); }}
                    disabled={upgradeToProviderMutation.isPending}
                    className="h-12 rounded-xl"
                  >
                    إلغاء
                  </Button>
                </div>

                <p className="text-xs text-center text-gray-400">
                  بعد الترقية، ابحث عن الحساب في صفحة الشركات لتعيين الباقة
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
