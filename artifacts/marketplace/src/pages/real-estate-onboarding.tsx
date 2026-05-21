import { useState, useRef, useCallback, useEffect, DragEvent } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/Header";
import {
  Home, Building2, TreePine, Check, ChevronLeft, ChevronRight,
  Upload, X, Loader2, CheckCircle2, Star, Crown, Zap, Shield,
  Navigation, GripVertical, Play, FileText, Image as ImageIcon,
  MapPin, Maximize2, BedDouble, Bath, Layers, Calendar, Sparkles,
  CreditCard, Wallet, ArrowLeftRight, Banknote, AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, type Region, type Package } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const DRAFT_KEY = "re_onboarding_v2_draft";
const TOTAL_STEPS = 4;

const MAIN_CATEGORIES = [
  {
    id: "residential", label: "سكني", desc: "شقق، فيلات، دوبلكس وأكثر",
    icon: Home, gradient: "from-teal-500 to-teal-600", bg: "bg-teal-50", border: "border-teal-200",
  },
  {
    id: "commercial", label: "تجاري", desc: "محلات، مكاتب، عيادات",
    icon: Building2, gradient: "from-amber-500 to-amber-600", bg: "bg-amber-50", border: "border-amber-200",
  },
  {
    id: "land", label: "أراضي", desc: "سكنية، تجارية، زراعية",
    icon: TreePine, gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200",
  },
];

const SUB_CATEGORIES: Record<string, { id: string; label: string; icon: string }[]> = {
  residential: [
    { id: "شقة", label: "شقة", icon: "🏢" },
    { id: "فيلا", label: "فيلا", icon: "🏡" },
    { id: "دوبلكس", label: "دوبلكس", icon: "🏘️" },
    { id: "بنتهاوس", label: "بنتهاوس", icon: "🏙️" },
    { id: "تاون هاوس", label: "تاون هاوس", icon: "🏠" },
    { id: "توين هاوس", label: "توين هاوس", icon: "🏗️" },
    { id: "استوديو", label: "استوديو", icon: "🛋️" },
    { id: "شاليه", label: "شاليه", icon: "🌊" },
  ],
  commercial: [
    { id: "محل", label: "محل تجاري", icon: "🏪" },
    { id: "مكتب", label: "مكتب", icon: "🏢" },
    { id: "عيادة", label: "عيادة", icon: "🏥" },
    { id: "مطعم", label: "مطعم", icon: "🍽️" },
    { id: "كافيه", label: "كافيه", icon: "☕" },
    { id: "مخزن", label: "مخزن", icon: "📦" },
    { id: "مصنع", label: "مصنع", icon: "🏭" },
  ],
  land: [
    { id: "أرض سكنية", label: "سكنية", icon: "🏠" },
    { id: "أرض تجارية", label: "تجارية", icon: "🏪" },
    { id: "أرض زراعية", label: "زراعية", icon: "🌾" },
    { id: "أرض صناعية", label: "صناعية", icon: "🏭" },
  ],
};

const LISTING_TYPES = [
  { id: "sale", label: "للبيع", emoji: "🏷️", color: "from-blue-500 to-blue-600" },
  { id: "rent", label: "للإيجار", emoji: "🔑", color: "from-violet-500 to-violet-600" },
];

const FINISHING_OPTIONS = ["سوبر لوكس", "لوكس", "عادي", "بدون تشطيب", "تشطيب جزئي"];
const CONDITION_OPTIONS = ["جديد", "ممتاز", "جيد جداً", "جيد", "يحتاج تجديد"];
const FURNISHED_OPTIONS = ["مفروش بالكامل", "مفروش جزئياً", "غير مفروش"];
const DIRECTION_OPTIONS = ["شمالي", "جنوبي", "شرقي", "غربي", "شمالي شرقي", "شمالي غربي", "جنوبي شرقي", "جنوبي غربي"];
const PAYMENT_METHODS = ["دفعة واحدة", "أقساط شهرية", "أقساط سنوية", "قابل للتفاوض"];

const PROPERTY_FEATURES = [
  "مسبح", "جراج مغطى", "حديقة خاصة", "مصعد", "شرفة", "مكيف مركزي",
  "أمن 24 ساعة", "غرفة خادمة", "غرفة سائق", "مستودع", "بوابة ذكية",
  "نظام منزل ذكي", "مطبخ مجهز", "غرفة غسيل", "طاقة شمسية", "موقف خاص",
  "صالة رياضية", "ملعب", "مسجد", "مصلى",
];

const NEARBY_SERVICES = [
  "مدارس", "مستشفيات", "مراكز تجارية", "مساجد", "مطاعم", "صيدليات",
  "بنوك وصرافات", "حدائق عامة", "محطات وقود", "مواصلات عامة",
  "نوادي رياضية", "سوبر ماركت",
];

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  card: <CreditCard className="w-5 h-5" />,
  wallet: <Wallet className="w-5 h-5" />,
  transfer: <ArrowLeftRight className="w-5 h-5" />,
  cash: <Banknote className="w-5 h-5" />,
};

interface FormDraft {
  mainCategory: string;
  listingType: string;
  subCategory: string;
  locRegionId: number | null;
  locCityId: number | null;
  locCityName: string | null;
  locDistrict: string;
  locAddress: string;
  locLat: string;
  locLng: string;
  propTitle: string;
  propDesc: string;
  propPrice: string;
  propArea: string;
  propRooms: string;
  propBathrooms: string;
  propFloor: string;
  propTotalFloors: string;
  propBuildYear: string;
  propFinishing: string;
  propCondition: string;
  propFurnished: string;
  propDirection: string;
  propPaymentMethod: string;
  features: string[];
  nearbyServices: string[];
  images: string[];
  mainImageIdx: number;
  videoUrl: string;
  plan: number | null;
  paymentMethod: string;
}

const defaultDraft: FormDraft = {
  mainCategory: "", listingType: "", subCategory: "",
  locRegionId: null, locCityId: null, locCityName: null,
  locDistrict: "", locAddress: "", locLat: "", locLng: "",
  propTitle: "", propDesc: "", propPrice: "", propArea: "",
  propRooms: "", propBathrooms: "", propFloor: "", propTotalFloors: "",
  propBuildYear: "", propFinishing: "", propCondition: "", propFurnished: "",
  propDirection: "", propPaymentMethod: "",
  features: [], nearbyServices: [], images: [], mainImageIdx: 0,
  videoUrl: "", plan: null, paymentMethod: "card",
};

function loadDraft(): FormDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return { ...defaultDraft, ...JSON.parse(raw) };
  } catch {}
  return { ...defaultDraft };
}

/* ─── Step Progress Bar ─── */
function StepBar({ step }: { step: number }) {
  const steps = [
    { label: "نوع العقار", icon: Home },
    { label: "التفاصيل", icon: FileText },
    { label: "الصور والفيديو", icon: ImageIcon },
    { label: "الباقة والنشر", icon: Star },
  ];
  return (
    <div className="w-full bg-white border-b border-zinc-100 sticky top-0 z-30">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const num = i + 1;
            const active = step === num;
            const done = step > num;
            return (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shrink-0
                    ${done ? "bg-primary text-white" : active ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110" : "bg-zinc-100 text-zinc-400"}`}>
                    {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[10px] font-semibold whitespace-nowrap hidden sm:block transition-colors ${active ? "text-primary" : done ? "text-zinc-500" : "text-zinc-300"}`}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 rounded-full transition-all duration-500 ${done ? "bg-primary" : "bg-zinc-100"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function RealEstateOnboarding() {
  const [step, setStep] = useState<number>(1);
  const [, setLocation] = useLocation();
  const { user, refetch: refetchAuth, setUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const imageFilesRef = useRef<File[]>([]);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<FormDraft>(loadDraft);

  const { data: packages = [] } = useQuery<Package[]>({
    queryKey: ["packages"],
    queryFn: api.packages.list,
    staleTime: 5 * 60_000,
  });

  const { data: regionsList = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: api.regions.list,
    staleTime: 5 * 60_000,
  });

  const updateDraft = useCallback((patch: Partial<FormDraft>) => {
    setDraft(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Auto-login as provider
  const providerSessionRef = useRef(false);
  useEffect(() => {
    if (!user || user.role === "admin" || providerSessionRef.current) return;
    providerSessionRef.current = true;
    (async () => {
      try {
        const me = await api.auth.becomeProvider();
        setUser(me as any);
      } catch {
        providerSessionRef.current = false;
      }
    })();
  }, [user?.id, setUser]);

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50" dir="rtl">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <p className="text-lg font-semibold text-zinc-700">يجب تسجيل الدخول أولاً</p>
            <Button onClick={() => setLocation("/login?returnTo=/real-estate-onboarding")}>تسجيل الدخول</Button>
          </div>
        </div>
      </div>
    );
  }

  const selectedRegion = (regionsList as Region[]).find(r => r.id === draft.locRegionId);
  const cityList = selectedRegion?.cities ?? [];
  const isLand = draft.mainCategory === "land";
  const isResidential = draft.mainCategory === "residential";
  const isCommercial = draft.mainCategory === "commercial";
  const sortedPackages = [...packages].sort((a, b) => a.priorityRank - b.priorityRank);

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!draft.mainCategory) e.mainCategory = "اختر تصنيف العقار";
      if (!draft.listingType) e.listingType = "اختر نوع الصفقة";
      if (!draft.subCategory) e.subCategory = "اختر النوع الفرعي";
    } else if (s === 2) {
      if (!draft.propTitle.trim()) e.propTitle = "عنوان الإعلان مطلوب";
      if (!draft.propPrice.trim()) e.propPrice = "السعر مطلوب";
      if (!draft.propArea.trim()) e.propArea = "المساحة مطلوبة";
      if (!draft.locRegionId) e.region = "المنطقة مطلوبة";
      if (!draft.locCityId) e.city = "المدينة مطلوبة";
    } else if (s === 3) {
      if (draft.images.length === 0) e.images = "أضف صورة واحدة على الأقل";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate(step) && step < TOTAL_STEPS) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
  };

  /* ── Image handling ── */
  const addFiles = (files: File[]) => {
    const remaining = 20 - draft.images.length;
    const toAdd = files.filter(f => f.type.startsWith("image/")).slice(0, remaining);
    if (!toAdd.length) return;
    imageFilesRef.current = [...imageFilesRef.current, ...toAdd];
    const previews = toAdd.map(f => URL.createObjectURL(f));
    updateDraft({ images: [...draft.images, ...previews] });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

  const handleDropZone = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const removeImage = (idx: number) => {
    imageFilesRef.current = imageFilesRef.current.filter((_, i) => i !== idx);
    const newImages = draft.images.filter((_, i) => i !== idx);
    const newMain = draft.mainImageIdx >= newImages.length ? Math.max(0, newImages.length - 1) : draft.mainImageIdx;
    updateDraft({ images: newImages, mainImageIdx: newMain });
  };

  /* ── Drag to reorder ── */
  const handleImageDragStart = (e: DragEvent<HTMLDivElement>, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleImageDragOver = (e: DragEvent<HTMLDivElement>, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handleImageDrop = (e: DragEvent<HTMLDivElement>, toIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); setDragOverIdx(null); return; }
    const imgs = [...draft.images];
    const files = [...imageFilesRef.current];
    const [img] = imgs.splice(dragIdx, 1);
    const [file] = files.splice(dragIdx, 1);
    imgs.splice(toIdx, 0, img);
    files.splice(toIdx, 0, file);
    imageFilesRef.current = files;
    let newMain = draft.mainImageIdx;
    if (newMain === dragIdx) newMain = toIdx;
    else if (dragIdx < newMain && toIdx >= newMain) newMain--;
    else if (dragIdx > newMain && toIdx <= newMain) newMain++;
    updateDraft({ images: imgs, mainImageIdx: newMain });
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const toggleFeature = (f: string) => {
    updateDraft({ features: draft.features.includes(f) ? draft.features.filter(x => x !== f) : [...draft.features, f] });
  };
  const toggleNearby = (s: string) => {
    updateDraft({ nearbyServices: draft.nearbyServices.includes(s) ? draft.nearbyServices.filter(x => x !== s) : [...draft.nearbyServices, s] });
  };

  const getGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => { updateDraft({ locLat: String(pos.coords.latitude.toFixed(7)), locLng: String(pos.coords.longitude.toFixed(7)) }); toast.success("تم تحديد موقعك"); },
      () => toast.error("تعذر الوصول إلى الموقع"),
    );
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    setSubmitting(true);
    setUploadProgress(0);
    try {
      let providerId = user.providerId;
      if (!providerId) {
        const me = await api.auth.becomeProvider();
        providerId = (me as any).providerId;
        if (providerId) setUser(me as any);
      }
      if (!providerId) {
        toast.error("لم يُعثر على ملف المعلن. أعد تحميل الصفحة.");
        return;
      }

      const uploadedImages: string[] = [];
      for (let i = 0; i < imageFilesRef.current.length; i++) {
        try {
          const up = await api.upload.propertyImage(imageFilesRef.current[i]);
          uploadedImages.push(up.url);
        } catch {}
        setUploadProgress(Math.round(((i + 1) / imageFilesRef.current.length) * 70));
      }

      await api.properties.create({
        providerId,
        title: draft.propTitle,
        description: draft.propDesc || undefined,
        mainCategory: draft.mainCategory,
        listingType: draft.listingType,
        subCategory: draft.subCategory || undefined,
        price: draft.propPrice || undefined,
        area: draft.propArea || undefined,
        rooms: draft.propRooms ? parseInt(draft.propRooms) : undefined,
        bathrooms: draft.propBathrooms ? parseInt(draft.propBathrooms) : undefined,
        floor: draft.propFloor ? parseInt(draft.propFloor) : undefined,
        totalFloors: draft.propTotalFloors ? parseInt(draft.propTotalFloors) : undefined,
        buildYear: draft.propBuildYear ? parseInt(draft.propBuildYear) : undefined,
        finishing: draft.propFinishing || undefined,
        condition: draft.propCondition || undefined,
        furnished: draft.propFurnished || undefined,
        direction: draft.propDirection || undefined,
        paymentMethod: draft.propPaymentMethod || undefined,
        address: draft.locAddress || undefined,
        regionId: draft.locRegionId ?? undefined,
        cityId: draft.locCityId ?? undefined,
        district: draft.locDistrict || undefined,
        latitude: draft.locLat || undefined,
        longitude: draft.locLng || undefined,
        images: uploadedImages,
        videoUrl: draft.videoUrl || undefined,
        features: draft.features,
        nearbyServices: draft.nearbyServices,
        mainImageIdx: draft.mainImageIdx,
      });

      setUploadProgress(90);

      if (draft.plan !== null) {
        try { await api.subscriptions.subscribe(providerId, draft.plan); } catch {}
      }

      setUploadProgress(100);
      await refetchAuth();
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      toast.success("تم نشر عقارك بنجاح!");
      setStep(10);
    } catch (err: any) {
      toast.error(err?.message ?? "حدث خطأ غير متوقع");
    } finally {
      setSubmitting(false);
    }
  };

  /* ═══════════════════════════════════════════
      SUCCESS SCREEN
  ═══════════════════════════════════════════ */
  if (step === 10) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 flex flex-col" dir="rtl">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-500">
            <div className="w-28 h-28 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xl shadow-emerald-100">
              <CheckCircle2 className="w-16 h-16" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-zinc-800 mb-2">تم نشر عقارك بنجاح! 🎉</h1>
              <p className="text-zinc-500 text-base leading-relaxed">
                سيتم مراجعة إعلانك وتفعيله من قِبَل فريقنا خلال ساعات قليلة.
              </p>
            </div>
            <div className="space-y-3 pt-2">
              <Button size="lg" className="w-full h-14 rounded-2xl text-base font-bold shadow-lg shadow-primary/20" onClick={() => setLocation("/dashboard")}>
                <Building2 className="w-5 h-5 ml-2" />
                لوحة التحكم
              </Button>
              <Button variant="outline" size="lg" className="w-full h-12 rounded-2xl" onClick={() => { setStep(1); setDraft({ ...defaultDraft }); imageFilesRef.current = []; }}>
                نشر عقار آخر
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
      STEP 1 — نوع العقار
  ═══════════════════════════════════════════ */
  const renderStep1 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-400">
      {/* Main Category */}
      <div>
        <h2 className="text-xl font-bold text-zinc-800 mb-1">ما نوع العقار؟</h2>
        <p className="text-zinc-500 text-sm mb-5">اختر التصنيف الرئيسي للعقار</p>
        {errors.mainCategory && <p className="text-sm text-red-500 flex items-center gap-1 mb-3"><AlertCircle className="w-4 h-4" />{errors.mainCategory}</p>}
        <div className="grid grid-cols-3 gap-4">
          {MAIN_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const sel = draft.mainCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => updateDraft({ mainCategory: cat.id, subCategory: "" })}
                className={`relative p-5 rounded-2xl border-2 transition-all duration-200 text-center group flex flex-col items-center gap-3
                  ${sel ? `border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]` : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"}`}
              >
                {sel && (
                  <div className="absolute top-2.5 left-2.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${cat.gradient} shadow-lg`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className={`font-bold text-base ${sel ? "text-primary" : "text-zinc-700"}`}>{cat.label}</p>
                  <p className="text-xs text-zinc-400 mt-0.5 hidden sm:block">{cat.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Listing Type */}
      {draft.mainCategory && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-400">
          <h3 className="text-lg font-bold text-zinc-800 mb-1">نوع الصفقة</h3>
          <p className="text-zinc-500 text-sm mb-4">بيع أم إيجار؟</p>
          {errors.listingType && <p className="text-sm text-red-500 flex items-center gap-1 mb-2"><AlertCircle className="w-4 h-4" />{errors.listingType}</p>}
          <div className="grid grid-cols-2 gap-4">
            {LISTING_TYPES.map(lt => {
              const sel = draft.listingType === lt.id;
              return (
                <button
                  key={lt.id}
                  type="button"
                  onClick={() => updateDraft({ listingType: lt.id })}
                  className={`p-5 rounded-2xl border-2 transition-all duration-200 flex items-center gap-3 font-bold text-base
                    ${sel ? "border-primary bg-primary/5 shadow-md shadow-primary/10" : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"}`}
                >
                  <span className="text-3xl">{lt.emoji}</span>
                  <span className={sel ? "text-primary" : "text-zinc-700"}>{lt.label}</span>
                  {sel && <Check className="w-5 h-5 text-primary mr-auto" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub Categories */}
      {draft.mainCategory && draft.listingType && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-400">
          <h3 className="text-lg font-bold text-zinc-800 mb-1">النوع الفرعي</h3>
          <p className="text-zinc-500 text-sm mb-4">حدد نوع العقار بدقة</p>
          {errors.subCategory && <p className="text-sm text-red-500 flex items-center gap-1 mb-2"><AlertCircle className="w-4 h-4" />{errors.subCategory}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {(SUB_CATEGORIES[draft.mainCategory] ?? []).map((sub, i) => {
              const sel = draft.subCategory === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => updateDraft({ subCategory: sub.id })}
                  style={{ animationDelay: `${i * 50}ms` }}
                  className={`p-3.5 rounded-xl border-2 transition-all duration-200 text-center animate-in fade-in zoom-in-95
                    ${sel ? "border-primary bg-primary/5 shadow-md" : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"}`}
                >
                  <div className="text-2xl mb-1.5">{sub.icon}</div>
                  <p className={`text-sm font-semibold ${sel ? "text-primary" : "text-zinc-600"}`}>{sub.label}</p>
                  {sel && <div className="w-4 h-4 rounded-full bg-primary mx-auto mt-1.5 flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  /* ═══════════════════════════════════════════
      STEP 2 — تفاصيل العقار
  ═══════════════════════════════════════════ */
  const renderStep2 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-400">

      {/* Location */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-zinc-800">الموقع</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-semibold text-zinc-700 mb-1.5 block">المنطقة *</Label>
            <Select value={draft.locRegionId ? String(draft.locRegionId) : "__"} onValueChange={v => {
              if (v === "__") { updateDraft({ locRegionId: null, locCityId: null, locCityName: null }); return; }
              updateDraft({ locRegionId: parseInt(v), locCityId: null, locCityName: null });
            }}>
              <SelectTrigger className={`h-11 rounded-xl ${errors.region ? "border-red-400" : ""}`}>
                <SelectValue placeholder="اختر المنطقة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__">— اختر المنطقة —</SelectItem>
                {(regionsList as Region[]).map(r => <SelectItem key={r.id} value={String(r.id)}>{r.nameAr}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.region && <p className="text-xs text-red-500 mt-1">{errors.region}</p>}
          </div>
          <div>
            <Label className="text-sm font-semibold text-zinc-700 mb-1.5 block">المدينة / المحافظة *</Label>
            {!draft.locRegionId ? (
              <div className="h-11 flex items-center px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-400 text-sm">اختر المنطقة أولاً</div>
            ) : (
              <Select value={draft.locCityId ? String(draft.locCityId) : "__"} onValueChange={v => {
                if (v === "__") { updateDraft({ locCityId: null, locCityName: null }); return; }
                const id = parseInt(v);
                const city = (cityList as any[]).find(c => c.id === id);
                updateDraft({ locCityId: id, locCityName: city?.nameAr ?? null });
              }}>
                <SelectTrigger className={`h-11 rounded-xl ${errors.city ? "border-red-400" : ""}`}>
                  <SelectValue placeholder="اختر المدينة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__">— اختر المدينة —</SelectItem>
                  {(cityList as any[]).map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.nameAr}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
          </div>
          <div>
            <Label className="text-sm font-semibold text-zinc-700 mb-1.5 block">الحي / المنطقة الفرعية</Label>
            <Input value={draft.locDistrict} onChange={e => updateDraft({ locDistrict: e.target.value })} placeholder="مثال: حي النرجس" className="h-11 rounded-xl" />
          </div>
          <div>
            <Label className="text-sm font-semibold text-zinc-700 mb-1.5 block">العنوان التفصيلي</Label>
            <div className="flex gap-2">
              <Input value={draft.locAddress} onChange={e => updateDraft({ locAddress: e.target.value })} placeholder="الشارع والعنوان" className="h-11 rounded-xl flex-1" />
              <button type="button" onClick={getGPS} title="تحديد موقعي" className="h-11 px-3 rounded-xl border border-zinc-200 hover:bg-primary/5 hover:border-primary/30 transition-colors shrink-0">
                <Navigation className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Property Info */}
      <section className="border-t border-zinc-100 pt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-zinc-800">تفاصيل الإعلان</h2>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold text-zinc-700 mb-1.5 block">عنوان الإعلان *</Label>
            <Input value={draft.propTitle} onChange={e => { updateDraft({ propTitle: e.target.value }); setErrors(prev => ({ ...prev, propTitle: "" })); }}
              placeholder={`مثال: ${draft.subCategory || "شقة"} ${draft.listingType === "sale" ? "للبيع" : "للإيجار"} — ${draft.locCityName ?? "بنها"}`}
              className={`h-12 rounded-xl ${errors.propTitle ? "border-red-400" : ""}`} />
            {errors.propTitle && <p className="text-xs text-red-500 mt-1">{errors.propTitle}</p>}
          </div>
          <div>
            <Label className="text-sm font-semibold text-zinc-700 mb-1.5 block">وصف العقار</Label>
            <Textarea value={draft.propDesc} onChange={e => updateDraft({ propDesc: e.target.value })}
              placeholder="اكتب وصفاً تفصيلياً يساعد المشترين على فهم مميزات العقار..."
              className="resize-none h-28 rounded-xl" maxLength={2000} />
            <p className="text-xs text-zinc-400 mt-1 text-left" dir="ltr">{draft.propDesc.length}/2000</p>
          </div>
        </div>
      </section>

      {/* Numeric Details */}
      <section className="border-t border-zinc-100 pt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Maximize2 className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-zinc-800">المواصفات</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5 block">
              <span className="text-base">💰</span> السعر (جنيه) *
            </Label>
            <Input inputMode="numeric" value={draft.propPrice} onChange={e => { updateDraft({ propPrice: e.target.value.replace(/\D/g, "") }); setErrors(prev => ({ ...prev, propPrice: "" })); }}
              placeholder="مثال: 850000" className={`h-11 rounded-xl font-mono ${errors.propPrice ? "border-red-400" : ""}`} dir="ltr" />
            {errors.propPrice && <p className="text-xs text-red-500 mt-1">{errors.propPrice}</p>}
          </div>
          <div>
            <Label className="text-sm font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5 block">
              <Maximize2 className="w-3.5 h-3.5 text-zinc-400" /> المساحة (م²) *
            </Label>
            <Input inputMode="numeric" value={draft.propArea} onChange={e => { updateDraft({ propArea: e.target.value.replace(/\D/g, "") }); setErrors(prev => ({ ...prev, propArea: "" })); }}
              placeholder="مثال: 120" className={`h-11 rounded-xl font-mono ${errors.propArea ? "border-red-400" : ""}`} dir="ltr" />
            {errors.propArea && <p className="text-xs text-red-500 mt-1">{errors.propArea}</p>}
          </div>

          {!isLand && (
            <>
              {isResidential && (
                <div>
                  <Label className="text-sm font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5 block">
                    <BedDouble className="w-3.5 h-3.5 text-zinc-400" /> عدد الغرف
                  </Label>
                  <Input inputMode="numeric" value={draft.propRooms} onChange={e => updateDraft({ propRooms: e.target.value.replace(/\D/g, "") })} placeholder="3" className="h-11 rounded-xl font-mono" dir="ltr" />
                </div>
              )}
              {(isResidential || isCommercial) && (
                <div>
                  <Label className="text-sm font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5 block">
                    <Bath className="w-3.5 h-3.5 text-zinc-400" /> عدد الحمامات
                  </Label>
                  <Input inputMode="numeric" value={draft.propBathrooms} onChange={e => updateDraft({ propBathrooms: e.target.value.replace(/\D/g, "") })} placeholder="2" className="h-11 rounded-xl font-mono" dir="ltr" />
                </div>
              )}
              <div>
                <Label className="text-sm font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5 block">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" /> رقم الدور
                </Label>
                <Input inputMode="numeric" value={draft.propFloor} onChange={e => updateDraft({ propFloor: e.target.value.replace(/\D/g, "") })} placeholder="3" className="h-11 rounded-xl font-mono" dir="ltr" />
              </div>
              <div>
                <Label className="text-sm font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5 block">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" /> عدد الأدوار الكلي
                </Label>
                <Input inputMode="numeric" value={draft.propTotalFloors} onChange={e => updateDraft({ propTotalFloors: e.target.value.replace(/\D/g, "") })} placeholder="10" className="h-11 rounded-xl font-mono" dir="ltr" />
              </div>
            </>
          )}

          <div>
            <Label className="text-sm font-semibold text-zinc-700 mb-1.5 flex items-center gap-1.5 block">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" /> سنة البناء
            </Label>
            <Input inputMode="numeric" value={draft.propBuildYear} onChange={e => updateDraft({ propBuildYear: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="2022" className="h-11 rounded-xl font-mono" dir="ltr" />
          </div>
        </div>
      </section>

      {/* Dropdown selects */}
      {!isLand && (
        <section className="border-t border-zinc-100 pt-8">
          <h3 className="text-base font-bold text-zinc-700 mb-4">التفاصيل الإضافية</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { key: "propFinishing", label: "نوع التشطيب", opts: FINISHING_OPTIONS },
              { key: "propCondition", label: "حالة العقار", opts: CONDITION_OPTIONS },
              ...(isResidential ? [{ key: "propFurnished", label: "الأثاث", opts: FURNISHED_OPTIONS }] : []),
              { key: "propDirection", label: "اتجاه الواجهة", opts: DIRECTION_OPTIONS },
              { key: "propPaymentMethod", label: "نظام الدفع", opts: PAYMENT_METHODS },
            ].map(({ key, label, opts }) => (
              <div key={key}>
                <Label className="text-sm font-semibold text-zinc-700 mb-1.5 block">{label}</Label>
                <Select value={(draft as any)[key] || "__"} onValueChange={v => updateDraft({ [key]: v === "__" ? "" : v } as any)}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder={`اختر ${label}`} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__">— {label} —</SelectItem>
                    {opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      {!isLand && (
        <section className="border-t border-zinc-100 pt-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-zinc-800">مميزات العقار</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {PROPERTY_FEATURES.map(f => {
              const sel = draft.features.includes(f);
              return (
                <button key={f} type="button" onClick={() => toggleFeature(f)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150
                    ${sel ? "bg-primary text-white border-primary shadow-sm" : "border-zinc-200 text-zinc-600 hover:border-primary/40 hover:bg-primary/5"}`}>
                  {f}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Nearby */}
      <section className="border-t border-zinc-100 pt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-zinc-800">الخدمات القريبة</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {NEARBY_SERVICES.map(s => {
            const sel = draft.nearbyServices.includes(s);
            return (
              <button key={s} type="button" onClick={() => toggleNearby(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150
                  ${sel ? "bg-teal-600 text-white border-teal-600 shadow-sm" : "border-zinc-200 text-zinc-600 hover:border-teal-300 hover:bg-teal-50"}`}>
                {s}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );

  /* ═══════════════════════════════════════════
      STEP 3 — الصور والفيديو
  ═══════════════════════════════════════════ */
  const renderStep3 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-400">
      <div>
        <h2 className="text-xl font-bold text-zinc-800 mb-1">الصور والفيديو</h2>
        <p className="text-zinc-500 text-sm">الصور الجيدة تزيد فرص البيع بنسبة 3× — أضف حتى 20 صورة</p>
      </div>

      {/* Drop Zone */}
      <div
        ref={dropZoneRef}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDropZone}
        onClick={() => fileInputRef.current?.click()}
        className={`relative w-full aspect-[2/1] rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-4
          ${dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-zinc-300 hover:border-primary/50 hover:bg-zinc-50"}`}
      >
        <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*" onChange={handleFileInput} />
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${dragOver ? "bg-primary/10 text-primary" : "bg-zinc-100 text-zinc-400"}`}>
          <Upload className="w-8 h-8" />
        </div>
        <div className="text-center">
          <p className="font-bold text-zinc-700 text-base">{dragOver ? "أفلت الصور هنا" : "اسحب وأفلت الصور هنا"}</p>
          <p className="text-zinc-400 text-sm mt-1">أو اضغط للاختيار من جهازك</p>
          <p className="text-zinc-300 text-xs mt-2">JPG, PNG, WEBP — حتى 5MB للصورة</p>
        </div>
        {draft.images.length > 0 && (
          <div className="absolute bottom-3 right-3 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {draft.images.length}/20
          </div>
        )}
      </div>

      {errors.images && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.images}</p>}

      {/* Image Grid */}
      {draft.images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-zinc-700">
              {draft.images.length} صورة — اسحب لإعادة الترتيب
            </p>
            <button type="button" onClick={() => { updateDraft({ images: [], mainImageIdx: 0 }); imageFilesRef.current = []; }}
              className="text-xs text-red-500 hover:text-red-600 font-semibold flex items-center gap-1">
              <X className="w-3 h-3" />حذف الكل
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {draft.images.map((src, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={e => handleImageDragStart(e, idx)}
                onDragOver={e => handleImageDragOver(e, idx)}
                onDrop={e => handleImageDrop(e, idx)}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-150 cursor-grab active:cursor-grabbing group
                  ${idx === draft.mainImageIdx ? "border-primary shadow-lg shadow-primary/20" : "border-zinc-200 hover:border-zinc-300"}
                  ${dragOverIdx === idx && dragIdx !== idx ? "scale-[1.03] border-primary/50" : ""}
                  ${dragIdx === idx ? "opacity-50" : "opacity-100"}`}
              >
                <img src={src} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover" />

                {/* Main badge */}
                {idx === draft.mainImageIdx && (
                  <div className="absolute top-1.5 right-1.5 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    رئيسية
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                  <button
                    type="button"
                    onClick={() => updateDraft({ mainImageIdx: idx })}
                    className={`text-[10px] font-bold px-2 py-1 rounded-full transition-colors ${idx === draft.mainImageIdx ? "bg-primary text-white" : "bg-white/90 text-zinc-700 hover:bg-primary hover:text-white"}`}
                  >
                    {idx === draft.mainImageIdx ? "✓ رئيسية" : "اجعلها رئيسية"}
                  </button>
                  <button type="button" onClick={() => removeImage(idx)} className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Drag handle */}
                <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-lg p-1">
                  <GripVertical className="w-3 h-3 text-white" />
                </div>
              </div>
            ))}

            {/* Add more */}
            {draft.images.length < 20 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-zinc-200 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-primary"
              >
                <Upload className="w-5 h-5" />
                <span className="text-xs font-semibold">إضافة</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Video */}
      <section className="border-t border-zinc-100 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
            <Play className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <h3 className="font-bold text-zinc-800">رابط فيديو العقار</h3>
            <p className="text-xs text-zinc-400">اختياري — YouTube أو رابط مباشر</p>
          </div>
        </div>
        <Input
          value={draft.videoUrl}
          onChange={e => updateDraft({ videoUrl: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=..."
          className="h-11 rounded-xl"
          dir="ltr"
        />
      </section>
    </div>
  );

  /* ═══════════════════════════════════════════
      STEP 4 — الباقة والنشر
  ═══════════════════════════════════════════ */
  const renderStep4 = () => {
    const getPkgStyle = (pkg: Package, idx: number) => {
      if (pkg.topBadge || pkg.priorityRank >= 2) return {
        gradient: "from-amber-500 to-orange-500",
        badge: "الأكثر طلباً 🔥",
        icon: <Crown className="w-5 h-5 text-amber-400" />,
        ring: "ring-2 ring-amber-400/60 shadow-xl shadow-amber-100",
        accent: "text-amber-600",
      };
      if (pkg.priorityRank === 1 || idx === 1) return {
        gradient: "from-teal-500 to-cyan-600",
        badge: "الأفضل للمحترفين",
        icon: <Zap className="w-5 h-5 text-teal-400" />,
        ring: "ring-2 ring-teal-400/40 shadow-lg shadow-teal-100",
        accent: "text-teal-600",
      };
      return {
        gradient: "from-slate-400 to-slate-500",
        badge: null,
        icon: <Shield className="w-5 h-5 text-slate-400" />,
        ring: "ring-1 ring-zinc-200",
        accent: "text-slate-500",
      };
    };

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-400">
        <div>
          <h2 className="text-xl font-bold text-zinc-800 mb-1">اختر باقة الإعلان</h2>
          <p className="text-zinc-500 text-sm">الباقات المميزة تضاعف ظهور عقارك أمام المشترين</p>
        </div>

        {/* Packages */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[{ id: null, name: "أساسية", nameAr: "مجاني", price: "0", durationDays: 30, priorityRank: 0, topBadge: false, features: [] } as any, ...sortedPackages].map((pkg, idx) => {
            const style = pkg.id === null
              ? { gradient: "from-zinc-400 to-zinc-500", badge: null, icon: <Shield className="w-5 h-5 text-zinc-400" />, ring: "ring-1 ring-zinc-200", accent: "text-zinc-500" }
              : getPkgStyle(pkg, idx - 1);
            const sel = draft.plan === pkg.id;
            return (
              <div
                key={pkg.id ?? "free"}
                onClick={() => updateDraft({ plan: pkg.id })}
                className={`relative rounded-2xl border bg-white p-5 cursor-pointer transition-all duration-200
                  ${sel ? `${style.ring} border-transparent scale-[1.02]` : "border-zinc-200 hover:border-zinc-300 hover:shadow-md"}`}
              >
                {style.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r ${style.gradient} text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap`}>
                    {style.badge}
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${style.gradient} flex items-center justify-center`}>
                    {style.icon}
                  </div>
                  {sel && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
                <h3 className="font-extrabold text-zinc-800 text-lg">{pkg.nameAr ?? pkg.name}</h3>
                <div className="mt-2 mb-4">
                  <span className={`text-2xl font-extrabold ${style.accent}`}>
                    {pkg.id === null ? "مجاني" : `${Number(pkg.price).toLocaleString("ar")} ج.م`}
                  </span>
                  {pkg.id !== null && <span className="text-zinc-400 text-sm"> / {pkg.durationDays} يوم</span>}
                </div>
                <ul className="space-y-1.5 text-sm text-zinc-500">
                  {pkg.id === null ? (
                    <>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-zinc-400" />نشر العقار</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-zinc-400" />30 يوم</li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" />ظهور مميز</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" />{pkg.durationDays} يوم</li>
                      <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" />عمولة {pkg.commissionRate}%</li>
                    </>
                  )}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Payment Method */}
        <section className="border-t border-zinc-100 pt-6">
          <h3 className="text-base font-bold text-zinc-800 mb-4">طريقة الدفع</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { id: "card", label: "بطاقة" },
              { id: "wallet", label: "محفظة" },
              { id: "transfer", label: "تحويل" },
              { id: "cash", label: "كاش" },
            ].map(pm => {
              const sel = draft.paymentMethod === pm.id;
              return (
                <button key={pm.id} type="button" onClick={() => updateDraft({ paymentMethod: pm.id })}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 text-sm font-semibold
                    ${sel ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"}`}>
                  {PAYMENT_ICONS[pm.id]}
                  {pm.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Summary */}
        <section className="border-t border-zinc-100 pt-6">
          <h3 className="text-base font-bold text-zinc-800 mb-4">ملخص الإعلان</h3>
          <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-100 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">التصنيف</span>
              <span className="font-semibold text-zinc-700">{MAIN_CATEGORIES.find(c => c.id === draft.mainCategory)?.label} — {draft.subCategory}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">النوع</span>
              <span className="font-semibold text-zinc-700">{LISTING_TYPES.find(t => t.id === draft.listingType)?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">الموقع</span>
              <span className="font-semibold text-zinc-700">{draft.locCityName ?? "—"}{draft.locDistrict ? ` — ${draft.locDistrict}` : ""}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">السعر</span>
              <span className="font-bold text-primary text-base">{draft.propPrice ? `${Number(draft.propPrice).toLocaleString("ar")} ج.م` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">المساحة</span>
              <span className="font-semibold text-zinc-700">{draft.propArea ? `${draft.propArea} م²` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">الصور</span>
              <span className="font-semibold text-zinc-700">{draft.images.length} صورة</span>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-3">
              <span className="text-zinc-500">الباقة</span>
              <span className="font-bold text-zinc-800">
                {draft.plan === null ? "مجانية" : sortedPackages.find(p => p.id === draft.plan)?.nameAr ?? "—"}
              </span>
            </div>
          </div>
        </section>

        {/* Upload progress */}
        {submitting && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-semibold text-zinc-600">
              <span>جاري رفع الصور والبيانات…</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          size="lg"
          className="w-full h-14 rounded-2xl text-base font-extrabold shadow-lg shadow-primary/20"
        >
          {submitting
            ? <><Loader2 className="w-5 h-5 ml-2 animate-spin" />جاري النشر…</>
            : <><CheckCircle2 className="w-5 h-5 ml-2" />نشر الإعلان الآن</>}
        </Button>
      </div>
    );
  };

  /* ═══════════════════════════════════════════
      MAIN LAYOUT
  ═══════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-zinc-50" dir="rtl">
      <Header />
      <StepBar step={step} />

      <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </div>

      {/* Fixed bottom nav */}
      {step < 4 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 shadow-xl z-40">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <Button variant="outline" onClick={handleBack} disabled={step === 1} className="h-11 px-6 rounded-xl font-semibold">
              <ChevronRight className="w-4 h-4 ml-1" />
              السابق
            </Button>
            <div className="flex-1 text-center">
              <p className="text-xs text-zinc-400 font-medium">الخطوة {step} من {TOTAL_STEPS}</p>
            </div>
            <Button onClick={handleNext} className="h-11 px-6 rounded-xl font-bold shadow-md shadow-primary/20">
              التالي
              <ChevronLeft className="w-4 h-4 mr-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
