import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  X, Upload, Camera, MapPin, CheckCircle2, ChevronLeft, ChevronRight, Check,
  Phone, MessageCircle, Mail, Video, Building2, Home, Loader2, FileText,
  Plus, Trash2, Star, Navigation, Youtube, Image as ImageIcon, TreePine,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import toast from "react-hot-toast";
import { api, type Region } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const DRAFT_KEY = "re_onboarding_draft";

const MAIN_CATEGORIES = [
  { id: "residential", label: "سكني", icon: Home, color: "from-teal-500 to-teal-600" },
  { id: "commercial", label: "تجاري", icon: Building2, color: "from-amber-500 to-amber-600" },
  { id: "land", label: "أراضي", icon: TreePine, color: "from-emerald-500 to-emerald-600" },
];

const LISTING_TYPES = [
  { id: "sale", label: "للبيع", emoji: "🏷️" },
  { id: "rent", label: "للإيجار", emoji: "🔑" },
];

const SUB_CATEGORIES: Record<string, string[]> = {
  residential: ["شقة", "دوبلكس", "بنتهاوس", "فيلا", "تاون هاوس", "توين هاوس", "استوديو", "شاليه"],
  commercial: ["محل", "مكتب", "عيادة", "مطعم", "كافيه", "مخزن", "مصنع"],
  land: ["أرض سكنية", "أرض تجارية", "أرض زراعية", "أرض صناعية"],
};

const FINISHING_OPTIONS = ["سوبر لوكس", "لوكس", "عادي", "بدون تشطيب", "تشطيب جزئي"];
const CONDITION_OPTIONS = ["جديد", "ممتاز", "جيد جداً", "جيد", "يحتاج تجديد"];
const FURNISHED_OPTIONS = ["مفروش بالكامل", "مفروش جزئياً", "غير مفروش"];
const DIRECTION_OPTIONS = ["شمالي", "جنوبي", "شرقي", "غربي", "شمالي شرقي", "شمالي غربي", "جنوبي شرقي", "جنوبي غربي"];
const PAYMENT_METHODS = ["دفعة واحدة", "أقساط شهرية", "أقساط سنوية", "قابل للتفاوض"];

const PROPERTY_FEATURES = [
  "مسبح", "جراج مغطى", "حديقة خاصة", "مصعد", "شرفة", "مكيف مركزي",
  "أمن 24 ساعة", "غرفة خادمة", "غرفة سائق", "مستودع", "بوابة ذكية",
  "نظام منزل ذكي", "مطبخ مجهز", "غرفة غسيل", "طاقة شمسية", "موقف خاص",
  "صالة رياضية", "ملعب", "مسجد", "مصلى"
];

const NEARBY_SERVICES = [
  "مدارس", "مستشفيات", "مراكز تجارية", "مساجد", "مطاعم", "صيدليات",
  "بنوك وصرافات", "حدائق عامة", "محطات وقود", "مواصلات عامة",
  "نوادي رياضية", "دور العبادة", "أسواق شعبية", "سوبر ماركت"
];

const CONTACT_METHODS = [
  { id: "call", label: "مكالمة هاتفية", icon: Phone },
  { id: "whatsapp", label: "واتساب", icon: MessageCircle },
  { id: "chat", label: "دردشة داخلية", icon: Video },
  { id: "email", label: "بريد إلكتروني", icon: Mail },
];

const TOTAL_STEPS = 9;

type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface FormDraft {
  basicInfo: { name: string; phone: string; email: string; bio: string; avatar: string; cover: string };
  locRegionId: number | null;
  locCityId: number | null;
  locCityName: string | null;
  locDistrict: string;
  locAddress: string;
  locLat: string;
  locLng: string;
  mainCategory: string;
  listingType: string;
  subCategory: string;
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
  images: string[];
  videoUrl: string;
  brochureUrl: string;
  features: string[];
  nearbyServices: string[];
  contactMethods: string[];
  whatsapp: string;
  plan: string;
}

const defaultDraft: FormDraft = {
  basicInfo: { name: "", phone: "", email: "", bio: "", avatar: "", cover: "" },
  locRegionId: null, locCityId: null, locCityName: null,
  locDistrict: "", locAddress: "", locLat: "", locLng: "",
  mainCategory: "", listingType: "", subCategory: "",
  propTitle: "", propDesc: "", propPrice: "", propArea: "",
  propRooms: "", propBathrooms: "", propFloor: "", propTotalFloors: "",
  propBuildYear: "", propFinishing: "", propCondition: "", propFurnished: "",
  propDirection: "", propPaymentMethod: "",
  images: [], videoUrl: "", brochureUrl: "",
  features: [], nearbyServices: [],
  contactMethods: [], whatsapp: "", plan: "free",
};

function loadDraft(): FormDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return { ...defaultDraft, ...JSON.parse(raw) };
  } catch {}
  return { ...defaultDraft };
}

export default function RealEstateOnboarding() {
  const [step, setStep] = useState<number>(1);
  const [, setLocation] = useLocation();
  const { toast: shadToast } = useToast();
  const { user, refetch: refetchAuth, setUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const providerSessionRef = useRef(false);

  const avatarFileRef = useRef<File | null>(null);
  const coverFileRef = useRef<File | null>(null);
  const brochureFileRef = useRef<File | null>(null);
  const imageFilesRef = useRef<File[]>([]);

  const [draft, setDraft] = useState<FormDraft>(loadDraft);

  const updateDraft = useCallback((patch: Partial<FormDraft>) => {
    setDraft(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const updateBasicInfo = (patch: Partial<FormDraft["basicInfo"]>) => {
    updateDraft({ basicInfo: { ...draft.basicInfo, ...patch } });
  };

  const { data: regionsList = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: api.regions.list,
    staleTime: 5 * 60_000,
  });

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
    staleTime: 5 * 60 * 1000,
  });
  const siteName = (settings as any)?.siteName ?? "سمارت لاينز للنظم المتطورة";

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

  useEffect(() => {
    if (!user) return;
    if (!draft.basicInfo.name && user.name) updateBasicInfo({ name: user.name });
    if (!draft.basicInfo.email && user.email) updateBasicInfo({ email: user.email });
    if (!draft.basicInfo.phone && user.phone) updateBasicInfo({ phone: user.phone.replace(/\D/g, "") });
  }, [user?.id]);

  useEffect(() => {
    if (step !== 9 && reviewConfirmed) setReviewConfirmed(false);
  }, [step]);

  const needsRooms = ["residential"].includes(draft.mainCategory);
  const needsFloor = ["residential", "commercial"].includes(draft.mainCategory);
  const isLand = draft.mainCategory === "land";

  const stepLabels = [
    "المعلومات الأساسية", "الموقع", "تصنيف العقار", "النوع الفرعي",
    "تفاصيل العقار", "الوسائط", "المميزات والخدمات",
    "التواصل والباقة", "المراجعة والإرسال",
  ];

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!draft.basicInfo.name.trim()) e.name = "الاسم مطلوب";
      if (!draft.basicInfo.phone.trim()) e.phone = "رقم الجوال مطلوب";
      if (!draft.basicInfo.email.trim()) e.email = "البريد الإلكتروني مطلوب";
    } else if (s === 2) {
      if (!draft.locRegionId) e.region = "يرجى اختيار المنطقة";
      if (!draft.locCityId) e.city = "يرجى اختيار المدينة";
    } else if (s === 3) {
      if (!draft.mainCategory) e.mainCategory = "يرجى اختيار التصنيف الرئيسي";
      if (!draft.listingType) e.listingType = "يرجى اختيار نوع القائمة";
    } else if (s === 4) {
      if (!draft.subCategory) e.subCategory = "يرجى اختيار النوع الفرعي";
      if (!draft.propTitle.trim()) e.propTitle = "اسم العقار مطلوب";
    } else if (s === 5) {
      if (!draft.propPrice.trim()) e.propPrice = "السعر مطلوب";
      if (!draft.propArea.trim()) e.propArea = "المساحة مطلوبة";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate(step)) return;
    if (step < TOTAL_STEPS) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    avatarFileRef.current = f;
    updateBasicInfo({ avatar: URL.createObjectURL(f) });
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    coverFileRef.current = f;
    updateBasicInfo({ cover: URL.createObjectURL(f) });
  };

  const handlePropertyImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = 15 - draft.images.length;
    const toAdd = files.slice(0, remaining);
    imageFilesRef.current = [...imageFilesRef.current, ...toAdd];
    const previews = toAdd.map(f => URL.createObjectURL(f));
    updateDraft({ images: [...draft.images, ...previews] });
  };

  const removeImage = (idx: number) => {
    imageFilesRef.current = imageFilesRef.current.filter((_, i) => i !== idx);
    updateDraft({ images: draft.images.filter((_, i) => i !== idx) });
  };

  const handleBrochureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    brochureFileRef.current = f;
    updateDraft({ brochureUrl: f.name });
  };

  const getGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      updateDraft({ locLat: String(pos.coords.latitude.toFixed(7)), locLng: String(pos.coords.longitude.toFixed(7)) });
      toast.success("تم تحديد موقعك بنجاح");
    }, () => toast.error("تعذر الوصول إلى الموقع"));
  };

  const toggleFeature = (f: string) => {
    const next = draft.features.includes(f) ? draft.features.filter(x => x !== f) : [...draft.features, f];
    updateDraft({ features: next });
  };

  const toggleNearby = (s: string) => {
    const next = draft.nearbyServices.includes(s) ? draft.nearbyServices.filter(x => x !== s) : [...draft.nearbyServices, s];
    updateDraft({ nearbyServices: next });
  };

  const toggleContact = (id: string) => {
    const next = draft.contactMethods.includes(id) ? draft.contactMethods.filter(x => x !== id) : [...draft.contactMethods, id];
    updateDraft({ contactMethods: next });
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("يرجى تسجيل الدخول أولاً");
      return;
    }

    let providerId = user.providerId;
    if (!providerId) {
      try {
        const me = await api.auth.becomeProvider();
        providerId = (me as any).providerId;
        if (providerId) setUser(me as any);
      } catch {}
    }
    if (!providerId) {
      try {
        const me = await api.auth.me();
        providerId = (me as any).providerId;
        if (providerId) setUser(me as any);
      } catch {}
    }
    if (!providerId) {
      toast.error("لم يُعثر على ملف مقدم الخدمة. أعد تحميل الصفحة.");
      return;
    }

    setSubmitting(true);
    try {
      let bannerUrl: string | undefined;
      let avatarUrl: string | undefined;
      let brochureUrl: string | undefined;
      const uploadedImages: string[] = [];

      if (coverFileRef.current) {
        const up = await api.upload.banner(coverFileRef.current);
        bannerUrl = up.url;
      }
      if (avatarFileRef.current) {
        const up = await api.upload.avatar(avatarFileRef.current);
        avatarUrl = up.url;
      }
      if (brochureFileRef.current) {
        const up = await api.upload.brochure(brochureFileRef.current);
        brochureUrl = up.url;
      }
      for (const file of imageFilesRef.current) {
        try {
          const up = await api.upload.propertyImage(file);
          uploadedImages.push(up.url);
        } catch {}
      }

      await api.users.update(user.id, {
        name: draft.basicInfo.name || undefined,
        phone: draft.basicInfo.phone || undefined,
        regionId: draft.locRegionId ?? undefined,
        cityId: draft.locCityId ?? undefined,
      });

      await api.providers.update(providerId, {
        bio: draft.basicInfo.bio || undefined,
        city: draft.locCityName || undefined,
        phone: draft.basicInfo.phone || undefined,
        whatsapp: draft.whatsapp || undefined,
        contactMethods: JSON.stringify(draft.contactMethods),
        ...(bannerUrl ? { banner: bannerUrl } : {}),
        ...(avatarUrl ? { avatar: avatarUrl } : {}),
      });

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
        brochureUrl: brochureUrl || undefined,
        logoUrl: avatarUrl || undefined,
        phone: draft.basicInfo.phone || undefined,
        whatsapp: draft.whatsapp || undefined,
        features: draft.features,
        nearbyServices: draft.nearbyServices,
        contactMethods: draft.contactMethods,
      });

      if (draft.plan !== "free") {
        const packages = await api.packages.list();
        const matchPkg = packages.find(p =>
          draft.plan === "bronze"
            ? parseFloat(p.price) > 0 && parseFloat(p.price) <= 150
            : parseFloat(p.price) > 150
        );
        if (matchPkg) {
          await api.subscriptions.subscribe(providerId, matchPkg.id);
        }
      }

      await refetchAuth();
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      toast.success("تم تسجيل عقارك بنجاح!");
      setStep(10);
    } catch (err: any) {
      toast.error(err?.message ?? "حدث خطأ غير متوقع");
      shadToast({ title: "خطأ", description: err?.message ?? "حدث خطأ", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRegion = (regionsList as Region[]).find(r => r.id === draft.locRegionId);
  const cityList = selectedRegion?.cities ?? [];

  if (step === 10) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-14 h-14" />
          </div>
          <h1 className="text-3xl font-bold">تم تسجيل العقار بنجاح!</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            تم إضافة عقارك وحفظ ملفك الشخصي. سيتم مراجعة العقار وتفعيله من قِبَل فريقنا قريباً.
          </p>
          <div className="pt-4 space-y-3">
            <Button className="w-full h-14 rounded-xl text-lg font-bold shadow-lg" onClick={() => setLocation("/dashboard")}>
              الذهاب إلى لوحة التحكم
            </Button>
            <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => setLocation("/")}>
              العودة إلى الرئيسية
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const renderStep1 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">المعلومات الأساسية</h2>
        <p className="text-muted-foreground text-sm">أخبرنا عن نشاطك العقاري وكيف تُعرّف نفسك للعملاء</p>
      </div>
      <div className="relative mb-12">
        <div className="h-36 w-full rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-dashed border-teal-200 relative overflow-hidden flex items-center justify-center group cursor-pointer hover:border-primary/50 transition-colors">
          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="image/*" onChange={handleCoverUpload} />
          {draft.basicInfo.cover ? (
            <img src={draft.basicInfo.cover} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-muted-foreground group-hover:text-primary transition-colors">
              <Camera className="h-8 w-8 mx-auto mb-1 opacity-50" />
              <span className="text-sm font-medium">إضافة صورة الغلاف / البانر</span>
            </div>
          )}
        </div>
        <div className="absolute -bottom-10 right-6 z-30">
          <div className="h-20 w-20 rounded-full bg-white border-4 border-background shadow-xl overflow-hidden relative group cursor-pointer">
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="image/*" onChange={handleAvatarUpload} />
            {draft.basicInfo.avatar ? (
              <img src={draft.basicInfo.avatar} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/10 flex flex-col items-center justify-center text-primary gap-0.5">
                <Building2 className="h-5 w-5" />
                <span className="text-[9px] font-bold">اللوجو</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-4 pt-4">
        <div>
          <Label htmlFor="re-name">اسم الشركة / السمسار *</Label>
          <Input id="re-name" value={draft.basicInfo.name} onChange={e => updateBasicInfo({ name: e.target.value })} className={`h-12 mt-1 ${errors.name ? "border-destructive" : ""}`} placeholder="مثال: شركة الخليج للعقارات" />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="re-phone">رقم الجوال *</Label>
            <Input id="re-phone" inputMode="numeric" value={draft.basicInfo.phone} onChange={e => { const d = e.target.value.replace(/\D/g, ""); updateBasicInfo({ phone: d }); if (!draft.whatsapp) updateDraft({ whatsapp: d }); }} className={`h-12 mt-1 ${errors.phone ? "border-destructive" : ""}`} placeholder="05xxxxxxxx" dir="ltr" />
            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
          </div>
          <div>
            <Label htmlFor="re-email">البريد الإلكتروني *</Label>
            <Input id="re-email" type="email" value={draft.basicInfo.email} onChange={e => updateBasicInfo({ email: e.target.value })} className={`h-12 mt-1 ${errors.email ? "border-destructive" : ""}`} placeholder="info@company.com" dir="ltr" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
        </div>
        <div>
          <Label htmlFor="re-bio">نبذة تعريفية</Label>
          <Textarea id="re-bio" value={draft.basicInfo.bio} onChange={e => updateBasicInfo({ bio: e.target.value })} placeholder="اكتب نبذة مختصرة عن شركتك ونشاطها العقاري..." className="resize-none h-24 mt-1" />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">الموقع ومنطقة الخدمة</h2>
        <p className="text-muted-foreground text-sm">حدد أين تعمل وأين تقع العقارات التي تتعامل بها</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>المنطقة *</Label>
          <Select value={draft.locRegionId ? String(draft.locRegionId) : "__none__"} onValueChange={v => { if (v === "__none__") { updateDraft({ locRegionId: null, locCityId: null, locCityName: null }); return; } updateDraft({ locRegionId: parseInt(v), locCityId: null, locCityName: null }); }}>
            <SelectTrigger className="h-11 mt-1"><SelectValue placeholder="اختر المنطقة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— اختر المنطقة —</SelectItem>
              {(regionsList as Region[]).map(r => <SelectItem key={r.id} value={String(r.id)}>{r.nameAr}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.region && <p className="text-xs text-destructive mt-1">{errors.region}</p>}
        </div>
        <div>
          <Label>المدينة *</Label>
          {!draft.locRegionId ? (
            <p className="text-sm text-muted-foreground py-3 mt-1">اختر المنطقة أولاً</p>
          ) : (
            <Select value={draft.locCityId ? String(draft.locCityId) : "__none__"} onValueChange={v => { if (v === "__none__") { updateDraft({ locCityId: null, locCityName: null }); return; } const id = parseInt(v); const city = cityList.find((c: any) => c.id === id); updateDraft({ locCityId: id, locCityName: city?.nameAr ?? null }); }}>
              <SelectTrigger className="h-11 mt-1"><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— اختر المدينة —</SelectItem>
                {(cityList as any[]).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nameAr}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="district">الحي / المنطقة</Label>
          <Input id="district" value={draft.locDistrict} onChange={e => updateDraft({ locDistrict: e.target.value })} placeholder="مثال: حي النرجس" className="h-11 mt-1" />
        </div>
        <div>
          <Label htmlFor="address">العنوان التفصيلي</Label>
          <Input id="address" value={draft.locAddress} onChange={e => updateDraft({ locAddress: e.target.value })} placeholder="الشارع والعنوان الكامل" className="h-11 mt-1" />
        </div>
      </div>
      <div>
        <Label className="mb-2 block">تحديد الموقع على الخريطة <span className="text-muted-foreground font-normal text-xs">(اختياري)</span></Label>
        <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={getGPS}>
              <Navigation className="w-4 h-4" /> تحديد موقعي الحالي
            </Button>
            <span className="text-xs text-muted-foreground">أو أدخل الإحداثيات يدوياً</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">خط العرض (Latitude)</Label>
              <Input value={draft.locLat} onChange={e => updateDraft({ locLat: e.target.value })} placeholder="24.7136" className="h-10 mt-1" dir="ltr" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">خط الطول (Longitude)</Label>
              <Input value={draft.locLng} onChange={e => updateDraft({ locLng: e.target.value })} placeholder="46.6753" className="h-10 mt-1" dir="ltr" />
            </div>
          </div>
          {draft.locLat && draft.locLng && (
            <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
              <MapPin className="w-4 h-4" />
              <span>الموقع: {draft.locLat}, {draft.locLng}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">تصنيف العقار</h2>
        <p className="text-muted-foreground text-sm">اختر نوع العقار والغرض منه</p>
      </div>
      <div>
        <Label className="text-base font-semibold mb-3 block">التصنيف الرئيسي *</Label>
        {errors.mainCategory && <p className="text-sm text-destructive mb-2">{errors.mainCategory}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {MAIN_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const selected = draft.mainCategory === cat.id;
            return (
              <button key={cat.id} type="button" onClick={() => updateDraft({ mainCategory: cat.id, subCategory: "" })}
                className={`relative p-5 rounded-2xl border-2 transition-all duration-300 text-center group ${selected ? "border-primary bg-primary/5 shadow-md" : "border-border/50 hover:border-primary/40 hover:bg-secondary/30"}`}>
                {selected && <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Check className="w-3 h-3 text-white" /></div>}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <span className="font-bold text-lg">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Label className="text-base font-semibold mb-3 block">الغرض من العقار *</Label>
        {errors.listingType && <p className="text-sm text-destructive mb-2">{errors.listingType}</p>}
        <div className="grid grid-cols-2 gap-4">
          {LISTING_TYPES.map(lt => {
            const selected = draft.listingType === lt.id;
            return (
              <button key={lt.id} type="button" onClick={() => updateDraft({ listingType: lt.id })}
                className={`p-5 rounded-2xl border-2 transition-all duration-300 text-center ${selected ? "border-primary bg-primary/5 shadow-md" : "border-border/50 hover:border-primary/40 hover:bg-secondary/30"}`}>
                <span className="text-3xl mb-2 block">{lt.emoji}</span>
                <span className={`font-bold text-xl ${selected ? "text-primary" : ""}`}>{lt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => {
    const subs = draft.mainCategory ? (SUB_CATEGORIES[draft.mainCategory] ?? []) : [];
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
        <div>
          <h2 className="text-2xl font-bold mb-1">النوع الفرعي وبيانات العقار</h2>
          <p className="text-muted-foreground text-sm">حدد النوع التفصيلي وابدأ بكتابة بيانات العقار</p>
        </div>
        <div>
          <Label className="text-base font-semibold mb-3 block">النوع الفرعي *</Label>
          {errors.subCategory && <p className="text-sm text-destructive mb-2">{errors.subCategory}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {subs.map(sub => {
              const selected = draft.subCategory === sub;
              return (
                <button key={sub} type="button" onClick={() => updateDraft({ subCategory: sub })}
                  className={`px-4 py-3 rounded-xl border-2 font-medium transition-all text-sm ${selected ? "border-primary bg-primary/8 text-primary shadow-sm" : "border-border/50 hover:border-primary/40 hover:bg-secondary/30"}`}>
                  {selected && <Check className="w-3.5 h-3.5 inline ml-1.5 text-primary" />}{sub}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="propTitle">اسم / عنوان العقار *</Label>
            <Input id="propTitle" value={draft.propTitle} onChange={e => updateDraft({ propTitle: e.target.value })} className={`h-12 mt-1 ${errors.propTitle ? "border-destructive" : ""}`} placeholder="مثال: شقة فاخرة بحي النرجس — 3 غرف" />
            {errors.propTitle && <p className="text-xs text-destructive mt-1">{errors.propTitle}</p>}
          </div>
          <div>
            <Label htmlFor="propDesc">وصف احترافي للعقار</Label>
            <Textarea id="propDesc" value={draft.propDesc} onChange={e => updateDraft({ propDesc: e.target.value })} placeholder="اكتب وصفاً تفصيلياً يُبرز مميزات العقار ويجذب المهتمين..." className="resize-none h-28 mt-1" />
          </div>
        </div>
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">تفاصيل العقار</h2>
        <p className="text-muted-foreground text-sm">أضف المعلومات التفصيلية التي تُساعد في استقطاب المشترين والمستأجرين</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>السعر *</Label>
          <div className="relative mt-1">
            <Input value={draft.propPrice} onChange={e => updateDraft({ propPrice: e.target.value.replace(/[^\d.]/g, "") })} className={`h-12 pr-14 ${errors.propPrice ? "border-destructive" : ""}`} placeholder="0" dir="ltr" inputMode="decimal" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">ج.م</span>
          </div>
          {errors.propPrice && <p className="text-xs text-destructive mt-1">{errors.propPrice}</p>}
        </div>
        <div>
          <Label>طريقة الدفع</Label>
          <Select value={draft.propPaymentMethod || "__none__"} onValueChange={v => updateDraft({ propPaymentMethod: v === "__none__" ? "" : v })}>
            <SelectTrigger className="h-12 mt-1"><SelectValue placeholder="اختر" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>المساحة (م²) *</Label>
          <div className="relative mt-1">
            <Input value={draft.propArea} onChange={e => updateDraft({ propArea: e.target.value.replace(/[^\d.]/g, "") })} className={`h-12 pl-10 ${errors.propArea ? "border-destructive" : ""}`} placeholder="150" dir="ltr" inputMode="decimal" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">م²</span>
          </div>
          {errors.propArea && <p className="text-xs text-destructive mt-1">{errors.propArea}</p>}
        </div>
        <div>
          <Label>سنة البناء</Label>
          <Input value={draft.propBuildYear} onChange={e => updateDraft({ propBuildYear: e.target.value.replace(/\D/g, "") })} className="h-12 mt-1" placeholder="2020" dir="ltr" inputMode="numeric" maxLength={4} />
        </div>
      </div>
      {needsRooms && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>عدد الغرف</Label>
            <Input value={draft.propRooms} onChange={e => updateDraft({ propRooms: e.target.value.replace(/\D/g, "") })} className="h-12 mt-1" placeholder="3" dir="ltr" inputMode="numeric" />
          </div>
          <div>
            <Label>عدد الحمامات</Label>
            <Input value={draft.propBathrooms} onChange={e => updateDraft({ propBathrooms: e.target.value.replace(/\D/g, "") })} className="h-12 mt-1" placeholder="2" dir="ltr" inputMode="numeric" />
          </div>
        </div>
      )}
      {needsFloor && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>رقم الدور</Label>
            <Input value={draft.propFloor} onChange={e => updateDraft({ propFloor: e.target.value.replace(/\D/g, "") })} className="h-12 mt-1" placeholder="2" dir="ltr" inputMode="numeric" />
          </div>
          <div>
            <Label>عدد الأدوار الكلي</Label>
            <Input value={draft.propTotalFloors} onChange={e => updateDraft({ propTotalFloors: e.target.value.replace(/\D/g, "") })} className="h-12 mt-1" placeholder="6" dir="ltr" inputMode="numeric" />
          </div>
        </div>
      )}
      {!isLand && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>التشطيب</Label>
              <Select value={draft.propFinishing || "__none__"} onValueChange={v => updateDraft({ propFinishing: v === "__none__" ? "" : v })}>
                <SelectTrigger className="h-12 mt-1"><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{<SelectItem value="__none__">—</SelectItem>}{FINISHING_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>حالة العقار</Label>
              <Select value={draft.propCondition || "__none__"} onValueChange={v => updateDraft({ propCondition: v === "__none__" ? "" : v })}>
                <SelectTrigger className="h-12 mt-1"><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{<SelectItem value="__none__">—</SelectItem>}{CONDITION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>مفروش / غير مفروش</Label>
              <Select value={draft.propFurnished || "__none__"} onValueChange={v => updateDraft({ propFurnished: v === "__none__" ? "" : v })}>
                <SelectTrigger className="h-12 mt-1"><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{<SelectItem value="__none__">—</SelectItem>}{FURNISHED_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>اتجاه العقار</Label>
              <Select value={draft.propDirection || "__none__"} onValueChange={v => updateDraft({ propDirection: v === "__none__" ? "" : v })}>
                <SelectTrigger className="h-12 mt-1"><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>{<SelectItem value="__none__">—</SelectItem>}{DIRECTION_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">الوسائط والملفات</h2>
        <p className="text-muted-foreground text-sm">أضف صور العقار والوسائط الداعمة لإبراز العقار بأفضل صورة</p>
      </div>
      <div>
        <Label className="text-base font-semibold mb-2 block">صور العقار <span className="text-muted-foreground font-normal text-sm">(حتى 15 صورة)</span></Label>
        <div className="border-2 border-dashed border-border/60 rounded-2xl p-8 text-center hover:bg-secondary/20 hover:border-primary/50 transition-colors cursor-pointer relative group">
          <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handlePropertyImages} disabled={draft.images.length >= 15} />
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
            <ImageIcon className="w-7 h-7" />
          </div>
          <p className="font-semibold">اسحب الصور هنا أو اضغط للاختيار</p>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — حتى 5MB لكل صورة ({draft.images.length}/15)</p>
        </div>
        {draft.images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
            {draft.images.map((img, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border shadow-sm group">
                <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <button onClick={() => removeImage(i)} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors shadow-sm opacity-0 group-hover:opacity-100">
                  <X className="w-3.5 h-3.5" />
                </button>
                {i === 0 && <div className="absolute bottom-0 inset-x-0 bg-primary/80 text-primary-foreground text-[10px] text-center py-0.5 font-bold">الصورة الرئيسية</div>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="videoUrl" className="text-base font-semibold mb-2 block">رابط الفيديو <span className="text-muted-foreground font-normal text-sm">(YouTube / Vimeo)</span></Label>
        <div className="relative">
          <Input id="videoUrl" value={draft.videoUrl} onChange={e => updateDraft({ videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." className="h-12 pl-11" dir="ltr" />
          <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
        </div>
      </div>
      <div>
        <Label className="text-base font-semibold mb-2 block">بروشور / ملف PDF <span className="text-muted-foreground font-normal text-sm">(اختياري، حتى 10MB)</span></Label>
        <div className={`border-2 border-dashed rounded-2xl p-6 transition-colors cursor-pointer relative group ${brochureFileRef.current ? "border-emerald-300 bg-emerald-50" : "border-border/60 hover:border-primary/50 hover:bg-secondary/20"}`}>
          <input type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleBrochureUpload} />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-red-500" />
            </div>
            {brochureFileRef.current ? (
              <div>
                <p className="font-semibold text-emerald-700">{brochureFileRef.current.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{(brochureFileRef.current.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold">اضغط لرفع ملف PDF</p>
                <p className="text-xs text-muted-foreground">بروشور العقار أو وثائق تفصيلية</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep7 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">مميزات وخدمات قريبة</h2>
        <p className="text-muted-foreground text-sm">حدد ما يوفره العقار والخدمات المتاحة بالقرب منه</p>
      </div>
      <div>
        <Label className="text-base font-semibold mb-3 block">مميزات العقار <span className="text-muted-foreground font-normal text-sm">({draft.features.length} مختار)</span></Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {PROPERTY_FEATURES.map(f => {
            const sel = draft.features.includes(f);
            return (
              <button key={f} type="button" onClick={() => toggleFeature(f)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${sel ? "border-primary bg-primary/8 text-primary" : "border-border/50 hover:border-primary/30 hover:bg-secondary/30"}`}>
                {sel ? <Check className="w-4 h-4 text-primary shrink-0" /> : <Plus className="w-4 h-4 text-muted-foreground shrink-0" />}
                {f}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <Label className="text-base font-semibold mb-3 block">خدمات قريبة <span className="text-muted-foreground font-normal text-sm">({draft.nearbyServices.length} مختار)</span></Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {NEARBY_SERVICES.map(s => {
            const sel = draft.nearbyServices.includes(s);
            return (
              <button key={s} type="button" onClick={() => toggleNearby(s)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${sel ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-border/50 hover:border-emerald-300 hover:bg-secondary/30"}`}>
                {sel ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />}
                {s}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderStep8 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <div>
        <h2 className="text-2xl font-bold mb-1">التواصل والباقة</h2>
        <p className="text-muted-foreground text-sm">حدد طرق تواصل العملاء معك واختر الباقة المناسبة لنشاطك</p>
      </div>
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-6 space-y-5">
          <Label className="text-base font-bold block">طرق التواصل المتاحة</Label>
          <div className="grid grid-cols-2 gap-3">
            {CONTACT_METHODS.map(m => {
              const sel = draft.contactMethods.includes(m.id);
              return (
                <button key={m.id} type="button" onClick={() => toggleContact(m.id)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${sel ? "border-primary bg-primary/8 text-primary" : "border-border/60 hover:border-primary/40 hover:bg-secondary/30"}`}>
                  <m.icon className={`w-4 h-4 ${sel ? "text-primary" : "text-muted-foreground"}`} />
                  {m.label}
                  {sel && <Check className="w-3.5 h-3.5 mr-auto text-primary" />}
                </button>
              );
            })}
          </div>
          {draft.contactMethods.includes("whatsapp") && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <Label>رقم الواتساب</Label>
              <Input value={draft.whatsapp} onChange={e => updateDraft({ whatsapp: e.target.value.replace(/\D/g, "") })} className="h-11 mt-1" dir="ltr" placeholder="+966xxxxxxxxx" inputMode="numeric" />
            </div>
          )}
        </CardContent>
      </Card>
      <div>
        <Label className="text-base font-bold mb-4 block">اختر باقتك</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { id: "free", label: "مجاني", price: "مجاناً", features: ["ملف أساسي", "عقار واحد", "ظهور في البحث"], featured: false },
            { id: "bronze", label: "برونزي", price: "٩٩ ج.م/شهر", features: ["حتى 10 عقارات", "ظهور مميز", "شارة موثق"], featured: true },
            { id: "premium", label: "بريميوم", price: "٢٤٩ ج.م/شهر", features: ["عقارات غير محدودة", "أولوية البحث", "دعم مخصص"], featured: false },
          ].map(p => {
            const sel = draft.plan === p.id;
            return (
              <Card key={p.id} onClick={() => updateDraft({ plan: p.id })}
                className={`cursor-pointer transition-all duration-300 relative overflow-hidden ${p.featured ? "md:-translate-y-2 md:scale-105" : ""} ${sel ? "border-primary shadow-lg ring-2 ring-primary/30" : "border-border/60 hover:border-primary/40 hover:shadow-sm"}`}>
                {p.featured && <div className="absolute top-0 inset-x-0 bg-primary text-primary-foreground text-xs font-bold text-center py-1">موصى به</div>}
                <CardContent className={`p-5 ${p.featured ? "pt-7 bg-primary/5" : ""}`}>
                  <h3 className={`font-bold text-lg mb-1 ${p.featured ? "text-primary" : ""}`}>{p.label}</h3>
                  <div className={`text-2xl font-black mb-4 ${p.featured ? "text-primary" : ""}`}>{p.price}</div>
                  <ul className="space-y-2 text-sm">
                    {p.features.map(f => <li key={f} className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary shrink-0" />{f}</li>)}
                  </ul>
                  <div className={`mt-5 text-center py-2.5 rounded-lg font-bold text-sm transition-colors ${sel ? "bg-primary text-primary-foreground" : p.featured ? "bg-primary/20 text-primary" : "bg-secondary text-foreground"}`}>
                    {sel ? "مختار" : "اختر"}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderStep9 = () => {
    const mainCat = MAIN_CATEGORIES.find(c => c.id === draft.mainCategory);
    const listType = LISTING_TYPES.find(l => l.id === draft.listingType);
    const regionName = (regionsList as Region[]).find(r => r.id === draft.locRegionId)?.nameAr;
    const planLabel = { free: "مجاني", bronze: "برونزي — ٩٩ ج.م/شهر", premium: "بريميوم — ٢٤٩ ج.م/شهر" }[draft.plan] ?? "";

    const Row = ({ label, value }: { label: string; value?: React.ReactNode }) => (
      <div className="grid grid-cols-3 gap-2 py-2 text-sm border-b border-border/30 last:border-0">
        <span className="text-muted-foreground">{label}</span>
        <span className="col-span-2 font-medium">{value || <span className="text-muted-foreground italic">— غير محدد</span>}</span>
      </div>
    );

    const Section = ({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) => (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
            <h3 className="font-bold text-base">{title}</h3>
            <Button variant="ghost" size="sm" onClick={onEdit} className="text-primary h-7 text-xs">تعديل</Button>
          </div>
          {children}
        </CardContent>
      </Card>
    );

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <div>
              <h2 className="text-2xl font-bold mb-1">مراجعة وإرسال</h2>
              <p className="text-sm text-muted-foreground">راجع بياناتك قبل الإرسال النهائي. يمكنك العودة لتعديل أي قسم.</p>
            </div>
          </div>
        </div>
        <Section title="المعلومات الأساسية" onEdit={() => setStep(1)}>
          <Row label="الاسم" value={draft.basicInfo.name} />
          <Row label="الجوال" value={<span dir="ltr">{draft.basicInfo.phone}</span>} />
          <Row label="البريد" value={<span dir="ltr">{draft.basicInfo.email}</span>} />
        </Section>
        <Section title="الموقع" onEdit={() => setStep(2)}>
          <Row label="المنطقة" value={regionName} />
          <Row label="المدينة" value={draft.locCityName ?? ""} />
          <Row label="الحي" value={draft.locDistrict} />
          <Row label="العنوان" value={draft.locAddress} />
          {draft.locLat && <Row label="الإحداثيات" value={<span dir="ltr">{draft.locLat}, {draft.locLng}</span>} />}
        </Section>
        <Section title="تصنيف العقار" onEdit={() => setStep(3)}>
          <Row label="التصنيف" value={mainCat?.label} />
          <Row label="الغرض" value={listType?.label} />
        </Section>
        <Section title="النوع والبيانات الأساسية" onEdit={() => setStep(4)}>
          <Row label="النوع الفرعي" value={draft.subCategory} />
          <Row label="العنوان" value={draft.propTitle} />
        </Section>
        <Section title="التفاصيل" onEdit={() => setStep(5)}>
          <Row label="السعر" value={draft.propPrice ? `${draft.propPrice} ج.م` : ""} />
          <Row label="المساحة" value={draft.propArea ? `${draft.propArea} م²` : ""} />
          {draft.propRooms && <Row label="الغرف" value={draft.propRooms} />}
          {draft.propBathrooms && <Row label="الحمامات" value={draft.propBathrooms} />}
          {draft.propFinishing && <Row label="التشطيب" value={draft.propFinishing} />}
          {draft.propCondition && <Row label="الحالة" value={draft.propCondition} />}
          {draft.propFurnished && <Row label="الأثاث" value={draft.propFurnished} />}
        </Section>
        <Section title="الوسائط" onEdit={() => setStep(6)}>
          <Row label="الصور" value={draft.images.length ? `${draft.images.length} صورة` : ""} />
          {draft.videoUrl && <Row label="الفيديو" value="تم إضافة رابط" />}
          {brochureFileRef.current && <Row label="PDF" value={brochureFileRef.current.name} />}
        </Section>
        <Section title="المميزات والخدمات" onEdit={() => setStep(7)}>
          <Row label="المميزات" value={draft.features.length ? draft.features.join("، ") : ""} />
          <Row label="الخدمات القريبة" value={draft.nearbyServices.length ? draft.nearbyServices.join("، ") : ""} />
        </Section>
        <Section title="التواصل والباقة" onEdit={() => setStep(8)}>
          <Row label="طرق التواصل" value={draft.contactMethods.map(id => CONTACT_METHODS.find(m => m.id === id)?.label).filter(Boolean).join("، ")} />
          <Row label="الباقة" value={planLabel} />
        </Section>
        <Card className="border-primary/30 bg-primary/5 shadow-sm">
          <CardContent className="p-5">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <Checkbox checked={reviewConfirmed} onCheckedChange={c => setReviewConfirmed(c === true)} className="mt-0.5" />
              <span className="text-sm font-medium leading-relaxed">لقد راجعت جميع البيانات أعلاه وأؤكد صحتها، وأوافق على إرسال العقار للمراجعة.</span>
            </label>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderCurrentStep = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      case 7: return renderStep7();
      case 8: return renderStep8();
      case 9: return renderStep9();
      default: return null;
    }
  };

  const isLastStep = step === TOTAL_STEPS;
  const progress = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background" dir="rtl">
      <header className="shrink-0 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow">د</div>
            <span className="font-extrabold text-xl text-primary tracking-tight hidden sm:block">{siteName}</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="w-4 h-4 text-amber-500" />
            <span>تسجيل عقاري</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl w-full mx-auto px-4 py-8 flex-1 flex flex-col">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-primary">الخطوة {step} من {TOTAL_STEPS}</span>
            <span className="text-sm text-muted-foreground">{stepLabels[step - 1]}</span>
          </div>
          <Progress value={progress} className="h-2 rounded-full" />
          <div className="flex items-center justify-between mt-3 gap-1">
            {stepLabels.map((label, idx) => {
              const n = idx + 1;
              const done = n < step;
              const current = n === step;
              return (
                <button key={n} type="button" onClick={() => n < step && setStep(n)}
                  className={`flex flex-col items-center gap-1 group transition-all ${n < step ? "cursor-pointer" : "cursor-default"}`}
                  disabled={n >= step}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${done ? "bg-primary text-primary-foreground" : current ? "bg-primary/20 text-primary border-2 border-primary" : "bg-secondary text-muted-foreground"}`}>
                    {done ? <Check className="w-3.5 h-3.5" /> : n}
                  </div>
                  <span className="hidden sm:block text-[9px] text-muted-foreground leading-tight text-center max-w-12 truncate">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1">
          {renderCurrentStep()}
        </div>

        <div className="mt-8 flex items-center justify-between gap-4 border-t border-border/50 pt-6">
          <Button variant="outline" onClick={handleBack} disabled={step === 1 || submitting} className="h-12 px-6 rounded-xl gap-2">
            <ChevronRight className="w-4 h-4" /> السابق
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            حفظ تلقائي
          </div>
          {isLastStep ? (
            <Button onClick={handleSubmit} disabled={submitting || !reviewConfirmed} className="h-12 px-8 rounded-xl font-bold shadow-md gap-2">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</> : <><CheckCircle2 className="w-4 h-4" /> إرسال العقار</>}
            </Button>
          ) : (
            <Button onClick={handleNext} className="h-12 px-8 rounded-xl font-bold shadow-md gap-2">
              التالي <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
