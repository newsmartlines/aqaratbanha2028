import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import {
  Building2, Home, Warehouse, Briefcase, ShoppingBag, Trees,
  MapPin, Phone, ImagePlus, CheckCircle2, AlertCircle, X,
  ChevronLeft, Sofa, Car, Wind, Wifi, Shield, Zap, Droplets,
  Dumbbell, Tag, LogIn, UserPlus, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";

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

function GuestScreen() {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-16">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-teal-200">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">أضف عقارك الآن</h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
              انشر إعلانك مجاناً وتواصل مع مشترين ومستأجرين في بنها والقليوبية
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { value: "+500", label: "عقار منشور" },
              { value: "+1,200", label: "باحث نشط" },
              { value: "مجاناً", label: "بدون رسوم" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl py-4 px-2 text-center border border-border/60 shadow-sm">
                <p className="text-lg font-extrabold text-teal-600">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
            <div className="p-6 space-y-3">
              <Link href="/login?returnTo=/add-property">
                <Button className="w-full h-12 rounded-xl font-bold text-base bg-teal-600 hover:bg-teal-700 text-white gap-2">
                  <LogIn className="w-4 h-4" />
                  تسجيل الدخول
                </Button>
              </Link>
              <Link href="/register?returnTo=/add-property">
                <Button variant="outline" className="w-full h-12 rounded-xl font-bold text-base border-teal-200 text-teal-700 hover:bg-teal-50 gap-2">
                  <UserPlus className="w-4 h-4" />
                  إنشاء حساب مجاني
                </Button>
              </Link>
            </div>
            <div className="bg-gray-50 border-t border-border/40 px-6 py-3">
              <p className="text-xs text-center text-muted-foreground">
                التسجيل مجاني تماماً • لا بطاقة ائتمان مطلوبة
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { icon: "⚡", label: "نشر فوري بعد الموافقة" },
              { icon: "📸", label: "رفع صور متعددة" },
              { icon: "📍", label: "موقع على الخريطة" },
              { icon: "📞", label: "تواصل مباشر مع المشترين" },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-2 p-3 bg-white rounded-xl border border-border/50 text-sm text-muted-foreground">
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <RealEstateFooter />
    </div>
  );
}

export default function AddPropertyPage() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    totalFloors: "",
    finishing: "",
    paymentMethod: "",
    furnished: "",
    city: "بنها",
    district: "",
    address: "",
    phone: "",
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
        // skip
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
      listingType: "", mainCategory: "",
      title: "", description: "", price: "", area: "",
      rooms: "", bathrooms: "", floor: "", totalFloors: "", finishing: "",
      paymentMethod: "", furnished: "",
      city: "بنها", district: "", address: "",
      phone: user?.phone ?? "", whatsapp: "", amenities: [], images: [],
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!user) return <GuestScreen />;

  const showRoomFields = !["أرض", "مستودع", "محل تجاري"].includes(form.mainCategory);

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle2 className="w-10 h-10 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">تم إرسال إعلانك!</h2>
            <p className="text-muted-foreground mb-2">
              سيتم مراجعة إعلانك من قبل فريقنا وسيُنشر بعد الموافقة.
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
        <RealEstateFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : setLocation("/")}
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
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    done ? "bg-teal-600 border-teal-600 text-white" :
                    active ? "bg-white border-teal-600 text-teal-600 shadow-md shadow-teal-100" :
                    "bg-background border-border text-muted-foreground"
                  }`}>
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
            <div>
              <Label className="text-base font-bold mb-4 block">نوع الإعلان <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "sale", label: "للبيع", icon: Tag, desc: "بيع عقارك بأفضل سعر" },
                  { value: "rent", label: "للإيجار", icon: Building2, desc: "أجّر عقارك شهرياً أو سنوياً" },
                ].map((opt) => (
                  <button key={opt.value} type="button" onClick={() => set("listingType", opt.value)}
                    className={`relative p-5 rounded-2xl border-2 text-right transition-all ${
                      form.listingType === opt.value
                        ? "border-teal-600 bg-teal-50 shadow-md"
                        : "border-border hover:border-teal-300 hover:bg-secondary/40"
                    }`}>
                    {form.listingType === opt.value && (
                      <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <p className={`text-xl font-bold mb-1 ${form.listingType === opt.value ? "text-teal-700" : ""}`}>{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-bold mb-4 block">نوع العقار <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PROPERTY_TYPES.map((type) => {
                  const Icon = type.icon;
                  const active = form.mainCategory === type.value;
                  return (
                    <button key={type.value} type="button" onClick={() => set("mainCategory", type.value)}
                      className={`relative p-4 rounded-2xl border-2 text-center flex flex-col items-center gap-2 transition-all ${
                        active ? "border-teal-600 bg-teal-50 shadow-sm" : "border-border hover:border-teal-300 hover:bg-secondary/40"
                      }`}>
                      {active && (
                        <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-teal-600 flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? "bg-teal-600 text-white" : "bg-secondary text-muted-foreground"}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className={`text-sm font-semibold ${active ? "text-teal-700" : ""}`}>{type.label}</p>
                      <p className="text-[10px] text-muted-foreground hidden sm:block">{type.desc}</p>
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
            <div>
              <Label htmlFor="title" className="text-base font-bold mb-2 block">
                عنوان الإعلان <span className="text-red-500">*</span>
              </Label>
              <Input id="title" placeholder="مثال: شقة 3 غرف للبيع في حي النزهة ببنها"
                value={form.title} onChange={(e) => set("title", e.target.value)}
                className="h-12 rounded-xl text-base" />
              <p className="text-xs text-muted-foreground mt-1.5">عنوان واضح يجذب أكثر مشترين</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price" className="text-sm font-semibold mb-2 block">السعر (ج.م)</Label>
                <Input id="price" type="number" placeholder="850,000"
                  value={form.price} onChange={(e) => set("price", e.target.value)} className="h-11 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="area" className="text-sm font-semibold mb-2 block">المساحة (م²) <span className="text-red-500">*</span></Label>
                <Input id="area" type="number" placeholder="120"
                  value={form.area} onChange={(e) => set("area", e.target.value)} className="h-11 rounded-xl" />
              </div>
            </div>

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
                      <Input id={f.id} type="number" placeholder={f.placeholder}
                        value={form[f.id as keyof typeof form] as string}
                        onChange={(e) => set(f.id, e.target.value)}
                        className="h-11 rounded-xl text-center" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block">حالة التشطيب</Label>
                <Select value={form.finishing} onValueChange={(v) => set("finishing", v)}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="اختر..." /></SelectTrigger>
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
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="اختر..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="furnished">مفروشة بالكامل</SelectItem>
                      <SelectItem value="semi_furnished">نصف مفروشة</SelectItem>
                      <SelectItem value="unfurnished">غير مفروشة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {form.listingType === "rent" && (
              <div>
                <Label className="text-sm font-semibold mb-2 block">فترة الإيجار</Label>
                <Select value={form.paymentMethod} onValueChange={(v) => set("paymentMethod", v)}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="اختر..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">يومي</SelectItem>
                    <SelectItem value="monthly">شهري</SelectItem>
                    <SelectItem value="quarterly">ربع سنوي</SelectItem>
                    <SelectItem value="yearly">سنوي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-sm font-semibold mb-3 block">المميزات والخدمات</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AMENITIES.map((am) => {
                  const Icon = am.icon;
                  const active = form.amenities.includes(am.value);
                  return (
                    <button key={am.value} type="button" onClick={() => toggleAmenity(am.value)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        active ? "border-teal-600 bg-teal-50 text-teal-700" : "border-border hover:border-teal-200 text-foreground"
                      }`}>
                      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-teal-600" : "text-muted-foreground"}`} />
                      {am.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="desc" className="text-sm font-semibold mb-2 block">وصف إضافي</Label>
              <Textarea id="desc" placeholder="أي تفاصيل إضافية تريد إضافتها..."
                value={form.description} onChange={(e) => set("description", e.target.value)}
                className="rounded-xl min-h-24 resize-none" rows={3} />
            </div>
          </div>
        )}

        {/* ─── Step 3: الموقع ─── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <Label className="text-base font-bold mb-4 block">المدينة <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {["بنها", "قليوب", "شبرا الخيمة", "القناطر", "طوخ", "كفر شكر"].map((city) => (
                  <button key={city} type="button" onClick={() => set("city", city)}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      form.city === city ? "border-teal-600 bg-teal-50 text-teal-700" : "border-border hover:border-teal-300 hover:bg-secondary/40"
                    }`}>
                    {city}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="district" className="text-sm font-semibold mb-2 block">الحي / المنطقة</Label>
              <Input id="district" placeholder="مثال: حي النزهة، حي الزهراء..."
                value={form.district} onChange={(e) => set("district", e.target.value)} className="h-11 rounded-xl" />
            </div>

            <div>
              <Label htmlFor="address" className="text-sm font-semibold mb-2 block">العنوان التفصيلي</Label>
              <Input id="address" placeholder="مثال: شارع الجمهورية، بجوار المسجد..."
                value={form.address} onChange={(e) => set("address", e.target.value)} className="h-11 rounded-xl" />
            </div>
          </div>
        )}

        {/* ─── Step 4: الصور والتواصل ─── */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Images */}
            <div>
              <Label className="text-base font-bold mb-2 block">صور العقار</Label>
              <p className="text-xs text-muted-foreground mb-4">أضف حتى 10 صور — الصورة الأولى تكون الغلاف</p>

              {form.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-border/50 aspect-video bg-muted">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute bottom-1 right-1 bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">غلاف</span>
                      )}
                      <button onClick={() => removeImage(img)}
                        className="absolute top-1 left-1 w-5 h-5 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {form.images.length < 10 && (
                <>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImages}
                    className="w-full py-8 rounded-2xl border-2 border-dashed border-border hover:border-teal-400 hover:bg-teal-50/30 transition-all flex flex-col items-center gap-2 text-muted-foreground">
                    {uploadingImages ? (
                      <><Loader2 className="w-7 h-7 animate-spin text-teal-500" /><span className="text-sm">جارٍ الرفع...</span></>
                    ) : (
                      <><ImagePlus className="w-7 h-7" /><span className="text-sm font-medium">اضغط لاختيار الصور</span><span className="text-xs">PNG, JPG حتى 5MB</span></>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Contact */}
            <div>
              <Label className="text-base font-bold mb-4 block">بيانات التواصل</Label>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="phone" className="text-sm font-semibold mb-2 block">رقم الهاتف <span className="text-red-500">*</span></Label>
                  <Input id="phone" type="tel" placeholder="01xxxxxxxxx"
                    value={form.phone} onChange={(e) => set("phone", e.target.value)} className="h-11 rounded-xl" dir="ltr" />
                </div>
                <div>
                  <Label htmlFor="whatsapp" className="text-sm font-semibold mb-2 block">واتساب (اختياري)</Label>
                  <Input id="whatsapp" type="tel" placeholder="01xxxxxxxxx"
                    value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className="h-11 rounded-xl" dir="ltr" />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-secondary/40 rounded-2xl p-4 border border-border/50">
              <h3 className="font-bold text-sm mb-3">ملخص إعلانك</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">النوع</span><span className="font-medium">{form.mainCategory} • {form.listingType === "sale" ? "للبيع" : "للإيجار"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">العنوان</span><span className="font-medium truncate max-w-[200px]">{form.title}</span></div>
                {form.price && <div className="flex justify-between"><span className="text-muted-foreground">السعر</span><span className="font-bold text-teal-700">{Number(form.price).toLocaleString("ar-EG")} ج.م</span></div>}
                {form.area && <div className="flex justify-between"><span className="text-muted-foreground">المساحة</span><span className="font-medium">{form.area} م²</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">الموقع</span><span className="font-medium">{[form.district, form.city].filter(Boolean).join("، ")}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الصور</span><span className="font-medium">{form.images.length} صورة</span></div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between gap-4">
          {step > 1 ? (
            <Button variant="outline" className="rounded-xl h-12 px-6" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="w-4 h-4 ml-1" />
              السابق
            </Button>
          ) : (
            <div />
          )}

          {step < STEPS.length ? (
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-12 px-8 gap-2 flex-1 sm:flex-none"
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              التالي
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </Button>
          ) : (
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-12 px-8 flex-1 sm:flex-none"
              onClick={handleSubmit}
              disabled={submitting || !canProceed()}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جارٍ الإرسال...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 ml-2" />نشر الإعلان</>
              )}
            </Button>
          )}
        </div>
      </div>
      <RealEstateFooter />
    </div>
  );
}
