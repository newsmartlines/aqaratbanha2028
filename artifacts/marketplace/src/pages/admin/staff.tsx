import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api, type StaffMember } from "@/lib/api";
import { Loader2, Plus, Pencil, Trash2, ShieldCheck, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useT, useLanguage, commonDict } from "@/lib/i18n";

const ROLES = ["super_admin", "admin", "moderator"] as const;
type Role = typeof ROLES[number];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  admin: "bg-blue-100 text-blue-700 border-blue-200",
  moderator: "bg-slate-100 text-slate-700 border-slate-200",
};

const ALL_PERMISSIONS = ["providers", "users", "orders", "payments", "settings", "categories", "reports"] as const;

const dict = {
  pageTitle: { ar: "الموظفون والصلاحيات", en: "Staff & Roles" },
  adminStaff: { ar: "موظفو الإدارة", en: "Admin Staff" },
  teamMembers: { ar: "عضو في الفريق", en: "team members" },
  addStaff: { ar: "إضافة موظف", en: "Add Staff Member" },
  editStaff: { ar: "تعديل بيانات الموظف", en: "Edit Staff Member" },
  deleteStaff: { ar: "حذف الموظف", en: "Delete Staff Member" },
  searchPh: { ar: "ابحث بالاسم أو البريد الإلكتروني...", en: "Search by name or email..." },
  noStaff: { ar: "لا يوجد موظفون", en: "No staff members found" },
  fullName: { ar: "الاسم الكامل", en: "Full Name" },
  fullNamePh: { ar: "محمد عبدالله", en: "John Doe" },
  emailPh: { ar: "staff@aqarat-banha.com", en: "staff@aqarat-banha.com" },
  passwordNew: { ar: "كلمة مرور جديدة (اتركه فارغاً للإبقاء)", en: "New Password (leave blank to keep)" },
  role: { ar: "الدور", en: "Role" },
  permissions: { ar: "الصلاحيات", en: "Permissions" },
  joined: { ar: "تاريخ الانضمام", en: "Joined" },
  superAdmin: { ar: "مسؤول عام", en: "Super Admin" },
  admin: { ar: "مسؤول", en: "Admin" },
  moderator: { ar: "مشرف", en: "Moderator" },
  permProviders: { ar: "مقدمو الخدمة", en: "Providers" },
  permUsers: { ar: "المستخدمون", en: "Users" },
  permOrders: { ar: "الطلبات", en: "Orders" },
  permPayments: { ar: "المدفوعات", en: "Payments" },
  permSettings: { ar: "الإعدادات", en: "Settings" },
  permCategories: { ar: "التصنيفات", en: "Categories" },
  permReports: { ar: "التقارير", en: "Reports" },
  createStaff: { ar: "إنشاء موظف", en: "Create Staff" },
  passwordRequired: { ar: "كلمة المرور مطلوبة.", en: "Password is required." },
  staffCreated: { ar: "تم إنشاء الموظف", en: "Staff Created" },
  staffCreatedDesc: { ar: "تمت إضافة موظف جديد بنجاح.", en: "New staff member added successfully." },
  staffUpdated: { ar: "تم تحديث الموظف", en: "Staff Updated" },
  staffDeleted: { ar: "تم حذف الموظف", en: "Staff Deleted" },
  confirmDelete: { ar: "هل أنت متأكد من حذف", en: "Are you sure you want to delete" },
};

interface StaffForm {
  name: string; email: string; password: string;
  role: Role; permissions: Record<string, boolean>;
}

const emptyForm = (): StaffForm => ({
  name: "", email: "", password: "", role: "moderator",
  permissions: Object.fromEntries(ALL_PERMISSIONS.map(p => [p, false])),
});

export default function AdminStaff() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const t = useT(dict);
  const tc = useT(commonDict);
  const { formatDate } = useLanguage();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);

  const ROLE_LABELS: Record<string, string> = {
    super_admin: t("superAdmin"), admin: t("admin"), moderator: t("moderator"),
  };
  const PERM_LABELS: Record<string, string> = {
    providers: t("permProviders"), users: t("permUsers"), orders: t("permOrders"),
    payments: t("permPayments"), settings: t("permSettings"),
    categories: t("permCategories"), reports: t("permReports"),
  };

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["admin-staff"], queryFn: api.admin.staff.list,
  });

  const createMutation = useMutation({
    mutationFn: api.admin.staff.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      setModalOpen(false); setForm(emptyForm());
      toast({ title: t("staffCreated"), description: t("staffCreatedDesc") });
    },
    onError: (e: Error) => toast({ title: tc("error"), description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof api.admin.staff.update>[1] }) =>
      api.admin.staff.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      setModalOpen(false); setEditTarget(null);
      toast({ title: t("staffUpdated") });
    },
    onError: (e: Error) => toast({ title: tc("error"), description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.admin.staff.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      setDeleteTarget(null);
      toast({ title: t("staffDeleted") });
    },
  });

  const openAdd = () => { setEditTarget(null); setForm(emptyForm()); setModalOpen(true); };

  const openEdit = (member: StaffMember) => {
    setEditTarget(member);
    let perms: Record<string, boolean> = {};
    try { perms = JSON.parse(member.permissions ?? "{}"); } catch {}
    setForm({
      name: member.name, email: member.email, password: "",
      role: member.role as Role,
      permissions: { ...Object.fromEntries(ALL_PERMISSIONS.map(p => [p, false])), ...perms },
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (editTarget) {
      const data: { name: string; email: string; role: Role; permissions: Record<string, boolean>; password?: string } = {
        name: form.name, email: form.email, role: form.role, permissions: form.permissions,
      };
      if (form.password) data.password = form.password;
      updateMutation.mutate({ id: editTarget.id, data });
    } else {
      if (!form.password) {
        toast({ title: tc("error"), description: t("passwordRequired"), variant: "destructive" });
        return;
      }
      createMutation.mutate({
        name: form.name, email: form.email, password: form.password,
        role: form.role, permissions: form.permissions,
      });
    }
  };

  const filtered = Array.isArray(staff)
    ? staff.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()))
    : [];

  return (
    <AdminLayout title={t("pageTitle")}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{t("adminStaff")}</h2>
          <p className="text-slate-500 text-sm mt-1">{staff.length} {t("teamMembers")}</p>
        </div>
        <Button onClick={openAdd} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
          <Plus className="w-4 h-4" /> {t("addStaff")}
        </Button>
      </div>

      <div className="mb-4">
        <Input placeholder={t("searchPh")} value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>#</TableHead>
                  <TableHead>{tc("name")}</TableHead>
                  <TableHead>{tc("email")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead>{t("permissions")}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                  <TableHead>{t("joined")}</TableHead>
                  <TableHead className="text-end">{tc("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-slate-500">{t("noStaff")}</TableCell></TableRow>
                ) : filtered.map((member, i) => {
                  let perms: Record<string, boolean> = {};
                  try { perms = JSON.parse(member.permissions ?? "{}"); } catch {}
                  const activePerms = ALL_PERMISSIONS.filter(p => perms[p]);
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="text-slate-400 text-sm">{i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">{member.name[0]}</div>
                          <span className="font-medium text-slate-800">{member.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">{member.email}</TableCell>
                      <TableCell>
                        <Badge className={`${ROLE_COLORS[member.role] ?? ROLE_COLORS.moderator} border text-xs`}>
                          {member.role === "super_admin" ? <ShieldCheck className="w-3 h-3 me-1" /> : <ShieldAlert className="w-3 h-3 me-1" />}
                          {ROLE_LABELS[member.role] ?? member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {activePerms.length === 0 ? (
                            <span className="text-xs text-slate-400">{tc("none")}</span>
                          ) : activePerms.map(p => (
                            <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0">{PERM_LABELS[p]}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={member.status === "active" ? "bg-emerald-100 text-emerald-700 border-emerald-200 border" : "bg-red-100 text-red-700 border-red-200 border"}>
                          {member.status === "active" ? tc("active") : tc("inactive")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{formatDate(member.createdAt)}</TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(member)} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(member)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? t("editStaff") : t("addStaff")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("fullName")}</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t("fullNamePh")} />
              </div>
              <div className="space-y-1.5">
                <Label>{tc("email")}</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder={t("emailPh")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{editTarget ? t("passwordNew") : tc("password")}</Label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("role")}</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as Role }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">{t("superAdmin")}</SelectItem>
                  <SelectItem value="admin">{t("admin")}</SelectItem>
                  <SelectItem value="moderator">{t("moderator")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("permissions")}</Label>
              <div className="grid grid-cols-2 gap-2 border border-slate-200 rounded-lg p-3">
                {ALL_PERMISSIONS.map(p => (
                  <div key={p} className="flex items-center gap-2">
                    <Switch
                      checked={!!form.permissions[p]}
                      onCheckedChange={v => setForm(f => ({ ...f, permissions: { ...f.permissions, [p]: v } }))}
                      className="scale-75"
                    />
                    <Label className="text-sm cursor-pointer">{PERM_LABELS[p]}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>{tc("cancel")}</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
              {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : editTarget ? tc("saveChanges") : t("createStaff")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t("deleteStaff")}</DialogTitle></DialogHeader>
          <p className="text-slate-600 text-sm">{t("confirmDelete")} <strong>{deleteTarget?.name}</strong>؟ {tc("cannotUndo")}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>{tc("cancel")}</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : tc("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
