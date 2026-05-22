import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  Megaphone, Plus, Pencil, Trash2, Power, PowerOff, Loader2, Eye, X,
} from "lucide-react";
import toast from "react-hot-toast";

interface Popup {
  id: number;
  name: string;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  bgColor?: string | null;
  overlayOpacity?: number | null;
  textColor?: string | null;
  btnColor?: string | null;
  btnTextColor?: string | null;
  borderRadius?: number | null;
  size?: string | null;
  position?: string | null;
  triggerType?: string | null;
  triggerDelay?: number | null;
  triggerScrollPct?: number | null;
  pages?: string | null;
  showCloseBtn?: boolean | null;
  cookieDuration?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean | null;
  sortOrder?: number | null;
}

const EMPTY: Partial<Popup> = {
  name: "",
  title: "",
  description: "",
  imageUrl: "",
  ctaText: "",
  ctaLink: "",
  bgColor: "#ffffff",
  overlayOpacity: 50,
  textColor: "#111827",
  btnColor: "#0d9488",
  btnTextColor: "#ffffff",
  borderRadius: 12,
  size: "md",
  position: "center",
  triggerType: "immediate",
  triggerDelay: 3,
  triggerScrollPct: 50,
  pages: '["all"]',
  showCloseBtn: true,
  cookieDuration: 1,
  startDate: "",
  endDate: "",
  isActive: false,
  sortOrder: 0,
};

const PAGES_OPTIONS = [
  { value: "all", label: "كل الموقع" },
  { value: "home", label: "الرئيسية" },
  { value: "properties", label: "نتائج البحث" },
  { value: "property", label: "صفحة عقار معين" },
];

const SIZE_OPTIONS = [
  { value: "sm", label: "صغير (SM)" },
  { value: "md", label: "متوسط (MD)" },
  { value: "lg", label: "كبير (LG)" },
  { value: "xl", label: "كبير جداً (XL)" },
];

const POSITION_OPTIONS = [
  { value: "center", label: "المنتصف" },
  { value: "top", label: "أعلى" },
  { value: "bottom", label: "أسفل" },
  { value: "bottom-right", label: "أسفل يمين" },
  { value: "bottom-left", label: "أسفل يسار" },
  { value: "top-right", label: "أعلى يمين" },
  { value: "top-left", label: "أعلى يسار" },
];

const TRIGGER_OPTIONS = [
  { value: "immediate", label: "فور دخول الصفحة" },
  { value: "delay", label: "بعد عدد ثواني" },
  { value: "scroll", label: "عند النزول (Scroll)" },
  { value: "exit", label: "نية المغادرة (Exit Intent)" },
];

const PRESET_COLORS = [
  "#ffffff", "#111827", "#0d9488", "#3b82f6", "#8b5cf6",
  "#ef4444", "#f59e0b", "#10b981", "#ec4899", "#1e293b",
];

function parsePages(val: string | null | undefined): string[] {
  if (!val) return ["all"];
  try { return JSON.parse(val); } catch { return ["all"]; }
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
        <Input value={value} onChange={e => onChange(e.target.value)} className="flex-1 h-8 text-xs font-mono" />
      </div>
      <div className="flex gap-1 flex-wrap">
        {PRESET_COLORS.map(c => (
          <button key={c} onClick={() => onChange(c)}
            className="w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform"
            style={{ background: c }} />
        ))}
      </div>
    </div>
  );
}

function PopupPreview({ form }: { form: Partial<Popup> }) {
  const radius = form.borderRadius ?? 12;
  const bg = form.bgColor ?? "#ffffff";
  const textColor = form.textColor ?? "#111827";
  const btnColor = form.btnColor ?? "#0d9488";
  const btnTextColor = form.btnTextColor ?? "#ffffff";

  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 flex items-center justify-center min-h-[180px]">
      <div
        className="relative w-full max-w-xs shadow-lg overflow-hidden"
        style={{ borderRadius: radius, background: bg, color: textColor }}
        dir="rtl"
      >
        {form.imageUrl && (
          <img src={form.imageUrl} alt="" className="w-full h-28 object-cover" onError={() => {}} />
        )}
        <div className="p-4">
          {form.title && <h3 className="font-bold text-base mb-1">{form.title}</h3>}
          {form.description && <p className="text-xs opacity-70 mb-3 line-clamp-2">{form.description}</p>}
          {form.ctaText && (
            <button
              className="w-full py-2 rounded-lg text-sm font-bold"
              style={{ background: btnColor, color: btnTextColor, borderRadius: radius * 0.5 }}
            >
              {form.ctaText}
            </button>
          )}
        </div>
        {form.showCloseBtn !== false && (
          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/20 flex items-center justify-center">
            <X className="w-3 h-3" style={{ color: textColor }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPopups() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Popup | null>(null);
  const [form, setForm] = useState<Partial<Popup>>(EMPTY);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data, isLoading } = useQuery<{ success: boolean; data: Popup[] }>({
    queryKey: ["admin-popups"],
    queryFn: () => fetch("/api/admin/popups").then(r => r.json()),
  });

  const popups = data?.data ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-popups"] });

  const createMut = useMutation({
    mutationFn: (body: Partial<Popup>) =>
      fetch("/api/admin/popups", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { toast.success("تم إنشاء البوب آب ✓"); invalidate(); setShowModal(false); },
    onError: () => toast.error("خطأ في الإنشاء"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Popup> }) =>
      fetch(`/api/admin/popups/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { toast.success("تم التحديث ✓"); invalidate(); setShowModal(false); },
    onError: () => toast.error("خطأ في التحديث"),
  });

  const toggleMut = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/admin/popups/${id}/toggle`, { method: "PATCH", credentials: "include" }).then(r => r.json()),
    onSuccess: () => invalidate(),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/admin/popups/${id}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => { toast.success("تم الحذف"); invalidate(); },
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (p: Popup) => { setEditing(p); setForm({ ...p }); setShowModal(true); };

  const save = () => {
    const body = { ...form };
    if (editing) updateMut.mutate({ id: editing.id, body });
    else createMut.mutate(body);
  };

  const f = (k: keyof Popup, v: unknown) => setForm(prev => ({ ...prev, [k]: v }));

  const pages = parsePages(form.pages);
  const togglePage = (val: string) => {
    let next: string[];
    if (val === "all") { next = ["all"]; }
    else {
      const cur = pages.filter(p => p !== "all");
      next = cur.includes(val) ? cur.filter(p => p !== val) : [...cur, val];
      if (!next.length) next = ["all"];
    }
    f("pages", JSON.stringify(next));
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-primary" /> البوب آب والإعلانات
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">أنشئ وتحكم في البوب آب بشكل كامل دون أي كود</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> بوب آب جديد
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : popups.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Megaphone className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p className="font-semibold">لا يوجد بوب آب حتى الآن</p>
            <p className="text-sm mt-1">ابدأ بإنشاء بوب آب جديد</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {popups.map(p => {
              const pagesArr = parsePages(p.pages);
              return (
                <div key={p.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${p.isActive ? "border-primary/30 ring-1 ring-primary/20" : "border-gray-200"}`}>
                  {/* Image preview */}
                  {p.imageUrl ? (
                    <div className="h-32 bg-gray-100 overflow-hidden">
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-24 flex items-center justify-center text-4xl" style={{ background: p.bgColor ?? "#f9fafb" }}>
                      <Megaphone className="w-8 h-8 opacity-20" style={{ color: p.textColor ?? "#111827" }} />
                    </div>
                  )}

                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{p.name}</p>
                        {p.title && <p className="text-xs text-gray-500 truncate">{p.title}</p>}
                      </div>
                      <Badge variant={p.isActive ? "default" : "secondary"} className="shrink-0 text-[10px]">
                        {p.isActive ? "مفعّل" : "معطّل"}
                      </Badge>
                    </div>

                    {/* Meta chips */}
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                        {TRIGGER_OPTIONS.find(t => t.value === p.triggerType)?.label ?? p.triggerType}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
                        {POSITION_OPTIONS.find(t => t.value === p.position)?.label ?? p.position}
                      </span>
                      {pagesArr.map(pg => (
                        <span key={pg} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium">
                          {PAGES_OPTIONS.find(o => o.value === pg)?.label ?? pg}
                        </span>
                      ))}
                    </div>

                    {/* Schedule */}
                    {(p.startDate || p.endDate) && (
                      <p className="text-[10px] text-gray-400">
                        {p.startDate ? `من ${new Date(p.startDate).toLocaleDateString("ar-EG")}` : ""}
                        {p.endDate ? ` حتى ${new Date(p.endDate).toLocaleDateString("ar-EG")}` : ""}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                      <button
                        onClick={() => toggleMut.mutate(p.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl text-xs font-bold transition-all ${p.isActive ? "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600" : "bg-primary/10 text-primary hover:bg-primary hover:text-white"}`}
                      >
                        {p.isActive ? <><PowerOff className="w-3.5 h-3.5" />تعطيل</> : <><Power className="w-3.5 h-3.5" />تفعيل</>}
                      </button>
                      <button onClick={() => openEdit(p)} className="h-8 w-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:border-primary/40 hover:text-primary transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { if (confirm("هل تريد حذف هذا البوب آب؟")) deleteMut.mutate(p.id); }}
                        className="h-8 w-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:border-red-200 hover:text-red-500 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create/Edit Modal ── */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editing ? "تعديل البوب آب" : "إنشاء بوب آب جديد"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              {/* Basic info */}
              <div className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">المعلومات الأساسية</h3>
                <div className="space-y-1.5">
                  <Label className="text-xs">اسم البوب آب (داخلي)</Label>
                  <Input value={form.name ?? ""} onChange={e => f("name", e.target.value)} placeholder="مثال: عرض رمضان" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">الصورة / البانر (رابط URL)</Label>
                  <Input value={form.imageUrl ?? ""} onChange={e => f("imageUrl", e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">العنوان</Label>
                  <Input value={form.title ?? ""} onChange={e => f("title", e.target.value)} placeholder="عنوان البوب آب" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">الوصف</Label>
                  <Textarea rows={2} value={form.description ?? ""} onChange={e => f("description", e.target.value)} placeholder="نص توضيحي..." />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">نص الزر (CTA)</Label>
                    <Input value={form.ctaText ?? ""} onChange={e => f("ctaText", e.target.value)} placeholder="اعرف أكثر" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">رابط الزر</Label>
                    <Input value={form.ctaLink ?? ""} onChange={e => f("ctaLink", e.target.value)} placeholder="/properties" />
                  </div>
                </div>
              </div>

              {/* Appearance */}
              <div className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">المظهر</h3>
                <ColorPicker label="لون الخلفية" value={form.bgColor ?? "#ffffff"} onChange={v => f("bgColor", v)} />
                <ColorPicker label="لون النص" value={form.textColor ?? "#111827"} onChange={v => f("textColor", v)} />
                <ColorPicker label="لون الزر" value={form.btnColor ?? "#0d9488"} onChange={v => f("btnColor", v)} />
                <ColorPicker label="لون نص الزر" value={form.btnTextColor ?? "#ffffff"} onChange={v => f("btnTextColor", v)} />
                <div className="space-y-1.5">
                  <Label className="text-xs">الشفافية (Overlay Opacity): {form.overlayOpacity ?? 50}%</Label>
                  <Slider min={0} max={100} step={5} value={[form.overlayOpacity ?? 50]}
                    onValueChange={([v]) => f("overlayOpacity", v)} className="my-1" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">تدوير الزوايا (Border Radius): {form.borderRadius ?? 12}px</Label>
                  <Slider min={0} max={32} step={2} value={[form.borderRadius ?? 12]}
                    onValueChange={([v]) => f("borderRadius", v)} className="my-1" />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              {/* Preview */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-700">معاينة مباشرة</Label>
                <PopupPreview form={form} />
              </div>

              {/* Layout */}
              <div className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">التخطيط والحجم</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">الحجم</Label>
                    <Select value={form.size ?? "md"} onValueChange={v => f("size", v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{SIZE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">مكان الظهور</Label>
                    <Select value={form.position ?? "center"} onValueChange={v => f("position", v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{POSITION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Trigger */}
              <div className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">طريقة الظهور</h3>
                <Select value={form.triggerType ?? "immediate"} onValueChange={v => f("triggerType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TRIGGER_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
                {form.triggerType === "delay" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">عدد الثواني: {form.triggerDelay ?? 3}ث</Label>
                    <Slider min={1} max={30} step={1} value={[form.triggerDelay ?? 3]}
                      onValueChange={([v]) => f("triggerDelay", v)} />
                  </div>
                )}
                {form.triggerType === "scroll" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">نسبة النزول: {form.triggerScrollPct ?? 50}%</Label>
                    <Slider min={10} max={100} step={5} value={[form.triggerScrollPct ?? 50]}
                      onValueChange={([v]) => f("triggerScrollPct", v)} />
                  </div>
                )}
              </div>

              {/* Pages */}
              <div className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">الصفحات</h3>
                <div className="grid grid-cols-2 gap-2">
                  {PAGES_OPTIONS.map(o => (
                    <label key={o.value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={pages.includes(o.value)} onCheckedChange={() => togglePage(o.value)} />
                      <span className="text-sm">{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Behavior */}
              <div className="space-y-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">السلوك والجدولة</h3>
                <div className="flex items-center gap-3">
                  <Switch checked={form.showCloseBtn !== false} onCheckedChange={v => f("showCloseBtn", v)} />
                  <Label className="text-sm">إظهار زر الإغلاق (X)</Label>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">عدم إظهاره مجدداً لمدة (أيام): {form.cookieDuration ?? 1} يوم</Label>
                  <Slider min={0} max={30} step={1} value={[form.cookieDuration ?? 1]}
                    onValueChange={([v]) => f("cookieDuration", v)} />
                  <p className="text-[10px] text-gray-400">0 = يظهر في كل زيارة</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">تاريخ البداية</Label>
                    <Input type="datetime-local" value={(form.startDate ?? "").replace("Z", "").slice(0, 16)}
                      onChange={e => f("startDate", e.target.value || null)} className="h-9 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">تاريخ الانتهاء</Label>
                    <Input type="datetime-local" value={(form.endDate ?? "").replace("Z", "").slice(0, 16)}
                      onChange={e => f("endDate", e.target.value || null)} className="h-9 text-xs" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={!!form.isActive} onCheckedChange={v => f("isActive", v)} />
                  <Label className="text-sm font-semibold">تفعيل البوب آب الآن</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-row-reverse">
            <Button onClick={save} disabled={isSaving} className="gap-2">
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "حفظ التعديلات" : "إنشاء"}
            </Button>
            <Button variant="outline" onClick={() => setShowModal(false)}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
