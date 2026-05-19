import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  MapPin, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  GripVertical, Image as ImageIcon, Building2, Eye, EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";

type FeaturedArea = {
  id: number;
  nameAr: string;
  image: string | null;
  cityName: string | null;
  displayOrder: number;
  enabled: boolean;
  propertyCount: number;
};

const EMPTY: Omit<FeaturedArea, "id" | "propertyCount"> = {
  nameAr: "",
  image: "",
  cityName: "",
  displayOrder: 0,
  enabled: true,
};

const PLACEHOLDER_IMGS = [
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=280&fit=crop",
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&h=280&fit=crop",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=280&fit=crop",
  "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=400&h=280&fit=crop",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=280&fit=crop",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=280&fit=crop",
];

export default function AdminFeaturedAreas() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<FeaturedArea | null>(null);
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ["admin-featured-areas"],
    queryFn: api.featuredAreas.adminList,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-featured-areas"] });

  const createMut = useMutation({
    mutationFn: (d: typeof EMPTY) => api.featuredAreas.create(d),
    onSuccess: () => { invalidate(); setModalOpen(false); toast.success("تمت الإضافة"); },
    onError: () => toast.error("حدث خطأ"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, d }: { id: number; d: typeof EMPTY }) => api.featuredAreas.update(id, d),
    onSuccess: () => { invalidate(); setModalOpen(false); toast.success("تم التحديث"); },
    onError: () => toast.error("حدث خطأ"),
  });

  const toggleMut = useMutation({
    mutationFn: (id: number) => api.featuredAreas.toggle(id),
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api.featuredAreas.delete(id),
    onSuccess: () => { invalidate(); setDeleteId(null); toast.success("تم الحذف"); },
    onError: () => toast.error("حدث خطأ"),
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setModalOpen(true);
  };

  const openEdit = (area: FeaturedArea) => {
    setEditing(area);
    setForm({ nameAr: area.nameAr, image: area.image ?? "", cityName: area.cityName ?? "", displayOrder: area.displayOrder, enabled: area.enabled });
    setModalOpen(true);
  };

  const handleSubmit = () => {
    if (!form.nameAr.trim()) { toast.error("اسم المنطقة مطلوب"); return; }
    const payload = { ...form, image: form.image || null, cityName: form.cityName || null };
    if (editing) updateMut.mutate({ id: editing.id, d: payload as any });
    else createMut.mutate(payload as any);
  };

  const isBusy = createMut.isPending || updateMut.isPending;

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary" />
              أهم المناطق
            </h1>
            <p className="text-sm text-gray-500 mt-1">تحكم في المناطق التي تظهر في الصفحة الرئيسية</p>
          </div>
          <Button onClick={openAdd} className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" />
            إضافة منطقة
          </Button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "إجمالي المناطق", value: areas.length, color: "bg-blue-50 text-blue-700" },
            { label: "مفعّلة", value: areas.filter(a => a.enabled).length, color: "bg-emerald-50 text-emerald-700" },
            { label: "إجمالي العقارات", value: areas.reduce((s, a) => s + a.propertyCount, 0), color: "bg-primary/10 text-primary" },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick image suggestions */}
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex gap-2 items-start">
          <ImageIcon className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>تلميح:</strong> يمكنك استخدام أي رابط صورة من الإنترنت (Unsplash, Google Images...) أو رفع صورة عبر مدير المرفقات ونسخ الرابط.
          </span>
        </div>

        {/* Areas grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-52 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : areas.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <MapPin className="w-8 h-8 text-gray-300" />
            </div>
            <div>
              <p className="font-semibold text-gray-600">لا توجد مناطق مضافة بعد</p>
              <p className="text-sm text-gray-400 mt-1">أضف أول منطقة لتظهر في الصفحة الرئيسية</p>
            </div>
            <Button onClick={openAdd} variant="outline" className="gap-2 rounded-xl">
              <Plus className="w-4 h-4" />
              إضافة منطقة
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {areas.map((area) => (
              <div
                key={area.id}
                className={`group relative rounded-2xl overflow-hidden border-2 transition-all duration-200
                  ${area.enabled ? "border-transparent hover:border-primary/30" : "border-gray-200 opacity-60"}`}
              >
                {/* Image */}
                <div className="relative h-44 bg-gray-100">
                  {area.image ? (
                    <img
                      src={area.image}
                      alt={area.nameAr}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                      <ImageIcon className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Actions overlay */}
                  <div className="absolute top-3 left-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(area)}
                      className="w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5 text-gray-700" />
                    </button>
                    <button
                      onClick={() => toggleMut.mutate(area.id)}
                      className="w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow transition-all"
                    >
                      {area.enabled
                        ? <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                    </button>
                    <button
                      onClick={() => setDeleteId(area.id)}
                      className="w-8 h-8 bg-white/90 hover:bg-red-500 hover:text-white rounded-full flex items-center justify-center shadow transition-all text-gray-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Status badge */}
                  {!area.enabled && (
                    <div className="absolute top-3 right-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-800/70 text-white rounded-full">مخفية</span>
                    </div>
                  )}

                  {/* Bottom info */}
                  <div className="absolute bottom-0 right-0 left-0 p-3">
                    <p className="text-white font-bold text-base leading-tight">{area.nameAr}</p>
                    {area.cityName && (
                      <p className="text-white/70 text-xs mt-0.5">{area.cityName}</p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-white px-3 py-2 flex items-center justify-between border-t border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm font-semibold text-gray-700">{area.propertyCount} عقار</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <GripVertical className="w-3 h-3" />
                    ترتيب: {area.displayOrder}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit Modal */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                {editing ? "تعديل المنطقة" : "إضافة منطقة جديدة"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Name */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">اسم المنطقة *</Label>
                <Input
                  value={form.nameAr}
                  onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))}
                  placeholder="مثال: بنها، شبرا الخيمة، القناطر الخيرية"
                  className="text-right"
                />
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">المدينة / المحافظة (اختياري)</Label>
                <Input
                  value={form.cityName}
                  onChange={e => setForm(f => ({ ...f, cityName: e.target.value }))}
                  placeholder="مثال: القليوبية"
                  className="text-right"
                />
              </div>

              {/* Image URL */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">رابط الصورة</Label>
                <Input
                  value={form.image}
                  onChange={e => setForm(f => ({ ...f, image: e.target.value }))}
                  placeholder="https://..."
                  className="text-left ltr"
                  dir="ltr"
                />
                {/* Preview */}
                {form.image && (
                  <div className="h-24 rounded-xl overflow-hidden bg-gray-100 mt-1">
                    <img
                      src={form.image}
                      alt="preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  </div>
                )}
                {/* Suggested images */}
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">أو اختر صورة سريعة:</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PLACEHOLDER_IMGS.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setForm(f => ({ ...f, image: url }))}
                        className={`h-14 rounded-lg overflow-hidden border-2 transition-all ${form.image === url ? "border-primary" : "border-transparent hover:border-gray-300"}`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order + Enabled */}
              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-sm font-semibold">الترتيب</Label>
                  <Input
                    type="number"
                    value={form.displayOrder}
                    onChange={e => setForm(f => ({ ...f, displayOrder: Number(e.target.value) }))}
                    className="text-center"
                    min={0}
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-sm font-semibold">الحالة</Label>
                  <button
                    onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
                    className={`w-full h-10 rounded-lg border flex items-center justify-center gap-2 text-sm font-semibold transition-all
                      ${form.enabled ? "bg-emerald-50 border-emerald-300 text-emerald-700" : "bg-gray-50 border-gray-200 text-gray-500"}`}
                  >
                    {form.enabled
                      ? <><ToggleRight className="w-4 h-4" /> مفعّلة</>
                      : <><ToggleLeft className="w-4 h-4" /> مخفية</>}
                  </button>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 flex-row-reverse">
              <Button onClick={handleSubmit} disabled={isBusy} className="flex-1 rounded-xl">
                {isBusy ? "جارٍ الحفظ..." : editing ? "حفظ التعديلات" : "إضافة المنطقة"}
              </Button>
              <Button variant="outline" onClick={() => setModalOpen(false)} className="flex-1 rounded-xl">
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
          <DialogContent className="sm:max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right">تأكيد الحذف</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-600 text-right">
              هل أنت متأكد من حذف هذه المنطقة؟ لن تظهر في الصفحة الرئيسية.
            </p>
            <DialogFooter className="gap-2 flex-row-reverse">
              <Button
                variant="destructive"
                onClick={() => deleteId && deleteMut.mutate(deleteId)}
                disabled={deleteMut.isPending}
                className="flex-1 rounded-xl"
              >
                {deleteMut.isPending ? "جارٍ الحذف..." : "حذف"}
              </Button>
              <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1 rounded-xl">
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
