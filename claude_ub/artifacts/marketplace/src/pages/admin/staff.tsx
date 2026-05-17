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

const ROLES = ["super_admin", "admin", "moderator"] as const;
type Role = typeof ROLES[number];

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700 border-purple-200",
  admin: "bg-blue-100 text-blue-700 border-blue-200",
  moderator: "bg-slate-100 text-slate-700 border-slate-200",
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  moderator: "Moderator",
};

const ALL_PERMISSIONS = ["providers", "users", "orders", "payments", "settings", "categories", "reports"] as const;
type Permission = typeof ALL_PERMISSIONS[number];

const PERM_LABELS: Record<string, string> = {
  providers: "Providers", users: "Users", orders: "Orders",
  payments: "Payments", settings: "Settings", categories: "Categories", reports: "Reports",
};

interface StaffForm {
  name: string;
  email: string;
  password: string;
  role: Role;
  permissions: Record<string, boolean>;
}

const emptyForm = (): StaffForm => ({
  name: "", email: "", password: "", role: "moderator",
  permissions: Object.fromEntries(ALL_PERMISSIONS.map(p => [p, false])),
});

export default function AdminStaff() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<StaffForm>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: api.admin.staff.list,
  });

  const createMutation = useMutation({
    mutationFn: api.admin.staff.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      setModalOpen(false);
      setForm(emptyForm());
      toast({ title: "Staff Created", description: "New staff member added successfully." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof api.admin.staff.update>[1] }) =>
      api.admin.staff.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      setModalOpen(false);
      setEditTarget(null);
      toast({ title: "Staff Updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.admin.staff.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-staff"] });
      setDeleteTarget(null);
      toast({ title: "Staff Deleted" });
    },
  });

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (member: StaffMember) => {
    setEditTarget(member);
    let perms: Record<string, boolean> = {};
    try { perms = JSON.parse(member.permissions ?? "{}"); } catch {}
    setForm({
      name: member.name,
      email: member.email,
      password: "",
      role: member.role as Role,
      permissions: { ...Object.fromEntries(ALL_PERMISSIONS.map(p => [p, false])), ...perms },
    });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (editTarget) {
      const data: Parameters<typeof api.admin.staff.update>[1] = {
        name: form.name, email: form.email, role: form.role, permissions: form.permissions,
      };
      if (form.password) data.password = form.password;
      updateMutation.mutate({ id: editTarget.id, data });
    } else {
      if (!form.password) return toast({ title: "Error", description: "Password is required.", variant: "destructive" });
      createMutation.mutate({ name: form.name, email: form.email, password: form.password, role: form.role, permissions: form.permissions });
    }
  };

  // Filtered staff
  // FIX: Use Array.isArray for a robust check before filtering
  const filtered = Array.isArray(staff)
    ? staff.filter(m =>
        !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())
      )
    : []; // Default to an empty array if staff is not an array
  return (
    <AdminLayout title="Staff & Roles">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Admin Staff</h2>
          <p className="text-slate-500 text-sm mt-1">{staff.length} team members</p>
        </div>
        <Button onClick={openAdd} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Add Staff Member
        </Button>
      </div>

      <div className="mb-4">
        <Input placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
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
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-slate-500">No staff members found</TableCell></TableRow>
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
                          {member.role === "super_admin" ? <ShieldCheck className="w-3 h-3 mr-1" /> : <ShieldAlert className="w-3 h-3 mr-1" />}
                          {ROLE_LABELS[member.role] ?? member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {activePerms.length === 0 ? (
                            <span className="text-xs text-slate-400">None</span>
                          ) : activePerms.map(p => (
                            <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0">{PERM_LABELS[p]}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={member.status === "active" ? "bg-emerald-100 text-emerald-700 border-emerald-200 border" : "bg-red-100 text-red-700 border-red-200 border"}>
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">{new Date(member.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
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

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="staff@dalel.sa" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{editTarget ? "New Password (leave blank to keep)" : "Password"}</Label>
              <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as Role }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
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
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
              {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : editTarget ? "Save Changes" : "Create Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={v => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Staff Member</DialogTitle></DialogHeader>
          <p className="text-slate-600 text-sm">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
