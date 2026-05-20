import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2, Loader2, Save, ArrowRight, ExternalLink,
  MapPin, DollarSign, Home, BedDouble, Bath, Maximize2,
} from "lucide-react";
import { api, type Category } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";

type DbProperty = {
  id: number;
  providerId: number;
  title: string;
  description: string | null;
  mainCategory: string;
  listingType: string;
  subCategory: string | null;
  price: string | null;
  area: string | null;
  rooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  buildYear: number | null;
  finishing: string | null;
  condition: string | null;
  furnished: string | null;
  direction: string | null;
  paymentMethod: string | null;
  featured: boolean;
  status: string;
  address: string | null;
  district: string | null;
  images: string | null;
  videoUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  latitude: string | null;
  longitude: string | null;
  features: string | null;
};

const MAIN_CATEGORIES = [
  { value: "residential", label: "سكني" },
  { value: "land", label: "أراضي" },
  { value: "commercial", label: "تجاري" },
];
const LISTING_TYPES = [
  { value: "sale", label: "للبيع" },
  { value: "rent", label: "للإيجار" },
];
const FINISHING_OPTS = ["تشطيب كامل", "نصف تشطيب", "بدون تشطيب", "فندقي", "لوكس"];
const CONDITION_OPTS = ["جديد", "ممتاز", "جيد", "يحتاج صيانة"];
const FURNISHED_OPTS = ["مفروشة", "نصف مفروشة", "غير مفروشة"];
const DIRECTION_OPTS = ["شمالي", "جنوبي", "شرقي", "غربي", "شمالي شرقي", "شمالي غربي", "جنوبي شرقي", "جنوبي غربي"];
const PAYMENT_OPTS = ["نقداً", "تقسيط", "نقداً أو تقسيط"];
const STATUS_OPTS = [
  { value: "published", label: "منشور" },
  { value: "pending", label: "قيد المراجعة" },
  { value: "rejected", label: "مرفوض" },
];

function getFirstImage(images: string | null): string {
  if (!images) return "";
  try {
    const arr = JSON.parse(images);
    if (Array.isArray(arr) && arr.length > 0) return arr[0];
  } catch {}
  if (typeof images === "string" && images.startsWith("http")) return images;
  return "";
}

function getAllImages(images: string | null): string {
  if (!images) return "";
  try {
    const arr = JSON.parse(images);
    if (Array.isArray(arr)) return arr.join("\n");
  } catch {}
  return images;
}

function parseImagesInput(val: string): string | null {
  const lines = val.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  return JSON.stringify(lines);
}

function parseFeatures(val: string): string | null {
  const lines = val.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  return JSON.stringify(lines);
}

function getFeaturesStr(features: string | null): string {
  if (!features) return "";
  try {
    const arr = JSON.parse(features);
    if (Array.isArray(arr)) return arr.join("\n");
  } catch {}
  return features;
}

export default function AdminPropertyEdit() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const id = parseInt(params.id ?? "0");

  const { data: reCategories = [] } = useQuery<Category[]>({
    queryKey: ["re-categories"],
    queryFn: () => api.categories.listByType("real_estate"),
    staleTime: 5 * 60 * 1000,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    address: "",
    district: "",
    price: "",
    listingType: "sale",
    mainCategory: "residential",
    subCategory: "",
    rooms: "",
    bathrooms: "",
    area: "",
    floor: "",
    totalFloors: "",
    buildYear: "",
    finishing: "",
    condition: "",
    furnished: "",
    direction: "",
    paymentMethod: "",
    description: "",
    imagesRaw: "",
    videoUrl: "",
    phone: "",
    whatsapp: "",
    latitude: "",
    longitude: "",
    featuresRaw: "",
    status: "pending",
    featured: false,
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.properties.get(id)
      .then((res: unknown) => {
        const d = (res as { data?: DbProperty; success?: boolean }) ;
        const p: DbProperty = (d?.data ?? res) as DbProperty;
        setForm({
          title: p.title ?? "",
          address: p.address ?? "",
          district: p.district ?? "",
          price: p.price ?? "",
          listingType: p.listingType ?? "للبيع",
          mainCategory: p.mainCategory ?? "شقة",
          subCategory: p.subCategory ?? "",
          rooms: p.rooms != null ? String(p.rooms) : "",
          bathrooms: p.bathrooms != null ? String(p.bathrooms) : "",
          area: p.area ?? "",
          floor: p.floor != null ? String(p.floor) : "",
          totalFloors: p.totalFloors != null ? String(p.totalFloors) : "",
          buildYear: p.buildYear != null ? String(p.buildYear) : "",
          finishing: p.finishing ?? "",
          condition: p.condition ?? "",
          furnished: p.furnished ?? "",
          direction: p.direction ?? "",
          paymentMethod: p.paymentMethod ?? "",
          description: p.description ?? "",
          imagesRaw: getAllImages(p.images),
          videoUrl: p.videoUrl ?? "",
          phone: p.phone ?? "",
          whatsapp: p.whatsapp ?? "",
          latitude: p.latitude ?? "",
          longitude: p.longitude ?? "",
          featuresRaw: getFeaturesStr(p.features),
          status: p.status ?? "pending",
          featured: p.featured ?? false,
        });
      })
      .catch(() => toast.error("فشل تحميل بيانات العقار"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!form.title) { toast.error("العنوان مطلوب"); return; }
    setSaving(true);
    try {
      await api.properties.update(id, {
        title: form.title,
        address: form.address || null,
        district: form.district || null,
        price: form.price || null,
        listingType: form.listingType,
        mainCategory: form.mainCategory,
        subCategory: form.subCategory || null,
        rooms: form.rooms ? parseInt(form.rooms) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
        area: form.area || null,
        floor: form.floor ? parseInt(form.floor) : null,
        totalFloors: form.totalFloors ? parseInt(form.totalFloors) : null,
        buildYear: form.buildYear ? parseInt(form.buildYear) : null,
        finishing: form.finishing || null,
        condition: form.condition || null,
        furnished: form.furnished || null,
        direction: form.direction || null,
        paymentMethod: form.paymentMethod || null,
        description: form.description || null,
        images: parseImagesInput(form.imagesRaw),
        videoUrl: form.videoUrl || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
        features: parseFeatures(form.featuresRaw),
        status: form.status,
        featured: form.featured,
      });
      toast.success("تم حفظ التعديلات بنجاح");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  const f = form;
  const setF = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  if (loading) {
    return (
      <AdminLayout title="تعديل العقار">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`تعديل العقار #${id}`}>

      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setLocation("/admin/properties")}>
            <ArrowRight className="w-4 h-4" />
            العودة للقائمة
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-teal-700" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">{form.title || "عقار جديد"}</p>
              <p className="text-xs text-slate-400 mt-0.5">#{id}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm" className="gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => window.open(`/property/${id}`, "_blank")}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            عرض الإعلان
          </Button>
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 gap-1.5"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ التعديلات
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Main Info */}
        <div className="lg:col-span-2 space-y-6">

          {/* Basic Info */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="w-4 h-4 text-teal-600" />
                المعلومات الأساسية
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2 grid gap-1.5">
                <Label>عنوان الإعلان <span className="text-red-500">*</span></Label>
                <Input value={f.title} onChange={e => setF({ title: e.target.value })} placeholder="شقة فاخرة في الزمالك" />
              </div>
              <div className="grid gap-1.5">
                <Label>نوع الصفقة</Label>
                <Select value={f.listingType} onValueChange={v => setF({ listingType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LISTING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>نوع العقار</Label>
                <Select value={f.mainCategory} onValueChange={v => setF({ mainCategory: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {reCategories.length > 0
                      ? reCategories.map(c => <SelectItem key={c.slug ?? c.id} value={c.slug ?? String(c.id)}>{c.nameAr}</SelectItem>)
                      : MAIN_CATEGORIES.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 grid gap-1.5">
                <Label>التصنيف الفرعي</Label>
                <Input value={f.subCategory} onChange={e => setF({ subCategory: e.target.value })} placeholder="مثال: شقة روف، استوديو..." />
              </div>
            </CardContent>
          </Card>

          {/* Specs */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-teal-600" />
                المواصفات
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <Label className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />غرف النوم</Label>
                <Input type="number" min={0} value={f.rooms} onChange={e => setF({ rooms: e.target.value })} placeholder="3" />
              </div>
              <div className="grid gap-1.5">
                <Label className="flex items-center gap-1"><Bath className="w-3.5 h-3.5" />الحمامات</Label>
                <Input type="number" min={0} value={f.bathrooms} onChange={e => setF({ bathrooms: e.target.value })} placeholder="2" />
              </div>
              <div className="grid gap-1.5">
                <Label className="flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5" />المساحة م²</Label>
                <Input type="number" min={0} value={f.area} onChange={e => setF({ area: e.target.value })} placeholder="150" />
              </div>
              <div className="grid gap-1.5">
                <Label>الطابق</Label>
                <Input type="number" min={0} value={f.floor} onChange={e => setF({ floor: e.target.value })} placeholder="3" />
              </div>
              <div className="grid gap-1.5">
                <Label>إجمالي الطوابق</Label>
                <Input type="number" min={0} value={f.totalFloors} onChange={e => setF({ totalFloors: e.target.value })} placeholder="10" />
              </div>
              <div className="grid gap-1.5">
                <Label>سنة البناء</Label>
                <Input type="number" value={f.buildYear} onChange={e => setF({ buildYear: e.target.value })} placeholder="2020" />
              </div>
              <div className="grid gap-1.5">
                <Label>التشطيب</Label>
                <Select value={f.finishing} onValueChange={v => setF({ finishing: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">غير محدد</SelectItem>
                    {FINISHING_OPTS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>الحالة</Label>
                <Select value={f.condition} onValueChange={v => setF({ condition: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">غير محدد</SelectItem>
                    {CONDITION_OPTS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>التأثيث</Label>
                <Select value={f.furnished} onValueChange={v => setF({ furnished: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">غير محدد</SelectItem>
                    {FURNISHED_OPTS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>الاتجاه</Label>
                <Select value={f.direction} onValueChange={v => setF({ direction: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">غير محدد</SelectItem>
                    {DIRECTION_OPTS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>طريقة الدفع</Label>
                <Select value={f.paymentMethod} onValueChange={v => setF({ paymentMethod: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">غير محدد</SelectItem>
                    {PAYMENT_OPTS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Description + Features */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">الوصف والمميزات</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>وصف العقار</Label>
                <Textarea
                  value={f.description}
                  onChange={e => setF({ description: e.target.value })}
                  placeholder="وصف تفصيلي عن العقار..."
                  rows={4}
                  className="resize-none"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>المميزات والمرافق (كل ميزة في سطر)</Label>
                <Textarea
                  value={f.featuresRaw}
                  onChange={e => setF({ featuresRaw: e.target.value })}
                  placeholder={"مسبح\nحارس أمن\nموقف سيارات\nتكييف مركزي"}
                  rows={4}
                  className="resize-none"
                  dir="rtl"
                />
              </div>
            </CardContent>
          </Card>

          {/* Images + Video */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">الصور والفيديو</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>روابط الصور (كل رابط في سطر)</Label>
                <Textarea
                  value={f.imagesRaw}
                  onChange={e => setF({ imagesRaw: e.target.value })}
                  placeholder={"https://example.com/img1.jpg\nhttps://example.com/img2.jpg"}
                  rows={4}
                  className="resize-none text-sm"
                  dir="ltr"
                />
                <p className="text-xs text-slate-400">الصورة الأولى ستكون الغلاف الرئيسي</p>
              </div>
              {getFirstImage(parseImagesInput(f.imagesRaw)) && (
                <div className="w-full h-40 rounded-xl overflow-hidden border border-slate-200">
                  <img
                    src={getFirstImage(parseImagesInput(f.imagesRaw))}
                    alt="معاينة"
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                </div>
              )}
              <div className="grid gap-1.5">
                <Label>رابط الفيديو (YouTube أو مباشر)</Label>
                <Input value={f.videoUrl} onChange={e => setF({ videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." dir="ltr" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Location + Contact + Settings */}
        <div className="space-y-6">

          {/* Status & Featured */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">الحالة والتمييز</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>حالة الإعلان</Label>
                <Select value={f.status} onValueChange={v => setF({ status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <input
                  id="featured-edit"
                  type="checkbox"
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                  checked={f.featured}
                  onChange={e => setF({ featured: e.target.checked })}
                />
                <Label htmlFor="featured-edit" className="cursor-pointer font-semibold text-amber-800">⭐ إعلان مميز</Label>
              </div>
              <Button
                className="w-full bg-teal-600 hover:bg-teal-700 gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ التعديلات
              </Button>
            </CardContent>
          </Card>

          {/* Price */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-teal-600" />
                السعر
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>السعر (ج.م)</Label>
                <Input type="number" min={0} value={f.price} onChange={e => setF({ price: e.target.value })} placeholder="1500000" />
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-600" />
                الموقع
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>العنوان الكامل</Label>
                <Input value={f.address} onChange={e => setF({ address: e.target.value })} placeholder="الزمالك، القاهرة" />
              </div>
              <div className="grid gap-1.5">
                <Label>الحي / المنطقة</Label>
                <Input value={f.district} onChange={e => setF({ district: e.target.value })} placeholder="الزمالك" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label>خط العرض</Label>
                  <Input value={f.latitude} onChange={e => setF({ latitude: e.target.value })} placeholder="30.0444" dir="ltr" />
                </div>
                <div className="grid gap-1.5">
                  <Label>خط الطول</Label>
                  <Input value={f.longitude} onChange={e => setF({ longitude: e.target.value })} placeholder="31.2357" dir="ltr" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">بيانات التواصل</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>رقم الهاتف</Label>
                <Input value={f.phone} onChange={e => setF({ phone: e.target.value })} placeholder="+201000000000" dir="ltr" />
              </div>
              <div className="grid gap-1.5">
                <Label>واتساب</Label>
                <Input value={f.whatsapp} onChange={e => setF({ whatsapp: e.target.value })} placeholder="+201000000000" dir="ltr" />
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </AdminLayout>
  );
}
