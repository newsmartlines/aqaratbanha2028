import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, Eye, EyeOff,
  ChevronUp, ChevronDown, Search, Tag, MapPin,
  Loader2, GripVertical, ToggleLeft, ToggleRight, CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

type Feature = {
  id: number;
  type: string;
  name: string;
  icon: string | null;
  status: string;
  sortOrder: number;
};

type Tab = "feature" | "service";

const EMPTY = { name: "", icon: "🏠", status: "active" };

// ─── Common emoji pickers ─────────────────────────────────────────────────────

const FEATURE_EMOJIS = [
  "🛗", "🚗", "🏊", "🏠", "❄️", "📡", "💂", "⚡", "💧", "🏋️",
  "🪟", "🌿", "🤖", "🔒", "🛋️", "🌞", "🔑", "🚿", "🛁", "🛏",
  "📹", "🔥", "⚙️", "🌊", "🎮", "🍳", "🏗", "🏢", "🌳", "🌺",
];
const SERVICE_EMOJIS = [
  "🕌", "🏫", "🏥", "💊", "🛒", "🏬", "🏦", "🌳", "🚌", "🍽️",
  "🏃", "⛽", "🎓", "🏪", "🏨", "🎭", "🚉", "✈️", "🏋️", "🎯",
];

// ─── Emoji Picker Grid ────────────────────────────────────────────────────────

function EmojiPicker({ value, onChange, emojis }: {
  value: string;
  onChange: (e: string) => void;
  emojis: string[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-3xl">{value}</span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="اكتب إيموجي أو رمز..."
          className="h-9 rounded-lg w-32"
        />
      </div>
      <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-border">
        {emojis.map((em) => (
          <button
            key={em}
            type="button"
            onClick={() => onChange(em)}
            className={`text-xl w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${
              value === em ? "bg-teal-100 ring-2 ring-teal-400 scale-110" : "hover:bg-slate-100"
            }`}
          >
            {em}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Feature Row ──────────────────────────────────────────────────────────────

function FeatureRow({
  item, isFirst, isLast,
  onEdit, onDelete, onToggle, onMoveUp, onMoveDown,
}: {
  item: Feature;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const isActive = item.status === "active";
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all group ${
      isActive
        ? "bg-white border-slate-200 hover:border-teal-200 hover:shadow-sm"
        : "bg-slate-50 border-slate-200 opacity-60"
    }`}>
      {/* Drag handle / order */}
      <div className="flex flex-col gap-0.5 text-slate-300 shrink-0">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          className="hover:text-teal-600 disabled:opacity-20 transition-colors"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          className="hover:text-teal-600 disabled:opacity-20 transition-colors"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Icon */}
      <span className="text-2xl w-8 text-center shrink-0">{item.icon ?? "🏠"}</span>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 text-sm">{item.name}</p>
        <p className="text-xs text-slate-400">ترتيب: {item.sortOrder}</p>
      </div>

      {/* Status badge */}
      <Badge
        className={`text-[10px] px-2 py-0.5 shrink-0 ${
          isActive
            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
            : "bg-slate-100 text-slate-500 border-slate-200"
        }`}
        variant="outline"
      >
        {isActive ? "ظاهر" : "مخفي"}
      </Badge>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onToggle}
          title={isActive ? "إخفاء" : "إظهار"}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            isActive
              ? "text-amber-500 hover:bg-amber-50"
              : "text-emerald-500 hover:bg-emerald-50"
          }`}
        >
          {isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPropertyFeatures() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("feature");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "hidden">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Feature | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Feature | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  // ── Queries ────────────────────────────────────────────────────────────────

  const queryKey = ["admin-property-features", tab];

  const { data: items = [], isLoading } = useQuery<Feature[]>({
    queryKey,
    queryFn: () => api.propertyFeatures.adminList(tab),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (d: typeof EMPTY) =>
      api.propertyFeatures.create({ type: tab, ...d, sortOrder: items.length + 1 }),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      toast.success("تمت الإضافة بنجاح");
    },
    onError: () => toast.error("حدث خطأ أثناء الإضافة"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<typeof EMPTY> }) =>
      api.propertyFeatures.update(id, data),
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
      toast.success("تم التعديل بنجاح");
    },
    onError: () => toast.error("حدث خطأ أثناء التعديل"),
  });

  const toggleMut = useMutation({
    mutationFn: (id: number) => api.propertyFeatures.toggle(id),
    onSuccess: () => {
      invalidate();
      // Also invalidate the public list so the form wizard updates
      qc.invalidateQueries({ queryKey: ["property-features", tab] });
    },
    onError: () => toast.error("حدث خطأ"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.propertyFeatures.delete(id),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["property-features", tab] });
      setDeleteTarget(null);
      toast.success("تم الحذف");
    },
    onError: () => toast.error("حدث خطأ أثناء الحذف"),
  });

  const reorderMut = useMutation({
    mutationFn: (reordered: Feature[]) =>
      api.propertyFeatures.reorder(
        reordered.map((item, idx) => ({ id: item.id, sortOrder: idx + 1 }))
      ),
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["property-features", tab] });
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY, icon: tab === "service" ? "🕌" : "🏠" });
    setModalOpen(true);
  };

  const openEdit = (item: Feature) => {
    setEditing(item);
    setForm({ name: item.name, icon: item.icon ?? "🏠", status: item.status });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) {
      updateMut.mutate({ id: editing.id, data: form });
    } else {
      createMut.mutate(form);
    }
  };

  const handleMove = (item: Feature, dir: "up" | "down") => {
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((i) => i.id === item.id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === sorted.length - 1) return;
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    const reordered = [...sorted];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    reorderMut.mutate(reordered);
  };

  // ── Filtering ──────────────────────────────────────────────────────────────

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.sortOrder - b.sortOrder),
    [items]
  );

  const visible = useMemo(() => {
    let list = sorted;
    if (filter === "active") list = list.filter((i) => i.status === "active");
    if (filter === "hidden") list = list.filter((i) => i.status === "hidden");
    if (search.trim())
      list = list.filter((i) => i.name.includes(search.trim()));
    return list;
  }, [sorted, filter, search]);

  const activeCount  = items.filter((i) => i.status === "active").length;
  const hiddenCount  = items.filter((i) => i.status === "hidden").length;
  const tabEmojis    = tab === "feature" ? FEATURE_EMOJIS : SERVICE_EMOJIS;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className="p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">مميزات وخدمات العقار</h1>
            <p className="text-sm text-slate-500 mt-1">
              إدارة مميزات العقارات والخدمات القريبة التي تظهر في نماذج الإضافة والبحث
            </p>
          </div>
          <Button
            onClick={openAdd}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2 h-10 px-5"
          >
            <Plus className="w-4 h-4" />
            إضافة {tab === "feature" ? "ميزة" : "خدمة"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => { setTab("feature"); setSearch(""); setFilter("all"); }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "feature"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Tag className="w-4 h-4" />
            مميزات العقار
          </button>
          <button
            type="button"
            onClick={() => { setTab("service"); setSearch(""); setFilter("all"); }}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === "service"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <MapPin className="w-4 h-4" />
            الخدمات القريبة
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "الإجمالي", value: items.length, color: "text-slate-700", bg: "bg-slate-50 border-slate-200" },
            { label: "ظاهر",     value: activeCount,  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
            { label: "مخفي",     value: hiddenCount,  color: "text-amber-700",   bg: "bg-amber-50 border-amber-200" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="ابحث بالاسم..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 h-10 rounded-xl border-slate-200"
            />
          </div>
          <div className="flex items-center gap-2">
            {(["all", "active", "hidden"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  filter === f
                    ? "bg-teal-600 border-teal-600 text-white"
                    : "border-slate-200 text-slate-600 hover:border-teal-300 bg-white"
                }`}
              >
                {f === "all" ? "الكل" : f === "active" ? "الظاهرة" : "المخفية"}
              </button>
            ))}
          </div>
        </div>

        {/* Items list */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <div className="text-4xl mb-3">{tab === "feature" ? "🏠" : "📍"}</div>
              <p className="font-semibold text-slate-600">
                {search ? "لا توجد نتائج مطابقة" : `لا توجد ${tab === "feature" ? "مميزات" : "خدمات"} بعد`}
              </p>
              {!search && (
                <Button onClick={openAdd} variant="outline" className="mt-4 rounded-xl gap-2">
                  <Plus className="w-4 h-4" />
                  أضف أول {tab === "feature" ? "ميزة" : "خدمة"}
                </Button>
              )}
            </div>
          ) : (
            visible.map((item, idx) => {
              const originalIdx = sorted.findIndex((s) => s.id === item.id);
              return (
                <FeatureRow
                  key={item.id}
                  item={item}
                  isFirst={originalIdx === 0}
                  isLast={originalIdx === sorted.length - 1}
                  onEdit={() => openEdit(item)}
                  onDelete={() => setDeleteTarget(item)}
                  onToggle={() => toggleMut.mutate(item.id)}
                  onMoveUp={() => handleMove(item, "up")}
                  onMoveDown={() => handleMove(item, "down")}
                />
              );
            })
          )}
        </div>

        {/* Hint */}
        {items.length > 0 && (
          <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-2">
            <GripVertical className="w-3.5 h-3.5" />
            استخدم أسهم ↑↓ لتغيير ترتيب الظهور في نماذج الإضافة والبحث
          </p>
        )}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) setModalOpen(false); }}>
        <DialogContent className="sm:max-w-[460px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {editing ? <Pencil className="w-4 h-4 text-teal-600" /> : <Plus className="w-4 h-4 text-teal-600" />}
              {editing ? "تعديل" : "إضافة"} {tab === "feature" ? "ميزة" : "خدمة"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Name */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">
                الاسم <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder={tab === "feature" ? "مثال: مسبح، جراج مغطى..." : "مثال: مسجد، مدرسة..."}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Icon */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">الأيقونة (إيموجي)</Label>
              <EmojiPicker
                value={form.icon}
                onChange={(e) => setForm((p) => ({ ...p, icon: e }))}
                emojis={tabEmojis}
              />
            </div>

            {/* Status */}
            <div>
              <Label className="text-sm font-semibold mb-3 block">الحالة</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "active", label: "ظاهر",  desc: "يظهر للمستخدمين",   color: "border-emerald-400 bg-emerald-50" },
                  { value: "hidden", label: "مخفي",  desc: "لا يظهر للمستخدمين", color: "border-slate-300 bg-slate-50" },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, status: s.value }))}
                    className={`relative p-3 rounded-xl border-2 text-right transition-all ${
                      form.status === s.value ? s.color + " shadow-sm" : "border-border hover:border-slate-300"
                    }`}
                  >
                    {form.status === s.value && (
                      <CheckCircle2 className="absolute top-2 left-2 w-4 h-4 text-teal-600" />
                    )}
                    <p className="font-semibold text-sm">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || createMut.isPending || updateMut.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2"
            >
              {(createMut.isPending || updateMut.isPending) && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              {editing ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف {tab === "feature" ? "الميزة" : "الخدمة"}</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف{" "}
              <span className="font-semibold text-slate-800">
                {deleteTarget?.icon} {deleteTarget?.name}
              </span>
              ؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMut.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "حذف"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
