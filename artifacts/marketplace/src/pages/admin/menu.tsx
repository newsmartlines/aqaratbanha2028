import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GripVertical, Plus, Pencil, Trash2, Eye, EyeOff,
  ExternalLink, Check, X, Loader2, Navigation,
  RotateCcw, Link as LinkIcon,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import toast from "react-hot-toast";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MenuItem {
  id: number;
  label: string;
  href: string;
  icon: string | null;
  visible: boolean;
  openInNewTab: boolean;
  sortOrder: number;
}

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = { label: "", href: "", icon: "", openInNewTab: false };

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminMenuPage() {
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery<MenuItem[]>({
    queryKey: ["admin-menu-items"],
    queryFn:  () => api.menuItems.adminList().then((r: any) => r.data ?? r),
    staleTime: 0,
  });

  // ── Local ordered copy for optimistic drag ──
  const [ordered, setOrdered] = useState<MenuItem[]>([]);
  const synced = ordered.length === items.length && ordered.every((o, i) => o.id === items[i]?.id);
  const displayed = synced ? ordered : items;

  // Keep local list in sync when server data changes
  if (!synced && items.length > 0) {
    setOrdered([...items].sort((a, b) => a.sortOrder - b.sortOrder));
  }

  // ── Modals state ────────────────────────────────────────────────────────────
  const [editItem, setEditItem]         = useState<MenuItem | null>(null);
  const [showAdd, setShowAdd]           = useState(false);
  const [form, setForm]                 = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);

  // ── Drag & drop ─────────────────────────────────────────────────────────────
  const dragId   = useRef<number | null>(null);
  const overId   = useRef<number | null>(null);

  function onDragStart(id: number) { dragId.current = id; }

  function onDragOver(e: React.DragEvent, id: number) {
    e.preventDefault();
    overId.current = id;
    if (dragId.current === null || dragId.current === id) return;
    setOrdered(prev => {
      const next = [...prev];
      const fromIdx = next.findIndex(x => x.id === dragId.current);
      const toIdx   = next.findIndex(x => x.id === id);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }

  const reorderMut = useMutation({
    mutationFn: (order: number[]) => api.menuItems.reorder(order),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-menu-items"] }),
    onError:   () => toast.error("فشل حفظ الترتيب"),
  });

  function onDragEnd() {
    if (dragId.current !== null) {
      reorderMut.mutate(ordered.map(x => x.id));
    }
    dragId.current = null;
    overId.current = null;
  }

  // ── Visibility toggle ────────────────────────────────────────────────────────
  const toggleMut = useMutation({
    mutationFn: ({ id, visible }: { id: number; visible: boolean }) =>
      api.menuItems.update(id, { visible }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-menu-items"] });
      qc.invalidateQueries({ queryKey: ["public-menu-items"] });
    },
    onError: () => toast.error("فشل تغيير الحالة"),
  });

  // ── Add mutation ─────────────────────────────────────────────────────────────
  const addMut = useMutation({
    mutationFn: (body: typeof emptyForm) => api.menuItems.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-menu-items"] });
      qc.invalidateQueries({ queryKey: ["public-menu-items"] });
      toast.success("تمت الإضافة");
      setShowAdd(false);
      setForm(emptyForm);
    },
    onError: () => toast.error("فشل الإضافة"),
  });

  // ── Edit mutation ────────────────────────────────────────────────────────────
  const editMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<MenuItem> }) =>
      api.menuItems.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-menu-items"] });
      qc.invalidateQueries({ queryKey: ["public-menu-items"] });
      toast.success("تم التعديل");
      setEditItem(null);
    },
    onError: () => toast.error("فشل التعديل"),
  });

  // ── Delete mutation ──────────────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: (id: number) => api.menuItems.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-menu-items"] });
      qc.invalidateQueries({ queryKey: ["public-menu-items"] });
      toast.success("تم الحذف");
      setDeleteTarget(null);
    },
    onError: () => toast.error("فشل الحذف"),
  });

  // ── Reset to defaults ────────────────────────────────────────────────────────
  // (just delete all then let ensureDefaults re-seed on next fetch)
  const resetMut = useMutation({
    mutationFn: async () => {
      await Promise.all(displayed.map(i => api.menuItems.remove(i.id)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-menu-items"] });
      qc.invalidateQueries({ queryKey: ["public-menu-items"] });
      toast.success("تمت إعادة الضبط للقائمة الافتراضية");
    },
    onError: () => toast.error("فشل إعادة الضبط"),
  });

  // ── Open edit modal pre-filled ────────────────────────────────────────────────
  function openEdit(item: MenuItem) {
    setEditItem(item);
    setForm({
      label: item.label,
      href:  item.href,
      icon:  item.icon ?? "",
      openInNewTab: item.openInNewTab,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6" dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Navigation className="w-6 h-6 text-primary" />
              إدارة القائمة الرئيسية
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              اسحب العناصر لإعادة ترتيبها — التغييرات تظهر فوراً على الموقع
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => resetMut.mutate()}
              disabled={resetMut.isPending}
            >
              {resetMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              استعادة الافتراضي
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => { setForm(emptyForm); setShowAdd(true); }}>
              <Plus className="w-4 h-4" /> إضافة عنصر
            </Button>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-muted py-20 text-center">
            <Navigation className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد عناصر في القائمة</p>
            <Button size="sm" className="mt-4 gap-1.5" onClick={() => { setForm(emptyForm); setShowAdd(true); }}>
              <Plus className="w-4 h-4" /> إضافة عنصر جديد
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => onDragStart(item.id)}
                onDragOver={(e) => onDragOver(e, item.id)}
                onDragEnd={onDragEnd}
                className={`group flex items-center gap-3 bg-white dark:bg-card border rounded-xl px-4 py-3 shadow-sm transition-all cursor-grab active:cursor-grabbing hover:shadow-md ${
                  !item.visible ? "opacity-50" : ""
                }`}
              >
                {/* Drag handle */}
                <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />

                {/* Icon + Label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {item.icon && <span className="text-base leading-none">{item.icon}</span>}
                    <span className={`font-semibold text-sm ${!item.visible ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {item.label}
                    </span>
                    {item.openInNewTab && (
                      <ExternalLink className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <LinkIcon className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                    <span className="text-xs text-muted-foreground truncate font-mono">{item.href}</span>
                  </div>
                </div>

                {/* Visibility badge */}
                <span className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                  item.visible
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-gray-100 text-gray-500 border border-gray-200"
                }`}>
                  {item.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {item.visible ? "مرئي" : "مخفي"}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Toggle visibility */}
                  <button
                    title={item.visible ? "إخفاء" : "إظهار"}
                    onClick={() => toggleMut.mutate({ id: item.id, visible: !item.visible })}
                    className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>

                  {/* Edit */}
                  <button
                    title="تعديل"
                    onClick={() => openEdit(item)}
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    title="حذف"
                    onClick={() => setDeleteTarget(item)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Reorder hint */}
            {reorderMut.isPending && (
              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> جاري حفظ الترتيب...
              </p>
            )}
          </div>
        )}

        {/* Live preview strip */}
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> معاينة القائمة كما ستظهر على الموقع
          </p>
          <div className="flex flex-wrap items-center gap-4 rtl:flex-row">
            {displayed.filter(i => i.visible).map(i => (
              <span key={i.id} className="text-sm font-medium text-foreground flex items-center gap-1">
                {i.icon && <span>{i.icon}</span>}
                {i.label}
                {i.openInNewTab && <ExternalLink className="w-3 h-3 text-muted-foreground/50" />}
              </span>
            ))}
            {displayed.filter(i => i.visible).length === 0 && (
              <span className="text-xs text-muted-foreground">لا توجد عناصر مرئية</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={showAdd || !!editItem}
        onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditItem(null); } }}
      >
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "تعديل العنصر" : "إضافة عنصر جديد"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Label */}
            <div className="space-y-1.5">
              <Label htmlFor="m-label">النص (الاسم)</Label>
              <Input
                id="m-label"
                placeholder="مثال: للبيع"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                dir="rtl"
              />
            </div>

            {/* href */}
            <div className="space-y-1.5">
              <Label htmlFor="m-href">الرابط</Label>
              <Input
                id="m-href"
                placeholder="مثال: /properties?listingType=sale"
                value={form.href}
                onChange={e => setForm(f => ({ ...f, href: e.target.value }))}
                dir="ltr"
                className="text-left font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                رابط داخلي يبدأ بـ / أو رابط خارجي كامل
              </p>
            </div>

            {/* Icon */}
            <div className="space-y-1.5">
              <Label htmlFor="m-icon">أيقونة (إيموجي اختياري)</Label>
              <Input
                id="m-icon"
                placeholder="مثال: 🏠 أو 🗺"
                value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                dir="ltr"
                className="text-xl"
              />
            </div>

            {/* Open in new tab */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">فتح في تاب جديد</p>
                <p className="text-xs text-muted-foreground">مناسب للروابط الخارجية</p>
              </div>
              <Switch
                checked={form.openInNewTab}
                onCheckedChange={v => setForm(f => ({ ...f, openInNewTab: v }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); setEditItem(null); }}>
              <X className="w-4 h-4 ml-1" /> إلغاء
            </Button>
            <Button
              disabled={!form.label.trim() || !form.href.trim() || addMut.isPending || editMut.isPending}
              onClick={() => {
                if (editItem) {
                  editMut.mutate({ id: editItem.id, body: form });
                } else {
                  addMut.mutate(form);
                }
              }}
            >
              {(addMut.isPending || editMut.isPending)
                ? <Loader2 className="w-4 h-4 animate-spin ml-1" />
                : <Check className="w-4 h-4 ml-1" />
              }
              {editItem ? "حفظ التغييرات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف العنصر</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "<strong>{deleteTarget?.label}</strong>"؟ لا يمكن التراجع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
            >
              {deleteMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
