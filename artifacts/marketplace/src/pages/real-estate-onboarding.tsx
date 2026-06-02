import { useState, useRef, useCallback, useEffect, DragEvent } from "react";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/Header";
import {
  Upload, X, GripVertical, Loader2, Check, ChevronLeft, ChevronRight, Navigation, Play,
  CreditCard, ShieldCheck, Star, Crown, Zap,
  CheckCircle2, Clock, AlertCircle, BadgeCheck, ClipboardList, Send, Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, type Region, type BillingPlan } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

/* ─── Plan helper utils ──────────────────────────────────────────────────── */
const FEATURE_LABELS: Record<string, string> = {
  homepageDisplay: "ظهور في الصفحة الرئيسية",
  topSearch:       "أولوية في نتائج البحث",
  verifiedBadge:   "شارة موثق",
  premiumBadge:    "شارة Premium",
  prioritySupport: "دعم فني بأولوية",
  analytics:       "إحصائيات متقدمة",
  seo:             "تحسين محركات البحث",
  aiTools:         "أدوات الذكاء الاصطناعي",
  autoBoost:       "رفع تلقائي للإعلان",
};
function parsePlanFeatureBullets(featuresJson: string): string[] {
  try {
    return Object.entries(JSON.parse(featuresJson) as Record<string, boolean>)
      .filter(([, v]) => v)
      .map(([k]) => FEATURE_LABELS[k])
      .filter(Boolean);
  } catch { return []; }
}
function parsePlanLimits(limitsJson: string): Record<string, number> {
  try { return JSON.parse(limitsJson); } catch { return {}; }
}
function getPlanBullets(plan: BillingPlan): string[] {
  const bullets: string[] = [];
  const lim = parsePlanLimits(plan.limits);
  const comm = parseFloat(plan.commissionPercent ?? "0");
  if (lim.properties === -1 || !lim.properties) bullets.push("إعلانات غير محدودة");
  else bullets.push(`حتى ${lim.properties} إعلان نشط`);
  if (lim.photos && lim.photos > 0) bullets.push(`حتى ${lim.photos} صورة لكل إعلان`);
  const feats = parsePlanFeatureBullets(plan.features);
  bullets.push(...feats.slice(0, 3));
  if (comm > 0) bullets.push(`عمولة ${comm}% على الصفقات`);
  else bullets.push("بدون عمولة");
  return bullets.slice(0, 5);
}

// Fix leaflet default marker
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const BANHA_LAT = 30.468;
const BANHA_LNG = 31.183;
const DRAFT_KEY = "re_onboarding_v4_draft";
const TOTAL_STEPS = 3;

const MAIN_TYPES = [
  { id: "residential", label: "سكني", sub: "شقق · فيلات · دوبلكس · استوديو" },
  { id: "commercial",  label: "تجاري", sub: "محلات · مكاتب · عيادات · مطاعم" },
  { id: "land",        label: "أراضي", sub: "سكنية · تجارية · زراعية · صناعية" },
];

const SUB_TYPES: Record<string, string[]> = {
  residential: ["شقة", "فيلا", "دوبلكس", "بنتهاوس", "تاون هاوس", "توين هاوس", "استوديو", "شاليه"],
  commercial:  ["محل تجاري", "مكتب", "عيادة", "مطعم", "كافيه", "مخزن", "مصنع"],
  land:        ["أرض سكنية", "أرض تجارية", "أرض زراعية", "أرض صناعية"],
};

const LISTING_TYPES = [
  { id: "sale", label: "للبيع" },
  { id: "rent", label: "للإيجار" },
];

const FINISHING   = ["سوبر لوكس", "لوكس", "عادي", "بدون تشطيب", "تشطيب جزئي"];
const CONDITIONS  = ["جديد", "ممتاز", "جيد جداً", "جيد", "يحتاج تجديد"];
const FURNISHED   = ["مفروش بالكامل", "مفروش جزئياً", "غير مفروش"];
const DIRECTIONS  = ["شمالي", "جنوبي", "شرقي", "غربي", "شمالي شرقي", "شمالي غربي", "جنوبي شرقي", "جنوبي غربي"];
const PAY_METHODS = ["دفعة واحدة", "أقساط شهرية", "أقساط سنوية", "قابل للتفاوض"];

const FEATURES = [
  "مسبح", "جراج مغطى", "حديقة خاصة", "مصعد", "شرفة", "مكيف مركزي",
  "أمن 24 ساعة", "غرفة خادمة", "غرفة سائق", "مستودع", "بوابة ذكية",
  "نظام منزل ذكي", "مطبخ مجهز", "غرفة غسيل", "طاقة شمسية", "موقف خاص",
  "صالة رياضية", "ملعب", "مسجد",
];

const NEARBY = [
  "مدارس", "مستشفيات", "مراكز تجارية", "مساجد", "مطاعم", "صيدليات",
  "بنوك", "حدائق عامة", "محطات وقود", "مواصلات عامة", "نوادي رياضية", "سوبر ماركت",
];

const PAYMENT_OPS = [
  { id: "card",     label: "بطاقة بنكية" },
  { id: "wallet",   label: "محفظة إلكترونية" },
  { id: "transfer", label: "تحويل بنكي" },
  { id: "cash",     label: "كاش" },
];

interface Draft {
  mainType: string; listingType: string; subType: string;
  regionId: number | null; cityId: number | null; cityName: string | null;
  address: string; lat: string; lng: string;
  title: string; desc: string; price: string; area: string;
  rooms: string; bathrooms: string; floor: string; totalFloors: string;
  buildYear: string; finishing: string; condition: string;
  furnished: string; direction: string; payMethod: string;
  features: string[]; nearby: string[];
  images: string[]; mainImg: number; videoUrl: string;
  plan: number | null; paymentMethod: string;
}

const defaults: Draft = {
  mainType: "", listingType: "", subType: "",
  regionId: null, cityId: null, cityName: null,
  address: "", lat: "", lng: "",
  title: "", desc: "", price: "", area: "",
  rooms: "", bathrooms: "", floor: "", totalFloors: "",
  buildYear: "", finishing: "", condition: "",
  furnished: "", direction: "", payMethod: "",
  features: [], nearby: [],
  images: [], mainImg: 0, videoUrl: "",
  plan: null, paymentMethod: "card",
};

function loadDraft(): Draft {
  try { const r = localStorage.getItem(DRAFT_KEY); if (r) return { ...defaults, ...JSON.parse(r) }; } catch {}
  return { ...defaults };
}

/* ─── Leaflet click handler ─── */
function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

/* ─── Professional step indicator ─── */
function Steps({ step }: { step: number }) {
  const steps = [
    { label: "تفاصيل العقار", icon: "🏠" },
    { label: "اختيار الباقة",  icon: "📦" },
    { label: "الدفع والنشر",   icon: "💳" },
  ];
  return (
    <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-1">
          {steps.map((s, i) => {
            const n = i + 1;
            const active = step === n;
            const done   = step > n;
            return (
              <div key={i} className="flex items-center flex-1">
                {/* Step circle + label */}
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold transition-all duration-300 shadow-sm
                    ${done   ? "bg-teal-600 text-white scale-95"
                    : active ? "bg-teal-600 text-white ring-4 ring-teal-100 scale-105"
                    :          "bg-gray-100 text-gray-400"}`}>
                    {done ? <Check className="w-5 h-5" /> : <span>{n}</span>}
                  </div>
                  <span className={`text-[11px] font-semibold hidden sm:block text-center transition-colors
                    ${active ? "text-teal-700" : done ? "text-gray-500" : "text-gray-400"}`}>
                    {s.label}
                  </span>
                </div>
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 rounded-full transition-all duration-500 ${done ? "bg-teal-500" : "bg-gray-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Field label ─── */
function FLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="text-sm font-semibold text-gray-700 mb-2">
      {children}{required && <span className="text-red-500 mr-1">*</span>}
    </p>
  );
}

/* ─── Section ─── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 pt-8 first:border-t-0 first:pt-0">
      <h3 className="text-base font-bold text-gray-900 mb-6 pb-3 border-b border-gray-100">{title}</h3>
      {children}
    </div>
  );
}

/* ─── Chip selector ─── */
function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all
        ${selected
          ? "bg-teal-600 text-white border-teal-600"
          : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
      {label}
    </button>
  );
}

/* ─── Num input ─── */
function NumInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <FLabel>{label}</FLabel>
      <Input inputMode="numeric" value={value} onChange={e => onChange(e.target.value.replace(/\D/g, ""))}
        placeholder={placeholder ?? "0"} className="h-11 border-gray-200 rounded-lg" dir="ltr" />
    </div>
  );
}

export default function RealEstateOnboarding() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { user, refetch: refetchAuth, setUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [mapPos, setMapPos] = useState<[number, number] | null>(null);

  // Payment flow state
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "paid" | "failed">("idle");
  const [receipt, setReceipt]   = useState<string | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [wasPaid, setWasPaid]   = useState(false);
  const receiptRef = useRef<HTMLInputElement>(null);

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-onboarding"],
    queryFn: api.settings.list,
    staleTime: 5 * 60_000,
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const imgFilesRef = useRef<File[]>([]);
  const [draft, setDraft] = useState<Draft>(loadDraft);

  const { data: billingPlans = [] } = useQuery<BillingPlan[]>({
    queryKey: ["billingPlans", "company"],
    queryFn: () => api.billingPlans.publicListByType("company"),
    staleTime: 0,
  });
  const { data: regions = [] } = useQuery({ queryKey: ["regions"], queryFn: api.regions.list, staleTime: 5 * 60_000 });

  const upd = useCallback((p: Partial<Draft>) => {
    setDraft(prev => { const n = { ...prev, ...p }; try { localStorage.setItem(DRAFT_KEY, JSON.stringify(n)); } catch {} return n; });
  }, []);

  // Init map position from draft
  useEffect(() => {
    if (draft.lat && draft.lng) setMapPos([parseFloat(draft.lat), parseFloat(draft.lng)]);
  }, []);

  const provRef = useRef(false);
  useEffect(() => {
    if (!user || user.role === "admin" || provRef.current) return;
    provRef.current = true;
    api.auth.becomeProvider().then(me => setUser(me as any)).catch(() => { provRef.current = false; });
  }, [user?.id, setUser]);

  if (!user) return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold text-gray-700">يجب تسجيل الدخول أولاً</p>
          <Button onClick={() => setLocation("/login?returnTo=/real-estate-onboarding")}>تسجيل الدخول</Button>
        </div>
      </div>
    </div>
  );

  const selRegion = (regions as Region[]).find(r => r.id === draft.regionId);
  const cities    = selRegion?.cities ?? [];
  const isLand    = draft.mainType === "land";
  const isRes     = draft.mainType === "residential";
  const isCom     = draft.mainType === "commercial";

  // Sorted billing plans — all active plans from admin (single source of truth)
  const sortedPlans = billingPlans
    .filter(p => p.status === "active")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || parseFloat(a.price) - parseFloat(b.price));

  // The currently selected billing plan object
  const selectedBillingPlan = draft.plan !== null ? sortedPlans.find(p => p.id === draft.plan) ?? null : null;
  const isFreeSelected = selectedBillingPlan !== null && parseFloat(selectedBillingPlan.price) === 0;

  /* ── Map pick ── */
  const onMapPick = (lat: number, lng: number) => {
    setMapPos([lat, lng]);
    upd({ lat: lat.toFixed(7), lng: lng.toFixed(7) });
  };

  const getGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      p => { onMapPick(p.coords.latitude, p.coords.longitude); toast.success("تم تحديد موقعك"); },
      () => toast.error("تعذر الوصول إلى الموقع"),
    );
  };

  /* ── Validate ── */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!draft.mainType)     e.mainType    = "مطلوب";
    if (!draft.listingType)  e.listingType = "مطلوب";
    if (!draft.subType)      e.subType     = "مطلوب";
    if (!draft.regionId)     e.region      = "المنطقة مطلوبة";
    if (!draft.cityId)       e.city        = "المدينة مطلوبة";
    if (!draft.title.trim()) e.title       = "مطلوب";
    if (!draft.price.trim()) e.price       = "مطلوب";
    if (!draft.area.trim())  e.area        = "مطلوب";
    if (draft.images.length === 0) e.images = "أضف صورة واحدة على الأقل";
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const first = document.getElementById(`f-${Object.keys(e)[0]}`);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (step === 1) { if (validate()) setStep(s => s + 1); }
    else if (step === 2) {
      if (draft.plan === null) { toast.error("يرجى اختيار باقة للمتابعة"); return; }
      setStep(s => Math.min(s + 1, TOTAL_STEPS));
    } else {
      setStep(s => Math.min(s + 1, TOTAL_STEPS));
    }
  };
  const goBack = () => setStep(s => Math.max(s - 1, 1));

  /* ── Images ── */
  const addFiles = (files: File[]) => {
    const rem = 20 - draft.images.length;
    const add = files.filter(f => f.type.startsWith("image/")).slice(0, rem);
    if (!add.length) return;
    imgFilesRef.current = [...imgFilesRef.current, ...add];
    upd({ images: [...draft.images, ...add.map(f => URL.createObjectURL(f))] });
  };
  const rmImg = (i: number) => {
    imgFilesRef.current = imgFilesRef.current.filter((_, j) => j !== i);
    const imgs = draft.images.filter((_, j) => j !== i);
    upd({ images: imgs, mainImg: Math.min(draft.mainImg, Math.max(0, imgs.length - 1)) });
  };
  const onDragStart = (e: DragEvent<HTMLDivElement>, i: number) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver  = (e: DragEvent<HTMLDivElement>, i: number) => { e.preventDefault(); setDragOverIdx(i); };
  const onDrop      = (e: DragEvent<HTMLDivElement>, to: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === to) { setDragIdx(null); setDragOverIdx(null); return; }
    const imgs  = [...draft.images]; const files = [...imgFilesRef.current];
    const [img] = imgs.splice(dragIdx, 1); const [file] = files.splice(dragIdx, 1);
    imgs.splice(to, 0, img); files.splice(to, 0, file);
    imgFilesRef.current = files;
    let m = draft.mainImg;
    if (m === dragIdx) m = to; else if (dragIdx < m && to >= m) m--; else if (dragIdx > m && to <= m) m++;
    upd({ images: imgs, mainImg: m });
    setDragIdx(null); setDragOverIdx(null);
  };

  const tog = (key: "features" | "nearby", v: string) =>
    upd({ [key]: draft[key].includes(v) ? draft[key].filter(x => x !== v) : [...draft[key], v] });

  /* ── Submit (creates property after payment or for free plan) ── */
  const handleSubmit = async () => {
    setSubmitting(true); setProgress(0);
    try {
      let pid = user.providerId;
      if (!pid) { const me = await api.auth.becomeProvider(); pid = (me as any).providerId; if (pid) setUser(me as any); }
      if (!pid) { toast.error("خطأ في بيانات المعلن"); return; }

      const uploaded: string[] = [];
      for (let i = 0; i < imgFilesRef.current.length; i++) {
        try { const r = await api.upload.propertyImage(imgFilesRef.current[i]); uploaded.push(r.url); } catch {}
        setProgress(Math.round(((i + 1) / Math.max(1, imgFilesRef.current.length)) * 70));
      }

      await api.properties.create({
        providerId: pid, title: draft.title, description: draft.desc || undefined,
        mainCategory: draft.mainType, listingType: draft.listingType, subCategory: draft.subType || undefined,
        price: draft.price || undefined, area: draft.area || undefined,
        rooms: draft.rooms ? +draft.rooms : undefined, bathrooms: draft.bathrooms ? +draft.bathrooms : undefined,
        floor: draft.floor ? +draft.floor : undefined, totalFloors: draft.totalFloors ? +draft.totalFloors : undefined,
        buildYear: draft.buildYear ? +draft.buildYear : undefined,
        finishing: draft.finishing || undefined, condition: draft.condition || undefined,
        furnished: draft.furnished || undefined, direction: draft.direction || undefined,
        paymentMethod: draft.payMethod || undefined,
        address: draft.address || undefined, regionId: draft.regionId ?? undefined,
        cityId: draft.cityId ?? undefined,
        latitude: draft.lat || undefined, longitude: draft.lng || undefined,
        images: uploaded, videoUrl: draft.videoUrl || undefined,
        features: draft.features, nearbyServices: draft.nearby, mainImageIdx: draft.mainImg,
      });

      setProgress(90);
      // Activate billing plan subscription if a paid plan was selected
      if (draft.plan !== null) {
        try { await api.subscriptions.subscribe(pid, draft.plan, true); } catch {}
      }
      setProgress(100);
      await refetchAuth();
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      setStep(99);
    } catch (e: any) {
      toast.error(e?.message ?? "حدث خطأ أثناء إرسال العقار");
      setPaymentStatus("failed");
    }
    finally { setSubmitting(false); }
  };

  /* ── Process payment then submit ── */
  const handleReceiptUpload = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setReceiptUploading(true);
    try {
      const res = await api.upload.propertyImage(files[0]);
      setReceipt(res.url);
      toast.success("تم رفع إيصال الدفع");
    } catch {
      toast.error("فشل رفع الإيصال، حاول مرة أخرى");
    } finally {
      setReceiptUploading(false);
    }
  };

  const handlePayment = async () => {
    setPaymentStatus("processing");
    await new Promise(r => setTimeout(r, 800));
    setPaymentStatus("paid");
    setWasPaid(true);
    await handleSubmit();
  };

  /* ══════════════════════════════════════════════════
      SUCCESS
  ══════════════════════════════════════════════════ */
  if (step === 99) return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex flex-col" dir="rtl">
      <Header />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8 animate-in zoom-in-95 fade-in duration-500">

          {/* Icon stack */}
          <div className="relative w-28 h-28 mx-auto">
            {wasPaid && (
              <div className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg z-10">
                <CreditCard className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="w-28 h-28 rounded-full bg-emerald-100 flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            </div>
          </div>

          {/* Messages */}
          <div className="space-y-2">
            {wasPaid && (
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-sm font-bold px-4 py-2 rounded-full">
                <Check className="w-4 h-4" />تم الدفع بنجاح
              </div>
            )}
            <h1 className="text-2xl font-extrabold text-gray-900">
              {wasPaid ? "تم نشر إعلانك مع الباقة المميزة" : "تم إرسال إعلانك للمراجعة"}
            </h1>
            <p className="text-gray-500 leading-relaxed">
              {wasPaid
                ? "سيتم مراجعة إعلانك وتفعيله مع مميزات الباقة المدفوعة خلال ساعات قليلة."
                : "سيتم مراجعة إعلانك خلال 24 ساعة وإشعارك عند التفعيل."}
            </p>
          </div>

          {/* Status badges */}
          <div className="flex justify-center gap-3 flex-wrap">
            {[
              { icon: <Clock className="w-4 h-4" />, text: "قيد المراجعة", color: "bg-amber-50 text-amber-700 border-amber-200" },
              { icon: <ShieldCheck className="w-4 h-4" />, text: "مؤمّن ومحمي", color: "bg-blue-50 text-blue-700 border-blue-200" },
              ...(wasPaid ? [{ icon: <BadgeCheck className="w-4 h-4" />, text: "باقة مفعّلة", color: "bg-emerald-50 text-emerald-700 border-emerald-200" }] : []),
            ].map((b, i) => (
              <span key={i} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${b.color}`}>
                {b.icon}{b.text}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button
              className="w-full h-13 rounded-2xl font-bold text-base shadow-md shadow-teal-200"
              onClick={() => setLocation("/dashboard/properties")}
            >
              عرض عقاراتي
            </Button>
            <Button variant="outline" className="w-full h-12 rounded-2xl font-semibold"
              onClick={() => setLocation("/dashboard")}
            >
              لوحة التحكم
            </Button>
            <button className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => { setStep(1); setDraft({ ...defaults }); setPaymentStatus("idle"); setWasPaid(false); imgFilesRef.current = []; }}>
              + نشر إعلان آخر
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════
      STEP 1 — تفاصيل العقار (صفحة طويلة)
  ══════════════════════════════════════════════════ */
  const step1 = (
    <div className="space-y-10">

      {/* نوع العقار */}
      <Section title="نوع العقار">
        <div id="f-mainType" className="grid grid-cols-3 gap-3 mb-6">
          {MAIN_TYPES.map(t => (
            <button key={t.id} type="button" onClick={() => upd({ mainType: t.id, subType: "" })}
              className={`p-4 rounded-xl border-2 text-center transition-all
                ${draft.mainType === t.id ? "border-teal-600 bg-teal-50" : "border-gray-200 hover:border-gray-300 bg-white"}`}>
              <p className={`font-bold text-base mb-1 ${draft.mainType === t.id ? "text-teal-700" : "text-gray-800"}`}>{t.label}</p>
              <p className="text-xs text-gray-400 leading-snug">{t.sub}</p>
            </button>
          ))}
        </div>
        {errors.mainType && <p className="text-xs text-red-500 -mt-4 mb-4">{errors.mainType}</p>}

        {draft.mainType && (
          <div className="animate-in fade-in duration-200">
            <FLabel required>نوع الصفقة</FLabel>
            <div id="f-listingType" className="flex gap-3 mb-1">
              {LISTING_TYPES.map(lt => (
                <button key={lt.id} type="button" onClick={() => upd({ listingType: lt.id })}
                  className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all
                    ${draft.listingType === lt.id ? "border-teal-600 bg-teal-50 text-teal-700" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}>
                  {lt.label}
                </button>
              ))}
            </div>
            {errors.listingType && <p className="text-xs text-red-500 mt-1">{errors.listingType}</p>}
          </div>
        )}

        {draft.mainType && draft.listingType && (
          <div className="animate-in fade-in duration-200 mt-6">
            <FLabel required>النوع التفصيلي</FLabel>
            <div id="f-subType" className="flex flex-wrap gap-2">
              {(SUB_TYPES[draft.mainType] ?? []).map(s => (
                <Chip key={s} label={s} selected={draft.subType === s} onClick={() => upd({ subType: s })} />
              ))}
            </div>
            {errors.subType && <p className="text-xs text-red-500 mt-2">{errors.subType}</p>}
          </div>
        )}
      </Section>

      {/* الموقع */}
      <Section title="الموقع">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div id="f-region">
            <FLabel required>المنطقة</FLabel>
            <Select value={draft.regionId ? String(draft.regionId) : "__"}
              onValueChange={v => { if (v === "__") { upd({ regionId: null, cityId: null, cityName: null }); return; } upd({ regionId: +v, cityId: null, cityName: null }); }}>
              <SelectTrigger className={`h-11 rounded-lg border-gray-200 ${errors.region ? "border-red-400" : ""}`}>
                <SelectValue placeholder="اختر المنطقة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__">اختر المنطقة</SelectItem>
                {(regions as Region[]).map(r => <SelectItem key={r.id} value={String(r.id)}>{r.nameAr}</SelectItem>)}
              </SelectContent>
            </Select>
            {errors.region && <p className="text-xs text-red-500 mt-1">{errors.region}</p>}
          </div>

          <div id="f-city">
            <FLabel required>المدينة</FLabel>
            {!draft.regionId ? (
              <div className="h-11 flex items-center px-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 text-sm">اختر المنطقة أولاً</div>
            ) : (
              <Select value={draft.cityId ? String(draft.cityId) : "__"}
                onValueChange={v => { if (v === "__") { upd({ cityId: null, cityName: null }); return; } const c = (cities as any[]).find(x => x.id === +v); upd({ cityId: +v, cityName: c?.nameAr ?? null }); }}>
                <SelectTrigger className={`h-11 rounded-lg border-gray-200 ${errors.city ? "border-red-400" : ""}`}>
                  <SelectValue placeholder="اختر المدينة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__">اختر المدينة</SelectItem>
                  {(cities as any[]).map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.nameAr}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
          </div>
        </div>

        <div className="mb-4">
          <FLabel>العنوان</FLabel>
          <Input value={draft.address} onChange={e => upd({ address: e.target.value })}
            placeholder="مثال: شارع جمال عبد الناصر، أمام المجمع التجاري"
            className="h-11 rounded-lg border-gray-200" />
        </div>

        {/* Leaflet map */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <FLabel>تحديد الموقع على الخريطة</FLabel>
            <button type="button" onClick={getGPS}
              className="flex items-center gap-1.5 text-xs text-teal-600 font-semibold hover:text-teal-700">
              <Navigation className="w-3.5 h-3.5" />
              موقعي الحالي
            </button>
          </div>
          <div className="rounded-xl overflow-hidden border border-gray-200 h-64">
            <MapContainer
              center={mapPos ?? [BANHA_LAT, BANHA_LNG]}
              zoom={mapPos ? 15 : 12}
              className="h-full w-full"
              key={mapPos ? "placed" : "default"}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapClickHandler onPick={onMapPick} />
              {mapPos && <Marker position={mapPos} />}
            </MapContainer>
          </div>
          {mapPos && (
            <p className="text-xs text-gray-400 mt-1.5" dir="ltr">
              {mapPos[0].toFixed(6)}, {mapPos[1].toFixed(6)}
              <button className="mr-3 text-red-400 hover:text-red-500" onClick={() => { setMapPos(null); upd({ lat: "", lng: "" }); }}>مسح</button>
            </p>
          )}
          {!mapPos && <p className="text-xs text-gray-400 mt-1.5">اضغط على الخريطة لتحديد موقع العقار</p>}
        </div>
      </Section>

      {/* تفاصيل الإعلان */}
      <Section title="تفاصيل الإعلان">
        <div className="space-y-4">
          <div id="f-title">
            <FLabel required>عنوان الإعلان</FLabel>
            <Input value={draft.title}
              onChange={e => { upd({ title: e.target.value }); setErrors(p => ({ ...p, title: "" })); }}
              placeholder={`مثال: ${draft.subType || "شقة"} ${draft.listingType === "sale" ? "للبيع" : "للإيجار"}${draft.cityName ? " في " + draft.cityName : ""}`}
              className={`h-12 rounded-lg text-base ${errors.title ? "border-red-400" : "border-gray-200"}`} />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>
          <div>
            <FLabel>وصف العقار</FLabel>
            <Textarea value={draft.desc} onChange={e => upd({ desc: e.target.value })}
              placeholder="صف العقار بالتفصيل — الموقع، المميزات، حالة العقار..."
              className="resize-none h-32 rounded-lg border-gray-200" maxLength={2000} />
            <p className="text-xs text-gray-400 mt-1 text-left" dir="ltr">{draft.desc.length}/2000</p>
          </div>
        </div>
      </Section>

      {/* المواصفات */}
      <Section title="المواصفات">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div id="f-price" className="col-span-1">
            <FLabel required>السعر (جنيه)</FLabel>
            <Input inputMode="numeric" value={draft.price}
              onChange={e => { upd({ price: e.target.value.replace(/\D/g, "") }); setErrors(p => ({ ...p, price: "" })); }}
              placeholder="850,000" className={`h-11 rounded-lg font-mono ${errors.price ? "border-red-400" : "border-gray-200"}`} dir="ltr" />
            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
          </div>
          <div id="f-area" className="col-span-1">
            <FLabel required>المساحة (م²)</FLabel>
            <Input inputMode="numeric" value={draft.area}
              onChange={e => { upd({ area: e.target.value.replace(/\D/g, "") }); setErrors(p => ({ ...p, area: "" })); }}
              placeholder="120" className={`h-11 rounded-lg font-mono ${errors.area ? "border-red-400" : "border-gray-200"}`} dir="ltr" />
            {errors.area && <p className="text-xs text-red-500 mt-1">{errors.area}</p>}
          </div>

          {isRes && <NumInput label="غرف النوم" value={draft.rooms} onChange={v => upd({ rooms: v })} placeholder="3" />}
          {(isRes || isCom) && <NumInput label="الحمامات" value={draft.bathrooms} onChange={v => upd({ bathrooms: v })} placeholder="2" />}
          {!isLand && <NumInput label="رقم الدور" value={draft.floor} onChange={v => upd({ floor: v })} placeholder="3" />}
          {!isLand && <NumInput label="إجمالي الأدوار" value={draft.totalFloors} onChange={v => upd({ totalFloors: v })} placeholder="10" />}
          <NumInput label="سنة البناء" value={draft.buildYear} onChange={v => upd({ buildYear: v.slice(0, 4) })} placeholder="2022" />
        </div>
      </Section>

      {/* التفاصيل الإضافية */}
      {!isLand && (
        <Section title="التفاصيل الإضافية">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { k: "finishing", label: "التشطيب", opts: FINISHING },
              { k: "condition", label: "الحالة", opts: CONDITIONS },
              ...(isRes ? [{ k: "furnished", label: "الأثاث", opts: FURNISHED }] : []),
              { k: "direction", label: "اتجاه الواجهة", opts: DIRECTIONS },
              { k: "payMethod", label: "نظام الدفع", opts: PAY_METHODS },
            ].map(({ k, label, opts }) => (
              <div key={k}>
                <FLabel>{label}</FLabel>
                <Select value={(draft as any)[k] || "__"} onValueChange={v => upd({ [k]: v === "__" ? "" : v } as any)}>
                  <SelectTrigger className="h-11 rounded-lg border-gray-200"><SelectValue placeholder={label} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__">— {label} —</SelectItem>
                    {opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* المميزات */}
      {!isLand && (
        <Section title="مميزات العقار">
          <div className="flex flex-wrap gap-2">
            {FEATURES.map(f => <Chip key={f} label={f} selected={draft.features.includes(f)} onClick={() => tog("features", f)} />)}
          </div>
        </Section>
      )}

      {/* الخدمات القريبة */}
      <Section title="الخدمات القريبة">
        <div className="flex flex-wrap gap-2">
          {NEARBY.map(n => <Chip key={n} label={n} selected={draft.nearby.includes(n)} onClick={() => tog("nearby", n)} />)}
        </div>
      </Section>

      {/* الصور */}
      <Section title="صور العقار">
        <p className="text-sm text-gray-500 mb-4">الصور الجيدة تزيد فرص البيع بنسبة كبيرة — يمكنك إضافة حتى 20 صورة</p>

        <div id="f-images"
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)); }}
          onClick={() => fileRef.current?.click()}
          className={`rounded-xl border-2 border-dashed cursor-pointer transition-colors py-12 flex flex-col items-center gap-3
            ${dragOver ? "border-teal-400 bg-teal-50" : "border-gray-200 hover:border-gray-300 bg-gray-50"}`}>
          <input ref={fileRef} type="file" className="hidden" multiple accept="image/*"
            onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
          <Upload className="w-8 h-8 text-gray-400" />
          <p className="text-sm font-semibold text-gray-600">{dragOver ? "أفلت الصور هنا" : "اسحب الصور أو اضغط لاختيارها"}</p>
          <p className="text-xs text-gray-400">JPG · PNG · WEBP — حتى 5MB لكل صورة</p>
          {draft.images.length > 0 && <span className="text-xs font-bold text-teal-600">{draft.images.length}/20 صورة</span>}
        </div>

        {errors.images && <p className="text-xs text-red-500 mt-2">{errors.images}</p>}

        {draft.images.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">اسحب لإعادة الترتيب — اضغط "رئيسية" لتعيين صورة الغلاف</p>
              <button type="button" onClick={() => { upd({ images: [], mainImg: 0 }); imgFilesRef.current = []; }}
                className="text-xs text-red-500 hover:text-red-600 font-semibold">حذف الكل</button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {draft.images.map((src, i) => (
                <div key={i} draggable
                  onDragStart={e => onDragStart(e, i)} onDragOver={e => onDragOver(e, i)}
                  onDrop={e => onDrop(e, i)} onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-grab group transition-all
                    ${i === draft.mainImg ? "border-teal-500" : "border-gray-200"}
                    ${dragOverIdx === i && dragIdx !== i ? "scale-105 border-teal-400" : ""}
                    ${dragIdx === i ? "opacity-40" : ""}`}>
                  <img src={src} className="w-full h-full object-cover" />
                  {i === draft.mainImg && <div className="absolute top-1 right-1 bg-teal-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">غلاف</div>}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1">
                    {i !== draft.mainImg && (
                      <button type="button" onClick={() => upd({ mainImg: i })} className="text-[10px] bg-white text-gray-700 rounded px-2 py-0.5 font-semibold w-full text-center">رئيسية</button>
                    )}
                    <button type="button" onClick={() => rmImg(i)} className="text-[10px] bg-red-500 text-white rounded px-2 py-0.5 font-semibold w-full text-center">حذف</button>
                  </div>
                  <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 bg-black/30 rounded p-0.5">
                    <GripVertical className="w-3 h-3 text-white" />
                  </div>
                </div>
              ))}
              {draft.images.length < 20 && (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-teal-400 hover:text-teal-500 transition-colors">
                  <Upload className="w-4 h-4" />
                  <span className="text-[10px] font-semibold">إضافة</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* فيديو */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <FLabel>رابط فيديو <span className="text-gray-400 font-normal">(اختياري)</span></FLabel>
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-gray-400 shrink-0" />
            <Input value={draft.videoUrl} onChange={e => upd({ videoUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=..." className="h-11 rounded-lg border-gray-200 flex-1" dir="ltr" />
          </div>
        </div>
      </Section>
    </div>
  );

  /* ══════════════════════════════════════════════════
      STEP 2 — اختيار الباقة (all plans from admin — single source of truth)
  ══════════════════════════════════════════════════ */
  const step2 = (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-2">
        <div className="inline-flex items-center gap-2 bg-teal-50 border border-teal-100 rounded-full px-4 py-1.5 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          <span className="text-xs font-semibold text-teal-700 uppercase tracking-widest">خطوة 2 من 3</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">اختر باقة الإعلان</h2>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          الباقات تُدار من لوحة الإدارة — أي تغيير يظهر هنا فوراً. يمكنك الترقية في أي وقت.
        </p>
      </div>

      {/* Loading */}
      {billingPlans.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-400">جاري تحميل الباقات…</p>
          </div>
        </div>
      ) : sortedPlans.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-semibold mb-1">لا توجد باقات متاحة حالياً</p>
          <p className="text-sm">تواصل مع الإدارة لتفعيل الباقات</p>
        </div>
      ) : (
        <>
          {/* Plans grid */}
          <div className={`grid gap-4 ${
            sortedPlans.length <= 2 ? "grid-cols-1 sm:grid-cols-2 max-w-xl mx-auto" :
            "grid-cols-1 sm:grid-cols-3"
          }`}>
            {sortedPlans.map(plan => {
              const sel     = draft.plan === plan.id;
              const price   = parseFloat(plan.price);
              const isFree  = price === 0;
              const accent  = plan.color || "#0d9488";
              const limits: Record<string, number> = (() => { try { return JSON.parse(plan.limits ?? "{}"); } catch { return {}; } })();
              const features: Record<string, boolean> = (() => { try { return JSON.parse(plan.features ?? "{}"); } catch { return {}; } })();
              const topFeatures = Object.entries(features).filter(([, v]) => v).slice(0, 3);

              return (
                <div
                  key={plan.id}
                  onClick={() => upd({ plan: plan.id })}
                  className={`relative flex flex-col rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden group
                    ${sel
                      ? "shadow-2xl -translate-y-1"
                      : "border-gray-100 bg-white hover:shadow-lg hover:-translate-y-0.5"
                    }`}
                  style={sel ? {
                    borderColor: accent,
                    boxShadow: `0 20px 60px ${accent}25`,
                    borderWidth: "2px",
                  } : {}}
                >
                  {/* Color strip */}
                  <div className="h-1 w-full shrink-0 transition-all"
                    style={{ background: sel ? accent : "#e5e7eb" }} />

                  {/* Popular / Recommended badge */}
                  {plan.isMostPopular && (
                    <div className="absolute top-3 right-3">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white"
                        style={{ background: accent }}>
                        ⭐ الأكثر طلباً
                      </span>
                    </div>
                  )}
                  {plan.isRecommended && !plan.isMostPopular && (
                    <div className="absolute top-3 right-3">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-white"
                        style={{ background: accent }}>
                        موصى به
                      </span>
                    </div>
                  )}

                  {/* Selected checkmark */}
                  {sel && (
                    <div className="absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center shadow-md"
                      style={{ background: accent }}>
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </div>
                  )}

                  <div className="p-5 flex flex-col flex-1 gap-3">
                    {/* Name + price */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{plan.name}</p>
                      <h3 className="text-lg font-bold text-gray-900 leading-tight">{plan.nameAr ?? plan.name}</h3>
                      {plan.descriptionAr && (
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{plan.descriptionAr}</p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="flex items-baseline gap-1">
                      {isFree ? (
                        <span className="text-3xl font-black" style={{ color: accent }}>مجاني</span>
                      ) : (
                        <>
                          <span dir="ltr" className="text-3xl font-black text-gray-900">{Number(price).toLocaleString("en-US")}</span>
                          <div className="text-xs text-gray-400 leading-tight">
                            <div>{plan.currency}</div>
                            <div>/{plan.durationDays} يوم</div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100" />

                    {/* Key limits */}
                    <div className="space-y-1.5 text-xs flex-1">
                      {limits.properties !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">العقارات</span>
                          <span className="font-semibold text-gray-800">
                            {limits.properties < 0 ? "غير محدود" : limits.properties}
                          </span>
                        </div>
                      )}
                      {limits.featuredAds !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">إعلانات مميزة</span>
                          <span className="font-semibold text-gray-800">
                            {limits.featuredAds < 0 ? "غير محدود" : limits.featuredAds}
                          </span>
                        </div>
                      )}
                      {plan.commissionPercent && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">العمولة</span>
                          <span className="font-semibold text-gray-800">{plan.commissionPercent}%</span>
                        </div>
                      )}
                      {topFeatures.map(([key]) => {
                        const labels: Record<string, string> = {
                          homepageDisplay: "ظهور في الرئيسية",
                          topSearch: "أعلى البحث",
                          verifiedBadge: "شارة موثّق",
                          premiumBadge: "شارة Premium",
                          aiTools: "أدوات AI",
                          prioritySupport: "دعم الأولوية",
                        };
                        return (
                          <div key={key} className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 shrink-0" style={{ color: accent }} />
                            <span className="text-gray-600">{labels[key] ?? key}</span>
                          </div>
                        );
                      })}
                      {plan.trialDays > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Zap className="w-3 h-3 shrink-0 text-amber-500" />
                          <span className="text-amber-700 font-medium">{plan.trialDays} أيام تجريبية</span>
                        </div>
                      )}
                    </div>

                    {/* CTA */}
                    <button
                      type="button"
                      className="w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200 mt-1"
                      style={sel
                        ? { background: accent, color: "#fff" }
                        : { background: "#f4f4f5", color: "#374151" }
                      }
                      onClick={e => { e.stopPropagation(); upd({ plan: plan.id }); }}
                    >
                      {sel ? "✓ تم الاختيار" : isFree ? "ابدأ مجاناً" : "اختر هذه الباقة"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected plan banner */}
          {selectedBillingPlan && (
            <div className="rounded-xl border p-4 flex items-center justify-between gap-3 transition-all"
              style={{ background: `${selectedBillingPlan.color || "#0d9488"}08`, borderColor: `${selectedBillingPlan.color || "#0d9488"}30` }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: selectedBillingPlan.color || "#0d9488" }}>
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">
                    الباقة المختارة: {selectedBillingPlan.nameAr ?? selectedBillingPlan.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isFreeSelected
                      ? "⚡ نشر مجاني — سيُراجع إعلانك بدون دفع"
                      : `💳 ستدفع ${selectedBillingPlan.price} ${selectedBillingPlan.currency} لتفعيل الباقة`
                    }
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => upd({ plan: null })}
                className="text-xs text-gray-400 hover:text-gray-600 underline shrink-0">
                تغيير
              </button>
            </div>
          )}

          {/* Property mini summary */}
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">ملخص العقار</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
              {[
                ["النوع",    `${MAIN_TYPES.find(t => t.id === draft.mainType)?.label ?? "—"}`],
                ["الصفقة",  LISTING_TYPES.find(t => t.id === draft.listingType)?.label ?? "—"],
                ["الموقع",  draft.cityName ?? "—"],
                ["السعر",   draft.price ? `${Number(draft.price).toLocaleString("en-US")} ج.م` : "—"],
                ["المساحة", draft.area ? `${draft.area} م²` : "—"],
                ["الصور",   `${draft.images.length} صورة`],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-1">
                  <span className="text-gray-400">{k}</span>
                  <span className="font-semibold text-gray-700 truncate">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  /* ══════════════════════════════════════════════════
      STEP 3 — الدفع والنشر
  ══════════════════════════════════════════════════ */

  // ── Summary row helper
  const SummaryRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-teal-700" : "text-gray-800"}`}>{value}</span>
    </div>
  );

  // ── Formatted card number

  const step3 = (
    <div className="space-y-7">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-1">
            {isFreeSelected ? "مراجعة ونشر" : "الدفع والنشر"}
          </h2>
          <p className="text-sm text-gray-500">
            {isFreeSelected ? "راجع بيانات إعلانك قبل الإرسال" : "ادفع لتفعيل باقتك ونشر إعلانك"}
          </p>
        </div>
        {!isFreeSelected && selectedBillingPlan && (
          <div className="text-left shrink-0 bg-teal-50 rounded-xl px-4 py-2 border border-teal-100">
            <p className="text-xs text-teal-600 font-semibold">{selectedBillingPlan.nameAr}</p>
            <p className="text-xl font-black text-teal-700 leading-tight">
              {Number(selectedBillingPlan.price).toLocaleString("ar")} {selectedBillingPlan.currency}
            </p>
          </div>
        )}
      </div>

      {/* Order summary card */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-5 py-3 flex items-center gap-2 border-b border-gray-100">
          <ClipboardList className="w-4 h-4 text-gray-400" />
          <p className="font-bold text-gray-700 text-sm">ملخص الطلب</p>
        </div>
        <div className="px-5 py-1 divide-y divide-gray-100">
          <SummaryRow label="العقار"  value={`${MAIN_TYPES.find(t => t.id === draft.mainType)?.label ?? "—"} — ${draft.subType || "—"}`} />
          <SummaryRow label="الصفقة" value={LISTING_TYPES.find(t => t.id === draft.listingType)?.label ?? "—"} />
          <SummaryRow label="الموقع" value={`${draft.cityName ?? "—"}${draft.address ? " · " + draft.address : ""}`} />
          <SummaryRow label="السعر"  value={draft.price ? `${Number(draft.price).toLocaleString("ar")} ج.م` : "—"} />
          <SummaryRow label="المساحة" value={draft.area ? `${draft.area} م²` : "—"} />
          <SummaryRow label="الصور"  value={`${draft.images.length} صورة`} />
          <SummaryRow label="الباقة" value={isFreeSelected ? "مجانية" : selectedBillingPlan?.nameAr ?? "—"} highlight />
          {!isFreeSelected && selectedBillingPlan && (
            <SummaryRow label="المبلغ المستحق"
              value={`${Number(selectedBillingPlan.price).toLocaleString("ar")} ${selectedBillingPlan.currency}`}
              highlight />
          )}
        </div>
      </div>

      {/* ── PAID PLAN: Payment instructions ── */}
      {!isFreeSelected && paymentStatus !== "processing" && paymentStatus !== "paid" && (() => {
        const gateway = (siteSettings?.paymentGateway ?? "vodafone_cash") as string;
        const GATEWAY_META: Record<string, { label: string; color: string; bg: string; border: string; emoji: string }> = {
          vodafone_cash:  { label: "فودافون كاش",  color: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    emoji: "📱" },
          fawry:          { label: "فوري",           color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", emoji: "⚡" },
          instapay:       { label: "انستاباي",       color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200",   emoji: "💙" },
          bank_transfer:  { label: "تحويل بنكي",    color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200",  emoji: "🏦" },
        };
        const meta = GATEWAY_META[gateway] ?? GATEWAY_META.vodafone_cash;
        const amount = selectedBillingPlan ? Number(selectedBillingPlan.price).toLocaleString("en-US") : "";
        const currency = selectedBillingPlan?.currency ?? "EGP";

        return (
          <div className="space-y-4">
            <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-400" />تعليمات الدفع
            </p>

            {/* Gateway card */}
            <div className={`rounded-2xl border ${meta.border} ${meta.bg} p-5 space-y-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{meta.emoji}</span>
                  <span className={`font-bold text-base ${meta.color}`}>{meta.label}</span>
                </div>
                <div className="text-left">
                  <p className={`text-xl font-black ${meta.color}`}>{amount}</p>
                  <p className="text-xs text-gray-500">{currency}</p>
                </div>
              </div>

              {/* Vodafone Cash */}
              {gateway === "vodafone_cash" && siteSettings?.vodafoneCashNumber && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white rounded-xl border border-red-100 px-3 py-2">
                    <div>
                      <p className="text-xs text-gray-400">رقم المحفظة</p>
                      <p className="font-bold text-gray-800 font-mono" dir="ltr">{siteSettings.vodafoneCashNumber}</p>
                    </div>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(siteSettings.vodafoneCashNumber!); toast.success("تم النسخ"); }} className="text-xs text-red-600 font-semibold hover:text-red-800">نسخ</button>
                  </div>
                  {siteSettings.vodafoneCashName && (
                    <p className="text-xs text-red-700">باسم: <strong>{siteSettings.vodafoneCashName}</strong></p>
                  )}
                  <p className="text-xs text-gray-500">افتح تطبيق فودافون كاش → تحويل → أدخل الرقم → أرسل المبلغ</p>
                </div>
              )}

              {/* Fawry */}
              {gateway === "fawry" && siteSettings?.fawryCode && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white rounded-xl border border-orange-100 px-3 py-2">
                    <div>
                      <p className="text-xs text-gray-400">كود فوري</p>
                      <p className="font-bold text-gray-800 font-mono" dir="ltr">{siteSettings.fawryCode}</p>
                    </div>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(siteSettings.fawryCode!); toast.success("تم النسخ"); }} className="text-xs text-orange-600 font-semibold hover:text-orange-800">نسخ</button>
                  </div>
                  {siteSettings.fawryMerchantName && <p className="text-xs text-orange-700">التاجر: <strong>{siteSettings.fawryMerchantName}</strong></p>}
                  <p className="text-xs text-gray-500">توجه لأقرب نقطة فوري أو استخدم التطبيق وأدخل الكود</p>
                </div>
              )}

              {/* InstaPay */}
              {gateway === "instapay" && siteSettings?.instaPayIPA && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white rounded-xl border border-blue-100 px-3 py-2">
                    <div>
                      <p className="text-xs text-gray-400">معرّف InstaPay</p>
                      <p className="font-bold text-gray-800 font-mono" dir="ltr">{siteSettings.instaPayIPA}</p>
                    </div>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(siteSettings.instaPayIPA!); toast.success("تم النسخ"); }} className="text-xs text-blue-600 font-semibold hover:text-blue-800">نسخ</button>
                  </div>
                  {siteSettings.instaPayName && <p className="text-xs text-blue-700">باسم: <strong>{siteSettings.instaPayName}</strong></p>}
                  <p className="text-xs text-gray-500">افتح InstaPay أو بنكك → تحويل فوري → أدخل المعرّف</p>
                </div>
              )}

              {/* Bank Transfer */}
              {gateway === "bank_transfer" && (
                <div className="space-y-2">
                  {siteSettings?.bankName && <p className="text-xs text-green-700">البنك: <strong>{siteSettings.bankName}</strong></p>}
                  {siteSettings?.bankAccountName && <p className="text-xs text-green-700">الحساب: <strong>{siteSettings.bankAccountName}</strong></p>}
                  {siteSettings?.bankAccountNumber && (
                    <div className="flex items-center justify-between bg-white rounded-xl border border-green-100 px-3 py-2">
                      <div>
                        <p className="text-xs text-gray-400">رقم الحساب</p>
                        <p className="font-bold text-gray-800 font-mono" dir="ltr">{siteSettings.bankAccountNumber}</p>
                      </div>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(siteSettings.bankAccountNumber!); toast.success("تم النسخ"); }} className="text-xs text-green-600 font-semibold hover:text-green-800">نسخ</button>
                    </div>
                  )}
                  {siteSettings?.bankIBAN && (
                    <div className="flex items-center justify-between bg-white rounded-xl border border-green-100 px-3 py-2">
                      <div>
                        <p className="text-xs text-gray-400">IBAN</p>
                        <p className="font-bold text-gray-800 font-mono text-sm" dir="ltr">{siteSettings.bankIBAN}</p>
                      </div>
                      <button type="button" onClick={() => { navigator.clipboard.writeText(siteSettings.bankIBAN!); toast.success("تم النسخ"); }} className="text-xs text-green-600 font-semibold hover:text-green-800">نسخ</button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">حوّل المبلغ عبر الإنترنت البنكي أو فرع البنك</p>
                </div>
              )}

              {siteSettings?.paymentInstructions && (
                <p className="text-xs text-gray-500 border-t border-gray-200 pt-2">{siteSettings.paymentInstructions}</p>
              )}
            </div>

            {/* Receipt upload */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">ارفع إيصال الدفع (اختياري)</p>
              <input ref={receiptRef} type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => handleReceiptUpload(e.target.files)} />
              {receipt ? (
                <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl p-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                  <p className="text-sm text-teal-700 font-medium flex-1">تم رفع الإيصال</p>
                  <button type="button" onClick={() => setReceipt(null)} className="text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => receiptRef.current?.click()} disabled={receiptUploading}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-teal-400 hover:bg-teal-50/30 transition-all flex items-center justify-center gap-2 text-gray-400 hover:text-teal-600">
                  {receiptUploading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">جارٍ الرفع...</span></>
                    : <><Upload className="w-4 h-4" /><span className="text-sm">اضغط لرفع الإيصال (صورة أو PDF)</span></>}
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Processing overlay ── */}
      {paymentStatus === "processing" && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
            <Loader2 className="w-7 h-7 text-teal-600 animate-spin" />
          </div>
          <div>
            <p className="font-bold text-teal-800 text-base">جاري معالجة الدفع…</p>
            <p className="text-teal-600 text-sm mt-1">يرجى الانتظار، لا تغلق الصفحة</p>
          </div>
        </div>
      )}

      {/* ── Upload progress ── */}
      {submitting && paymentStatus === "paid" && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-600">
            <span>جاري رفع البيانات والصور…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-teal-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* ── Action button ── */}
      {paymentStatus !== "processing" && paymentStatus !== "paid" && (
        <div className="space-y-3">
          {isFreeSelected ? (
            <Button onClick={handleSubmit} disabled={submitting}
              className="w-full h-14 rounded-2xl text-base font-bold bg-teal-600 hover:bg-teal-700 shadow-md">
              {submitting
                ? <><Loader2 className="w-5 h-5 ml-2 animate-spin" />جاري الإرسال…</>
                : <><Send className="w-5 h-5 ml-2" />إرسال للمراجعة</>}
            </Button>
          ) : (
            <Button onClick={handlePayment} disabled={submitting}
              className="w-full h-14 rounded-2xl text-base font-bold shadow-md bg-emerald-600 hover:bg-emerald-700">
              {submitting
                ? <><Loader2 className="w-5 h-5 ml-2 animate-spin" />جاري المعالجة…</>
                : <><Lock className="w-5 h-5 ml-2" />ادفع الآن وانشر الإعلان</>}
            </Button>
          )}
          <p className="text-center text-xs text-gray-400">بالنشر أنت توافق على شروط وأحكام المنصة</p>
        </div>
      )}

      {paymentStatus === "failed" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 font-semibold text-sm">فشل الدفع أو رفع البيانات</p>
            <p className="text-red-500 text-xs mt-0.5">يرجى المحاولة مرة أخرى أو التواصل مع الدعم</p>
          </div>
          <button className="mr-auto text-xs text-red-600 underline" onClick={() => setPaymentStatus("idle")}>إعادة المحاولة</button>
        </div>
      )}
    </div>
  );

  /* ══════════════════════════════════════════════════
      LAYOUT
  ══════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Header />
      <Steps step={step} />

      <div className="max-w-3xl mx-auto px-4 py-8 pb-28">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          {step === 1 && step1}
          {step === 2 && step2}
          {step === 3 && step3}
        </div>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {step > 1 && (
            <button onClick={goBack} className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900 px-4 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white transition-colors shrink-0">
              <ChevronRight className="w-4 h-4" />السابق
            </button>
          )}
          <div className="flex-1 flex justify-center gap-1.5">
            {[1,2,3].map(i => (
              <div key={i} className={`h-1 rounded-full transition-all ${i === step ? "w-8 bg-teal-600" : i < step ? "w-4 bg-teal-200" : "w-4 bg-gray-200"}`} />
            ))}
          </div>
          {step < TOTAL_STEPS && (
            <button onClick={goNext}
              className="flex items-center gap-1 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 px-6 py-2.5 rounded-lg transition-colors shrink-0">
              التالي<ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <RealEstateFooter />
    </div>
  );
}
