import { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  Building2, Home, Warehouse, Briefcase, ShoppingBag, Trees,
  MapPin, Phone, MessageCircle, ImagePlus, CheckCircle2,
  AlertCircle, X, Upload, ChevronRight, ChevronLeft,
  Sofa, Car, Wind, Wifi, Shield, Zap, Droplets, Dumbbell,
  User, Users, Eye, Tag,
} from "lucide-react";
import UserLayout from "@/components/UserLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const PROPERTY_TYPES = [
  { value: "شقة", label: "شقة", icon: Home, desc: "في عمارة أو مجمع" },
  { value: "فيلا", label: "فيلا", icon: Building2, desc: "منزل مستقل" },
  { value: "أرض", label: "أرض", icon: Trees, desc: "قطعة أرض" },
  { value: "مكتب", label: "مكتب", icon: Briefcase, desc: "إداري أو تجاري" },
  { value: "محل تجاري", label: "محل تجاري", icon: ShoppingBag, desc: "على الشارع" },
  { value: "مستودع", label: "مستودع", icon: Warehouse, desc: "للتخزين" },
  { value: "عمارة", label: "عمارة", icon: Building2, desc: "مبنى كامل" },
  { value: "استراحة", label: "استراحة", icon: Home, desc: "للإيجار اليومي" },
];

const AMENITIES = [
  { value: "مصعد", label: "مصعد", icon: Building2 },
  { value: "موقف سيارات", label: "موقف سيارات", icon: Car },
  { value: "تكييف مركزي", label: "تكييف مركزي", icon: Wind },
  { value: "إنترنت", label: "إنترنت", icon: Wifi },
  { value: "حارس أمن", label: "حارس أمن", icon: Shield },
  { value: "مولد كهرباء", label: "مولد كهرباء", icon: Zap },
  { value: "خزان مياه", label: "خزان مياه", icon: Droplets },
  { value: "نادي رياضي", label: "نادي رياضي", icon: Dumbbell },
  { value: "مفروش", label: "مفروش", icon: Sofa },
  { value: "حديقة", label: "حديقة", icon: Trees },
];

const FINISHING = [
  { value: "super_lux", label: "سوبر لوكس", desc: "تشطيبات راقية جداً" },
  { value: "lux", label: "لوكس", desc: "تشطيبات جيدة" },
  { value: "semi_finished", label: "نصف تشطيب", desc: "جاهز للتشطيب" },
  { value: "unfinished", label: "بدون تشطيب", desc: "هيكل فقط" },
];

const STEPS = [
  { id: 1, label: "نوع العقار", icon: Building2 },
  { id: 2, label: "التفاصيل", icon: Home },
  { id: 3, label: "الموقع", icon: MapPin },
  { id: 4, label: "الصور والتواصل", icon: Phone },
];

export default function AddPropertyPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    listingType: "",
    mainCategory: "",
    advertiserType: "owner",
    title: "",
    description: "",
    price: "",
    area: "",
    rooms: "",
    bathrooms: "",
    floor: "",
    totalFloors: "",
    finishing: "",
    paymentMethod: "",
    furnished: "",
    buildYear: "",
    city: "بنها",
    district: "",
    address: "",
    phone: user?.phone ?? "",
    whatsapp: "",
    amenities: [] as string[],
    images: [] as string[],
  });

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleAmenity = (val: string) =>
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(val)
        ? prev.amenities.filter((a) => a !== val)
        : [...prev.amenities, val],
    }));

  const removeImage = (url: string) =>
    setForm((prev) => ({ ...prev, images: prev.images.filter((i) => i !== url) }));

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    const uploaded: string[] = [];
    for (const file of Array.from(files).slice(0, 10 - form.images.length)) {
      try {
        const res = await api.upload.propertyImage(file);
        if (res?.url) uploaded.push(res.url);
      } catch {
        // skip failed images
      }
    }
    setForm((prev) => ({ ...prev, images: [...prev.images, ...uploaded] }));
    setUploadingImages(false);
  };

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
        phone: form.phone || undefined,
        whatsapp: form.whatsapp || undefined,
        advertiserType: form.advertiserType,
        paymentMethod: form.paymentMethod || undefined,
        furnished: form.furnished || undefined,
        amenities: form.amenities.length ? JSON.stringify(form.amenities) : undefined,
        images: form.images.length ? JSON.stringify(form.images) : undefined,
        status: "pending",
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message ?? "حدث خطأ أثناء إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSuccess(false);
    setStep(1);
    setForm({
      listingType: "", mainCategory: "", advertiserType: "owner",
      title: "", description: "", price: "", area: "",
      rooms: "", bathrooms: "", floor: "", totalFloors: "", finishing: "",
      paymentMethod: "", furnished: "", buildYear: "",
      city: "بنها", district: "", address: "",
      phone: user?.phone ?? "", whatsapp: "", amenities: [], images: [],
    });
  };

  const showRoomFields = !["أرض", "مستودع", "محل تجاري"].includes(form.mainCategory);

  if (success) {
    return (
      <UserLayout>
        <div className="min-h-[70vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">تم إرسال إعلانك!</h2>
            <p className="text-muted-foreground mb-2">
              سيتم مراجعة إعلانك من قبل فريقنا وسيُنشر خلال <strong>24 ساعة</strong>.
            </p>
            <p className="text-sm text-muted-foreground mb-8">ستصلك إشعار فور الموافقة على إعلانك.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button onClick={() => setLocation("/user/my-properties")} className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-11 px-6">
                <Building2 className="w-4 h-4 ml-2" />
                عقاراتي
              </Button>
              <Button variant="outline" onClick={resetForm} className="rounded-xl h-11 px-6">
                إضافة عقار آخر
              </Button>
            </div>
          </div>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : setLocation("/user/dashboard")}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">أضف عقارك</h1>
            <p className="text-sm text-muted-foreground">أنشر إعلانك ووصّل لآلاف الباحثين</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            {/* Connecting line */}
            <div className="absolute top-5 right-5 left-5 h-0.5 bg-border -z-0" />
            <div
              className="absolute top-5 right-5 h-0.5 bg-teal-600 transition-all duration-500 -z-0"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%`, left: "auto" }}
            />
            {STEPS.map((s) => {
              const Icon = s.icon;
              const done = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex flex-col items-center gap-2 z-10">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      done ? "bg-teal-600 border-teal-600 text-white" :
                      active ? "bg-white dark:bg-background border-teal-600 text-teal-600 shadow-md shadow-teal-100 dark:shadow-teal-900/30" :
                      "bg-background border-border text-muted-foreground"
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${active ? "text-teal-600" : done ? "text-teal-600/70" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 sm:hidden text-center">
            <span className="text-xs font-semibold text-teal-600">{STEPS[step - 1].label}</span>
            <span className="text-xs text-muted-foreground mx-1">—</span>
            <span className="text-xs text-muted-foreground">الخطوة {step} من {STEPS.length}</span>
          </div>
        </div>

        {/* ─── Step 1: نوع العقار ─── */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Listing type */}
            <div>
              <Label className="text-base font-bold mb-4 block">نوع الإعلان <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "sale", label: "للبيع", icon: Tag, color: "teal", desc: "بيع عقارك بأفضل سعر" },
                  { value: "rent", label: "للإيجار", icon: ChevronRight, color: "blue", desc: "أجّر عقارك شهرياً أو سنوياً" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("listingType", opt.value)}
                    className={`relative p-5 rounded-2xl border-2 text-right transition-all ${
                      form.listingType === opt.value
                        ? "border-teal-600 bg-teal-50 dark:bg-teal-950/30 shadow-md"
                        : "border-border hover:border-teal-300 hover:bg-secondary/40"
                    }`}
                  >
                    {form.listingType === opt.value && (
                      <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <p className={`text-xl font-bold mb-1 ${form.listingType === opt.value ? "text-teal-700 dark:text-teal-400" : ""}`}>{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Property type */}
            <div>
              <Label className="text-base font-bold mb-4 block">نوع العقار <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PROPERTY_TYPES.map((type) => {
                  const Icon = type.icon;
                  const active = form.mainCategory === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => set("mainCategory", type.value)}
                      className={`relative p-4 rounded-2xl border-2 text-center flex flex-col items-center gap-2 transition-all ${
                        active
                          ? "border-teal-600 bg-teal-50 dark:bg-teal-950/30 shadow-sm"
                          : "border-border hover:border-teal-300 hover:bg-secondary/40"
                      }`}
                    >
                      {active && (
                        <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-teal-600 flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? "bg-teal-600 text-white" : "bg-secondary text-muted-foreground"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className={`text-sm font-semibold ${active ? "text-teal-700 dark:text-teal-400" : ""}`}>{type.label}</p>
                      <p className="text-[10px] text-muted-foreground hidden sm:block">{type.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Advertiser type */}
            <div>
              <Label className="text-base font-bold mb-4 block">صفتك كمُعلِن</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "owner", label: "مالك العقار", icon: User, desc: "أنا صاحب العقار" },
                  { value: "agent", label: "وسيط عقاري", icon: Users, desc: "أتوسط لصالح المالك" },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = form.advertiserType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("advertiserType", opt.value)}
                      className={`p-4 rounded-2xl border-2 text-right flex items-start gap-3 transition-all ${
                        active
                          ? "border-teal-600 bg-teal-50 dark:bg-teal-950/30"
                          : "border-border hover:border-teal-300 hover:bg-secondary/40"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${active ? "bg-teal-600 text-white" : "bg-secondary text-muted-foreground"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${active ? "text-teal-700 dark:text-teal-400" : ""}`}>{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 2: تفاصيل العقار ─── */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title" className="text-base font-bold mb-2 block">
                عنوان الإعلان <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="مثال: شقة 3 غرف للبيع في حي النزهة ببنها"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="h-12 rounded-xl text-base"
              />
              <p className="text-xs text-muted-foreground mt-1.5">عنوان واضح يجذب أكثر مشترين</p>
            </div>

            {/* Price + Area */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price" className="text-sm font-semibold mb-2 block">
                  السعر (ج.م)
                </Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="850,000"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="area" className="text-sm font-semibold mb-2 block">
                  المساحة (م²) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="area"
                  type="number"
                  placeholder="120"
                  value={form.area}
                  onChange={(e) => set("area", e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            {/* Rooms, baths, floor */}
            {showRoomFields && (
              <div>
                <Label className="text-sm font-semibold mb-3 block">تفاصيل الوحدة</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "rooms", label: "عدد الغرف", placeholder: "3" },
                    { id: "bathrooms", label: "الحمامات", placeholder: "2" },
                    { id: "floor", label: "الطابق", placeholder: "3" },
                  ].map((f) => (
                    <div key={f.id}>
                      <p className="text-xs text-muted-foreground mb-1.5">{f.label}</p>
                      <Input
                        id={f.id}
                        type="number"
                        placeholder={f.placeholder}
                        value={form[f.id as keyof typeof form] as string}
                        onChange={(e) => set(f.id, e.target.value)}
                        className="h-11 rounded-xl text-center"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Finishing + Furnished */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block">حالة التشطيب</Label>
                <Select value={form.finishing} onValueChange={(v) => set("finishing", v)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent>
                    {FINISHING.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        <span className="font-medium">{f.label}</span>
                        <span className="text-xs text-muted-foreground mr-2">{f.desc}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {showRoomFields && (
                <div>
                  <Label className="text-sm font-semibold mb-2 block">الأثاث</Label>
                  <Select value={form.furnished} onValueChange={(v) => set("furnished", v)}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="furnished">مفروشة بالكامل</SelectItem>
                      <SelectItem value="semi_furnished">نصف مفروشة</SelectItem>
                      <SelectItem value="unfurnished">غير مفروشة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Rent period */}
            {form.listingType === "rent" && (
              <div>
                <Label className="text-sm font-semibold mb-2 block">فترة الإيجار</Label>
                <Select value={form.paymentMethod} onValueChange={(v) => set("paymentMethod", v)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="اختر..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">يومي</SelectItem>
                    <SelectItem value="monthly">شهري</SelectItem>
                    <SelectItem value="quarterly">ربع سنوي</SelectItem>
                    <SelectItem value="yearly">سنوي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Amenities */}
            <div>
              <Label className="text-sm font-semibold mb-3 block">المميزات والخدمات</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AMENITIES.map((am) => {
                  const Icon = am.icon;
                  const active = form.amenities.includes(am.value);
                  return (
                    <button
                      key={am.value}
                      type="button"
                      onClick={() => toggleAmenity(am.value)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        active
                          ? "border-teal-600 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400"
                          : "border-border hover:border-teal-200 text-foreground"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-teal-600" : "text-muted-foreground"}`} />
                      {am.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-semibold mb-2 block">
                وصف إضافي
              </Label>
              <Textarea
                id="description"
                placeholder="اكتب وصفاً تفصيلياً للعقار — الميزات، القريب منه، سبب البيع..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={4}
                className="rounded-xl resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1.5">الوصف الجيد يزيد فرص البيع بنسبة 40%</p>
            </div>
          </div>
        )}

        {/* ─── Step 3: الموقع ─── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <Label className="text-base font-bold mb-2 block">
                المدينة / المحافظة <span className="text-red-500">*</span>
              </Label>
              <Select value={form.city} onValueChange={(v) => set("city", v)}>
                <SelectTrigger className="h-12 rounded-xl text-base">
                  <SelectValue placeholder="اختر المدينة..." />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "بنها", "القاهرة", "الجيزة", "الإسكندرية", "شبرا الخيمة",
                    "المنصورة", "طنطا", "أسيوط", "السويس", "الإسماعيلية",
                    "دمياط", "بورسعيد", "الزقازيق", "المنوفية", "الفيوم",
                  ].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="district" className="text-sm font-semibold mb-2 block">الحي / المنطقة</Label>
              <Input
                id="district"
                placeholder="مثال: حي النزهة، الزيتون"
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div>
              <Label htmlFor="address" className="text-sm font-semibold mb-2 block">العنوان التفصيلي</Label>
              <Input
                id="address"
                placeholder="شارع رقم 5، بالقرب من مسجد..."
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Location info card */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-200/60 dark:border-blue-800/40">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">الموقع الجغرافي الدقيق</p>
                  <p className="text-xs text-blue-700/70 dark:text-blue-400/60 mt-0.5 leading-relaxed">
                    يمكنك تحديد الموقع على الخريطة بعد نشر الإعلان من صفحة عقاراتي لزيادة ظهور العقار في نتائج البحث.
                  </p>
                </div>
              </div>
            </div>

            {/* Location preview */}
            {(form.city || form.district) && (
              <div className="p-4 bg-secondary/40 rounded-2xl border border-border/50 flex items-center gap-3">
                <MapPin className="w-5 h-5 text-teal-600 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">موقع العقار</p>
                  <p className="text-sm font-semibold">
                    {[form.district, form.city].filter(Boolean).join(" — ")}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 4: الصور والتواصل ─── */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Images upload */}
            <div>
              <Label className="text-base font-bold mb-1 block">صور العقار</Label>
              <p className="text-xs text-muted-foreground mb-3">العقارات التي تحتوي صوراً تُباع 3 أضعاف أسرع — يُنصح بـ 5+ صور</p>

              {/* Upload area */}
              <div
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  uploadingImages ? "border-teal-300 bg-teal-50/50 dark:bg-teal-950/20" : "border-border hover:border-teal-400 hover:bg-secondary/30"
                } ${form.images.length >= 10 ? "opacity-50 pointer-events-none" : ""}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                {uploadingImages ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-teal-600 font-medium">جاري رفع الصور...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold">اضغط لرفع الصور</p>
                    <p className="text-xs text-muted-foreground">JPG أو PNG — حتى 10 صور</p>
                  </div>
                )}
              </div>

              {/* Image previews */}
              {form.images.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
                  {form.images.map((url, i) => (
                    <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-border">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <div className="absolute top-1.5 right-1.5 bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          الغلاف
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage(url); }}
                        className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {form.images.length < 10 && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-teal-400 flex items-center justify-center transition-colors"
                    >
                      <ImagePlus className="w-5 h-5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <Label className="text-base font-bold block">بيانات التواصل</Label>
              <div>
                <Label htmlFor="phone" className="text-sm font-semibold mb-2 block">
                  رقم الهاتف <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="01xxxxxxxxx"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  className="h-11 rounded-xl"
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="whatsapp" className="text-sm font-semibold mb-2 block flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                  رقم الواتساب
                  <span className="text-xs font-normal text-muted-foreground">(اختياري)</span>
                </Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  placeholder="01xxxxxxxxx"
                  value={form.whatsapp}
                  onChange={(e) => set("whatsapp", e.target.value)}
                  className="h-11 rounded-xl"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-2xl border border-border/60 overflow-hidden">
              <div className="bg-secondary/60 px-4 py-3 border-b border-border/40 flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-bold">ملخص إعلانك</p>
              </div>
              <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  { label: "نوع الإعلان", val: form.listingType === "sale" ? "للبيع 🏷️" : "للإيجار 🔑" },
                  { label: "نوع العقار", val: form.mainCategory },
                  { label: "العنوان", val: form.title || "—" },
                  { label: "المساحة", val: form.area ? `${form.area} م²` : "—" },
                  { label: "السعر", val: form.price ? `${Number(form.price).toLocaleString("ar-EG")} ج.م` : "—" },
                  { label: "الموقع", val: [form.district, form.city].filter(Boolean).join("، ") || "—" },
                  ...(form.amenities.length ? [{ label: "المميزات", val: `${form.amenities.length} مزية` }] : []),
                  ...(form.images.length ? [{ label: "الصور", val: `${form.images.length} صورة` }] : []),
                ].map(({ label, val }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium truncate">{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 gap-3 pt-6 border-t border-border/40">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : setLocation("/user/dashboard")}
            className="rounded-xl h-12 px-6 gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? "إلغاء" : "السابق"}
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-12 px-8 gap-2 flex-1 sm:flex-none"
            >
              التالي
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-12 px-8 flex-1 sm:flex-none font-semibold"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  جاري النشر...
                </span>
              ) : "نشر الإعلان ✓"}
            </Button>
          )}
        </div>
      </div>
    </UserLayout>
  );
}
