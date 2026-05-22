import { useState } from "react";
import { useLocation } from "wouter";
import {
  Building2,
  Home,
  Warehouse,
  Briefcase,
  ShoppingBag,
  Trees,
  ChevronLeft,
  MapPin,
  Phone,
  MessageCircle,
  ImagePlus,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import UserLayout from "@/components/UserLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const PROPERTY_TYPES = [
  { value: "شقة", label: "شقة", icon: Home },
  { value: "فيلا", label: "فيلا", icon: Building2 },
  { value: "أرض", label: "أرض", icon: Trees },
  { value: "مكتب", label: "مكتب", icon: Briefcase },
  { value: "محل تجاري", label: "محل تجاري", icon: ShoppingBag },
  { value: "مستودع", label: "مستودع", icon: Warehouse },
  { value: "عمارة", label: "عمارة", icon: Building2 },
  { value: "استراحة", label: "استراحة", icon: Home },
];

const CITIES = [
  "القاهرة", "الجيزة", "الإسكندرية", "بنها", "شبرا الخيمة",
  "المنصورة", "طنطا", "أسيوط", "السويس", "الإسماعيلية",
  "دمياط", "بورسعيد", "الزقازيق", "المنوفية", "الفيوم",
];

const FINISHING = [
  { value: "super_lux", label: "سوبر لوكس" },
  { value: "lux", label: "لوكس" },
  { value: "semi_finished", label: "نصف تشطيب" },
  { value: "unfinished", label: "بدون تشطيب" },
];

export default function AddPropertyPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    listingType: "",
    mainCategory: "",
    title: "",
    description: "",
    price: "",
    area: "",
    rooms: "",
    bathrooms: "",
    floor: "",
    finishing: "",
    address: "",
    district: "",
    city: "",
    phone: "",
    whatsapp: "",
    advertiserType: "owner",
    paymentMethod: "",
    furnished: "",
  });

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canProceed = () => {
    if (step === 1) return !!form.listingType && !!form.mainCategory;
    if (step === 2) return !!form.title && !!form.area;
    if (step === 3) return !!form.city;
    if (step === 4) return !!form.phone;
    return true;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.userProperties.create({
        listingType: form.listingType,
        mainCategory: form.mainCategory,
        title: form.title,
        description: form.description || undefined,
        price: form.price || undefined,
        area: form.area || undefined,
        rooms: form.rooms ? parseInt(form.rooms) : undefined,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : undefined,
        floor: form.floor ? parseInt(form.floor) : undefined,
        finishing: form.finishing || undefined,
        address: form.address || undefined,
        district: form.district || undefined,
        cityId: undefined,
        phone: form.phone || undefined,
        whatsapp: form.whatsapp || undefined,
        advertiserType: form.advertiserType,
        paymentMethod: form.paymentMethod || undefined,
        furnished: form.furnished || undefined,
        status: "pending",
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message ?? "حدث خطأ أثناء إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <UserLayout>
        <div className="p-6 max-w-xl mx-auto mt-8">
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/50 text-center p-8">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-green-800 dark:text-green-400 mb-2">تم إرسال إعلانك بنجاح!</h2>
            <p className="text-green-700/80 dark:text-green-400/70 text-sm mb-6">
              سيتم مراجعة إعلانك من قبل الفريق ونشره خلال 24 ساعة. ستصلك إشعار عند الموافقة.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => setLocation("/user/my-properties")} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl">
                عرض عقاراتي
              </Button>
              <Button variant="outline" onClick={() => { setSuccess(false); setStep(1); setForm({ listingType: "", mainCategory: "", title: "", description: "", price: "", area: "", rooms: "", bathrooms: "", floor: "", finishing: "", address: "", district: "", city: "", phone: "", whatsapp: "", advertiserType: "owner", paymentMethod: "", furnished: "" }); }} className="rounded-xl">
                إضافة عقار آخر
              </Button>
            </div>
          </Card>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="p-6 max-w-2xl mx-auto">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : setLocation("/user/dashboard")}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold">أضف عقارك</h1>
            <p className="text-xs text-muted-foreground">الخطوة {step} من 4</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? "bg-teal-600" : "bg-border"}`}
            />
          ))}
        </div>

        {/* Step 1: نوع الإعلان والعقار */}
        {step === 1 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" />
                نوع الإعلان والعقار
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Listing type */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">نوع الإعلان <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "sale", label: "للبيع", icon: "🏷️" },
                    { value: "rent", label: "للإيجار", icon: "🔑" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("listingType", opt.value)}
                      className={`p-4 rounded-xl border-2 text-center transition-all font-medium ${
                        form.listingType === opt.value
                          ? "border-teal-600 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400"
                          : "border-border hover:border-teal-300 hover:bg-secondary/50"
                      }`}
                    >
                      <span className="text-2xl block mb-1">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Property category */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">نوع العقار <span className="text-red-500">*</span></Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PROPERTY_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => set("mainCategory", type.value)}
                      className={`p-3 rounded-xl border-2 text-center transition-all flex flex-col items-center gap-1.5 ${
                        form.mainCategory === type.value
                          ? "border-teal-600 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400"
                          : "border-border hover:border-teal-300 hover:bg-secondary/50"
                      }`}
                    >
                      <type.icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Advertiser type */}
              <div>
                <Label className="text-sm font-semibold mb-3 block">صفتك</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "owner", label: "مالك" },
                    { value: "agent", label: "وسيط عقاري" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("advertiserType", opt.value)}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.advertiserType === opt.value
                          ? "border-teal-600 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400"
                          : "border-border hover:border-teal-300 hover:bg-secondary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: تفاصيل العقار */}
        {step === 2 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="w-5 h-5 text-teal-600" />
                تفاصيل العقار
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium">عنوان الإعلان <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  placeholder="مثال: شقة 3 غرف للبيع في حي النزهة"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="price" className="text-sm font-medium">السعر (ج.م)</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="850,000"
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
                <div>
                  <Label htmlFor="area" className="text-sm font-medium">المساحة (م²) <span className="text-red-500">*</span></Label>
                  <Input
                    id="area"
                    type="number"
                    placeholder="120"
                    value={form.area}
                    onChange={(e) => set("area", e.target.value)}
                    className="mt-1.5 rounded-xl"
                  />
                </div>
              </div>

              {form.mainCategory !== "أرض" && form.mainCategory !== "مستودع" && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="rooms" className="text-sm font-medium">الغرف</Label>
                    <Input
                      id="rooms"
                      type="number"
                      placeholder="3"
                      value={form.rooms}
                      onChange={(e) => set("rooms", e.target.value)}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bathrooms" className="text-sm font-medium">الحمامات</Label>
                    <Input
                      id="bathrooms"
                      type="number"
                      placeholder="2"
                      value={form.bathrooms}
                      onChange={(e) => set("bathrooms", e.target.value)}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                  <div>
                    <Label htmlFor="floor" className="text-sm font-medium">الطابق</Label>
                    <Input
                      id="floor"
                      type="number"
                      placeholder="3"
                      value={form.floor}
                      onChange={(e) => set("floor", e.target.value)}
                      className="mt-1.5 rounded-xl"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">التشطيب</Label>
                  <Select value={form.finishing} onValueChange={(v) => set("finishing", v)}>
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FINISHING.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">الأثاث</Label>
                  <Select value={form.furnished} onValueChange={(v) => set("furnished", v)}>
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="furnished">مفروشة</SelectItem>
                      <SelectItem value="semi_furnished">نصف مفروشة</SelectItem>
                      <SelectItem value="unfurnished">غير مفروشة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {form.listingType === "rent" && (
                <div>
                  <Label className="text-sm font-medium">فترة الإيجار</Label>
                  <Select value={form.paymentMethod} onValueChange={(v) => set("paymentMethod", v)}>
                    <SelectTrigger className="mt-1.5 rounded-xl">
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">شهري</SelectItem>
                      <SelectItem value="quarterly">ربع سنوي</SelectItem>
                      <SelectItem value="yearly">سنوي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="description" className="text-sm font-medium">وصف إضافي</Label>
                <Textarea
                  id="description"
                  placeholder="اكتب وصفاً تفصيلياً للعقار — الميزات، القريب منه، سبب البيع..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  className="mt-1.5 rounded-xl resize-none"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: الموقع */}
        {step === 3 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="w-5 h-5 text-teal-600" />
                الموقع
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">المدينة / المحافظة <span className="text-red-500">*</span></Label>
                <Select value={form.city} onValueChange={(v) => set("city", v)}>
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue placeholder="اختر المدينة..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CITIES.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="district" className="text-sm font-medium">الحي / المنطقة</Label>
                <Input
                  id="district"
                  placeholder="مثال: حي النزهة، الزيتون"
                  value={form.district}
                  onChange={(e) => set("district", e.target.value)}
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="address" className="text-sm font-medium">العنوان التفصيلي</Label>
                <Input
                  id="address"
                  placeholder="شارع، مبنى، بالقرب من..."
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  className="mt-1.5 rounded-xl"
                />
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-400">تحديد الموقع على الخريطة</p>
                    <p className="text-xs text-blue-600/80 dark:text-blue-400/70 mt-0.5">
                      سيتم إضافة خاصية تحديد الموقع الجغرافي قريباً لزيادة ظهور عقارك.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: بيانات التواصل */}
        {step === 4 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="w-5 h-5 text-teal-600" />
                بيانات التواصل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phone" className="text-sm font-medium">رقم الهاتف <span className="text-red-500">*</span></Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="01xxxxxxxxx"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className="mt-1.5 rounded-xl"
                  dir="ltr"
                />
              </div>

              <div>
                <Label htmlFor="whatsapp" className="text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    رقم الواتساب (اختياري)
                  </span>
                </Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="01xxxxxxxxx"
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                  className="mt-1.5 rounded-xl"
                  dir="ltr"
                />
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 dark:border-amber-800/50">
                <div className="flex items-start gap-3">
                  <ImagePlus className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-400">إضافة صور العقار</p>
                    <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
                      بعد مراجعة الإعلان، يمكنك إضافة الصور من صفحة "عقاراتي" لزيادة فرص البيع بنسبة 3x.
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="mt-2 p-4 rounded-xl bg-secondary/50 border border-border/50 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground mb-3">ملخص الإعلان</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  <span className="text-muted-foreground">نوع الإعلان:</span>
                  <span className="font-medium">{form.listingType === "sale" ? "للبيع" : "للإيجار"}</span>
                  <span className="text-muted-foreground">نوع العقار:</span>
                  <span className="font-medium">{form.mainCategory}</span>
                  <span className="text-muted-foreground">العنوان:</span>
                  <span className="font-medium truncate">{form.title || "—"}</span>
                  <span className="text-muted-foreground">المساحة:</span>
                  <span className="font-medium">{form.area ? `${form.area} م²` : "—"}</span>
                  <span className="text-muted-foreground">الموقع:</span>
                  <span className="font-medium">{[form.district, form.city].filter(Boolean).join("، ") || "—"}</span>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6 gap-3">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : setLocation("/user/dashboard")}
            className="rounded-xl flex-1 sm:flex-none"
          >
            السابق
          </Button>
          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex-1 sm:flex-none"
            >
              التالي
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex-1 sm:flex-none"
            >
              {submitting ? "جاري الإرسال..." : "إرسال الإعلان"}
            </Button>
          )}
        </div>
      </div>
    </UserLayout>
  );
}
