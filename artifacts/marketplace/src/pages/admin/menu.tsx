import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GripVertical, Plus, Pencil, Trash2, Eye, EyeOff,
  ExternalLink, Check, X, Loader2, Navigation,
  RotateCcw, Link as LinkIcon, AlertCircle, RefreshCw,
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

// ─── Raw fetch helpers (bypass fetchJson's auto-unwrap to control response) ───
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = (window as any).__API_BASE__ ?? "/api";
  const url  = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res  = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error ?? body?.message ?? `HTTP ${res.status}`);
  }
  if (body?.success === false) {
    throw new Error(body?.error ?? "طلب فاشل");
  }
  return (body?.data ?? body) as T;
}

const menuApi = {
  list:    ()                               => apiFetch<MenuItem[]>("/admin/menu-items"),
  create:  (b: Omit<typeof emptyForm, never>) => apiFetch<MenuItem>("/admin/menu-items", { method: "POST", body: JSON.stringify(b) }),
  update:  (id: number, b: Partial<MenuItem>) => apiFetch<MenuItem>(`/admin/menu-items/${id}`, { method: "PUT", body: JSON.stringify(b) }),
  remove:  (id: number)                     => apiFetch<void>(`/admin/menu-items/${id}`, { method: "DELETE" }),
  reorder: (order: number[])               => apiFetch<void>("/admin/menu-items/reorder", { method: "PUT", body: JSON.stringify({ order }) }),
};

// ─── Empty form default ───────────────────────────────────────────────────────
const emptyForm = { label: "", href: "", icon: "", openInNewTab: false };

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminMenuPage() {
  const qc = useQueryClient();

  // ── Server data ─────────────────────────────────────────────────────────────
  const { data: serverItems, isLoading, isError, error, refetch } = useQuery<MenuItem[]>({
    queryKey: ["admin-menu-items"],
    queryFn:  menuApi.list,
    staleTime: 0,
    retry: 1,
  });

  // ── Local ordered state (drives display + optimistic drag) ──────────────────
  const [ordered, setOrdered] = useState<MenuItem[]>([]);

  // Sync server data → local ordered list (only when server data arrives/changes)
  useEffect(() => {
    if (serverItems && serverItems.length > 0) {
      setOrdered([...serverItems].sort((a, b) => a.sortOrder - b.sortOrder));
    } else if (serverItems && serverItems.length === 0) {
      setOrdered([]);
    }
  }, [serverItems]);

  // Display: if ordered is populated use it (preserves drag order), else fall back to server
  const displayed = ordered.length > 0 ? ordered : (serverItems ?? []);

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [editItem,      setEditItem]      = useState<MenuItem | null>(null);
  const [showAdd,       setShowAdd]       = useState(false);
  const [form,          setForm]          = useState(emptyForm);
  const [deleteTarget,  setDeleteTarget]  = useState<MenuItem | null>(null);

  // ── Drag & Drop ──────────────────────────────────────────────────────────────
  const dragId = useRef<number | null>(null);

  function onDragStart(id: number) {
    dragId.current = id;
  }

  function onDragOver(e: React.DragEvent, overId: number) {
    e.preventDefault();
    if (dragId.current === null || dragId.current === overId) return;
    setOrdered(prev => {
      const next    = [...prev];
      const fromIdx = next.findIndex(x => x.id === dragId.current);
      const toIdx   = next.findIndex(x => x.id === overId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }

  const reorderMut = useMutation({
    mutationFn: (order: number[]) => menuApi.reorder(order),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-menu-items"] });
      qc.invalidateQueries({ queryKey: ["public-menu-items"] });
    },
    onError: () => toast.error("فشل حفظ الترتيب"),
  });

  function onDragEnd() {
    if (dragId.current !== null && ordered.length > 0) {
      reorderMut.mutate(ordered.map(x => x.id));
    }
    dragId.current = null;
  }

  // ── Visibility toggle ────────────────────────────────────────────────────────
  const toggleMut = useMutation({
    mutationFn: ({ id, visible }: { id: number; visible: boolean }) =>
      menuApi.update(id, { visible }),
    onMutate: ({ id, visible }) => {
      // Optimistic update
      setOrdered(prev => prev.map(x => x.id === id ? { ...x, visible } : x));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-menu-items"] });
      qc.invalidateQueries({ queryKey: ["public-menu-items"] });
    },
    onError: () => {
      toast.error("فشل تغيير الحالة");
      refetch();
    },
  });

  // ── Add ──────────────────────────────────────────────────────────────────────
  const addMut = useMutation({
    mutationFn: (body: typeof emptyForm) => menuApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-menu-items"] });
      qc.invalidateQueries({ queryKey: ["public-menu-items"] });
      toast.success("تمت الإضافة");
      setShowAdd(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل الإضافة"),
  });

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const editMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<MenuItem> }) =>
      menuApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-menu-items"] });
      qc.invalidateQueries({ queryKey: ["public-menu-items"] });
      toast.success("تم الحفظ");
      setEditItem(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل التعديل"),
  });

  // ── Delete ───────────────────────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: (id: number) => menuApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-menu-items"] });
      qc.invalidateQueries({ queryKey: ["public-menu-items"] });
      toast.success("تم الحذف");
      setDeleteTarget(null);
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل الحذف"),
  });

  // ── Reset to defaults ────────────────────────────────────────────────────────
  const resetMut = useMutation({
    mutationFn: async () => {
      for (const item of ordered) {
        await menuApi.remove(item.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-menu-items"] });
      qc.invalidateQueries({ queryKey: ["public-menu-items"] });
      toast.success("تمت استعادة القائمة الافتراضية");
    },
    onError: () => toast.error("فشل إعادة الضبط"),
  });

  // ── Open edit modal ──────────────────────────────────────────────────────────
  function openEdit(item: MenuItem) {
    setEditItem(item);
    setForm({ label: item.label, href: item.href, icon: item.icon ?? "", openInNewTab: item.openInNewTab });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6" dir="rtl">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
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
              variant="outline" size="sm" className="gap-1.5 text-xs"
              onClick={() => resetMut.mutate()}
              disabled={resetMut.isPending || displayed.length === 0}
            >
              {resetMut.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RotateCcw className="w-3.5 h-3.5" />}
              استعادة الافتراضي
            </Button>
            <Button size="sm" className="gap-1.5"
              onClick={() => { setForm(emptyForm); setShowAdd(true); }}>
              <Plus className="w-4 h-4" /> إضافة عنصر
            </Button>
          </div>
        </div>

        {/* ── Loading ─────────────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">جاري تحميل عناصر القائمة...</p>
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────────── */}
        {isError && !isLoading && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="font-semibold text-red-700">فشل تحميل عناصر القائمة</p>
            <p className="text-sm text-red-600">{(error as any)?.message ?? "خطأ غير معروف"}</p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" /> إعادة المحاولة
            </Button>
          </div>
        )}

        {/* ── Empty (no items at all) ──────────────────────────────────────────── */}
        {!isLoading && !isError && displayed.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-muted py-20 text-center space-y-3">
            <Navigation className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="text-muted-foreground">لا توجد عناصر — أضف أول عنصر أو استعد الافتراضي</p>
            <div className="flex justify-center gap-2">
              <Button size="sm" className="gap-1.5"
                onClick={() => { setForm(emptyForm); setShowAdd(true); }}>
                <Plus className="w-4 h-4" /> إضافة عنصر
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5"
                onClick={() => resetMut.mutate()} disabled={resetMut.isPending}>
                {resetMut.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RotateCcw className="w-3.5 h-3.5" />}
                استعادة الافتراضي
              </Button>
            </div>
          </div>
        )}

        {/* ── Items list ──────────────────────────────────────────────────────── */}
        {!isLoading && !isError && displayed.length > 0 && (
          <>
            <div className="space-y-2">
              {displayed.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => onDragStart(item.id)}
                  onDragOver={(e) => onDragOver(e, item.id)}
                  onDragEnd={onDragEnd}
                  className={`group flex items-center gap-3 bg-white dark:bg-card border rounded-xl px-4 py-3 shadow-sm transition-all cursor-grab active:cursor-grabbing hover:shadow-md select-none ${
                    !item.visible ? "opacity-50" : ""
                  }`}
                >
                  {/* Drag handle */}
                  <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />

                  {/* Icon + Label + URL */}
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

                  {/* Visibility badge (desktop only) */}
                  <span className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    item.visible
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-gray-100 text-gray-500 border border-gray-200"
                  }`}>
                    {item.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {item.visible ? "مرئي" : "مخفي"}
                  </span>

                  {/* Action buttons */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      title={item.visible ? "إخفاء" : "إظهار"}
                      onClick={() => toggleMut.mutate({ id: item.id, visible: !item.visible })}
                      className="p-1.5 rounded-lg hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      title="تعديل"
                      onClick={() => openEdit(item)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
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

              {reorderMut.isPending && (
                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1 py-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> جاري حفظ الترتيب...
                </p>
              )}
            </div>

            {/* ── Live preview ──────────────────────────────────────────────── */}
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> معاينة القائمة كما ستظهر على الموقع
              </p>
              <div className="flex flex-wrap items-center gap-5">
                {displayed.filter(i => i.visible).map(i => (
                  <span key={i.id} className="text-sm font-medium text-foreground flex items-center gap-1">
                    {i.icon && <span>{i.icon}</span>}
                    {i.label}
                    {i.openInNewTab && <ExternalLink className="w-3 h-3 text-muted-foreground/50" />}
                  </span>
                ))}
                {displayed.filter(i => i.visible).length === 0 && (
                  <span className="text-xs text-muted-foreground italic">لا توجد عناصر مرئية حالياً</span>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────────── */}
      <Dialog
        open={showAdd || !!editItem}
        onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditItem(null); } }}
      >
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "تعديل العنصر" : "إضافة عنصر جديد"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Label */}
            <div className="space-y-1.5">
              <Label htmlFor="m-label">النص (الاسم) *</Label>
              <Input
                id="m-label"
                placeholder="مثال: للبيع"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                dir="rtl"
                autoFocus
              />
            </div>

            {/* href */}
            <div className="space-y-1.5">
              <Label htmlFor="m-href">الرابط *</Label>
              <Input
                id="m-href"
                placeholder="مثال: /properties?listingType=sale"
                value={form.href}
                onChange={e => setForm(f => ({ ...f, href: e.target.value }))}
                dir="ltr"
                className="text-left font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">رابط داخلي يبدأ بـ / أو رابط خارجي كامل</p>
            </div>

            {/* Icon */}
            <div className="space-y-1.5">
              <Label htmlFor="m-icon">أيقونة إيموجي (اختياري)</Label>
              <Input
                id="m-icon"
                placeholder="🏠  أو  🗺  أو اتركها فارغة"
                value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                dir="ltr"
                className="text-xl"
              />
            </div>

            {/* Open in new tab */}
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
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
              disabled={
                !form.label.trim() || !form.href.trim() ||
                addMut.isPending || editMut.isPending
              }
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

      {/* ── Delete Confirmation ───────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف العنصر</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف «<strong>{deleteTarget?.label}</strong>»؟ لا يمكن التراجع.
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
