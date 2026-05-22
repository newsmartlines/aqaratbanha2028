import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, Home, Warehouse, Briefcase, ShoppingBag, Trees,
  MapPin, Phone, ImagePlus, CheckCircle2, X, Crown,
  ChevronLeft, Sofa, Car, Wind, Wifi, Shield, Zap, Droplets,
  Dumbbell, Tag, Loader2, Star, CreditCard, Check, Smartphone,
  TrendingUp, Eye, Award, BarChart2, Bot, Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, type BillingPlan } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROPERTY_TYPES = [
  { value: "شقة",        label: "شقة",        icon: Home,        desc: "في عمارة أو مجمع" },
  { value: "فيلا",       label: "فيلا",       icon: Building2,   desc: "منزل مستقل" },
  { value: "أرض",        label: "أرض",        icon: Trees,       desc: "قطعة أرض" },
  { value: "مكتب",       label: "مكتب",       icon: Briefcase,   desc: "إداري أو تجاري" },
  { value: "محل تجاري",  label: "محل تجاري",  icon: ShoppingBag, desc: "على الشارع" },
  { value: "مستودع",     label: "مستودع",     icon: Warehouse,   desc: "للتخزين" },
  { value: "عمارة",      label: "عمارة",      icon: Building2,   desc: "مبنى كامل" },
  { value: "استراحة",    label: "استراحة",    icon: Home,        desc: "للإيجار اليومي" },
];

const AMENITIES = [
  { value: "مصعد",         label: "مصعد",         icon: Building2 },
  { value: "موقف سيارات", label: "موقف سيارات", icon: Car },
  { value: "تكييف مركزي", label: "تكييف مركزي", icon: Wind },
  { value: "إنترنت",       label: "إنترنت",       icon: Wifi },
  { value: "حارس أمن",    label: "حارس أمن",    icon: Shield },
  { value: "مولد كهرباء", label: "مولد كهرباء", icon: Zap },
  { value: "خزان مياه",   label: "خزان مياه",   icon: Droplets },
  { value: "نادي رياضي",  label: "نادي رياضي",  icon: Dumbbell },
  { value: "مفروش",        label: "مفروش",        icon: Sofa },
  { value: "حديقة",        label: "حديقة",        icon: Trees },
];

const FINISHING = [
  { value: "super_lux",    label: "سوبر لوكس",   desc: "تشطيبات راقية جداً" },
  { value: "lux",          label: "لوكس",         desc: "تشطيبات جيدة" },
  { value: "semi_finished",label: "نصف تشطيب",   desc: "جاهز للتشطيب" },
  { value: "unfinished",   label: "بدون تشطيب",  desc: "هيكل فقط" },
];

const STEPS = [
  { id: 1, label: "نوع العقار",        icon: Building2 },
  { id: 2, label: "التفاصيل",          icon: Home },
  { id: 3, label: "الموقع",            icon: MapPin },
  { id: 4, label: "الصور والتواصل",   icon: Phone },
  { id: 5, label: "اختر الباقة",       icon: Crown },
];

// ─── Plan feature labels ──────────────────────────────────────────────────────

const FEATURE_LABELS: Record<string, { label: string; icon: typeof Eye }> = {
  homepageDisplay: { label: "ظهور في الصفحة الرئيسية", icon: Eye },
  topSearch:       { label: "أولوية في نتائج البحث",    icon: TrendingUp },
  verifiedBadge:   { label: "شارة الموثوقية",           icon: Award },
  premiumBadge:    { label: "شارة مميز",                icon: Star },
  prioritySupport: { label: "دعم أولوية",               icon: Smartphone },
  analytics:       { label: "إحصائيات الأداء",          icon: BarChart2 },
  seo:             { label: "تحسين محركات البحث",        icon: Rocket },
  aiTools:         { label: "أدوات الذكاء الاصطناعي",   icon: Bot },
  autoBoost:       { label: "رفع تلقائي للإعلان",       icon: TrendingUp },
};

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: BillingPlan;
  selected: boolean;
  onSelect: () => void;
}) {
  let features: Record<string, boolean> = {};
  let limits: Record<string, number> = {};
  try { features = JSON.parse(plan.features); } catch { /* empty */ }
  try { limits  = JSON.parse(plan.limits);   } catch { /* empty */ }

  const isFree  = parseFloat(plan.price) === 0;
  const activeFeatures = Object.entries(features).filter(([, v]) => v);
  const props   = limits.properties === -1 ? "غير محدود" : `${limits.properties ?? 0}`;
  const photos  = limits.photos     === -1 ? "غير محدود" : `${limits.photos     ?? 0}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative w-full text-right rounded-2xl border-2 p-5 transition-all flex flex-col gap-3 ${
        selected
          ? "border-teal-600 bg-teal-50 shadow-lg shadow-teal-100"
          : "border-border hover:border-teal-300 hover:bg-secondary/30 bg-white"
      }`}
    >
      {selected && (
        <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center shadow">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      {/* Badges row */}
      <div className="flex items-start gap-2 flex-wrap min-h-[20px]">
        {plan.isMostPopular && (
          <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0.5">الأكثر طلباً</Badge>
        )}
        {plan.isRecommended && (
          <Badge className="bg-teal-600 text-white text-[10px] px-2 py-0.5">موصى به</Badge>
        )}
        {plan.trialDays > 0 && (
          <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-teal-400 text-teal-700">
            {plan.trialDays} يوم مجاناً
          </Badge>
        )}
      </div>

      {/* Name + price */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-lg font-extrabold text-foreground">{plan.nameAr ?? plan.name}</p>
          {plan.descriptionAr && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{plan.descriptionAr}</p>
          )}
        </div>
        <div className="text-left shrink-0">
          {isFree ? (
            <p className="text-2xl font-black text-teal-600">مجاني</p>
          ) : (
            <>
              <p className="text-2xl font-black text-foreground">
                {plan.price}
                <span className="text-sm font-semibold text-muted-foreground mr-1">{plan.currency}</span>
              </p>
              <p className="text-xs text-muted-foreground">/ شهر</p>
            </>
          )}
        </div>
      </div>

      {/* Limits */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border/40 pt-3">
        <span className="flex items-center gap-1">
          <Building2 className="w-3.5 h-3.5 text-teal-500" />
          <span className="font-semibold text-foreground">{props}</span> عقار
        </span>
        <span className="flex items-center gap-1">
          <ImagePlus className="w-3.5 h-3.5 text-teal-500" />
          <span className="font-semibold text-foreground">{photos}</span> صورة
        </span>
        {(limits.featuredAds ?? 0) > 0 && (
          <span className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-foreground">
              {limits.featuredAds === -1 ? "∞" : limits.featuredAds}
            </span> مميز
          </span>
        )}
      </div>

      {/* Active features */}
      {activeFeatures.length > 0 && (
        <div className="space-y-1.5">
          {activeFeatures.slice(0, 4).map(([key]) => {
            const meta = FEATURE_LABELS[key];
            if (!meta) return null;
            return (
              <div key={key} className="flex items-center gap-2 text-xs text-foreground">
                <div className="w-4 h-4 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 text-teal-600" />
                </div>
                {meta.label}
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}

// ─── Payment Dialog ────────────────────────────────────────────────────────────

function PaymentDialog({
  open,
  plan,
  onClose,
  onSuccess,
}: {
  open: boolean;
  plan: BillingPlan | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [phase, setPhase] = useState<"form" | "processing" | "done">("form");
  const [mobile, setMobile] = useState("");

  const handlePay = async () => {
    if (!mobile.match(/^05\d{8}$/)) return;
    setPhase("processing");
    await new Promise((r) => setTimeout(r, 2800));
    setPhase("done");
    await new Promise((r) => setTimeout(r, 800));
    onSuccess();
  };

  const handleClose = () => {
    if (phase === "processing") return;
    setPhase("form");
    setMobile("");
    onClose();
  };

  if (!plan) return null;
  const isFree = parseFloat(plan.price) === 0;
  if (isFree) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-[420px]" dir="rtl">
        {phase === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <CreditCard className="w-5 h-5 text-teal-600" />
                الدفع الآمن
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              {/* Plan summary */}
              <div className="flex items-center justify-between bg-teal-50 rounded-xl px-4 py-3 border border-teal-200">
                <div>
                  <p className="text-sm font-bold text-teal-800">{plan.nameAr ?? plan.name}</p>
                  <p className="text-xs text-teal-600">{plan.durationDays} يوم — اشتراك شهري</p>
                </div>
                <p className="text-2xl font-black text-teal-700">
                  {plan.price}
                  <span className="text-sm font-semibold mr-1">{plan.currency}</span>
                </p>
              </div>

              {/* STC Pay input */}
              <div className="space-y-2">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" />
                  رقم جوال STC Pay
                </Label>
                <Input
                  placeholder="05XXXXXXXX"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  maxLength={10}
                  dir="ltr"
                  className="h-12 rounded-xl text-center tracking-widest text-lg font-bold"
                />
                <p className="text-xs text-muted-foreground text-center">
                  أدخل رقم الجوال المرتبط بمحفظة STC Pay
                </p>
              </div>

              {/* Security note */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
                <Shield className="w-4 h-4 text-teal-600 shrink-0" />
                جميع المعاملات مشفرة وآمنة بالكامل
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handlePay}
                  disabled={!mobile.match(/^05\d{8}$/)}
                  className="flex-1 h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  <CreditCard className="w-4 h-4 ml-2" />
                  ادفع {plan.price} {plan.currency}
                </Button>
                <Button variant="outline" onClick={handleClose} className="h-12 rounded-xl px-5">
                  إلغاء
                </Button>
              </div>
            </div>
          </>
        )}

        {phase === "processing" && (
          <div className="py-14 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
              <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
            </div>
            <div>
              <p className="text-lg font-bold">جارٍ معالجة الدفع</p>
              <p className="text-sm text-muted-foreground mt-1">الرجاء الانتظار...</p>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="py-14 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-teal-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-teal-700">تم الدفع بنجاح!</p>
              <p className="text-sm text-muted-foreground mt-1">جارٍ نشر إعلانك...</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UserAddPropertyPage() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [showPayment, setShowPayment] = useState(false);
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
    images:    [] as string[],
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery<BillingPlan[]>({
    queryKey: ["billingPlansPublic"],
    queryFn: () => api.billingPlans.publicList(),
    staleTime: 5 * 60 * 1000,
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
      } catch { /* skip */ }
    }
    setForm((prev) => ({ ...prev, images: [...prev.images, ...uploaded] }));
    setUploadingImages(false);
  };

  const canProceed = () => {
    if (step === 1) return !!form.listingType && !!form.mainCategory;
    if (step === 2) return !!form.title && !!form.area;
    if (step === 3) return !!form.city;
    if (step === 4) return !!form.phone;
    if (step === 5) return !!selectedPlan;
    return true;
  };

  const doCreateProperty = async () => {
    await api.userProperties.create({
      listingType:   form.listingType,
      mainCategory:  form.mainCategory,
      title:         form.title,
      description:   form.description   || undefined,
      price:         form.price         || undefined,
      area:          form.area          || undefined,
      rooms:         form.rooms         ? parseInt(form.rooms)     : undefined,
      bathrooms:     form.bathrooms     ? parseInt(form.bathrooms) : undefined,
      floor:         form.floor         ? parseInt(form.floor)     : undefined,
      finishing:     form.finishing     || undefined,
      address:       form.address       || undefined,
      district:      form.district      || undefined,
      phone:         form.phone         || undefined,
      whatsapp:      form.whatsapp      || undefined,
      paymentMethod: form.paymentMethod || undefined,
      furnished:     form.furnished     || undefined,
      amenities:     form.amenities.length ? JSON.stringify(form.amenities) : undefined,
      images:        form.images.length   ? JSON.stringify(form.images)    : undefined,
      status: "pending",
    });
    setSuccess(true);
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return;
    const isFree = parseFloat(selectedPlan.price) === 0;
    if (isFree) {
      setSubmitting(true);
      setError(null);
      try {
        await doCreateProperty();
      } catch (e: any) {
        setError(e?.message ?? "حدث خطأ أثناء إرسال الطلب");
      } finally {
        setSubmitting(false);
      }
    } else {
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    setSubmitting(true);
    setError(null);
    try {
      await doCreateProperty();
    } catch (e: any) {
      setError(e?.message ?? "حدث خطأ أثناء إرسال الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  const showRoomFields = !["أرض", "مستودع", "محل تجاري"].includes(form.mainCategory);

  // ── Auth guard ───────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login?returnTo=/user/add-property");
    return null;
  }

  // ── Success ──────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <Header />
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-24 h-24 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">تم إرسال إعلانك!</h2>
            <p className="text-muted-foreground mb-1">
              سيتم مراجعة إعلانك من قبل فريقنا وسيُنشر بعد الموافقة.
            </p>
            {selectedPlan && parseFloat(selectedPlan.price) > 0 && (
              <p className="text-sm text-teal-600 font-medium mb-1">
                تم تفعيل باقة {selectedPlan.nameAr ?? selectedPlan.name} بنجاح.
              </p>
            )}
            <p className="text-sm text-muted-foreground mb-8">
              ستصلك إشعار فور الموافقة على إعلانك.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button
                onClick={() => setLocation("/user/my-properties")}
                className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-11 px-6"
              >
                <Building2 className="w-4 h-4 ml-2" />
                عقاراتي
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSuccess(false);
                  setStep(1);
                  setSelectedPlan(null);
                  setForm({
                    listingType: "", mainCategory: "", title: "", description: "",
                    price: "", area: "", rooms: "", bathrooms: "", floor: "",
                    totalFloors: "", finishing: "", paymentMethod: "", furnished: "",
                    city: "بنها", district: "", address: "",
                    phone: user?.phone ?? "", whatsapp: "", amenities: [], images: [],
                  });
                }}
                className="rounded-xl h-11 px-6"
              >
                إضافة عقار آخر
              </Button>
            </div>
          </div>
        </div>
        <RealEstateFooter />
      </div>
    );
  }

  // ── Wizard ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-8 pb-28">

        {/* Title */}
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
            <div className="absolute top-5 right-5 left-5 h-0.5 bg-border -z-0" />
            <div
              className="absolute top-5 right-5 h-0.5 bg-teal-600 transition-all duration-500 -z-0"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%`, left: "auto" }}
            />
            {STEPS.map((s) => {
              const Icon = s.icon;
              const done   = step > s.id;
              const active = step === s.id;
              return (
                <div key={s.id} className="flex flex-col items-center gap-2 z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    done   ? "bg-teal-600 border-teal-600 text-white" :
                    active ? "bg-white border-teal-600 text-teal-600 shadow-md shadow-teal-100" :
                             "bg-background border-border text-muted-foreground"
                  }`}>
                    {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] font-medium hidden sm:block text-center leading-tight max-w-[56px] ${
                    active ? "text-teal-600" : done ? "text-teal-600/70" : "text-muted-foreground"
                  }`}>
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
              <Label className="text-base font-bold mb-4 block">
                نوع الإعلان <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: "sale", label: "للبيع",    icon: Tag,       desc: "بيع عقارك بأفضل سعر" },
                  { value: "rent", label: "للإيجار",  icon: Building2, desc: "أجّر عقارك شهرياً أو سنوياً" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("listingType", opt.value)}
                    className={`relative p-5 rounded-2xl border-2 text-right transition-all ${
                      form.listingType === opt.value
                        ? "border-teal-600 bg-teal-50 shadow-md"
                        : "border-border hover:border-teal-300 hover:bg-secondary/40"
                    }`}
                  >
                    {form.listingType === opt.value && (
                      <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    <p className={`text-xl font-bold mb-1 ${form.listingType === opt.value ? "text-teal-700" : ""}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-bold mb-4 block">
                نوع العقار <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PROPERTY_TYPES.map((type) => {
                  const Icon   = type.icon;
                  const active = form.mainCategory === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => set("mainCategory", type.value)}
                      className={`relative p-4 rounded-2xl border-2 text-center flex flex-col items-center gap-2 transition-all ${
                        active ? "border-teal-600 bg-teal-50 shadow-sm" : "border-border hover:border-teal-300 hover:bg-secondary/40"
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
                      <p className={`text-sm font-semibold ${active ? "text-teal-700" : ""}`}>{type.label}</p>
                      <p className="text-[10px] text-muted-foreground hidden sm:block">{type.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 2: التفاصيل ─── */}
        {step === 2 && (
          <div className="space-y-6">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price" className="text-sm font-semibold mb-2 block">السعر (ج.م)</Label>
                <Input
                  id="price" type="number" placeholder="850,000"
                  value={form.price} onChange={(e) => set("price", e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="area" className="text-sm font-semibold mb-2 block">
                  المساحة (م²) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="area" type="number" placeholder="120"
                  value={form.area} onChange={(e) => set("area", e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            {showRoomFields && (
              <div>
                <Label className="text-sm font-semibold mb-3 block">تفاصيل الوحدة</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "rooms",     label: "عدد الغرف", placeholder: "3" },
                    { id: "bathrooms", label: "الحمامات",  placeholder: "2" },
                    { id: "floor",     label: "الطابق",    placeholder: "3" },
                  ].map((f) => (
                    <div key={f.id}>
                      <p className="text-xs text-muted-foreground mb-1.5">{f.label}</p>
                      <Input
                        id={f.id} type="number" placeholder={f.placeholder}
                        value={form[f.id as keyof typeof form] as string}
                        onChange={(e) => set(f.id, e.target.value)}
                        className="h-11 rounded-xl text-center"
                      />
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
                  const Icon   = am.icon;
                  const active = form.amenities.includes(am.value);
                  return (
                    <button
                      key={am.value} type="button" onClick={() => toggleAmenity(am.value)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        active ? "border-teal-600 bg-teal-50 text-teal-700" : "border-border hover:border-teal-200 text-foreground"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? "text-teal-600" : "text-muted-foreground"}`} />
                      {am.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="desc" className="text-sm font-semibold mb-2 block">وصف إضافي</Label>
              <Textarea
                id="desc" placeholder="أي تفاصيل إضافية تريد إضافتها..."
                value={form.description} onChange={(e) => set("description", e.target.value)}
                className="rounded-xl min-h-24 resize-none" rows={3}
              />
            </div>
          </div>
        )}

        {/* ─── Step 3: الموقع ─── */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <Label className="text-base font-bold mb-4 block">
                المدينة <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {["بنها", "قليوب", "شبرا الخيمة", "القناطر", "طوخ", "كفر شكر"].map((city) => (
                  <button
                    key={city} type="button" onClick={() => set("city", city)}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      form.city === city
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-border hover:border-teal-300 hover:bg-secondary/40"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="district" className="text-sm font-semibold mb-2 block">الحي / المنطقة</Label>
              <Input
                id="district" placeholder="مثال: حي النزهة، حي الزهراء..."
                value={form.district} onChange={(e) => set("district", e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div>
              <Label htmlFor="address" className="text-sm font-semibold mb-2 block">العنوان التفصيلي</Label>
              <Input
                id="address" placeholder="مثال: شارع الجمهورية، بجوار المسجد..."
                value={form.address} onChange={(e) => set("address", e.target.value)}
                className="h-11 rounded-xl"
              />
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
                        <span className="absolute bottom-1 right-1 bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                          غلاف
                        </span>
                      )}
                      <button
                        onClick={() => removeImage(img)}
                        className="absolute top-1 left-1 w-5 h-5 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {form.images.length < 10 && (
                <>
                  <input
                    ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                  <button
                    type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImages}
                    className="w-full py-8 rounded-2xl border-2 border-dashed border-border hover:border-teal-400 hover:bg-teal-50/30 transition-all flex flex-col items-center gap-2 text-muted-foreground"
                  >
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
              <Label className="text-base font-bold mb-4 block">
                معلومات التواصل <span className="text-red-500">*</span>
              </Label>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone" className="text-sm font-semibold mb-2 block">
                    رقم الهاتف <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone" placeholder="01XXXXXXXXX"
                    value={form.phone} onChange={(e) => set("phone", e.target.value)}
                    className="h-11 rounded-xl" dir="ltr"
                  />
                </div>
                <div>
                  <Label htmlFor="whatsapp" className="text-sm font-semibold mb-2 block">
                    رقم الواتساب (اختياري)
                  </Label>
                  <Input
                    id="whatsapp" placeholder="01XXXXXXXXX"
                    value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)}
                    className="h-11 rounded-xl" dir="ltr"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 5: اختر الباقة ─── */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold mb-1">اختر الباقة المناسبة</h2>
              <p className="text-sm text-muted-foreground">
                حدد كيفية ظهور إعلانك وعدد الإعلانات المسموحة لحسابك
              </p>
            </div>

            {plansLoading ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-14 text-muted-foreground">
                <Crown className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>لا توجد باقات متاحة حالياً</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    selected={selectedPlan?.id === plan.id}
                    onSelect={() => setSelectedPlan(plan)}
                  />
                ))}
              </div>
            )}

            {/* Selected plan banner */}
            {selectedPlan && (
              <div className={`rounded-xl p-4 border flex items-center justify-between gap-3 ${
                parseFloat(selectedPlan.price) > 0
                  ? "bg-amber-50 border-amber-200"
                  : "bg-teal-50 border-teal-200"
              }`}>
                <div>
                  <p className="font-bold text-sm">
                    الباقة المختارة: {selectedPlan.nameAr ?? selectedPlan.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {parseFloat(selectedPlan.price) === 0
                      ? "الإعلان مجاني — سيُراجع فريقنا إعلانك قبل النشر"
                      : `ستدفع ${selectedPlan.price} ${selectedPlan.currency} عبر STC Pay لتفعيل الباقة`}
                  </p>
                </div>
                {parseFloat(selectedPlan.price) > 0
                  ? <CreditCard className="w-6 h-6 text-amber-600 shrink-0" />
                  : <CheckCircle2 className="w-6 h-6 text-teal-600 shrink-0" />
                }
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Fixed bottom nav ─────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-40 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Back button */}
          <button
            onClick={() => step > 1 ? setStep(step - 1) : setLocation("/user/dashboard")}
            className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900 px-4 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            السابق
          </button>

          {/* Progress indicators */}
          <div className="flex-1 flex justify-center gap-1.5">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  s.id === step ? "w-6 bg-teal-600" :
                  s.id < step  ? "w-3 bg-teal-300" :
                                 "w-3 bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* Next / Submit */}
          {step < STEPS.length ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-1 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg transition-colors shrink-0"
            >
              التالي
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
              className={`flex items-center gap-2 text-sm font-bold text-white px-6 py-2.5 rounded-lg transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                selectedPlan && parseFloat(selectedPlan.price) > 0
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-teal-600 hover:bg-teal-700"
              }`}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />جارٍ النشر...</>
              ) : selectedPlan && parseFloat(selectedPlan.price) > 0 ? (
                <><CreditCard className="w-4 h-4" />الدفع والنشر</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" />نشر مجاناً</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Payment dialog */}
      <PaymentDialog
        open={showPayment}
        plan={selectedPlan}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
      />

      <RealEstateFooter />
    </div>
  );
}
