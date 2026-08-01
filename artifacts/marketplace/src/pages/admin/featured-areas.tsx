import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { api, type Region } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  MapPin, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  GripVertical, Image as ImageIcon, Building2, Eye, EyeOff,
  Upload, X,
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

const EMPTY: { nameAr: string; image: string; cityName: string; displayOrder: number; enabled: boolean } = {
  nameAr: "",
  image: "",
  cityName: "",
  displayOrder: 0,
  enabled: true,
};

export default function AdminFeaturedAreas() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editing, setEditing] = useState<FeaturedArea | null>(null);
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ["admin-featured-areas"],
    queryFn: api.featuredAreas.adminList,
  });

  // Load all regions → flatten to a simple area list for the dropdown
  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ["regions"],
    queryFn: api.regions.list,
  });
  const allAreas = regions.flatMap(r => r.cities.flatMap(c => c.areas ?? []))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"));

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
    setImagePreview("");
    setImageFile(null);
    setModalOpen(true);
  };

  const openEdit = (area: FeaturedArea) => {
    setEditing(area);
    setForm({ nameAr: area.nameAr, image: area.image ?? "", cityName: area.cityName ?? "", displayOrder: area.displayOrder, enabled: area.enabled });
    setImagePreview(area.image ?? "");
    setImageFile(null);
    setModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview("");
    setForm(f => ({ ...f, image: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!form.nameAr.trim()) { toast.error("اسم المنطقة مطلوب"); return; }
    let imageUrl = form.image;
    // Upload new file if selected
    if (imageFile) {
      setUploading(true);
      try {
        const result = await api.upload.featuredAreaImage(imageFile);
        imageUrl = result.url;
      } catch {
        toast.error("فشل رفع الصورة");
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    const payload = { ...form, image: imageUrl || null, cityName: form.cityName || null };
    if (editing) updateMut.mutate({ id: editing.id, d: payload as any });
    else createMut.mutate(payload as any);
  };

  const isBusy = createMut.isPending || updateMut.isPending || uploading;

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
              {/* Area dropdown */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">المنطقة *</Label>
                <select
                  value={form.nameAr}
                  onChange={e => setForm(f => ({ ...f, nameAr: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">-- اختر منطقة --</option>
                  {allAreas.map(area => (
                    <option key={area.id} value={area.nameAr}>{area.nameAr}</option>
                  ))}
                </select>
              </div>

              {/* Image upload */}
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">صورة المنطقة</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {imagePreview ? (
                  <div className="relative h-36 rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={clearImage}
                      className="absolute top-2 left-2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-all"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 left-2 px-3 py-1.5 bg-black/60 hover:bg-black/80 rounded-lg text-white text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      تغيير الصورة
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-28 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary/50 bg-gray-50 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 transition-all"
                  >
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-gray-500">اضغط لرفع صورة</span>
                    <span className="text-xs text-gray-400">JPG, PNG, WebP — حتى 10 ميجا</span>
                  </button>
                )}
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
