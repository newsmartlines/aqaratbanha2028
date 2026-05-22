import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  ArrowRight, Building2, Save, Loader2, AlertTriangle,
  CheckCircle2, Image as ImageIcon, X,
} from "lucide-react";
import UserLayout from "@/components/UserLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const LISTING_TYPES = [
  { value: "sale", label: "للبيع" },
  { value: "rent", label: "للإيجار" },
];
const MAIN_CATEGORIES = [
  { value: "residential", label: "سكني" },
  { value: "land", label: "أرض" },
  { value: "commercial", label: "تجاري" },
];
const FINISHING_OPTIONS = [
  { value: "fully_finished", label: "تشطيب كامل" },
  { value: "semi_finished", label: "نصف تشطيب" },
  { value: "core_shell", label: "هيكل عظمي" },
];

export default function EditPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: propData, isLoading: loadingProp } = useQuery({
    queryKey: ["property", id],
    queryFn: () => api.properties.get(parseInt(id!)),
    enabled: !!id,
  });

  const prop = propData as any;

  const [form, setForm] = useState({
    title: "",
    address: "",
    district: "",
    price: "",
    area: "",
    rooms: "",
    bathrooms: "",
    floor: "",
    description: "",
    listingType: "sale",
    mainCategory: "residential",
    finishing: "",
  });
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  useEffect(() => {
    if (!prop) return;
    setForm({
      title: prop.title ?? "",
      address: prop.address ?? "",
      district: prop.district ?? "",
      price: prop.price ?? "",
      area: prop.area ?? "",
      rooms: prop.rooms != null ? String(prop.rooms) : "",
      bathrooms: prop.bathrooms != null ? String(prop.bathrooms) : "",
      floor: prop.floor != null ? String(prop.floor) : "",
      description: prop.description ?? "",
      listingType: prop.listingType ?? "sale",
      mainCategory: prop.mainCategory ?? "residential",
      finishing: prop.finishing ?? "",
    });
    try {
      const imgs = JSON.parse(prop.images ?? "[]");
      setImages(Array.isArray(imgs) ? imgs : []);
    } catch {
      if (prop.images) setImages([prop.images]);
    }
  }, [prop]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.properties.update(parseInt(id!), data),
    onSuccess: (result: any) => {
      const updated = result?.data ?? result;
      const wasPublished = prop?.status === "approved";
      queryClient.invalidateQueries({ queryKey: ["user-properties"] });
      queryClient.invalidateQueries({ queryKey: ["property", id] });
      if (wasPublished && updated?.status === "pending") {
        toast.success("تم حفظ التعديلات. سيُعاد مراجعة عقارك من قِبل الإدارة قبل النشر.", { duration: 4500 });
      } else {
        toast.success("تم حفظ التعديلات بنجاح");
      }
      navigate("/user/my-properties");
    },
    onError: () => toast.error("فشل حفظ التعديلات"),
  });

  const handleSave = () => {
    if (!form.title.trim()) {
      toast.error("عنوان العقار مطلوب");
      return;
    }
    updateMutation.mutate({
      ...form,
      rooms: form.rooms ? parseInt(form.rooms) : null,
      bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
      floor: form.floor ? parseInt(form.floor) : null,
      price: form.price || null,
      images: images,
    });
  };

  const addImage = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    if (!url.startsWith("http")) { toast.error("أدخل رابط صورة صالح يبدأ بـ http"); return; }
    setImages(prev => [...prev, url]);
    setNewImageUrl("");
  };

  if (!user) return null;

  if (loadingProp) {
    return (
      <UserLayout>
        <div className="p-6 flex items-center justify-center min-h-64">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      </UserLayout>
    );
  }

  if (!prop) {
    return (
      <UserLayout>
        <div className="p-6 text-center text-muted-foreground">
          لم يتم العثور على العقار
        </div>
      </UserLayout>
    );
  }

  const wasPublished = prop.status === "approved";

  return (
    <UserLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/user/my-properties")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-teal-700 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            عقاراتي
          </button>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm font-medium text-slate-700">تعديل العقار</span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              تعديل الإعلان
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{prop.title}</p>
          </div>
          {prop.status && (
            <Badge
              variant="outline"
              className={
                prop.status === "approved"
                  ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                  : prop.status === "rejected"
                  ? "text-red-700 border-red-200 bg-red-50"
                  : "text-amber-700 border-amber-200 bg-amber-50"
              }
            >
              {prop.status === "approved" ? "معتمد" : prop.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
            </Badge>
          )}
        </div>

        {/* Re-review notice for published properties */}
        {wasPublished && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">تنبيه: سيُعاد فحص عقارك بعد الحفظ</p>
              <p className="text-xs mt-0.5 text-amber-700">
                بعد حفظ التعديلات، يُحوَّل العقار إلى "قيد المراجعة" ريثما تتمّ الموافقة عليه من الإدارة مجدداً.
              </p>
            </div>
          </div>
        )}

        {/* Rejected notice */}
        {prop.status === "rejected" && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">بعد التعديل، سيُرسل إعلانك للمراجعة مجدداً</p>
              <p className="text-xs mt-0.5 text-blue-700">
                راجع بيانات العقار وأجرِ التعديلات اللازمة، ثم احفظ لإعادة التقديم.
              </p>
            </div>
          </div>
        )}

        {/* Basic info */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">المعلومات الأساسية</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>عنوان الإعلان <span className="text-red-500">*</span></Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="مثال: شقة 3 غرف بحي النصر"
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>نوع الصفقة</Label>
                <Select value={form.listingType} onValueChange={v => setForm(f => ({ ...f, listingType: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LISTING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>نوع العقار</Label>
                <Select value={form.mainCategory} onValueChange={v => setForm(f => ({ ...f, mainCategory: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MAIN_CATEGORIES.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>السعر (ج.م)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="مثال: 1500000"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>المساحة (م²)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.area}
                  onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
                  placeholder="مثال: 150"
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>غرف النوم</Label>
                <Input type="number" min={0} value={form.rooms} onChange={e => setForm(f => ({ ...f, rooms: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>الحمامات</Label>
                <Input type="number" min={0} value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>الدور</Label>
                <Input type="number" min={0} value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} className="rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>التشطيب</Label>
              <Select value={form.finishing} onValueChange={v => setForm(f => ({ ...f, finishing: v }))}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="اختر نوع التشطيب" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">غير محدد</SelectItem>
                  {FINISHING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">الموقع</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>الحي / المنطقة</Label>
                <Input value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="مثال: حي النصر" className="rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label>العنوان التفصيلي</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="مثال: شارع الجيش، بنها" className="rounded-xl" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-teal-600" />
              صور العقار
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden border border-border/50 aspect-video bg-muted">
                    <img src={img} alt="" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
                    {i === 0 && (
                      <span className="absolute bottom-1 right-1 bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">غلاف</span>
                    )}
                    <button
                      onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 left-1 w-5 h-5 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newImageUrl}
                onChange={e => setNewImageUrl(e.target.value)}
                placeholder="الصق رابط صورة (https://...)"
                className="rounded-xl flex-1 text-sm"
                onKeyDown={e => e.key === "Enter" && addImage()}
              />
              <Button variant="outline" size="sm" className="rounded-xl shrink-0" onClick={addImage}>
                إضافة
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">وصف العقار</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="أكتب وصفاً تفصيلياً عن العقار، مميزاته، موقعه، والخدمات القريبة منه..."
              className="rounded-xl min-h-28 resize-none"
              rows={5}
            />
          </CardContent>
        </Card>

        {/* Save actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => navigate("/user/my-properties")}
          >
            إلغاء
          </Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl gap-2 px-8"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ الحفظ...</>
            ) : (
              <><Save className="w-4 h-4" /> حفظ التعديلات</>
            )}
          </Button>
        </div>

      </div>
    </UserLayout>
  );
}
